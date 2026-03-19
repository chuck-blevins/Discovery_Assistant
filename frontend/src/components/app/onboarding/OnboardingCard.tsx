import { Badge } from '@/components/ui/badge'
import { ConfidenceMeter } from '@/components/app/analysis/ConfidenceMeter'
import type { OnboardingSummaryResponse } from '@/types/api'

interface OnboardingCardProps {
  onboarding: OnboardingSummaryResponse
}

export function OnboardingCard({ onboarding }: OnboardingCardProps) {
  return (
    <div className="space-y-6">
      {/* Confidence */}
      {onboarding.confidence_score != null && (
        <ConfidenceMeter score={onboarding.confidence_score} />
      )}

      {/* Summary */}
      {onboarding.summary && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Summary
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{onboarding.summary}</p>
        </section>
      )}

      {/* Themes */}
      {onboarding.themes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Recurring Themes
          </h3>
          <ul className="space-y-2">
            {onboarding.themes.map((t, i) => (
              <li key={i} className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="flex-1">{t.text}</span>
                {t.frequency > 1 && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    ×{t.frequency}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Interest Points */}
      {onboarding.interest_points.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Key Interests &amp; Priorities
          </h3>
          <ul className="space-y-1.5">
            {onboarding.interest_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Gaps */}
      {onboarding.gaps.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Gaps &amp; Blind Spots
          </h3>
          <ul className="space-y-1.5">
            {onboarding.gaps.map((gap, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                {gap}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
