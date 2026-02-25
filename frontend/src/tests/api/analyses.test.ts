import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listAnalyses, getAnalysis, runAnalysisStream } from '@/api/analyses'

vi.mock('@/lib/api', () => ({
  BASE_URL: 'http://localhost:8000',
  api: {
    get: vi.fn(),
  },
}))

const api = (await import('@/lib/api')).api as unknown as { get: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listAnalyses', () => {
  it('calls GET /projects/{projectId}/analyses', async () => {
    api.get.mockResolvedValue([])
    await listAnalyses('proj-1')
    expect(api.get).toHaveBeenCalledWith('/projects/proj-1/analyses')
  })
})

describe('getAnalysis', () => {
  it('calls GET /analyses/{analysisId}', async () => {
    api.get.mockResolvedValue({ id: 'a-1', insights: [] })
    await getAnalysis('a-1')
    expect(api.get).toHaveBeenCalledWith('/analyses/a-1')
  })
})

describe('runAnalysisStream', () => {
  it('invokes onProgress for progress events', async () => {
    const onProgress = vi.fn()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"progress","stage":"Parsing documents","pct":30}\n\n'))
        controller.close()
      },
    })
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body,
    })

    await runAnalysisStream('proj-1', { onProgress })

    expect(onProgress).toHaveBeenCalledWith('Parsing documents', 30)
  })

  it('invokes onResult for result event', async () => {
    const onResult = vi.fn()
    const resultPayload = {
      type: 'result',
      analysis_id: 'a-1',
      confidence_score: 0.8,
      insights: [],
      cost: { tokens: 1000, usd: 0.02 },
    }
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(resultPayload)}\n\n`))
        controller.close()
      },
    })
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body })

    await runAnalysisStream('proj-1', { onResult })

    expect(onResult).toHaveBeenCalledWith(resultPayload)
  })

  it('invokes onDone for done event', async () => {
    const onDone = vi.fn()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'))
        controller.close()
      },
    })
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body })

    await runAnalysisStream('proj-1', { onDone })

    expect(onDone).toHaveBeenCalled()
  })

  it('invokes onError for error event', async () => {
    const onError = vi.fn()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"error","message":"Backend failed"}\n\n'))
        controller.close()
      },
    })
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body })

    await runAnalysisStream('proj-1', { onError })

    expect(onError).toHaveBeenCalledWith('Backend failed')
  })

  it('invokes onError when response is not ok', async () => {
    const onError = vi.fn()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unprocessable Entity',
      json: () => Promise.resolve({ detail: 'No data sources found.' }),
    })

    await runAnalysisStream('proj-1', { onError })

    expect(onError).toHaveBeenCalledWith('No data sources found.')
  })

  it('invokes onError when body is missing', async () => {
    const onError = vi.fn()
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body: undefined })

    await runAnalysisStream('proj-1', { onError })

    expect(onError).toHaveBeenCalledWith('No response body')
  })
})
