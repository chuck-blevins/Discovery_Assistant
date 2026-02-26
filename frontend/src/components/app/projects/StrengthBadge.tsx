import { Badge } from '@/components/ui/badge'
import type { StrengthOfSupport } from '@/types/api'

interface StrengthBadgeProps {
  strength: StrengthOfSupport | null | undefined
}

/** Renders strength-of-support as text + subtle color (NFR-A3: not color alone). */
export function StrengthBadge({ strength }: StrengthBadgeProps) {
  if (strength == null) {
    return <span className="text-muted-foreground text-xs" aria-label="No strength">—</span>
  }
  const label = strength === 'strong' ? 'Strong' : strength === 'emerging' ? 'Emerging' : 'Weak'
  const variant = strength === 'strong' ? 'default' : strength === 'emerging' ? 'secondary' : 'outline'
  return (
    <Badge variant={variant} className="text-xs font-normal" aria-label={`Strength: ${label}`}>
      {label}
    </Badge>
  )
}
