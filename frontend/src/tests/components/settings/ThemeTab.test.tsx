import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { useTheme } from 'next-themes'
import { ThemeTab } from '@/components/app/settings/ThemeTab'
import { renderWithProviders } from '@/tests/utils'

vi.mock('next-themes', () => ({ useTheme: vi.fn() }))

describe('ThemeTab', () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
      resolvedTheme: 'light',
    } as unknown as ReturnType<typeof useTheme>)
  })

  it('renders Appearance label and theme select with Light, Dark, System options', () => {
    renderWithProviders(<ThemeTab />)
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /appearance/i })).toBeInTheDocument()
    expect(screen.getByText('System (use OS/browser preference)')).toBeInTheDocument()
    expect(screen.getByText('Choose how the app looks. System follows your device or browser setting.')).toBeInTheDocument()
  })

  it('shows resolved theme hint when theme is system', () => {
    renderWithProviders(<ThemeTab />)
    expect(screen.getByText(/Currently using: Light \(from system\)/)).toBeInTheDocument()
  })

  it('shows Dark and hides system hint when theme is dark', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      setTheme: vi.fn(),
      resolvedTheme: 'dark',
    } as unknown as ReturnType<typeof useTheme>)
    renderWithProviders(<ThemeTab />)
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.queryByText(/Currently using:/)).not.toBeInTheDocument()
  })

  it('shows Light and hides system hint when theme is light', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      resolvedTheme: 'light',
    } as unknown as ReturnType<typeof useTheme>)
    renderWithProviders(<ThemeTab />)
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.queryByText(/Currently using:/)).not.toBeInTheDocument()
  })
})
