import { api } from '@/lib/api'
import type { IcpResponse, ProjectCreate, ProjectNoteResponse, ProjectResponse, ProjectUpdate } from '@/types/api'

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

export async function listProjectNotes(projectId: string): Promise<ProjectNoteResponse[]> {
  return api.get<ProjectNoteResponse[]>(`/projects/${projectId}/notes`)
}

export async function createProjectNote(projectId: string, content: string): Promise<ProjectNoteResponse> {
  return api.post<ProjectNoteResponse>(`/projects/${projectId}/notes`, { content })
}

export async function deleteProjectNote(projectId: string, noteId: string): Promise<void> {
  return api.delete<void>(`/projects/${projectId}/notes/${noteId}`)
}

export async function seedIcp(projectId: string, hypothesis: string[]): Promise<IcpResponse> {
  return api.post<IcpResponse>(`/projects/${projectId}/icp/seed`, { hypothesis })
}
