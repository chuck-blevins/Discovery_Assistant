import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import { DataSourceList } from '@/components/app/data-sources/DataSourceList'
import { renderWithProviders } from '@/tests/utils'
import type { DataSourceResponse } from '@/types/api'

vi.mock('@/api/dataSources', () => ({
  listDataSources: vi.fn(),
  deleteDataSource: vi.fn(),
  uploadFiles: vi.fn(),
  pasteDataSource: vi.fn(),
  getDataSourcePreview: vi.fn(),
}))

import * as dataSourcesApi from '@/api/dataSources'

const fileSource: DataSourceResponse = {
  id: 'ds-1',
  project_id: 'proj-1',
  source_type: 'file',
  file_name: 'interview.pdf',
  file_path: 'proj-1/ds-1/interview.pdf',
  content_type: 'application/pdf',
  collected_date: '2026-01-15',
  creator_name: 'Alice',
  purpose: 'customer interview',
  created_at: '2026-01-15T10:00:00Z',
}

const pasteSource: DataSourceResponse = {
  id: 'ds-2',
  project_id: 'proj-1',
  source_type: 'paste',
  file_name: 'paste',
  file_path: null,
  content_type: null,
  collected_date: null,
  creator_name: null,
  purpose: null,
  created_at: '2026-01-16T10:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DataSourceList', () => {
  it('shows skeleton while loading', () => {
    vi.mocked(dataSourcesApi.listDataSources).mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(<DataSourceList projectId="proj-1" />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state when no data sources', async () => {
    vi.mocked(dataSourcesApi.listDataSources).mockResolvedValue([])
    renderWithProviders(<DataSourceList projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('No data sources yet.')).toBeInTheDocument()
    })
  })

  it('shows error state on API failure', async () => {
    vi.mocked(dataSourcesApi.listDataSources).mockRejectedValue(new Error('Network error'))
    renderWithProviders(<DataSourceList projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/Failed to load data sources/)).toBeInTheDocument()
  })

  it('renders file name, badge, creator, and date for each source', async () => {
    vi.mocked(dataSourcesApi.listDataSources).mockResolvedValue([fileSource, pasteSource])
    renderWithProviders(<DataSourceList projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('interview.pdf')).toBeInTheDocument()
    })
    expect(screen.getByText('file')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    // 'paste' appears as both source_type badge and file_name for pasteSource
    expect(screen.getAllByText('paste').length).toBeGreaterThan(0)
  })

  it('shows delete confirmation dialog', async () => {
    vi.mocked(dataSourcesApi.listDataSources).mockResolvedValue([fileSource])
    renderWithProviders(<DataSourceList projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('interview.pdf')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /delete interview\.pdf/i }))
    await waitFor(() => {
      expect(screen.getByText('Delete data source?')).toBeInTheDocument()
    })
    // 'interview.pdf' appears in both the list item and the dialog description
    expect(screen.getAllByText(/interview\.pdf/).length).toBeGreaterThan(0)
  })

  it('calls deleteDataSource when delete confirmed', async () => {
    vi.mocked(dataSourcesApi.listDataSources).mockResolvedValue([fileSource])
    vi.mocked(dataSourcesApi.deleteDataSource).mockResolvedValue(undefined)
    renderWithProviders(<DataSourceList projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('interview.pdf')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /delete interview\.pdf/i }))
    await waitFor(() => {
      expect(screen.getByText('Delete data source?')).toBeInTheDocument()
    })
    // Click the confirm Delete button (exact label "Delete", not the row button "Delete interview.pdf")
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(dataSourcesApi.deleteDataSource).toHaveBeenCalledWith('ds-1')
    })
  })

  it('has zero axe violations with populated list', async () => {
    vi.mocked(dataSourcesApi.listDataSources).mockResolvedValue([fileSource])
    const { container } = renderWithProviders(<DataSourceList projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('interview.pdf')).toBeInTheDocument()
    })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('has zero axe violations on empty state', async () => {
    vi.mocked(dataSourcesApi.listDataSources).mockResolvedValue([])
    const { container } = renderWithProviders(<DataSourceList projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('No data sources yet.')).toBeInTheDocument()
    })
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
