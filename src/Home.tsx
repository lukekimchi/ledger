import { useState, useEffect, useCallback } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Transaction, RecurringBill, Budget, weeklyEquivalent, CADENCE_SHORT, EXPENSE_CATEGORIES } from './types'
import AddSheet from './AddSheet'
import RecurringSheet from './RecurringSheet'
import SavingsChart from './SavingsChart'
import SettingsSheet from './SettingsSheet'
import BudgetView from './BudgetView'
import BudgetSheet from './BudgetSheet'

interface Props {
  session: Session
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function fmt(n: number): string {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function weekSavings(txs: Transaction[]): number {
  return txs.reduce((sum, t) => (t.type === 'income' ? sum + t.amount : sum - t.amount), 0)
}

type Tab = 'track' | 'bills' | 'budget'

export default function Home({ session }: Props) {
  const [tab, setTab] = useState<Tab>('track')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBudget, setShowBudget] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [addDefaultType, setAddDefaultType] = useState<'expense' | 'income' | 'recurring'>('expense')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  const fetchTransactions = useCallback(async () => {
    const monday = getMondayOfWeek(new Date())
    const fiveWeeksAgo = new Date(monday)
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 91) // 13 weeks for streak history

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', toDateStr(fiveWeeksAgo))
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    setTransactions(data ?? [])
    setLoading(false)
  }, [session.user.id])

  const fetchRecurringBills = useCallback(async () => {
    const { data } = await supabase
      .from('recurring_bills')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
    setRecurringBills(data ?? [])
  }, [session.user.id])

  const fetchBudgets = useCallback(async () => {
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
    setBudgets(data ?? [])
  }, [session.user.id])

  useEffect(() => {
    fetchTransactions()
    fetchRecurringBills()
    fetchBudgets()
  }, [fetchTransactions, fetchRecurringBills, fetchBudgets])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return
    setDeletingId(id)
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
  }

  const handleDeleteBill = async (id: string) => {
    if (!window.confirm('Delete this recurring bill?')) return
    setDeletingBillId(id)
    await supabase.from('recurring_bills').delete().eq('id', id)
    setRecurringBills(prev => prev.filter(b => b.id !== id))
    setDeletingBillId(null)
  }

  const now = new Date()
  const thisMonday = getMondayOfWeek(now)
  const thisSunday = new Date(thisMonday)
  thisSunday.setDate(thisMonday.getDate() + 6)
  const mondayStr = toDateStr(thisMonday)

  const thisWeekTx = transactions.filter(t => t.date >= mondayStr)
  const income = thisWeekTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const spent = thisWeekTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const totalRecurringWeekly = recurringBills.reduce(
    (sum, b) => sum + weeklyEquivalent(b.amount, b.cadence), 0
  )

  const savings = income - spent - totalRecurringWeekly
  const green = savings >= 0

  // Streak: consecutive positive completed weeks going back, skipping empty weeks
  const BUFFER_THRESHOLD = 50
  let pastStreak = 0
  for (let i = 1; i <= 12; i++) {
    const wStart = new Date(thisMonday)
    wStart.setDate(thisMonday.getDate() - i * 7)
    const wEnd = new Date(wStart)
    wEnd.setDate(wStart.getDate() + 6)
    const wTx = transactions.filter(t => t.date >= toDateStr(wStart) && t.date <= toDateStr(wEnd))
    if (wTx.length === 0) continue
    if (weekSavings(wTx) - totalRecurringWeekly > 0) pastStreak++
    else break
  }

  // Buffer: last completed week saved above threshold → free pass this week
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)
  const lastWeekTx = transactions.filter(t => t.date >= toDateStr(lastMonday) && t.date < mondayStr)
  const lastWeekNet = weekSavings(lastWeekTx) - totalRecurringWeekly
  const bufferAvailable = lastWeekNet > BUFFER_THRESHOLD

  const isBuffered = savings <= 0 && bufferAvailable && pastStreak > 0
  const bufferEarned = savings > BUFFER_THRESHOLD
  const streakCount = savings > 0 ? pastStreak + 1 : isBuffered ? pastStreak : 0

  const weekLabel = `${thisMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${thisSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  const weekBars = Array.from({ length: 5 }, (_, i) => {
    const wStart = new Date(thisMonday)
    wStart.setDate(wStart.getDate() - (4 - i) * 7)
    const wEnd = new Date(wStart)
    wEnd.setDate(wStart.getDate() + 6)
    const wTx = transactions.filter(t => t.date >= toDateStr(wStart) && t.date <= toDateStr(wEnd))
    const net = weekSavings(wTx) - totalRecurringWeekly
    const label = wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { label, net, isCurrent: i === 4 }
  })

  const unbudgetedCategories = EXPENSE_CATEGORIES.filter(c => !budgets.some(b => b.category === c))

  const openBudgetSheet = (b?: Budget) => {
    setEditingBudget(b ?? null)
    setShowBudget(true)
  }

  return (
    <div className="app">
      <main className="main">
        {tab === 'track' ? (
          <>
            {/* Weekly Status Card */}
            <div className={`status-card ${green ? 'status-green' : 'status-red'}`}>
              <div className="status-top">
                <div className="status-label">
                  {streakCount > 0
                    ? `${streakCount} WK STREAK${isBuffered ? ' · BUFFERED' : ''}${bufferEarned ? ' · BUFFER EARNED' : ''}`
                    : green ? '↑ SAVING · EFFECTIVE/WK' : '↓ OVERSPENDING · EFFECTIVE/WK'
                  }
                </div>
                <button className="gear-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="status-main">
                <div className="status-left">
                  <div className="status-amount">{green ? '+' : '−'}{fmt(savings)}</div>
                  <div className="status-week">{weekLabel}</div>
                </div>
                <div className="status-chart">
                  <SavingsChart bars={weekBars} dark={darkMode} mini />
                </div>
              </div>
              <div className="status-breakdown">
                <span>In {fmt(income)}</span>
                <span>Out {fmt(spent)}</span>
                {totalRecurringWeekly > 0 && <span>Bills −{fmt(totalRecurringWeekly)}/wk</span>}
              </div>
            </div>

            {/* Transactions */}
            <div className="tx-section">
              <h2 className="tx-heading">Transactions</h2>
              {loading ? (
                <p className="tx-empty">Loading…</p>
              ) : transactions.length === 0 ? (
                <p className="tx-empty">No transactions yet. Tap + to add one.</p>
              ) : (
                <ul className="tx-list">
                  {transactions.map(t => (
                    <li key={t.id} className="tx-item tx-item-tappable" onClick={() => { setEditingTransaction(t); setShowAdd(true) }}>
                      <div className="tx-left">
                        <span className="tx-category">{t.category}</span>
                        <span className="tx-date">{fmtShort(t.date)}{t.note ? ` · ${t.note}` : ''}</span>
                      </div>
                      <div className="tx-right">
                        <span className={`tx-amount ${t.type}`}>
                          {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                        </span>
                        <button
                          className="tx-delete"
                          onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                          disabled={deletingId === t.id}
                          aria-label="Delete"
                        >×</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : tab === 'bills' ? (
          <div className="recurring-section">
            <div className="recurring-header">
              <h2 className="recurring-heading">Recurring Bills</h2>
              {totalRecurringWeekly > 0 && (
                <span className="recurring-total">−{fmt(totalRecurringWeekly)}/wk</span>
              )}
            </div>
            <div className="bills-body">
              {recurringBills.length === 0 ? (
                <p className="tx-empty">No recurring bills yet. Tap + to add one.</p>
              ) : (
                <ul className="tx-list">
                  {recurringBills.map(b => (
                    <li key={b.id} className="tx-item tx-item-tappable" onClick={() => { setEditingBill(b); setShowRecurring(true) }}>
                      <div className="tx-left">
                        <span className="tx-category">{b.name}</span>
                        <span className="tx-date">{b.category} · {fmt(b.amount)}{CADENCE_SHORT[b.cadence]}</span>
                      </div>
                      <div className="tx-right">
                        <span className="tx-amount expense">{fmt(weeklyEquivalent(b.amount, b.cadence))}<span className="amount-unit">/wk</span></span>
                        <button
                          className="tx-delete"
                          onClick={e => { e.stopPropagation(); handleDeleteBill(b.id) }}
                          disabled={deletingBillId === b.id}
                          aria-label="Delete"
                        >×</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <BudgetView
            budgets={budgets}
            transactions={transactions}
            mondayStr={mondayStr}
            weekLabel={weekLabel}
            onEdit={openBudgetSheet}
          />
        )}
      </main>

      {/* Tab bar */}
      <nav className="tab-bar">
        <button className={`tab-btn${tab === 'track' ? ' active' : ''}`} onClick={() => setTab('track')}>
          Track
        </button>
        <button className={`tab-btn${tab === 'bills' ? ' active' : ''}`} onClick={() => setTab('bills')}>
          Bills
        </button>
        <button className={`tab-btn${tab === 'budget' ? ' active' : ''}`} onClick={() => setTab('budget')}>
          Limits
        </button>
      </nav>

      {/* FAB */}
      <button
        className="fab"
        onClick={() => {
          if (tab === 'budget') { openBudgetSheet(); return }
          setEditingTransaction(null)
          setAddDefaultType(tab === 'bills' ? 'recurring' : 'expense')
          setShowAdd(true)
        }}
        aria-label="Add"
      >+</button>

      {showAdd && (
        <AddSheet
          userId={session.user.id}
          transaction={editingTransaction ?? undefined}
          defaultType={editingTransaction ? undefined : addDefaultType}
          onClose={() => { setShowAdd(false); setEditingTransaction(null) }}
          onSaved={() => { setShowAdd(false); setEditingTransaction(null); fetchTransactions(); fetchRecurringBills() }}
        />
      )}

      {showRecurring && (
        <RecurringSheet
          userId={session.user.id}
          bill={editingBill ?? undefined}
          onClose={() => { setShowRecurring(false); setEditingBill(null) }}
          onSaved={() => { setShowRecurring(false); setEditingBill(null); fetchRecurringBills() }}
        />
      )}

      {showSettings && (
        <SettingsSheet
          darkMode={darkMode}
          onDarkMode={setDarkMode}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showBudget && (
        <BudgetSheet
          userId={session.user.id}
          budget={editingBudget ?? undefined}
          availableCategories={unbudgetedCategories}
          onClose={() => { setShowBudget(false); setEditingBudget(null) }}
          onSaved={() => { setShowBudget(false); setEditingBudget(null); fetchBudgets() }}
        />
      )}
    </div>
  )
}
