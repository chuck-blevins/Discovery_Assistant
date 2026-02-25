import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  archiveProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '@/api/projects'
import { queryKeys } from '@/lib/queryKeys'
import type { ProjectCreate, ProjectUpdate } from '@/types/api'

export function useProjects(clientId: string, includeArchived = false) {
  return useQuery({
    queryKey: [...queryKeys.projects.all(clientId), { includeArchived }],
    queryFn: () => listProjects(clientId, includeArchived),
    enabled: Boolean(clientId),
  })
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? ''),
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  })
}

export function useCreateProject(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProjectCreate) => createProject(clientId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all(clientId) }),
  })
}

export function useUpdateProject(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectUpdate }) => updateProject(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all(clientId) })
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
    },
  })
}

export function useArchiveProject(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveProject(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all(clientId) })
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
    },
  })
}

export function useDeleteProject(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all(clientId) }),
  })
}
