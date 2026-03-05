import { useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, BarChart3, Pencil, Trash2, Upload } from 'lucide-react'

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
import { useArchiveProject, useDeleteProject } from '@/hooks/useProjects'
import type { ProjectResponse } from '@/types/api'

interface ProjectActionsProps {
  project: ProjectResponse
  clientId: string
  onEdit: () => void
}

export function ProjectActions({ project, clientId, onEdit }: ProjectActionsProps) {
  const navigate = useNavigate()
  const archiveMutation = useArchiveProject(clientId)
  const deleteMutation = useDeleteProject(clientId)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/${clientId}/${project.id}#data-sources`)}
            aria-label="Upload data"
          >
            <Upload className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Upload data</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/${clientId}/${project.id}/analyze`)}
            aria-label="Run analysis"
          >
            <BarChart3 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Run analysis</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit project">
            <Pencil className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit project</TooltipContent>
      </Tooltip>

      {project.status === 'active' ? (
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={archiveMutation.isPending}
                  aria-label="Archive project"
                >
                  <Archive className="size-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Archive project</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive &ldquo;{project.name}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                It will be hidden from the default view.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => archiveMutation.mutate(project.id)}
                disabled={archiveMutation.isPending}
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => archiveMutation.mutate(project.id)}
              disabled={archiveMutation.isPending}
              aria-label="Unarchive project"
            >
              <ArchiveRestore className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Unarchive project</TooltipContent>
        </Tooltip>
      )}

      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={deleteMutation.isPending}
                aria-label="Delete project"
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Delete project</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{project.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(project.id)}
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
