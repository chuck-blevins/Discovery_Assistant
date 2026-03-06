import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { ArtifactsSection } from '@/components/app/analysis/ArtifactsSection'
import { renderWithProviders } from '@/tests/utils'

vi.mock('@/api/analyses', () => ({
  listArtifacts: vi.fn(),
  generateArtifacts: vi.fn(),
  downloadArtifact: vi.fn(),
}))

import * as analysesApi from '@/api/analyses'
import type { ArtifactSummaryResponse } from '@/api/analyses'

function makeArtifact(overrides: Partial<ArtifactSummaryResponse>): ArtifactSummaryResponse {
  return {
    id: 'art-1',
    artifact_type: 'interview_script',
    file_name: 'interview-script.md',
    generated_at: '2026-03-05T10:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ArtifactsSection', () => {
  it('shows generate prompt when no artifacts exist', async () => {
    vi.mocked(analysesApi.listArtifacts).mockResolvedValue([])
    renderWithProviders(<ArtifactsSection analysisId="analysis-1" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate artifacts/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/interview script/i)).toBeInTheDocument()
    expect(screen.queryByText(/icp/i)).not.toBeInTheDocument()
  })

  it('does not render icp_summary artifact in the list', async () => {
    vi.mocked(analysesApi.listArtifacts).mockResolvedValue([
      makeArtifact({ id: 'art-1', artifact_type: 'interview_script' }),
      makeArtifact({ id: 'art-2', artifact_type: 'icp_summary', file_name: 'icp-summary.md' }),
    ])
    renderWithProviders(<ArtifactsSection analysisId="analysis-1" />)
    await waitFor(() => {
      expect(screen.getByText(/interview script/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/icp summary/i)).not.toBeInTheDocument()
  })

  it('shows generate prompt when only icp_summary artifacts exist', async () => {
    vi.mocked(analysesApi.listArtifacts).mockResolvedValue([
      makeArtifact({ id: 'art-1', artifact_type: 'icp_summary' }),
    ])
    renderWithProviders(<ArtifactsSection analysisId="analysis-1" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate artifacts/i })).toBeInTheDocument()
    })
  })

  it('shows artifact list and generate-again button when non-icp artifacts exist', async () => {
    vi.mocked(analysesApi.listArtifacts).mockResolvedValue([
      makeArtifact({ id: 'art-1', artifact_type: 'interview_script' }),
      makeArtifact({ id: 'art-2', artifact_type: 'icp_summary' }),
    ])
    renderWithProviders(<ArtifactsSection analysisId="analysis-1" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate again/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/interview script/i)).toBeInTheDocument()
    expect(screen.queryByText(/icp summary/i)).not.toBeInTheDocument()
  })

  it('shows error on generate failure', async () => {
    vi.mocked(analysesApi.listArtifacts).mockResolvedValue([])
    vi.mocked(analysesApi.generateArtifacts).mockRejectedValue(new Error('Server error'))
    renderWithProviders(<ArtifactsSection analysisId="analysis-1" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate artifacts/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /generate artifacts/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
