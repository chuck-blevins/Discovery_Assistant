import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { TopBar } from '@/components/app/layout/TopBar'

function renderTopBarAtRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<TopBar />} />
        <Route path="/:clientId" element={<TopBar />} />
        <Route path="/:clientId/:projectId" element={<TopBar />} />
        <Route path="/:clientId/:projectId/analyze" element={<TopBar />} />
        <Route path="*" element={<TopBar />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TopBar', () => {
  it('shows "Discovery App" title on root route', () => {
    const { getByText } = renderTopBarAtRoute('/')
    expect(getByText('Discovery App')).toBeInTheDocument()
  })

  it('renders breadcrumb on /:clientId route', () => {
    const { getByText } = renderTopBarAtRoute('/acme-corp')
    expect(getByText('All Projects')).toBeInTheDocument()
    expect(getByText('acme-corp')).toBeInTheDocument()
  })

  it('renders full breadcrumb on /:clientId/:projectId route', () => {
    const { getByText } = renderTopBarAtRoute('/acme-corp/project-alpha')
    expect(getByText('All Projects')).toBeInTheDocument()
    expect(getByText('acme-corp')).toBeInTheDocument()
    expect(getByText('project-alpha')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    const { getByRole } = renderTopBarAtRoute('/')
    expect(getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })

  it('has zero axe violations on root route', async () => {
    const { container } = renderTopBarAtRoute('/')
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has zero axe violations on client route', async () => {
    const { container } = renderTopBarAtRoute('/acme-corp')
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
