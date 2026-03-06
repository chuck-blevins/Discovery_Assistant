import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ClientList } from '@/components/app/clients/ClientList'
import { useClientFormStore } from '@/stores/useClientFormStore'
import type { ClientResponse } from '@/types/api'

// Mock the API module
vi.mock('@/api/clients', () => ({
  listClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  archiveClient: vi.fn(),
  deleteClient: vi.fn(),
}))

import * as clientsApi from '@/api/clients'

const activeClient: ClientResponse = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: 'user-1',
  name: 'Acme Corp',
  description: null,
  market_type: 'SaaS',
  assumed_problem: null,
  assumed_solution: null,
  assumed_market: null,
  initial_notes: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  archived_at: null,
}

const archivedClient: ClientResponse = {
  ...activeClient,
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Old Corp',
  status: 'archived',
  archived_at: '2026-02-01T00:00:00Z',
}

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter>{ui}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // Reset Zustand store state
  useClientFormStore.setState({ open: false, client: null })
})

describe('ClientList', () => {
  it('shows skeleton rows while loading', () => {
    // Never-resolving promise → loading state
    vi.mocked(clientsApi.listClients).mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(<ClientList />)
    // Skeletons render as div elements with animate-pulse
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state when no clients', async () => {
    vi.mocked(clientsApi.listClients).mockResolvedValue([])
    renderWithProviders(<ClientList />)
    await waitFor(() => {
      expect(screen.getByText('No clients yet.')).toBeInTheDocument()
    })
    expect(screen.getAllByRole('button', { name: /new client/i }).length).toBeGreaterThan(0)
  })

  it('renders client names in table rows', async () => {
    vi.mocked(clientsApi.listClients).mockResolvedValue([activeClient])
    renderWithProviders(<ClientList />)
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(screen.getByText('SaaS')).toBeInTheDocument()
  })

  it('shows Archived badge for archived clients', async () => {
    vi.mocked(clientsApi.listClients).mockResolvedValue([archivedClient])
    renderWithProviders(<ClientList />)
    await waitFor(() => {
      expect(screen.getByText('Old Corp')).toBeInTheDocument()
    })
    expect(screen.getByText('Archived')).toBeInTheDocument()
  })

  it('shows error message on API failure', async () => {
    vi.mocked(clientsApi.listClients).mockRejectedValue(new Error('Network error'))
    renderWithProviders(<ClientList />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/Failed to load clients/)).toBeInTheDocument()
  })

  it('has zero axe violations with populated list', async () => {
    vi.mocked(clientsApi.listClients).mockResolvedValue([activeClient])
    const { container } = renderWithProviders(<ClientList />)
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has zero axe violations on empty state', async () => {
    vi.mocked(clientsApi.listClients).mockResolvedValue([])
    const { container } = renderWithProviders(<ClientList />)
    await waitFor(() => {
      expect(screen.getByText('No clients yet.')).toBeInTheDocument()
    })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
