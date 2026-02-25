import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { ProjectForm } from '@/components/app/projects/ProjectForm'
import { renderWithProviders } from '@/tests/utils'
import type { ProjectResponse } from '@/types/api'

// Mock shadcn Select with a native <select> so jsdom can interact with it
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: {
    children: React.ReactNode
    value?: string
    onValueChange?: (v: string) => void
  }) => (
    <select
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
      data-testid="objective-select"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <div id={id}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

vi.mock('@/api/projects', () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
  deleteProject: vi.fn(),
  getProject: vi.fn(),
}))

import * as projectsApi from '@/api/projects'

const existingProject: ProjectResponse = {
  id: 'proj-1',
  client_id: 'client-1',
  name: 'Sprint 1 Discovery',
  objective: 'problem-validation',
  target_segments: ['SaaS founders', 'Mid-market CTOs'],
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

describe('ProjectForm — create mode', () => {
  it('renders with title "New Project" and empty name field', () => {
    renderWithProviders(
      <ProjectForm open={true} onOpenChange={vi.fn()} clientId="client-1" />
    )
    expect(screen.getByRole('heading', { name: /new project/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toHaveValue('')
  })

  it('shows inline error when name is empty on submit', async () => {
    renderWithProviders(
      <ProjectForm open={true} onOpenChange={vi.fn()} clientId="client-1" />
    )
    fireEvent.click(screen.getByRole('button', { name: /create project/i }))
    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) on successful create', async () => {
    vi.mocked(projectsApi.createProject).mockResolvedValue(existingProject)
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])

    const onOpenChange = vi.fn()
    renderWithProviders(
      <ProjectForm open={true} onOpenChange={onOpenChange} clientId="client-1" />
    )

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Sprint 1 Discovery' },
    })
    fireEvent.change(screen.getByTestId('objective-select'), {
      target: { value: 'problem-validation' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows inline error on 409 duplicate name', async () => {
    vi.mocked(projectsApi.createProject).mockRejectedValue(
      new Error('A project with that name already exists for this client')
    )
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])

    renderWithProviders(
      <ProjectForm open={true} onOpenChange={vi.fn()} clientId="client-1" />
    )

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Sprint 1 Discovery' },
    })
    fireEvent.change(screen.getByTestId('objective-select'), {
      target: { value: 'problem-validation' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(
      screen.getByText('A project with that name already exists for this client')
    ).toBeInTheDocument()
  })

  it('has zero axe violations', async () => {
    const { container } = renderWithProviders(
      <ProjectForm open={true} onOpenChange={vi.fn()} clientId="client-1" />
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe('ProjectForm — edit mode', () => {
  it('renders with title "Edit Project" and pre-filled name and objective', () => {
    renderWithProviders(
      <ProjectForm
        open={true}
        onOpenChange={vi.fn()}
        clientId="client-1"
        project={existingProject}
      />
    )
    expect(screen.getByRole('heading', { name: /edit project/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toHaveValue('Sprint 1 Discovery')
    expect(screen.getByTestId('objective-select')).toHaveValue('problem-validation')
  })

  it('calls onOpenChange(false) on successful update', async () => {
    vi.mocked(projectsApi.updateProject).mockResolvedValue({
      ...existingProject,
      name: 'Sprint 1 Discovery Updated',
    })
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])

    const onOpenChange = vi.fn()
    renderWithProviders(
      <ProjectForm
        open={true}
        onOpenChange={onOpenChange}
        clientId="client-1"
        project={existingProject}
      />
    )

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Sprint 1 Discovery Updated' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('has zero axe violations', async () => {
    const { container } = renderWithProviders(
      <ProjectForm
        open={true}
        onOpenChange={vi.fn()}
        clientId="client-1"
        project={existingProject}
      />
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
