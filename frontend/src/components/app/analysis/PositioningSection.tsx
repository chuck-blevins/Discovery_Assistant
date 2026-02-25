import type { PositioningResultResponse } from '@/types/api'

interface Props {
  positioning: PositioningResultResponse
}

export function PositioningSection({ positioning }: Props) {
  const { value_drivers, alternative_angles, recommended_interviews } = positioning
  const isEmpty =
    value_drivers.length === 0 &&
    alternative_angles.length === 0 &&
    recommended_interviews.length === 0

  return (
    <section aria-label="Positioning" className="space-y-4">
      <h2 className="text-lg font-semibold">Positioning</h2>

      {isEmpty && (
        <p className="text-sm text-muted-foreground">No positioning insights.</p>
      )}

      {value_drivers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Value drivers</h3>
          <ul className="list-none space-y-2">
            {value_drivers.map((vd, i) => (
              <li key={i} className="border-b border-border/50 py-2 last:border-0">
                <p className="text-sm">{vd.text}</p>
                <span className="text-xs text-muted-foreground">
                  {vd.frequency_count} source{vd.frequency_count !== 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alternative_angles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Alternative angles</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            {alternative_angles.map((angle, i) => (
              <li key={i}>{angle}</li>
            ))}
          </ul>
        </div>
      )}

      {recommended_interviews.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Recommended interviews</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            {recommended_interviews.map((role, i) => (
              <li key={i}>{role}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
