import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTimeSession, deleteTimeSession, listTimeSessions } from '@/api/timeSessions'
import { queryKeys } from '@/lib/queryKeys'
import type { TimeSessionCreate } from '@/types/api'

export function useTimeSessions(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.timeSessions.byClient(clientId ?? ''),
    queryFn: () => listTimeSessions(clientId!),
    enabled: Boolean(clientId),
  })
}

export function useCreateTimeSession(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TimeSessionCreate) => createTimeSession(clientId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.timeSessions.byClient(clientId) }),
  })
}

export function useDeleteTimeSession(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => deleteTimeSession(clientId, sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.timeSessions.byClient(clientId) }),
  })
}
