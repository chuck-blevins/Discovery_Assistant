import type { IcpResponse } from '@/types/api'

export async function getIcp(projectId: string): Promise<IcpResponse> {
  const { api } = await import('@/lib/api')
  return api.get<IcpResponse>(`/projects/${projectId}/icp`)
}
