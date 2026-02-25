import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { InsightsList } from '@/components/app/analysis/InsightsList'
import { renderWithProviders } from '@/tests/utils'
import type { InsightResponse } from '@/types/api'

const findings: InsightResponse[] = [
  {
    id: 'ins-1',
    type: 'finding',
    text: 'Problem confirmed in 4 of 5 sources.',
    citation: 'interview-001.txt:line 42',
    confidence: 0.85,
    source_count: 4,
  },
]

const contradictions: InsightResponse[] = [
  {
    id: 'ins-2',
    type: 'contradiction',
    text: 'One source suggests the problem is not urgent.',
    citation: 'notes.md:line 15',
    confidence: 0.4,
    source_count: 1,
  },
]

const gaps: InsightResponse[] = [
  {
    id: 'ins-3',
    type: 'gap',
    text: 'Decision drivers not yet understood.',
    citation: null,
    confidence: null,
    source_count: 0,
  },
]

describe('InsightsList', () => {
  it('renders Findings section when there are findings', () => {
    renderWithProviders(<InsightsList insights={findings} />)
    expect(screen.getByRole('heading', { name: 'Findings' })).toBeInTheDocument()
    expect(screen.getByText('Problem confirmed in 4 of 5 sources.')).toBeInTheDocument()
    expect(screen.getByText('interview-001.txt:line 42')).toBeInTheDocument()
  })

  it('renders Contradictions and Data gaps sections', () => {
    renderWithProviders(<InsightsList insights={[...findings, ...contradictions, ...gaps]} />)
    expect(screen.getByRole('heading', { name: 'Contradictions' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Data gaps' })).toBeInTheDocument()
    expect(screen.getByText('One source suggests the problem is not urgent.')).toBeInTheDocument()
    expect(screen.getByText('Decision drivers not yet understood.')).toBeInTheDocument()
  })

  it('renders nothing when insights is empty', () => {
    const { container } = renderWithProviders(<InsightsList insights={[]} />)
    expect(container.querySelector('section')).not.toBeInTheDocument()
  })

  it('has zero axe violations', async () => {
    const { container } = renderWithProviders(
      <InsightsList insights={[...findings, ...contradictions]} />
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
