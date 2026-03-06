import type { InsightResponse, PositioningResultResponse, RecommendationsResponse } from '@/types/api'

interface AnalysisResultForMarkdown {
  confidence_score: number
  insights: InsightResponse[]
  positioning_result?: PositioningResultResponse
  recommendations?: RecommendationsResponse
}

export function buildAnalysisSummaryMarkdown(
  result: AnalysisResultForMarkdown,
  projectName: string
): string {
  const lines: string[] = []

  lines.push(`# Analysis Summary — ${projectName}`)
  lines.push('')
  lines.push(`**Confidence:** ${Math.round(result.confidence_score * 100)}%`)
  lines.push('')

  // Positioning
  const pos = result.positioning_result
  if (pos) {
    const hasPositioning =
      pos.value_drivers.length > 0 ||
      pos.alternative_angles.length > 0 ||
      pos.recommended_interviews.length > 0

    if (hasPositioning) {
      lines.push('## Positioning')
      lines.push('')

      if (pos.value_drivers.length > 0) {
        lines.push('### Value Drivers')
        lines.push('')
        for (const vd of pos.value_drivers) {
          lines.push(`- ${vd.text} _(${vd.frequency_count} source${vd.frequency_count !== 1 ? 's' : ''})_`)
        }
        lines.push('')
      }

      if (pos.alternative_angles.length > 0) {
        lines.push('### Alternative Angles')
        lines.push('')
        for (const angle of pos.alternative_angles) {
          lines.push(`- ${angle}`)
        }
        lines.push('')
      }

      if (pos.recommended_interviews.length > 0) {
        lines.push('### Recommended Interviews')
        lines.push('')
        for (const role of pos.recommended_interviews) {
          lines.push(`- ${role}`)
        }
        lines.push('')
      }
    }
  }

  // Insights by type
  const findings = result.insights.filter((i) => i.type === 'finding')
  const contradictions = result.insights.filter((i) => i.type === 'contradiction')
  const gaps = result.insights.filter((i) => i.type === 'gap')

  if (findings.length > 0) {
    lines.push('## Findings')
    lines.push('')
    for (const insight of findings) {
      const citation = insight.citation ? ` _(${insight.citation})_` : ''
      lines.push(`- ${insight.text}${citation}`)
    }
    lines.push('')
  }

  if (contradictions.length > 0) {
    lines.push('## Contradictions')
    lines.push('')
    for (const insight of contradictions) {
      const citation = insight.citation ? ` _(${insight.citation})_` : ''
      lines.push(`- ${insight.text}${citation}`)
    }
    lines.push('')
  }

  if (gaps.length > 0) {
    lines.push('## Data Gaps')
    lines.push('')
    for (const insight of gaps) {
      const citation = insight.citation ? ` _(${insight.citation})_` : ''
      lines.push(`- ${insight.text}${citation}`)
    }
    lines.push('')
  }

  // Next steps
  const rec = result.recommendations
  if (rec) {
    const hasNextSteps =
      rec.action_items.length > 0 || rec.suggested_next_objective != null

    if (hasNextSteps) {
      lines.push('## Next Steps')
      lines.push('')

      if (rec.action_items.length > 0) {
        lines.push('### Recommended Actions')
        lines.push('')
        for (const item of rec.action_items) {
          lines.push(`- ${item}`)
        }
        lines.push('')
      }

      if (rec.suggested_next_objective) {
        lines.push(`**Suggested next objective:** ${rec.suggested_next_objective}`)
        lines.push('')
      }
    }
  }

  return lines.join('\n').trimEnd()
}
