import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProjects } from '@/hooks/useProjects'
import { useProjectFormStore } from '@/stores/useProjectFormStore'
import { OBJECTIVE_LABELS } from '@/lib/constants'
import { getConfidenceColor } from './ConfidenceIndicator'
import { ProjectActions } from './ProjectActions'
import { ProjectForm } from './ProjectForm'
import { ProjectRow } from './ProjectRow'

interface ProjectTableProps {
  clientId: string
}

export function ProjectTable({ clientId }: ProjectTableProps) {
  const [includeArchived, setIncludeArchived] = useState(false)
  const { open, project, openCreate, openEdit, close } = useProjectFormStore()
  const { data: projects, isLoading, isError } = useProjects(clientId, includeArchived)

  // Reset store on unmount so stale project state doesn't carry over across client navigations
  useEffect(() => () => close(), [close])

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Projects</h2>
          {projects && projects.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Total spend: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(
                projects.reduce((s, p) => s + (p.total_cost_usd ?? 0), 0)
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Show archived
          </label>
          <Button onClick={openCreate}>New Project</Button>
        </div>
      </div>

      {isLoading && (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:block">
            <Table>
              <caption className="sr-only">Projects for this client</caption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1 p-0"><span className="sr-only">Confidence</span></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="w-1 p-0" />
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile skeleton */}
          <div className="flex md:hidden flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </>
      )}

      {isError && (
        <p role="alert">Failed to load projects. Please try again.</p>
      )}

      {!isLoading && !isError && projects && projects.length === 0 && (
        <div className="text-center py-8 space-y-3">
          <p>No projects yet.</p>
          <Button onClick={openCreate}>New Project</Button>
        </div>
      )}

      {!isLoading && !isError && projects && projects.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <caption className="sr-only">Projects for this client</caption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1 p-0"><span className="sr-only">Confidence</span></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <ProjectRow key={p.id} project={p} clientId={clientId} onEdit={openEdit} />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className="flex md:hidden flex-col gap-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="border rounded-lg p-4 flex gap-3"
                style={{ borderLeft: `4px solid ${getConfidenceColor(p.confidence_score)}` }}
              >
                <div className="flex-1">
                  <p className="font-medium">{p.name}</p>
                  <Badge variant="outline" className="mt-1">{OBJECTIVE_LABELS[p.objective]}</Badge>
                  {p.status === 'archived' && (
                    <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-600 border-gray-300">Archived</Badge>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(p.updated_at).toLocaleDateString()}
                    {' · '}
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(p.total_cost_usd ?? 0)}
                  </p>
                </div>
                <ProjectActions project={p} clientId={clientId} onEdit={() => openEdit(p)} />
              </div>
            ))}
          </div>
        </>
      )}

      <ProjectForm
        open={open}
        onOpenChange={(v) => { if (!v) close() }}
        clientId={clientId}
        project={project ?? undefined}
      />
    </div>
  )
}
