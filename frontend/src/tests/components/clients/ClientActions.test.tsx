import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ClientActions } from '@/components/app/clients/ClientActions'
import type { ClientResponse } from '@/types/api'

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
  status: 'archived',
  archived_at: '2026-02-01T00:00:00Z',
}

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ClientActions', () => {
  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = vi.fn()
    renderWithProviders(<ClientActions client={activeClient} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('shows "Archive" button for active clients', () => {
    renderWithProviders(<ClientActions client={activeClient} onEdit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^archive$/i })).toBeInTheDocument()
  })

  it('shows "Unarchive" button for archived clients', () => {
    renderWithProviders(<ClientActions client={archivedClient} onEdit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^unarchive$/i })).toBeInTheDocument()
  })

  it('calls archiveClient with client id when Archive is clicked', async () => {
    vi.mocked(clientsApi.archiveClient).mockResolvedValue({ ...activeClient, status: 'archived', archived_at: '2026-02-01T00:00:00Z' })
    vi.mocked(clientsApi.listClients).mockResolvedValue([])
    renderWithProviders(<ClientActions client={activeClient} onEdit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^archive$/i }))
    await waitFor(() => {
      expect(clientsApi.archiveClient).toHaveBeenCalledWith(activeClient.id)
    })
  })

  it('opens delete confirmation dialog when Delete is clicked', async () => {
    renderWithProviders(<ClientActions client={activeClient} onEdit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
    expect(screen.getByText(/Delete.*Acme Corp/)).toBeInTheDocument()
    expect(screen.getByText(/This cannot be undone/)).toBeInTheDocument()
  })

  it('calls deleteClient with client id when deletion is confirmed', async () => {
    vi.mocked(clientsApi.deleteClient).mockResolvedValue(undefined)
    vi.mocked(clientsApi.listClients).mockResolvedValue([])
    renderWithProviders(<ClientActions client={activeClient} onEdit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
    // Trigger has aria-hidden when dialog is open; only the confirm button is accessible
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => {
      expect(clientsApi.deleteClient).toHaveBeenCalledWith(activeClient.id)
    })
  })

  it('does not call deleteClient when Cancel is clicked in confirmation', async () => {
    renderWithProviders(<ClientActions client={activeClient} onEdit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(clientsApi.deleteClient).not.toHaveBeenCalled()
  })
})
