import { useQuery } from '@tanstack/react-query'
import { getOnboardingSummary } from '@/api/onboarding'
import { queryKeys } from '@/lib/queryKeys'

export function useOnboarding(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.onboarding.byProject(projectId ?? ''),
    queryFn: () => getOnboardingSummary(projectId!),
    enabled: Boolean(projectId) && enabled,
    retry: false, // 404 before first analysis is expected
  })
}
