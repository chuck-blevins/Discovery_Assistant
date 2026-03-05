import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, act } from '@testing-library/react'
import { AnalysisSummaryActions } from '@/components/app/analysis/AnalysisSummaryActions'
import { renderWithProviders } from '@/tests/utils'

const MARKDOWN = `# Analysis Summary — Test Project

**Confidence:** 75%

## Findings

- A key finding _(source-1)_`

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  })
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('AnalysisSummaryActions', () => {
  it('renders Copy, Download MD, and Download PDF buttons', () => {
    renderWithProviders(<AnalysisSummaryActions markdown={MARKDOWN} projectName="Test Project" />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download md/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
  })

  it('Copy button writes markdown to clipboard and shows "Copied!" then reverts', async () => {
    renderWithProviders(<AnalysisSummaryActions markdown={MARKDOWN} projectName="Test Project" />)
    const copyBtn = screen.getByRole('button', { name: /^copy$/i })

    await act(async () => {
      fireEvent.click(copyBtn)
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(MARKDOWN)
    expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
  })

  it('Download MD button triggers Blob download with correct filename', () => {
    const mockAnchorClick = vi.fn()
    const mockAnchor = { href: '', download: '', click: mockAnchorClick }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement
      return originalCreateElement(tag)
    })

    renderWithProviders(<AnalysisSummaryActions markdown={MARKDOWN} projectName="Test Project" />)
    fireEvent.click(screen.getByRole('button', { name: /download md/i }))

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(mockAnchor.download).toBe('analysis-summary-test-project.md')
    expect(mockAnchorClick).toHaveBeenCalled()
  })

  it('Download PDF button opens new window and calls print', () => {
    const mockPrint = vi.fn()
    const mockDocument = { write: vi.fn(), close: vi.fn() }
    const mockNewWin = { document: mockDocument, print: mockPrint }
    vi.spyOn(window, 'open').mockReturnValue(mockNewWin as unknown as Window)

    renderWithProviders(<AnalysisSummaryActions markdown={MARKDOWN} projectName="Test Project" />)
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }))

    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(mockDocument.write).toHaveBeenCalled()
    expect(mockDocument.close).toHaveBeenCalled()
    expect(mockPrint).toHaveBeenCalled()
  })
})
