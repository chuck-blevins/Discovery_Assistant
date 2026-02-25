import { useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getConfidenceColor } from '@/components/app/projects/ConfidenceIndicator'
import DataSourceSection from '@/components/app/data-sources/DataSourceSection'
import { useDataSources } from '@/hooks/useDataSources'
import { useProject } from '@/hooks/useProjects'
import { OBJECTIVE_LABELS } from '@/lib/constants'

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading, isError } = useProject(projectId)
  const { data: dataSources } = useDataSources(projectId)
  const hasDataSources = (dataSources?.length ?? 0) > 0

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  if (isError || !project) {
    return <p role="alert">Project not found.</p>
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge variant="outline">{OBJECTIVE_LABELS[project.objective]}</Badge>
          {project.status === 'archived' && <Badge variant="outline">Archived</Badge>}
        </div>
        {project.target_segments.length > 0 && (
          <p className="text-muted-foreground mt-1">
            Segments: {project.target_segments.join(', ')}
          </p>
        )}
        {project.confidence_score !== null && (
          <p
            className="mt-2 font-medium"
            style={{ color: getConfidenceColor(project.confidence_score) }}
          >
            {Math.round(project.confidence_score * 100)}% confidence
          </p>
        )}
        {project.last_analyzed_at && (
          <p className="text-sm text-muted-foreground">
            Last analyzed: {new Date(project.last_analyzed_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <section aria-label="Data Sources">
        <h2 className="text-lg font-semibold mb-2">Data Sources</h2>
        <DataSourceSection projectId={projectId ?? ''} />
      </section>
      <section aria-label="Analysis" className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Analysis</h2>
        <Button disabled={!hasDataSources}>Analyze</Button>
        {!hasDataSources && (
          <p className="text-xs text-muted-foreground mt-2">
            Add at least one data source to run analysis.
          </p>
        )}
      </section>
    </>
  )
}
