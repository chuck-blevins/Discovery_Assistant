import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppLayout } from '@/components/app/layout/AppLayout'

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <TooltipProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </TooltipProvider>
  )
}

describe('AppLayout', () => {
  it('renders the main navigation landmark', () => {
    const { getByRole } = renderWithRouter(
      <AppLayout>
        <p>content</p>
      </AppLayout>
    )
    expect(getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
  })

  it('renders a <main> landmark with id="main-content"', () => {
    const { getByRole } = renderWithRouter(
      <AppLayout>
        <p>content</p>
      </AppLayout>
    )
    const main = getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main).toHaveAttribute('id', 'main-content')
  })

  it('renders a skip link to #main-content', () => {
    const { getByText } = renderWithRouter(
      <AppLayout>
        <p>content</p>
      </AppLayout>
    )
    const skipLink = getByText('Skip to main content')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('renders children inside main', () => {
    const { getByText } = renderWithRouter(
      <AppLayout>
        <p>Hello World</p>
      </AppLayout>
    )
    expect(getByText('Hello World')).toBeInTheDocument()
  })

  it('has zero axe accessibility violations', async () => {
    const { container } = renderWithRouter(
      <AppLayout>
        <p>content</p>
      </AppLayout>
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
