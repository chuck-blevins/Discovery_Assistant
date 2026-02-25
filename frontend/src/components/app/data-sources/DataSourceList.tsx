import { useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDataSources, useDeleteDataSource } from '@/hooks/useDataSources'
import type { DataSourceResponse } from '@/types/api'
import { DataSourcePreviewModal } from './DataSourcePreviewModal'

interface DataSourceListProps {
  projectId: string
}

export function DataSourceList({ projectId }: DataSourceListProps) {
  const { data: dataSources, isLoading, isError } = useDataSources(projectId)
  const deleteMutation = useDeleteDataSource(projectId)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DataSourceResponse | null>(null)

  function handleDelete() {
    if (!deleteTarget) return
    // Capture values before async mutation to avoid stale closure
    const { id, file_name } = deleteTarget
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`"${file_name}" deleted.`)
        setDeleteTarget(null)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Delete failed.')
        setDeleteTarget(null)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2" aria-label="Loading data sources">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return <p role="alert" className="text-destructive text-sm">Failed to load data sources.</p>
  }

  if (!dataSources || dataSources.length === 0) {
    return <p className="text-muted-foreground text-sm">No data sources yet.</p>
  }

  return (
    <>
      <div className="divide-y" role="list" aria-label="Data sources">
        {dataSources.map((ds) => (
          <div
            key={ds.id}
            role="listitem"
            className="flex items-center gap-3 py-3 flex-wrap"
          >
            <span className="font-medium text-sm flex-1 min-w-0 truncate">{ds.file_name}</span>
            <Badge variant="outline" className="shrink-0">
              {ds.source_type}
            </Badge>
            {ds.creator_name && (
              <span className="text-xs text-muted-foreground shrink-0">{ds.creator_name}</span>
            )}
            {ds.collected_date && (
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(ds.collected_date + 'T00:00:00').toLocaleDateString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label={`Preview ${ds.file_name}`}
              onClick={() => setPreviewId(ds.id)}
            >
              Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive"
              aria-label={`Delete ${ds.file_name}`}
              onClick={() => setDeleteTarget(ds)}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>

      <DataSourcePreviewModal
        dataSourceId={previewId}
        onClose={() => setPreviewId(null)}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete data source?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.file_name}&rdquo; will be permanently deleted. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
