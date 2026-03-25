import { BASE_URL } from '@/lib/api'
import type {
  AnalysisResponse,
  InsightResponse,
  OnboardingSummaryResponse,
  PositioningResultResponse,
  RecommendationsResponse,
} from '@/types/api'

export interface SSEProgressEvent {
  type: 'progress'
  stage: string
  pct: number
}

export interface SSEResultEvent {
  type: 'result'
  analysis_id: string
  confidence_score: number
  insights: InsightResponse[]
  positioning_result?: PositioningResultResponse | null
  recommendations?: RecommendationsResponse | null
  persona_updated?: boolean
  icp_updated?: boolean
  onboarding_updated?: boolean
  onboarding_result?: OnboardingSummaryResponse | null
  cost: { tokens: number; usd: number }
}

export interface SSEDoneEvent {
  type: 'done'
}

export interface SSEErrorEvent {
  type: 'error'
  message: string
}

export type SSEEvent = SSEProgressEvent | SSEResultEvent | SSEDoneEvent | SSEErrorEvent

export async function listAnalyses(projectId: string): Promise<AnalysisResponse[]> {
  const { api } = await import('@/lib/api')
  return api.get<AnalysisResponse[]>(`/projects/${projectId}/analyses`)
}

export async function getAnalysis(analysisId: string): Promise<AnalysisResponse> {
  const { api } = await import('@/lib/api')
  return api.get<AnalysisResponse>(`/analyses/${analysisId}`)
}

// Story 6-2: artifact generation and list
export interface ArtifactSummaryResponse {
  id: string
  artifact_type: string
  file_name: string
  generated_at: string
}

export async function generateArtifacts(analysisId: string): Promise<ArtifactSummaryResponse[]> {
  const { api } = await import('@/lib/api')
  return api.post<ArtifactSummaryResponse[]>(`/analyses/${analysisId}/generate-artifacts`)
}

export async function listArtifacts(analysisId: string): Promise<ArtifactSummaryResponse[]> {
  const { api } = await import('@/lib/api')
  return api.get<ArtifactSummaryResponse[]>(`/analyses/${analysisId}/artifacts`)
}

/** Download artifact as file (uses credentials). */
export async function downloadArtifact(artifactId: string, fileName: string): Promise<void> {
  const { BASE_URL } = await import('@/lib/api')
  const res = await fetch(`${BASE_URL}/artifacts/${artifactId}/download`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Run analysis via SSE stream. Callbacks are invoked as events arrive.
 * Uses fetch + ReadableStream so we can send credentials (cookies).
 */
export async function runAnalysisStream(
  projectId: string,
  callbacks: {
    onProgress?: (stage: string, pct: number) => void
    onResult?: (data: SSEResultEvent) => void
    onDone?: () => void
    onError?: (message: string) => void
  }
): Promise<void> {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/analyze/stream`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'text/event-stream' },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = body?.detail ?? res.statusText
    callbacks.onError?.(typeof message === 'string' ? message : 'Analysis failed')
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    callbacks.onError?.('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let terminated = false  // true once onDone or onError has been called

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? ''
      for (const block of lines) {
        const dataLine = block.split('\n').find((l) => l.startsWith('data: '))
        if (!dataLine) continue
        const raw = dataLine.slice(6).trim()
        if (raw === '[DONE]' || !raw) continue
        try {
          const event = JSON.parse(raw) as SSEEvent
          if (event.type === 'progress') {
            callbacks.onProgress?.(event.stage, event.pct)
          } else if (event.type === 'result') {
            callbacks.onResult?.(event)
          } else if (event.type === 'done') {
            terminated = true
            callbacks.onDone?.()
          } else if (event.type === 'error') {
            terminated = true
            callbacks.onError?.(event.message)
          }
        } catch (e) {
          console.error('[runAnalysisStream] Malformed SSE data:', raw.slice(0, 200), e)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  // Stream closed without a done/error event — the backend likely threw before yielding.
  if (!terminated) {
    callbacks.onError?.('Analysis connection was lost. Please try again.')
  }
}
