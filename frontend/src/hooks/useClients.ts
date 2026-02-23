import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  archiveClient,
  createClient,
  deleteClient,
  listClients,
  updateClient,
} from '@/api/clients'
import { queryKeys } from '@/lib/queryKeys'
import type { ClientCreate, ClientUpdate } from '@/types/api'

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
