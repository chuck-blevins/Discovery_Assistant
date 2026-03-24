import { api } from '@/lib/api'
import type { TimeSessionCreate, TimeSessionResponse } from '@/types/api'

export async function listTimeSessions(clientId: string): Promise<TimeSessionResponse[]> {
  return api.get<TimeSessionResponse[]>(`/clients/${clientId}/sessions`)
}

export async function createTimeSession(
  clientId: string,
  data: TimeSessionCreate
): Promise<TimeSessionResponse> {
  return api.post<TimeSessionResponse>(`/clients/${clientId}/sessions`, data)
}

export async function deleteTimeSession(clientId: string, sessionId: string): Promise<void> {
  return api.delete<void>(`/clients/${clientId}/sessions/${sessionId}`)
}
