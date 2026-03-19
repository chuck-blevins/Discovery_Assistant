import { api } from '@/lib/api'
import type { ClientCreate, ClientNoteResponse, ClientResponse, ClientUpdate } from '@/types/api'

export async function listClients(includeArchived = false): Promise<ClientResponse[]> {
  const query = includeArchived ? '?include_archived=true' : ''
  return api.get<ClientResponse[]>(`/clients${query}`)
}

export async function createClient(data: ClientCreate): Promise<ClientResponse> {
  return api.post<ClientResponse>('/clients', data)
}

export async function updateClient(id: string, data: ClientUpdate): Promise<ClientResponse> {
  return api.put<ClientResponse>(`/clients/${id}`, data)
}

export async function archiveClient(id: string): Promise<ClientResponse> {
  return api.patch<ClientResponse>(`/clients/${id}/archive`)
}

export async function getClient(id: string): Promise<ClientResponse> {
  return api.get<ClientResponse>(`/clients/${id}`)
}

export async function deleteClient(id: string): Promise<void> {
  return api.delete<void>(`/clients/${id}`)
}

export async function listNotes(clientId: string): Promise<ClientNoteResponse[]> {
  return api.get<ClientNoteResponse[]>(`/clients/${clientId}/notes`)
}

export async function createNote(clientId: string, content: string): Promise<ClientNoteResponse> {
  return api.post<ClientNoteResponse>(`/clients/${clientId}/notes`, { content })
}

export async function deleteNote(clientId: string, noteId: string): Promise<void> {
  return api.delete<void>(`/clients/${clientId}/notes/${noteId}`)
}
