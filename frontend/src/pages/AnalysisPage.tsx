import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfidenceMeter } from '@/components/app/analysis/ConfidenceMeter'
import { InsightsList } from '@/components/app/analysis/InsightsList'
import { CostDisplay } from '@/components/app/analysis/CostDisplay'
import { PositioningSection } from '@/components/app/analysis/PositioningSection'
import { RecommendationsSection } from '@/components/app/analysis/RecommendationsSection'
import { ArtifactsSection } from '@/components/app/analysis/ArtifactsSection'
import { AnalysisSummaryActions } from '@/components/app/analysis/AnalysisSummaryActions'
import { buildAnalysisSummaryMarkdown } from '@/lib/analysisMarkdown'
import { IcpCard } from '@/components/app/icp/IcpCard'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useProject } from '@/hooks/useProjects'
import { useDataSources } from '@/hooks/useDataSources'
import { useAnalyses, useAnalysis, useRunAnalysisStream } from '@/hooks/useAnalyses'
import { useIcp } from '@/hooks/useIcp'
import type { SSEResultEvent } from '@/api/analyses'
import { OBJECTIVE_LABELS } from '@/lib/constants'

type PageState = 'idle' | 'streaming' | 'result' | 'error'

// Guard so autoStart only runs once per project per navigation (avoids double run under React Strict Mode).
const autoStartedProjectIds = new Set<string>()

export default function AnalysisPage() {
  const { clientId, projectId } = useParams<{ clientId: string; projectId: string }>()
  const location = useLocation()
  const { data: project, isLoading: projectLoading, isError: projectError } = useProject(projectId)
  const { data: dataSources } = useDataSources(projectId)
  const { data: analysesList } = useAnalyses(projectId)
  const [pageState, setPageState] = useState<PageState>('idle')
  const [streamStage, setStreamStage] = useState('')
  const [streamPct, setStreamPct] = useState(0)
  const [result, setResult] = useState<SSEResultEvent | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)

  const { data: selectedAnalysis } = useAnalysis(selectedAnalysisId ?? undefined)
  const { runStream } = useRunAnalysisStream(projectId)
  const { data: icp, isFetching: icpFetching, refetch: refetchIcp } = useIcp(projectId)
  const resultsSectionRef = useRef<HTMLDivElement>(null)
  const autoStartDoneRef = useRef(false)
  const viewLatestHandledRef = useRef(false)

  const hasDataSources = (dataSources?.length ?? 0) > 0
  const displayResult = result ?? (selectedAnalysisId && selectedAnalysis
    ? {
        type: 'result' as const,
        analysis_id: selectedAnalysis.id,
        confidence_score: selectedAnalysis.confidence_score ?? 0,
        insights: selectedAnalysis.insights,
        positioning_result: selectedAnalysis.positioning_result ?? undefined,
        recommendations: selectedAnalysis.recommendations ?? undefined,
        cost: {
          tokens: selectedAnalysis.tokens_used ?? 0,
          usd: selectedAnalysis.cost_usd ?? 0,
        },
      }
    : null)

  useEffect(() => {
    if (pageState === 'result' && displayResult && resultsSectionRef.current) {
      resultsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [pageState, displayResult])

  // Auto-start analysis when navigated from data-sources with state.autoStart.
  // Module-level set prevents double run when React Strict Mode double-mounts.
  useEffect(() => {
    const autoStart = (location.state as { autoStart?: boolean } | null)?.autoStart
    if (!projectId || !autoStart || !hasDataSources || pageState !== 'idle') return
    if (autoStartedProjectIds.has(projectId)) return
    autoStartedProjectIds.add(projectId)
    autoStartDoneRef.current = true
    handleStartAnalysis()
    return () => {
      autoStartedProjectIds.delete(projectId)
    }
  }, [projectId, hasDataSources, pageState, location.state])

  // When navigated from Project "View Last Analysis" (state.viewLatest), open the most recent analysis
  useEffect(() => {
    const viewLatest = (location.state as { viewLatest?: boolean } | null)?.viewLatest
    if (!viewLatest || !analysesList?.length || viewLatestHandledRef.current) return
    viewLatestHandledRef.current = true
    const sorted = [...analysesList].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const latestId = sorted[0].id
    setSelectedAnalysisId(latestId)
    setResult(null)
    setPageState('result')
  }, [analysesList, location.state])

  const handleSelectAnalysis = (id: string) => {
    setSelectedAnalysisId(id)
    setResult(null)
    setPageState('result')
  }

  const handleStartAnalysis = () => {
    if (!projectId || !hasDataSources) return
    setPageState('streaming')
    setStreamStage('Connecting…')
    setStreamPct(0)
    setResult(null)
    setErrorMessage(null)
    setSelectedAnalysisId(null)

    const promise = runStream({
      onProgress: (stage, pct) => {
        setStreamStage(stage)
        setStreamPct(pct)
      },
      onResult: (data) => {
        setResult(data)
        setStreamPct(100)
      },
      onDone: () => setPageState('result'),
      onError: (msg) => {
        setErrorMessage(msg)
        setPageState('error')
      },
    })
    promise?.catch(() => {
      setErrorMessage('Analysis failed. Please try again.')
      setPageState('error')
    })
  }

  if (projectLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  if (projectError || !project || !clientId || !projectId) {
    return <p role="alert">Project not found.</p>
  }

  if (!hasDataSources) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Add at least one data source to run analysis.
        </p>
        <Button asChild variant="outline">
          <Link to={`/${clientId}/${projectId}`}>Back to project</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Analysis</h1>
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link to={`/${clientId}/${projectId}`}>Back to project</Link>
        </Button>
      </div>

      {pageState === 'idle' && (
        <section aria-label="Start analysis">
          <Button onClick={handleStartAnalysis}>Start analysis</Button>
        </section>
      )}

      {pageState === 'streaming' && (
        <section aria-label="Analysis in progress" aria-busy="true">
          <p className="text-sm text-muted-foreground mb-2">
            Analyzing… {streamStage}
          </p>
          <div
            className="h-2 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={streamPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${streamPct} percent complete`}
            aria-label="Analysis progress"
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${streamPct}%` }}
            />
          </div>
        </section>
      )}

      {pageState === 'error' && (
        <section aria-label="Error">
          <p role="alert" className="text-destructive">
            {errorMessage ?? 'Analysis failed.'}
          </p>
          <Button onClick={handleStartAnalysis} variant="outline" className="mt-2">
            Try again
          </Button>
        </section>
      )}

      {pageState === 'result' && displayResult && (
        <section ref={resultsSectionRef} aria-label="Analysis results">
          <Tabs defaultValue="analysis" className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <TabsList>
                <TabsTrigger value="analysis">Analysis Summary</TabsTrigger>
                <TabsTrigger value="icp">ICP Summary</TabsTrigger>
              </TabsList>
              {project?.objective && (
                <Badge variant="outline" aria-label="Current project objective">
                  {OBJECTIVE_LABELS[project.objective] ?? project.objective}
                </Badge>
              )}
            </div>

            <TabsContent value="analysis" className="space-y-6">
              <AnalysisSummaryActions
                markdown={buildAnalysisSummaryMarkdown(displayResult, project?.name ?? '')}
                projectName={project?.name ?? ''}
              />
              <ConfidenceMeter score={displayResult.confidence_score} />
              {displayResult.cost.tokens > 0 && (
                <CostDisplay tokens={displayResult.cost.tokens} usd={displayResult.cost.usd} />
              )}
              {displayResult.positioning_result && (
                <PositioningSection positioning={displayResult.positioning_result} />
              )}
              <InsightsList insights={displayResult.insights} />
              {displayResult.recommendations && project && (
                <RecommendationsSection
                  recommendations={displayResult.recommendations}
                  projectName={project.name}
                />
              )}
              <ArtifactsSection analysisId={displayResult.analysis_id} />
              <Button onClick={handleStartAnalysis}>Run another analysis</Button>
            </TabsContent>

            <TabsContent value="icp">
              {(result?.icp_updated && !icp && icpFetching) ? (
                <p className="text-sm text-muted-foreground">Loading ICP…</p>
              ) : icp ? (
                <div className="space-y-2">
                  {icp.last_analyzed_at && (
                    <p className="text-sm text-muted-foreground">
                      Updated {new Date(icp.last_analyzed_at).toLocaleString()}
                    </p>
                  )}
                  <IcpCard icp={icp} projectName={project?.name ?? ''} />
                </div>
              ) : result?.icp_updated && !icpFetching ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No ICP data yet.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchIcp()} aria-label="Retry loading ICP">
                    Retry loading ICP
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No ICP data yet.</p>
              )}
            </TabsContent>
          </Tabs>
        </section>
      )}

      {analysesList && analysesList.length > 0 && (
        <section aria-label="Previous analyses">
          <h2 className="text-lg font-semibold mb-2">Previous analyses</h2>
          <ul className="list-none space-y-1">
            {analysesList.map((a) => (
              <li key={a.id}>
                <div className="flex items-center gap-2 w-full group">
                  <button
                    type="button"
                    onClick={() => handleSelectAnalysis(a.id)}
                    className="flex-1 text-left text-sm text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded py-1.5"
                  >
                    {new Date(a.created_at).toLocaleString()} — {a.confidence_score != null ? `${Math.round(a.confidence_score * 100)}%` : '—'}
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="View Analysis"
                        onClick={() => handleSelectAnalysis(a.id)}
                        className="shrink-0"
                      >
                        <Eye className="size-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">View Analysis</TooltipContent>
                  </Tooltip>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
