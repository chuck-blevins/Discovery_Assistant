import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ClientIntakeWizard } from '@/components/app/clients/ClientIntakeWizard'

// Mock API modules
vi.mock('@/api/clients', () => ({
  intakeScope: vi.fn(),
  createClient: vi.fn(),
  listClients: vi.fn(),
}))

vi.mock('@/api/projects', () => ({
  createProject: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import * as clientsApi from '@/api/clients'
import * as projectsApi from '@/api/projects'

const mockIntakeResult = {
  engagement_summary: 'Acme Corp is a B2B SaaS seeking product-market fit.',
  icp_hypothesis: ['B2B SaaS', 'VP Product buyer'],
  discovery_questions: ['What is your biggest blocker?', 'Who is your best customer?'],
  suggested_engagement_type: 'discovery',
}

const mockClient = {
  id: 'client-123',
  user_id: 'user-1',
  name: 'Acme Corp',
  description: null,
  market_type: null,
  assumed_problem: null,
  assumed_solution: null,
  assumed_market: null,
  initial_notes: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  archived_at: null,
}

const mockProject = {
  id: 'project-456',
  client_id: 'client-123',
  name: 'Discovery',
  objective: 'onboarding',
  assumed_problem: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderWizard(open = true, onClose = vi.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TooltipProvider delayDuration={0}>
          <ClientIntakeWizard open={open} onClose={onClose} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Step 1 rendering
// ============================================================================

describe('ClientIntakeWizard — Step 1', () => {
  it('renders company name, context, and win definition fields', () => {
    renderWizard()
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/context/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/win look like/i)).toBeInTheDocument()
  })

  it('Generate button is disabled when company name is empty', () => {
    renderWizard()
    const generateBtn = screen.getByRole('button', { name: /generate scope/i })
    expect(generateBtn).toBeDisabled()
  })

  it('Generate button is enabled after entering a company name', () => {
    renderWizard()
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Acme Corp' },
    })
    const generateBtn = screen.getByRole('button', { name: /generate scope/i })
    expect(generateBtn).not.toBeDisabled()
  })

  it('Skip AI button advances to Step 3 without calling intakeScope', async () => {
    renderWizard()
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Acme Corp' },
    })
    fireEvent.click(screen.getByRole('button', { name: /skip ai/i }))

    await waitFor(() => {
      expect(screen.getByText(/review & confirm/i)).toBeInTheDocument()
    })
    expect(vi.mocked(clientsApi.intakeScope)).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Step 2 — AI draft
// ============================================================================

describe('ClientIntakeWizard — Step 2 (AI Draft)', () => {
  async function advanceToStep2() {
    vi.mocked(clientsApi.intakeScope).mockResolvedValue(mockIntakeResult)
    renderWizard()
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Acme Corp' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate scope/i }))
    await waitFor(() => {
      expect(screen.getByText(/ai scope draft/i)).toBeInTheDocument()
    })
  }

  it('calls intakeScope API and shows loading state', async () => {
    let resolveIntake!: (v: typeof mockIntakeResult) => void
    vi.mocked(clientsApi.intakeScope).mockReturnValue(
      new Promise((res) => { resolveIntake = res })
    )
    renderWizard()
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /generate scope/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument()
    })
    resolveIntake(mockIntakeResult)
  })

  it('renders engagement summary, ICP hypothesis, and discovery questions on success', async () => {
    await advanceToStep2()
    expect(screen.getByLabelText(/engagement summary/i)).toHaveValue(
      mockIntakeResult.engagement_summary
    )
    expect(screen.getByText('B2B SaaS')).toBeInTheDocument()
    expect(screen.getByText('VP Product buyer')).toBeInTheDocument()
    expect(screen.getByLabelText(/discovery questions/i)).toBeInTheDocument()
  })

  it('engagement summary and discovery questions are editable', async () => {
    await advanceToStep2()
    const summaryField = screen.getByLabelText(/engagement summary/i)
    fireEvent.change(summaryField, { target: { value: 'Custom summary' } })
    expect(summaryField).toHaveValue('Custom summary')

    const questionsField = screen.getByLabelText(/discovery questions/i)
    fireEvent.change(questionsField, { target: { value: 'My custom question' } })
    expect(questionsField).toHaveValue('My custom question')
  })
})

// ============================================================================
// Step 2 — Error states
// ============================================================================

describe('ClientIntakeWizard — Step 2 error handling', () => {
  it('shows inline error and "Continue without AI draft" button on API error', async () => {
    vi.mocked(clientsApi.intakeScope).mockRejectedValue(new Error('Service unavailable'))
    renderWizard()
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Acme' } })
    fireEvent.click(screen.getByRole('button', { name: /generate scope/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/service unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip ai/i })).toBeInTheDocument()
  })

  it('shows Settings mention on 422 API key error', async () => {
    vi.mocked(clientsApi.intakeScope).mockRejectedValue(
      new Error('Claude API key is not configured. Add it in Settings > LLM Config.')
    )
    renderWizard()
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Acme' } })
    fireEvent.click(screen.getByRole('button', { name: /generate scope/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })
})

// ============================================================================
// Step 3 — Confirm
// ============================================================================

describe('ClientIntakeWizard — Step 3 Confirm', () => {
  async function advanceToStep3() {
    vi.mocked(clientsApi.intakeScope).mockResolvedValue(mockIntakeResult)
    renderWizard()
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /generate scope/i }))
    await waitFor(() => expect(screen.getByText(/ai scope draft/i)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => expect(screen.getByText(/review & confirm/i)).toBeInTheDocument())
  }

  it('both API calls succeed → navigate called with clientJustCreated state', async () => {
    vi.mocked(clientsApi.createClient).mockResolvedValue(mockClient)
    vi.mocked(projectsApi.createProject).mockResolvedValue(mockProject)
    await advanceToStep3()

    fireEvent.click(screen.getByRole('button', { name: /confirm & create/i }))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/client-123', {
        state: { clientJustCreated: true, clientName: 'Acme Corp' },
      })
    })
    expect(vi.mocked(clientsApi.createClient)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(projectsApi.createProject)).toHaveBeenCalledTimes(1)
  })

  it('client creation failure → error shown, project API not called', async () => {
    vi.mocked(clientsApi.createClient).mockRejectedValue(new Error('DB error'))
    await advanceToStep3()

    fireEvent.click(screen.getByRole('button', { name: /confirm & create/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(vi.mocked(projectsApi.createProject)).not.toHaveBeenCalled()
  })

  it('project creation failure → error shown + retry state preserves client_id', async () => {
    vi.mocked(clientsApi.createClient).mockResolvedValue(mockClient)
    vi.mocked(projectsApi.createProject).mockRejectedValue(new Error('Project creation failed'))
    await advanceToStep3()

    fireEvent.click(screen.getByRole('button', { name: /confirm & create/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Retry button shown; client was created so createClient should not be called again
    vi.mocked(clientsApi.createClient).mockClear()
    vi.mocked(projectsApi.createProject).mockResolvedValue(mockProject)
    fireEvent.click(screen.getByRole('button', { name: /retry project/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
    })
    expect(vi.mocked(clientsApi.createClient)).not.toHaveBeenCalled()
    expect(vi.mocked(projectsApi.createProject)).toHaveBeenCalledTimes(2)
  })
})

// ============================================================================
// Wizard close / reset
// ============================================================================

describe('ClientIntakeWizard — close behavior', () => {
  it('closes wizard and resets step to 1 when Cancel is clicked', async () => {
    const onClose = vi.fn()
    renderWizard(true, onClose)

    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
})
