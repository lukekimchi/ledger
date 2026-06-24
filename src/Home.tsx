import { useState, useEffect, useCallback } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Transaction } from './types'
import AddSheet from './AddSheet'

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

export default function Home({ session }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    const monday = getMondayOfWeek(new Date())
    const fiveWeeksAgo = new Date(monday)
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35)

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

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return
    setDeletingId(id)
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
  }

  const now = new Date()
  const thisMonday = getMondayOfWeek(now)
  const thisSunday = new Date(thisMonday)
  thisSunday.setDate(thisMonday.getDate() + 6)

  const thisWeekTx = transactions.filter(t => t.date >= toDateStr(thisMonday))
  const income = thisWeekTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const spent = thisWeekTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savings = income - spent
  const green = savings >= 0

  const weekLabel = `${thisMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${thisSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  // Past 4 complete weeks dots (oldest → newest, ending last week)
  const pastWeekDots = Array.from({ length: 4 }, (_, i) => {
    const wStart = new Date(thisMonday)
    wStart.setDate(wStart.getDate() - (4 - i) * 7)
    const wEnd = new Date(wStart)
    wEnd.setDate(wStart.getDate() + 6)
    const wTx = transactions.filter(t => t.date >= toDateStr(wStart) && t.date <= toDateStr(wEnd))
    return weekSavings(wTx) >= 0
  })

  return (
    <div className="app">
      <header className="header">
        <span className="header-logo">L</span>
        <span className="header-title">Ledger</span>
        <button className="btn-signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>

      <main className="main">
        {/* Weekly Status Card */}
        <div className={`status-card ${green ? 'status-green' : 'status-red'}`}>
          <div className="status-label">{green ? '↑ SAVING' : '↓ OVERSPENDING'}</div>
          <div className="status-amount">
            {green ? '+' : '−'}{fmt(savings)}
          </div>
          <div className="status-week">{weekLabel}</div>
          <div className="status-breakdown">
            <span>In: {fmt(income)}</span>
            <span>Out: {fmt(spent)}</span>
          </div>
        </div>

        {/* Past 4 weeks dots */}
        <div className="week-history">
          <span className="week-history-label">past 4 weeks</span>
          <div className="week-dots">
            {pastWeekDots.map((isGreen, i) => (
              <span key={i} className={`dot ${isGreen ? 'dot-green' : 'dot-red'}`} title={isGreen ? 'Saved' : 'Overspent'} />
            ))}
          </div>
        </div>

        {/* Transaction list */}
        <div className="tx-section">
          <h2 className="tx-heading">Transactions</h2>
          {loading ? (
            <p className="tx-empty">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="tx-empty">No transactions yet. Tap + to add one.</p>
          ) : (
            <ul className="tx-list">
              {transactions.map(t => (
                <li key={t.id} className="tx-item">
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
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      aria-label="Delete"
                    >×</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add transaction">+</button>

      {showAdd && (
        <AddSheet
          userId={session.user.id}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchTransactions() }}
        />
      )}
    </div>
  )
}
