export function Sparkline({ values, color = 'currentColor' }: { values: number[]; color?: string }) {
  const w = 120
  const h = 32
  if (values.length < 2) return <div style={{ height: h }} aria-hidden />
  const max = Math.max(...values, 1)
  const n = values.length
  const pts = values.map((v, i) => [(i / (n - 1)) * w, h - 2 - (v / max) * (h - 4)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w} ${h} L0 ${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden style={{ color }}>
      <path d={area} fill="currentColor" opacity="0.12" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
