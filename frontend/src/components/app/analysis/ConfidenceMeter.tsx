import { getConfidenceColor } from '@/components/app/projects/ConfidenceIndicator'

interface Props {
  score: number | null
  showBar?: boolean
}

export function ConfidenceMeter({ score, showBar = true }: Props) {
  const pct = score !== null ? Math.round(score * 100) : 0
  const color = getConfidenceColor(score)

  const summaryLabel =
    score === null
      ? 'Not yet analyzed'
      : score < 0.5
        ? 'Needs more data'
        : score < 0.75
          ? 'Emerging'
          : 'Problem validated'

  return (
    <div className="space-y-1" aria-label={`Confidence: ${pct}% - ${summaryLabel}`}>
      <div className="flex items-center gap-2">
        <span className="font-semibold tabular-nums" style={{ color }}>
          {pct}%
        </span>
        <span className="text-sm text-muted-foreground">{summaryLabel}</span>
      </div>
      {showBar && (
        <div
          className="h-2 w-full rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${pct} percent confidence`}
          aria-label="Confidence percentage"
        >
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  )
}
