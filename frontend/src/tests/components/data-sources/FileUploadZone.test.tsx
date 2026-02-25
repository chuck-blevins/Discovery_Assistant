import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { FileUploadZone } from '@/components/app/data-sources/FileUploadZone'
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

describe('FileUploadZone', () => {
  it('renders the file drop zone with correct accept attribute', () => {
    const { container } = renderWithProviders(<FileUploadZone projectId="proj-1" />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input?.accept).toBe('.pdf,.csv,.txt,.md')
  })

  it('renders drag and drop zone', () => {
    renderWithProviders(<FileUploadZone projectId="proj-1" />)
    expect(screen.getByRole('region', { name: /file drop zone/i })).toBeInTheDocument()
  })

  it('shows max file size indicator', () => {
    renderWithProviders(<FileUploadZone projectId="proj-1" />)
    expect(screen.getByText(/max 10 MB/i)).toBeInTheDocument()
  })

  it('renders all metadata fields', () => {
    renderWithProviders(<FileUploadZone projectId="proj-1" />)
    expect(screen.getByLabelText(/collected date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/creator/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/purpose/i)).toBeInTheDocument()
  })

  it('renders upload button (disabled when no files selected)', () => {
    renderWithProviders(<FileUploadZone projectId="proj-1" />)
    const btn = screen.getByRole('button', { name: /upload/i })
    expect(btn).toBeDisabled()
  })

  it('shows error for unsupported file type on drag-and-drop', async () => {
    renderWithProviders(<FileUploadZone projectId="proj-1" />)
    const zone = screen.getByRole('region', { name: /file drop zone/i })
    const badFile = new File(['content'], 'report.xlsx', { type: 'application/vnd.ms-excel' })
    fireEvent.drop(zone, { dataTransfer: { files: [badFile] } })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/not a supported file type/i)).toBeInTheDocument()
  })

  it('shows error when file exceeds 10 MB', async () => {
    renderWithProviders(<FileUploadZone projectId="proj-1" />)
    const zone = screen.getByRole('region', { name: /file drop zone/i })
    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'huge.pdf', {
      type: 'application/pdf',
    })
    fireEvent.drop(zone, { dataTransfer: { files: [bigFile] } })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/exceeds the 10 MB/i)).toBeInTheDocument()
  })

  it('calls uploadFiles when valid file submitted', async () => {
    vi.mocked(dataSourcesApi.uploadFiles).mockResolvedValue([])
    const { container } = renderWithProviders(<FileUploadZone projectId="proj-1" />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'interview.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload/i })).not.toBeDisabled()
    })
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => {
      expect(dataSourcesApi.uploadFiles).toHaveBeenCalledWith(
        'proj-1',
        [file],
        expect.any(Object)
      )
    })
  })

  it('has zero axe violations', async () => {
    const { container } = renderWithProviders(<FileUploadZone projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /file drop zone/i })).toBeInTheDocument()
    })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
