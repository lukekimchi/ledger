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

const GREEN = '#22c55e'
const RED = '#ef4444'

export default function SavingsChart({ bars, dark = false, mini = false }: Props) {
  const W = mini ? 130 : 320
  const H = mini ? 100 : 130
  const PT = mini ? 6 : 8
  const PB = mini ? 22 : 28
  const PS = mini ? 4 : 8

  const innerW = W - PS * 2
  const innerH = H - PT - PB

  const vals = bars.map(b => b.net)
  const maxVal = Math.max(0, ...vals)
  const minVal = Math.min(0, ...vals)
  const range = maxVal - minVal || 1

  const zeroY = PT + (maxVal / range) * innerH
  const n = bars.length
  const slotW = innerW / n
  const barW = Math.min(slotW * 0.52, mini ? 16 : 38)

  const zeroLineColor = dark ? 'rgba(255,255,255,0.2)' : '#e0e0e0'
  const labelCurrent = dark ? 'rgba(255,255,255,0.9)' : '#0a0a0a'
  const labelPast = dark ? 'rgba(255,255,255,0.35)' : '#aaaaaa'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line
        x1={PS} y1={zeroY}
        x2={W - PS} y2={zeroY}
        stroke={zeroLineColor}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />

      {bars.map((bar, i) => {
        const cx = PS + slotW * i + slotW / 2
        const rawH = Math.abs((bar.net / range) * innerH)
        const barH = bar.net !== 0 ? Math.max(rawH, 3) : 0
        const isPos = bar.net >= 0
        const color = isPos ? GREEN : RED
        const barY = isPos ? zeroY - barH : zeroY

        return (
          <g key={i}>
            {barH > 0 && (
              <rect
                x={cx - barW / 2}
                y={barY}
                width={barW}
                height={barH}
                rx={mini ? 3 : 5}
                fill={color}
                opacity={bar.isCurrent ? 1 : dark ? 0.55 : 0.5}
              />
            )}
            <text
              x={cx}
              y={H - 5}
              textAnchor="middle"
              fontSize={mini ? 11 : 9}
              fill={bar.isCurrent ? labelCurrent : labelPast}
              fontWeight={bar.isCurrent ? '700' : '400'}
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            >
              {mini
                ? (bar.isCurrent ? '●' : (bar.label.split(' ')[1] ?? bar.label))
                : (bar.isCurrent ? 'This wk' : bar.label)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
