import { api } from '@/lib/api'
import type { ProjectCreate, ProjectResponse, ProjectUpdate } from '@/types/api'

export async function listProjects(
  clientId: string,
  includeArchived = false
): Promise<ProjectResponse[]> {
  const query = includeArchived ? '?include_archived=true' : ''
  return api.get<ProjectResponse[]>(`/clients/${clientId}/projects${query}`)
}

export async function createProject(
  clientId: string,
  data: ProjectCreate
): Promise<ProjectResponse> {
  return api.post<ProjectResponse>(`/clients/${clientId}/projects`, data)
}

export async function getProject(id: string): Promise<ProjectResponse> {
  return api.get<ProjectResponse>(`/projects/${id}`)
}

export async function updateProject(
  id: string,
  data: ProjectUpdate
): Promise<ProjectResponse> {
  return api.put<ProjectResponse>(`/projects/${id}`, data)
}

export async function archiveProject(id: string): Promise<ProjectResponse> {
  return api.patch<ProjectResponse>(`/projects/${id}/archive`)
}

export async function deleteProject(id: string): Promise<void> {
  return api.delete<void>(`/projects/${id}`)
}
