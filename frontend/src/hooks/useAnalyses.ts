import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getAnalysis, listAnalyses, runAnalysisStream } from '@/api/analyses'
import type { SSEResultEvent } from '@/api/analyses'

export function useAnalyses(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.analyses.byProject(projectId ?? ''),
    queryFn: () => listAnalyses(projectId!),
    enabled: !!projectId,
  })
}

export function useAnalysis(analysisId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.analyses.detail(analysisId ?? ''),
    queryFn: () => getAnalysis(analysisId!),
    enabled: !!analysisId,
  })
}

export function useRunAnalysisStream(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return {
    runStream: (
      callbacks: {
        onProgress?: (stage: string, pct: number) => void
        onResult?: (data: SSEResultEvent) => void
        onDone?: () => void
        onError?: (message: string) => void
      }
    ) => {
      if (!projectId) return
      return runAnalysisStream(projectId, {
        ...callbacks,
        onResult: (data) => {
          if (data.icp_updated) {
            queryClient.invalidateQueries({ queryKey: queryKeys.icp.byProject(projectId) })
          }
          callbacks.onResult?.(data)
        },
        onDone: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.analyses.byProject(projectId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.persona.byProject(projectId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.icp.byProject(projectId) })
          callbacks.onDone?.()
        },
      })
    },
  }
}
