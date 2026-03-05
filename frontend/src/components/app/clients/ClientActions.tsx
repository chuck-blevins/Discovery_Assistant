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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit client">
            <Pencil className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit client</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent>
          {client.status === 'active' ? 'Archive client' : 'Unarchive client'}
        </TooltipContent>
      </Tooltip>

      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>Delete client</TooltipContent>
        </Tooltip>
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
