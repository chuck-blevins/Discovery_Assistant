import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteDataSource,
  getDataSourcePreview,
  listDataSources,
  pasteDataSource,
  uploadFiles,
} from '@/api/dataSources'
import { queryKeys } from '@/lib/queryKeys'
import type { DataSourcePasteCreate } from '@/types/api'

export function useDataSources(projectId: string) {
  return useQuery({
    queryKey: queryKeys.dataSources.byProject(projectId),
    queryFn: () => listDataSources(projectId),
    enabled: Boolean(projectId),
  })
}

export function useUploadFiles(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      files,
      metadata,
    }: {
      files: File[]
      metadata: { collected_date?: string; creator_name?: string; purpose?: string }
    }) => uploadFiles(projectId, files, metadata),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.dataSources.byProject(projectId) }),
  })
}

export function usePasteDataSource(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DataSourcePasteCreate) => pasteDataSource(projectId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.dataSources.byProject(projectId) }),
  })
}

export function useDeleteDataSource(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dataSourceId: string) => deleteDataSource(dataSourceId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.dataSources.byProject(projectId) }),
  })
}

export function useDataSourcePreview(dataSourceId: string | null) {
  return useQuery({
    queryKey: queryKeys.dataSources.preview(dataSourceId ?? ''),
    queryFn: () => getDataSourcePreview(dataSourceId!),
    enabled: Boolean(dataSourceId),
  })
}
