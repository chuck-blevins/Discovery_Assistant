import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { ClientForm } from '@/components/app/clients/ClientForm'
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

const existingClient: ClientResponse = {
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

describe('ClientForm — create mode', () => {
  it('renders with title "New Client" and empty name field', () => {
    renderWithProviders(
      <ClientForm open={true} onOpenChange={vi.fn()} />
    )
    expect(screen.getByRole('heading', { name: /new client/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toHaveValue('')
  })

  it('shows inline error when name is empty on submit', async () => {
    renderWithProviders(
      <ClientForm open={true} onOpenChange={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: /create client/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) on successful create', async () => {
    const mockCreated: ClientResponse = { ...existingClient, id: 'new-id', name: 'Beta Inc' }
    vi.mocked(clientsApi.createClient).mockResolvedValue(mockCreated)
    vi.mocked(clientsApi.listClients).mockResolvedValue([])

    const onOpenChange = vi.fn()
    renderWithProviders(
      <ClientForm open={true} onOpenChange={onOpenChange} />
    )

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Beta Inc' } })
    fireEvent.click(screen.getByRole('button', { name: /create client/i }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows inline error on 409 duplicate name', async () => {
    vi.mocked(clientsApi.createClient).mockRejectedValue(
      new Error('A client with that name already exists')
    )
    vi.mocked(clientsApi.listClients).mockResolvedValue([])

    renderWithProviders(
      <ClientForm open={true} onOpenChange={vi.fn()} />
    )

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /create client/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText('A client with that name already exists')).toBeInTheDocument()
  })

  it('has zero axe violations', async () => {
    const { container } = renderWithProviders(
      <ClientForm open={true} onOpenChange={vi.fn()} />
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe('ClientForm — edit mode', () => {
  it('renders with title "Edit Client" and pre-filled name', () => {
    renderWithProviders(
      <ClientForm open={true} onOpenChange={vi.fn()} client={existingClient} />
    )
    expect(screen.getByRole('heading', { name: /edit client/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toHaveValue('Acme Corp')
  })

  it('calls onOpenChange(false) on successful update', async () => {
    const mockUpdated: ClientResponse = { ...existingClient, name: 'Acme Corp Updated' }
    vi.mocked(clientsApi.updateClient).mockResolvedValue(mockUpdated)
    vi.mocked(clientsApi.listClients).mockResolvedValue([])

    const onOpenChange = vi.fn()
    renderWithProviders(
      <ClientForm open={true} onOpenChange={onOpenChange} client={existingClient} />
    )

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Acme Corp Updated' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('has zero axe violations', async () => {
    const { container } = renderWithProviders(
      <ClientForm open={true} onOpenChange={vi.fn()} client={existingClient} />
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
