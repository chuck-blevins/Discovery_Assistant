import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectPage from '@/pages/ProjectPage'
import type { ProjectResponse } from '@/types/api'

vi.mock('@/hooks/useProjects', () => ({
  useProject: vi.fn(),
}))
vi.mock('@/hooks/useDataSources', () => ({
  useDataSources: vi.fn(),
}))
vi.mock('@/hooks/usePersona', () => ({
  usePersona: vi.fn(),
}))
vi.mock('@/hooks/useIcp', () => ({
  useIcp: vi.fn(),
}))

vi.mock('@/components/app/data-sources/DataSourceSection', () => ({
  default: () => <div data-testid="data-source-section">Data Sources</div>,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useProject } from '@/hooks/useProjects'
import { useDataSources } from '@/hooks/useDataSources'
import { usePersona } from '@/hooks/usePersona'
import { useIcp } from '@/hooks/useIcp'

const baseProject: ProjectResponse = {
  id: 'proj-1',
  client_id: 'client-1',
  name: 'Test Project',
  objective: 'problem-validation',
  target_segments: [],
  status: 'active',
  confidence_score: null,
  last_analyzed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  archived_at: null,
}

function renderProjectPage(route = '/client-1/proj-1') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/:clientId/:projectId" element={<ProjectPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(useProject).mockReturnValue({
    data: baseProject,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useProject>)
  vi.mocked(useDataSources).mockReturnValue({
    data: [{ id: 'ds-1' }],
  } as ReturnType<typeof useDataSources>)
  vi.mocked(usePersona).mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof usePersona>)
  vi.mocked(useIcp).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useIcp>)
})

describe('ProjectPage', () => {
  it('does not show View Last Analysis button when no analyses have been run', () => {
    vi.mocked(useProject).mockReturnValue({
      data: { ...baseProject, last_analyzed_at: null },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useProject>)

    renderProjectPage()

    expect(screen.queryByRole('link', { name: /view last analysis/i })).not.toBeInTheDocument()
  })

  it('shows View Last Analysis button when at least one analysis has been completed', () => {
    vi.mocked(useProject).mockReturnValue({
      data: { ...baseProject, last_analyzed_at: '2026-03-05T10:00:00Z' },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useProject>)

    renderProjectPage()

    const links = screen.getAllByRole('link', { name: /view last analysis/i })
    expect(links.length).toBeGreaterThanOrEqual(1)
    const first = links[0]
    expect(first).toHaveAttribute('href', '/client-1/proj-1/analyze')
    expect(first.tagName).toBe('A')
  })

  it('has zero axe violations when View Last Analysis button is visible', async () => {
    vi.mocked(useProject).mockReturnValue({
      data: { ...baseProject, last_analyzed_at: '2026-03-05T10:00:00Z' },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useProject>)

    const { container } = renderProjectPage()

    expect(screen.getByRole('link', { name: /view last analysis/i })).toBeInTheDocument()
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
