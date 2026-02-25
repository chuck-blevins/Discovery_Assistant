import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getIcp } from '@/api/icp'
import { ApiError } from '@/lib/api'

export function useIcp(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.icp.byProject(projectId ?? ''),
    queryFn: () => getIcp(projectId!),
    enabled: !!projectId && enabled,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false
      return failureCount < 2
    },
  })
}
