import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { PositioningSection } from '@/components/app/analysis/PositioningSection'
import { renderWithProviders } from '@/tests/utils'
import type { PositioningResultResponse } from '@/types/api'

const positioning: PositioningResultResponse = {
  value_drivers: [
    { text: 'Speed and reliability', frequency_count: 5 },
    { text: 'Ease of use', frequency_count: 2 },
  ],
  alternative_angles: ['B2B efficiency', 'B2C convenience'],
  recommended_interviews: ['Product managers', 'Power users'],
  confidence_score: 0.82,
}

describe('PositioningSection', () => {
  it('renders value drivers with frequency count', () => {
    renderWithProviders(<PositioningSection positioning={positioning} />)
    expect(screen.getByText('Speed and reliability')).toBeInTheDocument()
    expect(screen.getByText('5 sources')).toBeInTheDocument()
    expect(screen.getByText('Ease of use')).toBeInTheDocument()
    expect(screen.getByText('2 sources')).toBeInTheDocument()
  })

  it('renders alternative angles and recommended interviews', () => {
    renderWithProviders(<PositioningSection positioning={positioning} />)
    expect(screen.getByText('Alternative angles')).toBeInTheDocument()
    expect(screen.getByText('B2B efficiency')).toBeInTheDocument()
    expect(screen.getByText('Recommended interviews')).toBeInTheDocument()
    expect(screen.getByText('Product managers')).toBeInTheDocument()
  })

  it('shows empty state when all lists are empty', () => {
    const empty: PositioningResultResponse = {
      value_drivers: [],
      alternative_angles: [],
      recommended_interviews: [],
      confidence_score: null,
    }
    renderWithProviders(<PositioningSection positioning={empty} />)
    expect(screen.getByText('No positioning insights.')).toBeInTheDocument()
  })

  it('has zero axe violations', async () => {
    const { container } = renderWithProviders(<PositioningSection positioning={positioning} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
