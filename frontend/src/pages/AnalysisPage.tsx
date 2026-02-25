import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfidenceMeter } from '@/components/app/analysis/ConfidenceMeter'
import { InsightsList } from '@/components/app/analysis/InsightsList'
import { CostDisplay } from '@/components/app/analysis/CostDisplay'
import { PositioningSection } from '@/components/app/analysis/PositioningSection'
import { RecommendationsSection } from '@/components/app/analysis/RecommendationsSection'
import { ArtifactsSection } from '@/components/app/analysis/ArtifactsSection'
import { useProject } from '@/hooks/useProjects'
import { useDataSources } from '@/hooks/useDataSources'
import { useAnalyses, useAnalysis, useRunAnalysisStream } from '@/hooks/useAnalyses'
import type { SSEResultEvent } from '@/api/analyses'

type PageState = 'idle' | 'streaming' | 'result' | 'error'

export default function AnalysisPage() {
  const { clientId, projectId } = useParams<{ clientId: string; projectId: string }>()
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
  const resultsSectionRef = useRef<HTMLDivElement>(null)

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
        <section ref={resultsSectionRef} aria-label="Analysis results" className="space-y-6">
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
        </section>
      )}

      {analysesList && analysesList.length > 0 && (
        <section aria-label="Previous analyses">
          <h2 className="text-lg font-semibold mb-2">Previous analyses</h2>
          <ul className="list-none space-y-1">
            {analysesList.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAnalysisId(a.id)
                    setResult(null)
                    setPageState('result')
                  }}
                  className="text-left text-sm text-primary hover:underline"
                >
                  {new Date(a.created_at).toLocaleString()} — {a.confidence_score != null ? `${Math.round(a.confidence_score * 100)}%` : '—'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
