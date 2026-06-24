import { useState } from 'react'
import { supabase } from './supabase'
import { EXPENSE_CATEGORIES } from './types'

interface Props {
  userId: string
  onClose: () => void
  onSaved: () => void
}

export default function AddSheet({ userId, onClose, onSaved }: Props) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('Groceries')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSaving(true)
    await supabase.from('transactions').insert({
      user_id: userId,
      type,
      amount: amt,
      category: type === 'income' ? 'Income' : category,
      note: note.trim() || null,
      date,
    })
    onSaved()
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="type-toggle">
          <button
            className={type === 'expense' ? 'active' : ''}
            onClick={() => setType('expense')}
          >
            Expense
          </button>
          <button
            className={type === 'income' ? 'active' : ''}
            onClick={() => setType('income')}
          >
            Income
          </button>
        </div>

        <div className="amount-row">
          <span className="amount-prefix">$</span>
          <input
            className="amount-input"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        {type === 'expense' && (
          <div className="categories">
            {EXPENSE_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`cat-btn${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <input
          type="text"
          className="field-input"
          placeholder="Note (optional)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        <input
          type="date"
          className="field-input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        <button
          className={`save-btn save-${type}`}
          onClick={handleSave}
          disabled={saving || !amount || parseFloat(amount) <= 0}
        >
          {saving ? '…' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
        </button>
      </div>
    </div>
  )
}
