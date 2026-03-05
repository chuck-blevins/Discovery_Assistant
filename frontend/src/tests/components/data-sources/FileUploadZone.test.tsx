import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { useNavigate } from 'react-router-dom'
import { FileUploadZone } from '@/components/app/data-sources/FileUploadZone'
import { renderWithProviders } from '@/tests/utils'

vi.mock('@/api/dataSources', () => ({
  listDataSources: vi.fn(),
  deleteDataSource: vi.fn(),
  uploadFiles: vi.fn(),
  pasteDataSource: vi.fn(),
  getDataSourcePreview: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: vi.fn() }
})

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

  it('hides Upload and Analyze buttons when no files selected', () => {
    renderWithProviders(<FileUploadZone projectId="proj-1" />)
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument()
  })

  it('shows helper text below document selection', () => {
    renderWithProviders(<FileUploadZone projectId="proj-1" />)
    expect(screen.getByText(/you can select additional documents before uploading/i)).toBeInTheDocument()
  })

  it('shows Upload button when at least one file selected', async () => {
    const { container } = renderWithProviders(<FileUploadZone projectId="proj-1" />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload \(\d+\)/i })).toBeInTheDocument()
    })
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
      expect(screen.getByRole('button', { name: /upload \(\d+\)/i })).toBeInTheDocument()
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

  it('renders metadata fields before document selection (element order)', () => {
    const { container } = renderWithProviders(<FileUploadZone projectId="proj-1" />)
    const form = container.querySelector('form')!
    const firstSection = form.children[0]
    const dropZone = form.querySelector('[aria-label="File drop zone"]')
    expect(firstSection).toContainElement(screen.getByLabelText(/collected date/i))
    expect(dropZone).toBeInTheDocument()
    expect(form.contains(dropZone)).toBe(true)
    const dropZoneParentIdx = Array.from(form.children).findIndex((el) => el.contains(dropZone))
    expect(dropZoneParentIdx).toBeGreaterThan(0)
  })

  it('shows Analyze button when clientId provided and files selected', async () => {
    const { container } = renderWithProviders(
      <FileUploadZone projectId="proj-1" clientId="client-1" />,
      { route: '/client-1/proj-1' }
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['c'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go to analysis/i })).toBeInTheDocument()
    })
  })

  it('navigates to analyze page when Analyze button is clicked', async () => {
    const navigateMock = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigateMock)
    const { container } = renderWithProviders(
      <FileUploadZone projectId="proj-1" clientId="client-1" />,
      { route: '/client-1/proj-1' }
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['c'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go to analysis/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /go to analysis/i }))
    expect(navigateMock).toHaveBeenCalledWith('/client-1/proj-1/analyze')
  })

  it('hides Upload and Analyze buttons when file selection is cleared', async () => {
    const { container } = renderWithProviders(<FileUploadZone projectId="proj-1" clientId="client-1" />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['c'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
    })
    fireEvent.change(input, { target: { files: [] } })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument()
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
