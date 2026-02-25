import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { OBJECTIVE_LABELS } from '@/lib/constants'
import { getConfidenceColor } from './ConfidenceIndicator'
import { ProjectActions } from './ProjectActions'
import type { ProjectResponse } from '@/types/api'

interface ProjectRowProps {
  project: ProjectResponse
  clientId: string
  onEdit: (project: ProjectResponse) => void
}

function formatCost(usd: number | null | undefined): string {
  if (usd == null || Number.isNaN(usd)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(usd)
}

export function ProjectRow({ project, clientId, onEdit }: ProjectRowProps) {
  return (
    <TableRow style={{ borderLeft: `4px solid ${getConfidenceColor(project.confidence_score)}` }}>
      <TableCell className="w-1 p-0" />
      <TableCell className="font-medium">{project.name}</TableCell>
      <TableCell>
        <Badge variant="outline">{OBJECTIVE_LABELS[project.objective]}</Badge>
      </TableCell>
      <TableCell>
        {project.status === 'archived' && (
          <Badge variant="outline" className="text-zinc-500">Archived</Badge>
        )}
      </TableCell>
      <TableCell>{new Date(project.updated_at).toLocaleDateString()}</TableCell>
      <TableCell className="tabular-nums">{formatCost(project.total_cost_usd)}</TableCell>
      <TableCell>
        <ProjectActions project={project} clientId={clientId} onEdit={() => onEdit(project)} />
      </TableCell>
    </TableRow>
  )
}
