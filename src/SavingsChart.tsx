interface Bar {
  label: string
  net: number
  isCurrent: boolean
}

interface Props {
  bars: Bar[]
  dark?: boolean
  mini?: boolean
}

export default function SavingsChart({ bars, dark = false }: Props) {
  const W = 100
  const H = 42
  const PT = 4
  const PB = 4
  const PS = 2

  const innerW = W - PS * 2
  const innerH = H - PT - PB

  const vals = bars.map(b => b.net)
  const maxVal = Math.max(...vals)
  const minVal = Math.min(...vals)
  const range = maxVal - minVal || 1

  const n = bars.length
  const slotW = innerW / n

  const toY = (v: number) => PT + ((maxVal - v) / range) * innerH

  const points = bars
    .map((bar, i) => `${PS + slotW * i + slotW / 2},${toY(bar.net)}`)
    .join(' ')

  const lastBar = bars[bars.length - 1]
  const dotX = PS + slotW * (n - 1) + slotW / 2
  const dotY = toY(lastBar.net)

  const zeroY = toY(0)
  const showZero = zeroY > PT + 2 && zeroY < H - PB - 2

  const lineColor = dark ? 'rgba(255,255,255,0.85)' : 'rgba(13,13,26,0.7)'
  const dotColor  = dark ? 'white' : '#1B35E8'
  const zeroColor = dark ? 'rgba(255,255,255,0.12)' : 'rgba(13,13,26,0.1)'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {showZero && (
        <line
          x1={PS} y1={zeroY} x2={W - PS} y2={zeroY}
          stroke={zeroColor} strokeWidth={1} strokeDasharray="3 3"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={dotX} cy={dotY} r={2.5} fill={dotColor} />
    </svg>
  )
}
