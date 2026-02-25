import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getPersona } from '@/api/persona'
import { ApiError } from '@/lib/api'

export function usePersona(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.persona.byProject(projectId ?? ''),
    queryFn: () => getPersona(projectId!),
    enabled: !!projectId && enabled,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false
      return failureCount < 2
    },
  })
}
