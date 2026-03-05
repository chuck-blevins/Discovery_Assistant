import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import { TopBar } from '@/components/app/layout/TopBar'

vi.mock('@/hooks/useClients', () => ({
  useClient: vi.fn(),
}))
vi.mock('@/hooks/useProjects', () => ({
  useProject: vi.fn(),
}))

import { useClient } from '@/hooks/useClients'
import { useProject } from '@/hooks/useProjects'

function renderTopBarAtRoute(path: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<TopBar />} />
          <Route path="/:clientId" element={<TopBar />} />
          <Route path="/:clientId/:projectId" element={<TopBar />} />
          <Route path="/:clientId/:projectId/analyze" element={<TopBar />} />
          <Route path="*" element={<TopBar />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(useClient).mockReturnValue({ data: undefined } as ReturnType<typeof useClient>)
  vi.mocked(useProject).mockReturnValue({ data: undefined } as ReturnType<typeof useProject>)
})

describe('TopBar', () => {
  it('shows "Discovery App" title on root route', () => {
    renderTopBarAtRoute('/')
    expect(screen.getByText('Discovery App')).toBeInTheDocument()
  })

  it('shows client name in breadcrumb on /:clientId route', () => {
    vi.mocked(useClient).mockReturnValue({
      data: { id: 'uuid-1', name: 'Acme Corp' },
    } as ReturnType<typeof useClient>)
    renderTopBarAtRoute('/uuid-1')
    expect(screen.getByText('All Projects')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('falls back to "Unknown Client" when client data is not yet loaded', () => {
    renderTopBarAtRoute('/uuid-1')
    expect(screen.getByText('Unknown Client')).toBeInTheDocument()
  })

  it('shows client and project names in full breadcrumb', () => {
    vi.mocked(useClient).mockReturnValue({
      data: { id: 'uuid-1', name: 'Acme Corp' },
    } as ReturnType<typeof useClient>)
    vi.mocked(useProject).mockReturnValue({
      data: { id: 'uuid-2', name: 'Sprint 1 Discovery' },
    } as ReturnType<typeof useProject>)
    renderTopBarAtRoute('/uuid-1/uuid-2')
    expect(screen.getByText('All Projects')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Sprint 1 Discovery')).toBeInTheDocument()
  })

  it('falls back to "Unknown Project" when project data is not yet loaded', () => {
    vi.mocked(useClient).mockReturnValue({
      data: { id: 'uuid-1', name: 'Acme Corp' },
    } as ReturnType<typeof useClient>)
    renderTopBarAtRoute('/uuid-1/uuid-2')
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Unknown Project')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    renderTopBarAtRoute('/')
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })

  it('has zero axe violations on root route', async () => {
    const { container } = renderTopBarAtRoute('/')
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has zero axe violations on client route', async () => {
    vi.mocked(useClient).mockReturnValue({
      data: { id: 'uuid-1', name: 'Acme Corp' },
    } as ReturnType<typeof useClient>)
    const { container } = renderTopBarAtRoute('/uuid-1')
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
