import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import AnalysisPage from '@/pages/AnalysisPage'
import type { ProjectResponse } from '@/types/api'

vi.mock('@/hooks/useProjects', () => ({
  useProject: vi.fn(),
}))
vi.mock('@/hooks/useDataSources', () => ({
  useDataSources: vi.fn(),
}))
vi.mock('@/hooks/useAnalyses', () => ({
  useAnalyses: vi.fn(),
  useAnalysis: vi.fn(),
  useRunAnalysisStream: vi.fn(),
}))

import { useProject } from '@/hooks/useProjects'
import { useDataSources } from '@/hooks/useDataSources'
import { useAnalyses, useAnalysis, useRunAnalysisStream } from '@/hooks/useAnalyses'

const project: ProjectResponse = {
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

function renderAnalysisPage(route = '/client-1/proj-1/analyze') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/:clientId/:projectId/analyze" element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(useProject).mockReturnValue({
    data: project,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useProject>)
  vi.mocked(useDataSources).mockReturnValue({
    data: [{ id: 'ds-1' }],
  } as ReturnType<typeof useDataSources>)
  vi.mocked(useAnalyses).mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useAnalyses>)
  vi.mocked(useAnalysis).mockReturnValue({
    data: null,
  } as unknown as ReturnType<typeof useAnalysis>)
  vi.mocked(useRunAnalysisStream).mockReturnValue({
    runStream: vi.fn(),
  } as ReturnType<typeof useRunAnalysisStream>)
})

describe('AnalysisPage', () => {
  it('shows "Add at least one data source" when no data sources', async () => {
    vi.mocked(useDataSources).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useDataSources>)
    renderAnalysisPage()
    await waitFor(() => {
      expect(screen.getByText(/Add at least one data source/)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /Back to project/ })).toBeInTheDocument()
  })

  it('shows Start analysis button when project has data sources', async () => {
    renderAnalysisPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start analysis' })).toBeInTheDocument()
    })
  })

  it('has zero axe violations in idle state', async () => {
    const { container } = renderAnalysisPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start analysis' })).toBeInTheDocument()
    })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
