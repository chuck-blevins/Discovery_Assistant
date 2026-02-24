import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { ProjectTable } from '@/components/app/projects/ProjectTable'
import { useProjectFormStore } from '@/stores/useProjectFormStore'
import type { ProjectResponse } from '@/types/api'

vi.mock('@/api/projects', () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
  deleteProject: vi.fn(),
  getProject: vi.fn(),
}))

import * as projectsApi from '@/api/projects'

const activeProject: ProjectResponse = {
  id: 'proj-1',
  client_id: 'client-1',
  name: 'Sprint 1 Discovery',
  objective: 'problem-validation',
  target_segments: ['SaaS founders'],
  status: 'active',
  confidence_score: null,
  last_analyzed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  archived_at: null,
}

const archivedProject: ProjectResponse = {
  ...activeProject,
  id: 'proj-2',
  name: 'Old Project',
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
  useProjectFormStore.setState({ open: false, project: null })
})

describe('ProjectTable', () => {
  it('shows skeleton rows while loading', () => {
    vi.mocked(projectsApi.listProjects).mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(<ProjectTable clientId="client-1" />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state when no projects', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])
    renderWithProviders(<ProjectTable clientId="client-1" />)
    await waitFor(() => {
      expect(screen.getByText('No projects yet.')).toBeInTheDocument()
    })
    expect(screen.getAllByRole('button', { name: /new project/i }).length).toBeGreaterThan(0)
  })

  it('renders project names and objective badges', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([activeProject])
    renderWithProviders(<ProjectTable clientId="client-1" />)
    // Both desktop table and mobile cards render; use getAllByText
    await waitFor(() => {
      expect(screen.getAllByText('Sprint 1 Discovery').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('Problem Validation').length).toBeGreaterThan(0)
  })

  it('shows error message on API failure', async () => {
    vi.mocked(projectsApi.listProjects).mockRejectedValue(new Error('Network error'))
    renderWithProviders(<ProjectTable clientId="client-1" />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/Failed to load projects/)).toBeInTheDocument()
  })

  it('re-queries with includeArchived when checkbox toggled', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([activeProject])
    renderWithProviders(<ProjectTable clientId="client-1" />)
    await waitFor(() => {
      expect(screen.getAllByText('Sprint 1 Discovery').length).toBeGreaterThan(0)
    })

    vi.mocked(projectsApi.listProjects).mockResolvedValue([activeProject, archivedProject])
    fireEvent.click(screen.getByLabelText(/show archived/i))

    await waitFor(() => {
      expect(projectsApi.listProjects).toHaveBeenCalledWith('client-1', true)
    })
  })

  it('has zero axe violations with populated list', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([activeProject])
    const { container } = renderWithProviders(<ProjectTable clientId="client-1" />)
    await waitFor(() => {
      expect(screen.getAllByText('Sprint 1 Discovery').length).toBeGreaterThan(0)
    })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has zero axe violations on empty state', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])
    const { container } = renderWithProviders(<ProjectTable clientId="client-1" />)
    await waitFor(() => {
      expect(screen.getByText('No projects yet.')).toBeInTheDocument()
    })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
