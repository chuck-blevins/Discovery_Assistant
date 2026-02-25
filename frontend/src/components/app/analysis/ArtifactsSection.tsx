import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { generateArtifacts, listArtifacts, downloadArtifact } from '@/api/analyses'
import type { ArtifactSummaryResponse } from '@/api/analyses'

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  interview_script: 'Interview script',
  survey_template: 'Survey template',
  persona_template: 'Persona template',
  icp_summary: 'ICP summary',
  positioning_statement: 'Positioning statement',
}

interface Props {
  analysisId: string
}

export function ArtifactsSection({ analysisId }: Props) {
  const [artifacts, setArtifacts] = useState<ArtifactSummaryResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listArtifacts(analysisId)
      setArtifacts(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load artifacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (analysisId) fetchList()
  }, [analysisId])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      await generateArtifacts(analysisId)
      await fetchList()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate artifacts')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section aria-label="Artifacts" className="space-y-4">
      <h2 className="text-lg font-semibold">Artifacts</h2>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-muted-foreground">Loading artifacts…</p>}
      {!loading && artifacts.length === 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Generate one-click download artifacts (interview script, survey, persona, ICP, positioning).
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate artifacts'}
          </Button>
        </div>
      )}
      {!loading && artifacts.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={handleGenerate} variant="outline" size="sm" disabled={generating}>
              {generating ? 'Generating…' : 'Generate again'}
            </Button>
          </div>
          <ul className="list-none space-y-2">
            {artifacts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                <span className="text-sm">
                  {ARTIFACT_TYPE_LABELS[a.artifact_type] ?? a.artifact_type} — {new Date(a.generated_at).toLocaleString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadArtifact(a.id, a.file_name)}
                >
                  Download .md
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
