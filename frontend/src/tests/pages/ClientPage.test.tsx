import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ClientPage from '@/pages/ClientPage'
import type { ClientResponse } from '@/types/api'

vi.mock('@/hooks/useClients', () => ({
  useClient: vi.fn(),
  useClientNotes: vi.fn().mockReturnValue({ data: [] }),
  useCreateNote: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
  useDeleteNote: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
}))

vi.mock('@/components/app/clients/ClientForm', () => ({
  ClientForm: () => null,
}))

vi.mock('@/components/app/time/TimeSessionList', () => ({
  TimeSessionList: () => null,
}))

vi.mock('@/components/app/invoices/InvoiceList', () => ({
  InvoiceList: () => null,
}))

let capturedProjectTableProps: { clientId?: string; clientName?: string } = {}
vi.mock('@/components/app/projects/ProjectTable', () => ({
  ProjectTable: (props: { clientId: string; clientName?: string }) => {
    capturedProjectTableProps = props
    return <div data-testid="project-table" />
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useClient } from '@/hooks/useClients'
import { toast } from 'sonner'

const mockClient: ClientResponse = {
  id: 'client-1',
  user_id: 'user-1',
  name: 'Acme Corp',
  description: null,
  market_type: 'SaaS',
  assumed_problem: null,
  assumed_solution: null,
  assumed_market: null,
  initial_notes: null,
  contact_name: null,
  contact_email: null,
  contact_phone: null,
  website: null,
  engagement_status: null,
  status: 'active',
  contract_value: null,
  billing_type: null,
  hourly_rate: null,
  agreed_hours: null,
  contract_start_date: null,
  contract_end_date: null,
  stripe_customer_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  archived_at: null,
}

function renderClientPage(locationState?: Record<string, unknown>) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const initialEntry = locationState
    ? { pathname: '/client-1', state: locationState }
    : '/client-1'

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/:clientId" element={<ClientPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  capturedProjectTableProps = {}
  vi.mocked(useClient).mockReturnValue({
    data: mockClient,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useClient>)
})

describe('ClientPage — success toast', () => {
  it('fires toast.success with client name when clientJustCreated state is true', async () => {
    renderClientPage({ clientJustCreated: true, clientName: 'Acme Corp' })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        '"Acme Corp" created successfully!',
        { duration: 3000, closeButton: true }
      )
    })
  })

  it('clears router state via navigate replace after firing toast', async () => {
    renderClientPage({ clientJustCreated: true, clientName: 'Acme Corp' })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/client-1',
        { replace: true, state: {} }
      )
    })
  })

  it('does NOT fire toast when no location state is present', async () => {
    renderClientPage()

    // Allow effects to settle
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('does NOT fire toast when location state has clientJustCreated false', async () => {
    renderClientPage({ clientJustCreated: false, clientName: 'Acme Corp' })

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe('ClientPage — rendering', () => {
  it('renders client name and project table', async () => {
    renderClientPage()

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(screen.getByTestId('project-table')).toBeInTheDocument()
  })

  it('passes clientId and clientName to ProjectTable', async () => {
    renderClientPage()

    await waitFor(() => {
      expect(screen.getByTestId('project-table')).toBeInTheDocument()
    })
    expect(capturedProjectTableProps.clientId).toBe('client-1')
    expect(capturedProjectTableProps.clientName).toBe('Acme Corp')
  })

  it('renders loading skeleton when isLoading', () => {
    vi.mocked(useClient).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useClient>)

    renderClientPage()
    // Skeletons render without client name
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })

  it('renders error message when isError', () => {
    vi.mocked(useClient).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useClient>)

    renderClientPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
