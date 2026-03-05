import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
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
vi.mock('@/hooks/useIcp', () => ({
  useIcp: vi.fn(),
}))

import { useProject } from '@/hooks/useProjects'
import { useDataSources } from '@/hooks/useDataSources'
import { useAnalyses, useAnalysis, useRunAnalysisStream } from '@/hooks/useAnalyses'
import { useIcp } from '@/hooks/useIcp'
import type { IcpResponse } from '@/types/api'

const mockIcp: IcpResponse = {
  id: 'icp-1',
  project_id: 'proj-1',
  confidence_score: 0.8,
  company_size: 'SMB (10–200 employees)',
  industries: 'SaaS, B2B Tech',
  geography: 'North America',
  revenue: '$1M–$10M ARR',
  tech_stack: null,
  use_case_fit: null,
  buying_process: null,
  budget: null,
  maturity: null,
  custom: null,
  dimension_confidence: null,
  last_analyzed_at: '2026-03-05T10:00:00Z',
  created_at: '2026-03-05T10:00:00Z',
  updated_at: '2026-03-05T10:00:00Z',
}

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
  // jsdom doesn't implement scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = vi.fn()

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
  vi.mocked(useIcp).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useIcp>)
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

  it('shows Analysis Summary and ICP Summary tabs when a previous analysis is selected', async () => {
    const pastAnalysis = {
      id: 'analysis-past',
      project_id: 'proj-1',
      objective: 'problem-validation',
      confidence_score: 0.7,
      tokens_used: 1000,
      cost_usd: 0.01,
      insights: [],
      created_at: '2026-03-05T09:00:00Z',
    }
    vi.mocked(useAnalyses).mockReturnValue({
      data: [pastAnalysis],
    } as unknown as ReturnType<typeof useAnalyses>)
    vi.mocked(useAnalysis).mockReturnValue({
      data: { ...pastAnalysis, recommendations: null, positioning_result: null },
    } as unknown as ReturnType<typeof useAnalysis>)
    vi.mocked(useIcp).mockReturnValue({
      data: mockIcp,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIcp>)

    renderAnalysisPage()

    // Click on the previous analysis to enter result state
    const analysisLink = await screen.findByRole('button', { name: /2026/ })
    fireEvent.click(analysisLink)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /analysis summary/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('tab', { name: /icp summary/i })).toBeInTheDocument()
  })

  it('ICP tab panel contains ICP card content when ICP data exists', async () => {
    const pastAnalysis = {
      id: 'analysis-past',
      project_id: 'proj-1',
      objective: 'problem-validation',
      confidence_score: 0.7,
      tokens_used: 0,
      cost_usd: 0,
      insights: [],
      created_at: '2026-03-05T09:00:00Z',
    }
    vi.mocked(useAnalyses).mockReturnValue({
      data: [pastAnalysis],
    } as unknown as ReturnType<typeof useAnalyses>)
    vi.mocked(useAnalysis).mockReturnValue({
      data: { ...pastAnalysis, recommendations: null, positioning_result: null },
    } as unknown as ReturnType<typeof useAnalysis>)
    vi.mocked(useIcp).mockReturnValue({
      data: mockIcp,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useIcp>)

    renderAnalysisPage()

    const analysisLink = await screen.findByRole('button', { name: /2026/ })
    fireEvent.click(analysisLink)

    // ICP tab panel is in the DOM (aria-hidden when inactive)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /icp summary/i })).toBeInTheDocument()
    })

    // ICP content is in the tabpanel DOM even when tab is inactive (aria-hidden)
    expect(screen.queryByText(/ideal customer profile/i, { hidden: true })).toBeInTheDocument()
    expect(screen.queryByText(/updated/i, { hidden: true })).toBeInTheDocument()
  })
})
