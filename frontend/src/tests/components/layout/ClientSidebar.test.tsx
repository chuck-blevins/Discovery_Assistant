import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ClientSidebar } from '@/components/app/layout/ClientSidebar'
import { useSidebarStore } from '@/stores/useSidebarStore'

vi.mock('@/api/settings', () => ({
  getStripeSettings: vi.fn().mockResolvedValue({ stripe_key_is_set: false }),
  getLLMSettings: vi.fn().mockResolvedValue({ api_key_is_set: false }),
}))

function renderSidebar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TooltipProvider delayDuration={0}>
          <ClientSidebar />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
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

  it('shows "Collapse sidebar" tooltip when hovering collapse button (expanded)', async () => {
    useSidebarStore.setState({ collapsed: false })
    const user = userEvent.setup()
    renderSidebar()
    const collapseButton = screen.getByRole('button', { name: 'Collapse sidebar' })
    await user.hover(collapseButton)
    await waitFor(() => {
      expect(screen.getByRole('tooltip', { name: 'Collapse sidebar' })).toBeInTheDocument()
    })
  })

  it('shows "Expand sidebar" tooltip when hovering expand button (collapsed)', async () => {
    useSidebarStore.setState({ collapsed: true })
    const user = userEvent.setup()
    renderSidebar()
    const expandButton = screen.getByRole('button', { name: 'Expand sidebar' })
    await user.hover(expandButton)
    await waitFor(() => {
      expect(screen.getByRole('tooltip', { name: 'Expand sidebar' })).toBeInTheDocument()
    })
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
