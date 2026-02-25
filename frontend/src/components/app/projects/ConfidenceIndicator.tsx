import { getConfidenceState } from '@/types/api'

export const CONFIDENCE_COLORS = {
  none: '#a1a1aa',   // zinc-400
  red: '#ef4444',    // red-500
  amber: '#f59e0b',  // amber-500
  green: '#10b981',  // emerald-500
} as const

export function getConfidenceColor(score: number | null): string {
  return CONFIDENCE_COLORS[getConfidenceState(score)]
}

interface Props {
  score: number | null
}

export function ConfidenceIndicator({ score }: Props) {
  const color = getConfidenceColor(score)
  const label =
    score !== null ? `${Math.round(score * 100)}% confidence` : 'Not yet analyzed'
  return (
    <div
      className="w-1 self-stretch rounded-sm flex-shrink-0"
      style={{ backgroundColor: color }}
      aria-label={label}
      role="img"
    />
  )
}
