import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { PasteDataSourceForm } from '@/components/app/data-sources/PasteDataSourceForm'
import { renderWithProviders } from '@/tests/utils'

vi.mock('@/api/dataSources', () => ({
  listDataSources: vi.fn(),
  deleteDataSource: vi.fn(),
  uploadFiles: vi.fn(),
  pasteDataSource: vi.fn(),
  getDataSourcePreview: vi.fn(),
}))

import * as dataSourcesApi from '@/api/dataSources'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PasteDataSourceForm', () => {
  it('renders the text content textarea', () => {
    renderWithProviders(<PasteDataSourceForm projectId="proj-1" />)
    expect(screen.getByLabelText(/text content/i)).toBeInTheDocument()
  })

  it('renders all metadata fields', () => {
    renderWithProviders(<PasteDataSourceForm projectId="proj-1" />)
    expect(screen.getByLabelText(/name \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/collected date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/creator/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/purpose/i)).toBeInTheDocument()
  })

  it('submit button is disabled when text is empty', () => {
    renderWithProviders(<PasteDataSourceForm projectId="proj-1" />)
    const btn = screen.getByRole('button', { name: /save text/i })
    expect(btn).toBeDisabled()
  })

  it('enables submit button when text is entered', async () => {
    renderWithProviders(<PasteDataSourceForm projectId="proj-1" />)
    fireEvent.change(screen.getByLabelText(/text content/i), {
      target: { value: 'Interview notes from customer call.' },
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save text/i })).not.toBeDisabled()
    })
  })

  it('calls pasteDataSource with correct payload on submit', async () => {
    vi.mocked(dataSourcesApi.pasteDataSource).mockResolvedValue([])
    renderWithProviders(<PasteDataSourceForm projectId="proj-1" />)
    fireEvent.change(screen.getByLabelText(/text content/i), {
      target: { value: 'Some research text' },
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save text/i })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /save text/i }))
    await waitFor(() => {
      expect(dataSourcesApi.pasteDataSource).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({ raw_text: 'Some research text' })
      )
    })
  })

  it('has zero axe violations', async () => {
    const { container } = renderWithProviders(<PasteDataSourceForm projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByLabelText(/text content/i)).toBeInTheDocument()
    })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
