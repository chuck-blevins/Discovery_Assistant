import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ClientSidebar } from '@/components/app/layout/ClientSidebar'
import { useSidebarStore } from '@/stores/useSidebarStore'

function renderSidebar() {
  return render(
    <TooltipProvider>
      <ClientSidebar />
    </TooltipProvider>
  )
}

describe('ClientSidebar', () => {
  beforeEach(() => {
    useSidebarStore.setState({ collapsed: false })
  })

  it('renders nav landmark with aria-label', () => {
    const { getByRole } = renderSidebar()
    expect(getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
  })

  it('shows text labels when expanded', () => {
    useSidebarStore.setState({ collapsed: false })
    const { getByText } = renderSidebar()
    expect(getByText('Discovery')).toBeInTheDocument()
    expect(getByText('All Clients')).toBeInTheDocument()
  })

  it('hides wordmark text when collapsed', () => {
    useSidebarStore.setState({ collapsed: true })
    const { queryByText } = renderSidebar()
    expect(queryByText('Discovery')).not.toBeInTheDocument()
  })

  it('collapse toggle button has aria-label', () => {
    const { getByLabelText } = renderSidebar()
    expect(getByLabelText('Collapse sidebar')).toBeInTheDocument()
  })

  it('shows expand label when collapsed', () => {
    useSidebarStore.setState({ collapsed: true })
    const { getByLabelText } = renderSidebar()
    expect(getByLabelText('Expand sidebar')).toBeInTheDocument()
  })

  it('has zero axe violations when expanded', async () => {
    useSidebarStore.setState({ collapsed: false })
    const { container } = renderSidebar()
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has zero axe violations when collapsed', async () => {
    useSidebarStore.setState({ collapsed: true })
    const { container } = renderSidebar()
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
