import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getConfidenceColor } from '@/components/app/projects/ConfidenceIndicator'
import { StrengthBadge } from '@/components/app/projects/StrengthBadge'
import DataSourceSection from '@/components/app/data-sources/DataSourceSection'
import { IcpCard } from '@/components/app/icp/IcpCard'
import { PersonaCard } from '@/components/app/persona/PersonaCard'
import { useDataSources } from '@/hooks/useDataSources'
import { useIcp } from '@/hooks/useIcp'
import { usePersona } from '@/hooks/usePersona'
import { useProject } from '@/hooks/useProjects'
import { OBJECTIVE_LABELS } from '@/lib/constants'

export default function ProjectPage() {
  const { clientId, projectId } = useParams<{ clientId: string; projectId: string }>()
  const { data: project, isLoading, isError } = useProject(projectId)
  const { data: dataSources } = useDataSources(projectId)
  const { data: persona, isLoading: personaLoading } = usePersona(
    projectId,
    project?.objective === 'persona-buildout'
  )
  const { data: icp, isLoading: icpLoading } = useIcp(
    projectId,
    project?.objective === 'icp-refinement'
  )
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
          <Badge
            variant="outline"
            className={project.status === 'archived' ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-green-100 text-green-800 border-green-300'}
          >
            {project.status === 'archived' ? 'Archived' : 'Active'}
          </Badge>
        </div>
        {project.target_segments.length > 0 && (
          <p className="text-muted-foreground mt-1">
            Segments: {project.target_segments.join(', ')}
          </p>
        )}
        {/* Quick view: strength, assumed problem, quotes (Epic 3 Story 3.2) */}
        {(project.strength_of_support != null ||
          project.assumed_problem_truncated ||
          (project.supporting_quotes?.length ?? 0) > 0 ||
          project.contradicting_quote) && (
          <div className="mt-2 space-y-2" role="region" aria-label="Quick view">
            <div className="flex flex-wrap items-center gap-2">
              {project.strength_of_support != null && (
                <span className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Strength:</span>
                  <StrengthBadge strength={project.strength_of_support} />
                </span>
              )}
              {project.assumed_problem_truncated && (
                <p className="text-sm text-muted-foreground max-w-2xl" title={project.assumed_problem ?? undefined}>
                  {project.assumed_problem_truncated}
                </p>
              )}
            </div>
            {project.supporting_quotes && project.supporting_quotes.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Supporting:</span>
                <ul className="mt-1 space-y-1 list-none pl-0" aria-label="Supporting quotes">
                  {project.supporting_quotes.map((q, i) => (
                    <li key={i} className="text-sm border-l-2 border-green-600 pl-2">
                      &ldquo;{q.text}&rdquo;
                      {q.citation && (
                        <cite className="block text-xs text-muted-foreground mt-0.5 not-italic">{q.citation}</cite>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {project.contradicting_quote && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Contradicting:</span>
                <blockquote className="mt-1 text-sm border-l-2 border-amber-600 pl-2" aria-label="Contradicting quote">
                  &ldquo;{project.contradicting_quote.text}&rdquo;
                  {project.contradicting_quote.citation && (
                    <cite className="block text-xs text-muted-foreground mt-0.5 not-italic">
                      {project.contradicting_quote.citation}
                    </cite>
                  )}
                </blockquote>
              </div>
            )}
            {project.last_analyzed_at && (
              <p className="text-sm flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/${clientId}/${projectId}/analyze`} state={{ viewLatest: true }}>View Last Analysis</Link>
                </Button>
                <span className="text-muted-foreground">
                  Last analyzed: {new Date(project.last_analyzed_at).toLocaleDateString()}
                </span>
              </p>
            )}
          </div>
        )}
        {!project.last_analyzed_at && project.confidence_score === null && project.assumed_problem_truncated && (
          <p className="mt-2 text-sm text-muted-foreground">
            Run analysis to see strength and quotes.
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
        {project.last_analyzed_at &&
          !project.strength_of_support &&
          !project.assumed_problem_truncated &&
          !(project.supporting_quotes?.length ?? 0) &&
          !project.contradicting_quote && (
            <p className="text-sm text-muted-foreground mt-2">
              Last analyzed: {new Date(project.last_analyzed_at).toLocaleDateString()}
            </p>
          )}
      </div>
      <section id="data-sources" aria-label="Data Sources">
        <h2 className="text-lg font-semibold mb-2">Data Sources</h2>
        <DataSourceSection projectId={projectId ?? ''} clientId={clientId} />
      </section>
      <section aria-label="Analysis" className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Analysis</h2>
        <div className="flex flex-wrap items-center gap-3">
          {hasDataSources ? (
            <Button asChild>
              <Link to={`/${clientId}/${projectId}/analyze`} state={{ autoStart: true }}>
                Analyze
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => toast.error('At least one document must be available for analysis.')}
            >
              Analyze
            </Button>
          )}
          {project.last_analyzed_at && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/${clientId}/${projectId}/analyze`} state={{ viewLatest: true }}>View Last Analysis</Link>
            </Button>
          )}
        </div>
        {!hasDataSources && (
          <p className="text-xs text-muted-foreground mt-2">
            Add at least one data source to run analysis.
          </p>
        )}
      </section>

      {project.objective === 'persona-buildout' && (
        <section aria-label="Persona" className="mt-6">
          {personaLoading && <Skeleton className="h-32 w-full" />}
          {!personaLoading && persona && (
            <PersonaCard persona={persona} projectName={project.name} />
          )}
          {!personaLoading && !persona && (
            <p className="text-sm text-muted-foreground">
              No persona yet. Run analysis to generate a persona card.
            </p>
          )}
        </section>
      )}

      {project.objective === 'icp-refinement' && (
        <section aria-label="ICP" className="mt-6">
          {icpLoading && <Skeleton className="h-32 w-full" />}
          {!icpLoading && icp && (
            <IcpCard icp={icp} projectName={project.name} />
          )}
          {!icpLoading && !icp && (
            <p className="text-sm text-muted-foreground">
              No ICP yet. Run analysis to generate an ICP card.
            </p>
          )}
        </section>
      )}
    </>
  )
}
