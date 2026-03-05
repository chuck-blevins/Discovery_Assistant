import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils'
import { ProjectActions } from '@/components/app/projects/ProjectActions'
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
  target_segments: [],
  status: 'active',
  confidence_score: null,
  last_analyzed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  archived_at: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProjectActions', () => {
  it('renders all action buttons for an active project', () => {
    renderWithProviders(
      <ProjectActions project={activeProject} clientId="client-1" onEdit={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /upload data/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /archive project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete project/i })).toBeInTheDocument()
  })

  it('calls onEdit when Edit project button is clicked', () => {
    const onEdit = vi.fn()
    renderWithProviders(
      <ProjectActions project={activeProject} clientId="client-1" onEdit={onEdit} />
    )
    fireEvent.click(screen.getByRole('button', { name: /edit project/i }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('shows "Unarchive project" button for archived projects', () => {
    const archived = { ...activeProject, status: 'archived' as const, archived_at: '2026-02-01T00:00:00Z' }
    renderWithProviders(
      <ProjectActions project={archived} clientId="client-1" onEdit={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /unarchive project/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^archive project/i })).not.toBeInTheDocument()
  })

  it('shows "Upload data" tooltip on hover', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ProjectActions project={activeProject} clientId="client-1" onEdit={vi.fn()} />
    )
    const uploadBtn = screen.getByRole('button', { name: /upload data/i })
    await user.hover(uploadBtn)
    await waitFor(() => {
      expect(screen.getByRole('tooltip', { name: /upload data/i })).toBeInTheDocument()
    })
  })

  it('shows "Edit project" tooltip on hover', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ProjectActions project={activeProject} clientId="client-1" onEdit={vi.fn()} />
    )
    const editBtn = screen.getByRole('button', { name: /edit project/i })
    await user.hover(editBtn)
    await waitFor(() => {
      expect(screen.getByRole('tooltip', { name: /edit project/i })).toBeInTheDocument()
    })
  })

  it('opens archive confirmation dialog when Archive project is clicked', async () => {
    vi.mocked(projectsApi.archiveProject).mockResolvedValue({
      ...activeProject,
      status: 'archived',
      archived_at: '2026-02-01T00:00:00Z',
    })
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])
    renderWithProviders(
      <ProjectActions project={activeProject} clientId="client-1" onEdit={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: /archive project/i }))
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
    expect(screen.getByText(/Archive.*Sprint 1 Discovery/)).toBeInTheDocument()
  })

  it('opens delete confirmation dialog when Delete project is clicked', async () => {
    renderWithProviders(
      <ProjectActions project={activeProject} clientId="client-1" onEdit={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: /delete project/i }))
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
    expect(screen.getByText(/Delete.*Sprint 1 Discovery/)).toBeInTheDocument()
  })
})
