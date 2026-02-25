import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { RecommendationsResponse } from '@/types/api'

const OBJECTIVE_LABELS: Record<string, string> = {
  'problem-validation': 'Problem validation',
  positioning: 'Positioning',
  'persona-buildout': 'Persona buildout',
  'icp-refinement': 'ICP refinement',
}

interface Props {
  recommendations: RecommendationsResponse
  projectName: string
}

function downloadMarkdown(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function RecommendationsSection({ recommendations, projectName }: Props) {
  const {
    action_items,
    interview_script_md,
    survey_template_md,
    can_create_next_project,
    suggested_next_objective,
  } = recommendations

  const safeName = projectName.replace(/\s+/g, '-')
  const hasDownloads = (interview_script_md?.trim()?.length ?? 0) > 0 || (survey_template_md?.trim()?.length ?? 0) > 0

  return (
    <section aria-label="Next steps" className="space-y-4">
      <h2 className="text-lg font-semibold">Next steps</h2>

      {action_items.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Recommended actions</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            {action_items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {suggested_next_objective && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Suggested next objective:</span>
          <Badge variant="secondary">
            {OBJECTIVE_LABELS[suggested_next_objective] ?? suggested_next_objective}
          </Badge>
        </div>
      )}

      {can_create_next_project && !suggested_next_objective && (
        <p className="text-sm text-muted-foreground">
          Confidence is sufficient to consider starting a follow-up project with a new objective.
        </p>
      )}

      {hasDownloads && (
        <div className="flex flex-wrap gap-2">
          {interview_script_md?.trim() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadMarkdown(
                  interview_script_md.replace(/\\n/g, '\n'),
                  `interview-script-${safeName}.md`
                )
              }
            >
              Interview script (.md)
            </Button>
          )}
          {survey_template_md?.trim() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadMarkdown(
                  survey_template_md.replace(/\\n/g, '\n'),
                  `survey-template-${safeName}.md`
                )
              }
            >
              Survey template (.md)
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
