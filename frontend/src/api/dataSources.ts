import { api, BASE_URL } from '@/lib/api'
import type {
  DataSourcePasteCreate,
  DataSourcePreviewResponse,
  DataSourceResponse,
} from '@/types/api'

export async function uploadFiles(
  projectId: string,
  files: File[],
  metadata: { collected_date?: string; creator_name?: string; purpose?: string }
): Promise<DataSourceResponse[]> {
  const form = new FormData()
  for (const file of files) {
    form.append('files', file)
  }
  if (metadata.collected_date) form.append('collected_date', metadata.collected_date)
  if (metadata.creator_name) form.append('creator_name', metadata.creator_name)
  if (metadata.purpose) form.append('purpose', metadata.purpose)

  const response = await fetch(
    `${BASE_URL}/projects/${projectId}/data-sources/upload`,
    {
      method: 'POST',
      credentials: 'include',
      body: form,
    }
  )
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      if (body?.detail) detail = body.detail
    } catch {
      // ignore parse error
    }
    throw new Error(detail)
  }
  return response.json()
}

export async function pasteDataSource(
  projectId: string,
  data: DataSourcePasteCreate
): Promise<DataSourceResponse[]> {
  return api.post<DataSourceResponse[]>(
    `/projects/${projectId}/data-sources/paste`,
    { source_type: 'paste', ...data }
  )
}

export async function listDataSources(projectId: string): Promise<DataSourceResponse[]> {
  return api.get<DataSourceResponse[]>(`/projects/${projectId}/data-sources`)
}

export async function getDataSourcePreview(
  dataSourceId: string
): Promise<DataSourcePreviewResponse> {
  return api.get<DataSourcePreviewResponse>(`/data-sources/${dataSourceId}/preview`)
}

export async function deleteDataSource(dataSourceId: string): Promise<void> {
  return api.delete<void>(`/data-sources/${dataSourceId}`)
}
