import { api } from '@/lib/api'
import type { OnboardingSummaryResponse } from '@/types/api'

export async function getOnboardingSummary(projectId: string): Promise<OnboardingSummaryResponse> {
  return api.get<OnboardingSummaryResponse>(`/projects/${projectId}/onboarding`)
}
