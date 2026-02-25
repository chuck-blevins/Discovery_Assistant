import type { PersonaResponse } from '@/types/api'

export async function getPersona(projectId: string): Promise<PersonaResponse> {
  const { api } = await import('@/lib/api')
  return api.get<PersonaResponse>(`/projects/${projectId}/persona`)
}
