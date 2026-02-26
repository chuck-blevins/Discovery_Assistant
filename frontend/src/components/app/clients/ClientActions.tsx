import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useArchiveClient, useDeleteClient } from '@/hooks/useClients'
import type { ClientResponse } from '@/types/api'

interface ClientActionsProps {
  client: ClientResponse
  onEdit: () => void
}

export function ClientActions({ client, onEdit }: ClientActionsProps) {
  const archiveMutation = useArchiveClient()
  const deleteMutation = useDeleteClient()

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit client">
        <Pencil className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => archiveMutation.mutate(client.id)}
        disabled={archiveMutation.isPending}
        aria-label={client.status === 'active' ? 'Archive client' : 'Unarchive client'}
      >
        {client.status === 'active' ? (
          <Archive className="size-4" />
        ) : (
          <ArchiveRestore className="size-4" />
        )}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={deleteMutation.isPending}
            aria-label="Delete client"
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{client.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(client.id)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
