import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import { TooltipProvider } from '@/components/ui/tooltip'
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
    <TooltipProvider delayDuration={0}>
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
    </TooltipProvider>
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

  it('has zero axe violations on project route', async () => {
    vi.mocked(useClient).mockReturnValue({
      data: { id: 'cid', name: 'Acme Corp' },
    } as ReturnType<typeof useClient>)
    vi.mocked(useProject).mockReturnValue({
      data: { id: 'pid', name: 'Sprint 1' },
    } as ReturnType<typeof useProject>)
    const { container } = renderTopBarAtRoute('/cid/pid')
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('"All Projects" breadcrumb link points to /', () => {
    vi.mocked(useClient).mockReturnValue({
      data: { id: 'c1', name: 'Client' },
    } as ReturnType<typeof useClient>)
    renderTopBarAtRoute('/c1')
    const link = screen.getByRole('link', { name: 'All Projects' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('client name breadcrumb link on project page points to client route', () => {
    vi.mocked(useClient).mockReturnValue({
      data: { id: 'c1', name: 'Acme Corp' },
    } as ReturnType<typeof useClient>)
    vi.mocked(useProject).mockReturnValue({
      data: { id: 'p1', name: 'Proj' },
    } as ReturnType<typeof useProject>)
    renderTopBarAtRoute('/c1/p1')
    const link = screen.getByRole('link', { name: 'Acme Corp' })
    expect(link).toHaveAttribute('href', '/c1')
  })

  it('does not display raw UUID in breadcrumb when names are missing', () => {
    renderTopBarAtRoute('/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(screen.getByText('Unknown Client')).toBeInTheDocument()
    expect(screen.queryByText(/a1b2c3d4-e5f6-7890-abcd-ef1234567890/)).not.toBeInTheDocument()
  })

  it('does not display raw UUIDs in breadcrumb on project route when names are missing', () => {
    const clientUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const projectUuid = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    renderTopBarAtRoute(`/${clientUuid}/${projectUuid}`)
    expect(screen.getByText('Unknown Client')).toBeInTheDocument()
    expect(screen.getByText('Unknown Project')).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(clientUuid))).not.toBeInTheDocument()
    expect(screen.queryByText(new RegExp(projectUuid))).not.toBeInTheDocument()
  })

  it('shows "Open menu" tooltip when hovering hamburger button', async () => {
    const user = userEvent.setup()
    renderTopBarAtRoute('/')
    const menuButton = screen.getByRole('button', { name: 'Open navigation' })
    await user.hover(menuButton)
    await waitFor(() => {
      expect(screen.getByRole('tooltip', { name: 'Open menu' })).toBeInTheDocument()
    })
  })
})
