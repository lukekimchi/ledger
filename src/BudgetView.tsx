import { Transaction, Budget } from './types'

interface Props {
  budgets: Budget[]
  transactions: Transaction[]
  mondayStr: string
  weekLabel: string
  onEdit: (b: Budget) => void
}

function fmt(n: number): string {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function BudgetView({ budgets, transactions, mondayStr, weekLabel, onEdit }: Props) {
  if (budgets.length === 0) {
    return (
      <div className="budget-empty">
        <p>No budgets set yet.</p>
        <p>Tap + to set a weekly limit for a category.</p>
      </div>
    )
  }

  return (
    <div className="budget-list">
      <div className="budget-week-row">
        <span className="tx-heading">Budgets</span>
        <span className="tx-heading">{weekLabel}</span>
      </div>

      {budgets.map(b => {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category === b.category && t.date >= mondayStr)
          .reduce((sum, t) => sum + t.amount, 0)

        const pct = Math.min((spent / b.weekly_amount) * 100, 100)
        const over = spent > b.weekly_amount
        const remaining = Math.abs(b.weekly_amount - spent)

        return (
          <div key={b.id} className="budget-item" onClick={() => onEdit(b)}>
            <div className="budget-item-header">
              <span className="budget-cat">{b.category}</span>
              <span className={`budget-remaining ${over ? 'over' : ''}`}>
                {over ? `${fmt(remaining)} over` : `${fmt(remaining)} left`}
              </span>
            </div>
            <div className="budget-bar-track">
              <div
                className={`budget-bar-fill ${over ? 'over' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="budget-item-sub">
              {fmt(spent)} spent of {fmt(b.weekly_amount)}/wk
            </div>
          </div>
        )
      })}
    </div>
  )
}
