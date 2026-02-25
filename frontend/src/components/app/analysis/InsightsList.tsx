import type { InsightResponse, InsightType } from '@/types/api'
import { Badge } from '@/components/ui/badge'

const TYPE_LABELS: Record<InsightType, string> = {
  finding: 'Finding',
  contradiction: 'Contradiction',
  gap: 'Data gap',
}

const TYPE_VARIANTS: Record<InsightType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  finding: 'default',
  contradiction: 'destructive',
  gap: 'outline',
}

interface Props {
  insights: InsightResponse[]
}

function InsightRow({ insight }: { insight: InsightResponse }) {
  return (
    <li className="border-b border-border/50 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Badge variant={TYPE_VARIANTS[insight.type]}>{TYPE_LABELS[insight.type]}</Badge>
        {insight.citation && (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
            {insight.citation}
          </code>
        )}
      </div>
      <p className="text-sm">{insight.text}</p>
    </li>
  )
}

export function InsightsList({ insights }: Props) {
  const findings = insights.filter((i) => i.type === 'finding')
  const contradictions = insights.filter((i) => i.type === 'contradiction')
  const gaps = insights.filter((i) => i.type === 'gap')

  return (
    <div className="space-y-4">
      {findings.length > 0 && (
        <section aria-label="Findings">
          <h3 className="text-sm font-semibold mb-2">Findings</h3>
          <ul className="list-none">
            {findings.map((i) => (
              <InsightRow key={i.id} insight={i} />
            ))}
          </ul>
        </section>
      )}
      {contradictions.length > 0 && (
        <section aria-label="Contradictions">
          <h3 className="text-sm font-semibold mb-2">Contradictions</h3>
          <ul className="list-none">
            {contradictions.map((i) => (
              <InsightRow key={i.id} insight={i} />
            ))}
          </ul>
        </section>
      )}
      {gaps.length > 0 && (
        <section aria-label="Data gaps">
          <h3 className="text-sm font-semibold mb-2">Data gaps</h3>
          <ul className="list-none">
            {gaps.map((i) => (
              <InsightRow key={i.id} insight={i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
