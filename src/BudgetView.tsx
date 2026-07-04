import { Transaction, Budget } from './types'

interface Props {
  budgets: Budget[]
  transactions: Transaction[]
  mondayStr: string
  weekLabel: string
  onEdit: (b: Budget, rollover: number) => void
}

function fmt(n: number): string {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function BudgetView({ budgets, transactions, mondayStr, weekLabel, onEdit }: Props) {
  if (budgets.length === 0) {
    return (
      <div className="budget-empty">
        <p>No limits set yet.</p>
        <p>Tap + to set a weekly spending limit for a category.</p>
      </div>
    )
  }

  const thisMonday = new Date(mondayStr + 'T12:00:00')
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)
  const lastMondayStr = toDateStr(lastMonday)
  const lastSundayStr = toDateStr(new Date(thisMonday.getTime() - 24 * 60 * 60 * 1000))

  // Only apply rolling if the user logged anything at all last week (not first week / inactive week)
  const hadActivityLastWeek = transactions.some(
    t => t.date >= lastMondayStr && t.date <= lastSundayStr
  )

  return (
    <div className="budget-list">
      <div className="budget-week-row">
        <span className="tx-heading" style={{ fontSize: '16px', letterSpacing: '-0.02em' }}>Spending Limits</span>
        <span className="budget-week-label">{weekLabel}</span>
      </div>

      {budgets.map(b => {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category === b.category && t.date >= mondayStr)
          .reduce((sum, t) => sum + t.amount, 0)

        const lastWeekSpent = transactions
          .filter(t => t.type === 'expense' && t.category === b.category &&
            t.date >= lastMondayStr && t.date <= lastSundayStr)
          .reduce((sum, t) => sum + t.amount, 0)

        const alreadyReset = b.rollover_reset_week === mondayStr
        const rollover = (hadActivityLastWeek && !alreadyReset) ? b.weekly_amount - lastWeekSpent : 0
        const effectiveLimit = Math.max(0, b.weekly_amount + rollover)

        const pct = effectiveLimit > 0 ? Math.min((spent / effectiveLimit) * 100, 100) : 100
        const over = spent > effectiveLimit
        const remaining = Math.abs(effectiveLimit - spent)
        const showRollover = hadActivityLastWeek && rollover !== 0

        return (
          <div key={b.id} className="budget-item" onClick={() => onEdit(b, rollover)}>
            <div className="budget-item-header">
              <span className="budget-cat">{b.category}</span>
              <span className={`budget-remaining ${over ? 'over' : ''}`}>
                {fmt(remaining)}<span className="amount-unit">{over ? ' over' : ' left'}</span>
              </span>
            </div>
            <div className="budget-bar-track">
              <div
                className={`budget-bar-fill ${over ? 'over' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="budget-item-sub">
              {fmt(spent)} spent · {fmt(effectiveLimit)} limit
              {showRollover && (
                <span className={rollover > 0 ? 'rollover-bonus' : 'rollover-penalty'}>
                  {' '}{rollover > 0 ? `+${fmt(rollover)}` : `−${fmt(Math.abs(rollover))}`} rollover
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
