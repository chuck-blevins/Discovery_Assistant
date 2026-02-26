import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { OBJECTIVE_LABELS } from '@/lib/constants'
import { getConfidenceColor } from './ConfidenceIndicator'
import { ProjectActions } from './ProjectActions'
import { StrengthBadge } from './StrengthBadge'
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
      <TableCell className="font-medium">
        <Link
          to={`/${clientId}/${project.id}`}
          className="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          {project.name}
        </Link>
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={project.assumed_problem ?? undefined}>
        {project.assumed_problem_truncated ?? '—'}
      </TableCell>
      <TableCell className="w-1 p-0" title="Strength of support">
        <StrengthBadge strength={project.strength_of_support} />
      </TableCell>
      <TableCell>
        <Badge variant="outline">{OBJECTIVE_LABELS[project.objective]}</Badge>
      </TableCell>
      <TableCell>
        {project.status === 'archived' ? (
          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">Archived</Badge>
        ) : (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Active</Badge>
        )}
      </TableCell>
      <TableCell>{new Date(project.updated_at).toLocaleDateString()}</TableCell>
      <TableCell>{new Date(project.created_at).toLocaleDateString()}</TableCell>
      <TableCell className="tabular-nums">{formatCost(project.total_cost_usd)}</TableCell>
      <TableCell>
        <ProjectActions project={project} clientId={clientId} onEdit={() => onEdit(project)} />
      </TableCell>
    </TableRow>
  )
}
