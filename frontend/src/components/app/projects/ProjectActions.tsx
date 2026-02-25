import { useNavigate } from 'react-router-dom'

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
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={() => navigate(`/${clientId}/${project.id}`)}>
        View
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(`/${clientId}/${project.id}#data-sources`)}>
        Upload
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(`/${clientId}/${project.id}/analyze`)}>
        Analyze
      </Button>
      <Button variant="outline" size="sm" onClick={onEdit}>
        Edit
      </Button>

      {project.status === 'active' ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={archiveMutation.isPending}>
              Archive
            </Button>
          </AlertDialogTrigger>
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => archiveMutation.mutate(project.id)}
          disabled={archiveMutation.isPending}
        >
          Unarchive
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={deleteMutation.isPending}>
            Delete
          </Button>
        </AlertDialogTrigger>
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
