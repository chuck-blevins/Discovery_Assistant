import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useDataSourcePreview } from '@/hooks/useDataSources'

interface DataSourcePreviewModalProps {
  dataSourceId: string | null
  onClose: () => void
}

export function DataSourcePreviewModal({
  dataSourceId,
  onClose,
}: DataSourcePreviewModalProps) {
  const { data, isLoading, isError } = useDataSourcePreview(dataSourceId)

  return (
    <Dialog open={Boolean(dataSourceId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isLoading ? <Skeleton className="h-5 w-40" /> : data?.file_name ?? 'Preview'}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            Failed to load preview. Please try again.
          </p>
        ) : (
          <pre className="text-sm whitespace-pre-wrap break-words rounded bg-muted p-3 max-h-96 overflow-auto">
            {data?.raw_text_preview || (
              <span className="text-muted-foreground italic">No text content available.</span>
            )}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  )
}
