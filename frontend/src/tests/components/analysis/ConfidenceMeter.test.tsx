import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { ConfidenceMeter } from '@/components/app/analysis/ConfidenceMeter'
import { renderWithProviders } from '@/tests/utils'

describe('ConfidenceMeter', () => {
  it('renders 0% and "Needs more data" when score is low', () => {
    renderWithProviders(<ConfidenceMeter score={0.3} />)
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByText('Needs more data')).toBeInTheDocument()
  })

  it('renders "Emerging" when score is 50–74%', () => {
    renderWithProviders(<ConfidenceMeter score={0.65} />)
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('Emerging')).toBeInTheDocument()
  })

  it('renders "Problem validated" when score is ≥75%', () => {
    renderWithProviders(<ConfidenceMeter score={0.85} />)
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('Problem validated')).toBeInTheDocument()
  })

  it('renders "Not yet analyzed" when score is null', () => {
    renderWithProviders(<ConfidenceMeter score={null} />)
    expect(screen.getByText('Not yet analyzed')).toBeInTheDocument()
  })

  it('has accessible progress bar when showBar is true', () => {
    renderWithProviders(<ConfidenceMeter score={0.8} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '80')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('has zero axe violations', async () => {
    const { container } = renderWithProviders(<ConfidenceMeter score={0.7} />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
