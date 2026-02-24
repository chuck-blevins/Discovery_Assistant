import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ConfidenceIndicator,
  getConfidenceColor,
  CONFIDENCE_COLORS,
} from '@/components/app/projects/ConfidenceIndicator'

describe('getConfidenceColor (pure function)', () => {
  it('returns zinc-400 for null score', () => {
    expect(getConfidenceColor(null)).toBe(CONFIDENCE_COLORS.none)
    expect(getConfidenceColor(null)).toBe('#a1a1aa')
  })

  it('returns red-500 for score < 0.50', () => {
    expect(getConfidenceColor(0.3)).toBe(CONFIDENCE_COLORS.red)
    expect(getConfidenceColor(0.3)).toBe('#ef4444')
    expect(getConfidenceColor(0.0)).toBe('#ef4444')
    expect(getConfidenceColor(0.49)).toBe('#ef4444')
  })

  it('returns amber-500 for score 0.50–0.74', () => {
    expect(getConfidenceColor(0.6)).toBe(CONFIDENCE_COLORS.amber)
    expect(getConfidenceColor(0.6)).toBe('#f59e0b')
    expect(getConfidenceColor(0.5)).toBe('#f59e0b')
    expect(getConfidenceColor(0.74)).toBe('#f59e0b')
  })

  it('returns emerald-500 for score >= 0.75', () => {
    expect(getConfidenceColor(0.8)).toBe(CONFIDENCE_COLORS.green)
    expect(getConfidenceColor(0.8)).toBe('#10b981')
    expect(getConfidenceColor(0.75)).toBe('#10b981')
    expect(getConfidenceColor(1.0)).toBe('#10b981')
  })
})

describe('ConfidenceIndicator component', () => {
  it('renders with aria-label "Not yet analyzed" for null score', () => {
    render(<ConfidenceIndicator score={null} />)
    expect(screen.getByRole('img', { name: 'Not yet analyzed' })).toBeInTheDocument()
  })

  it('renders with percentage aria-label for non-null score', () => {
    render(<ConfidenceIndicator score={0.73} />)
    expect(screen.getByRole('img', { name: '73% confidence' })).toBeInTheDocument()
  })

  it('applies zinc-400 background color for null score', () => {
    render(<ConfidenceIndicator score={null} />)
    const el = screen.getByRole('img')
    expect(el).toHaveStyle({ backgroundColor: '#a1a1aa' })
  })

  it('applies red-500 background color for score < 0.50', () => {
    render(<ConfidenceIndicator score={0.3} />)
    const el = screen.getByRole('img')
    expect(el).toHaveStyle({ backgroundColor: '#ef4444' })
  })

  it('applies amber-500 background color for score 0.50–0.74', () => {
    render(<ConfidenceIndicator score={0.6} />)
    const el = screen.getByRole('img')
    expect(el).toHaveStyle({ backgroundColor: '#f59e0b' })
  })

  it('applies emerald-500 background color for score >= 0.75', () => {
    render(<ConfidenceIndicator score={0.8} />)
    const el = screen.getByRole('img')
    expect(el).toHaveStyle({ backgroundColor: '#10b981' })
  })
})
