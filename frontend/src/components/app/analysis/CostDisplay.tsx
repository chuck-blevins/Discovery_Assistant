interface Props {
  tokens: number
  usd: number
}

export function CostDisplay({ tokens, usd }: Props) {
  return (
    <p className="text-sm text-muted-foreground">
      <span className="tabular-nums">{tokens.toLocaleString()}</span> tokens
      {' · '}
      <span className="tabular-nums">${usd.toFixed(2)}</span>
    </p>
  )
}
