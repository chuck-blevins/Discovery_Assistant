import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  archiveClient,
  createClient,
  createNote,
  deleteClient,
  deleteNote,
  getClient,
  listClients,
  listNotes,
  updateClient,
} from '@/api/clients'
import { queryKeys } from '@/lib/queryKeys'
import type { ClientCreate, ClientUpdate } from '@/types/api'

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id ?? ''),
    queryFn: () => getClient(id!),
    enabled: Boolean(id),
  })
}

export function useClients(includeArchived = false) {
  return useQuery({
    queryKey: [...queryKeys.clients.all, { includeArchived }],
    queryFn: () => listClients(includeArchived),
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClientCreate) => createClient(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clients.all }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientUpdate }) => updateClient(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clients.all }),
  })
}

export function useArchiveClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clients.all }),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clients.all }),
  })
}

export function useClientNotes(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.notes(clientId ?? ''),
    queryFn: () => listNotes(clientId!),
    enabled: Boolean(clientId),
  })
}

export function useCreateNote(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => createNote(clientId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clients.notes(clientId) }),
  })
}

export function useDeleteNote(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => deleteNote(clientId, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clients.notes(clientId) }),
  })
}
