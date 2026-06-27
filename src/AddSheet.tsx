import { useState } from 'react'
import { supabase } from './supabase'
import { Transaction, EXPENSE_CATEGORIES } from './types'

interface Props {
  userId: string
  transaction?: Transaction
  onClose: () => void
  onSaved: () => void
}

function initCategory(tx?: Transaction): string {
  if (!tx || tx.type === 'income') return 'Groceries'
  return (EXPENSE_CATEGORIES as readonly string[]).includes(tx.category) ? tx.category : ''
}

function initCustomCategory(tx?: Transaction): string {
  if (!tx || tx.type === 'income') return ''
  return (EXPENSE_CATEGORIES as readonly string[]).includes(tx.category) ? '' : tx.category
}

export default function AddSheet({ userId, transaction, onClose, onSaved }: Props) {
  const isEdit = !!transaction
  const [type, setType] = useState<'expense' | 'income'>(transaction?.type ?? 'expense')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [category, setCategory] = useState<string>(initCategory(transaction))
  const [customCategory, setCustomCategory] = useState(initCustomCategory(transaction))
  const [note, setNote] = useState(transaction?.note ?? '')
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const finalCategory = customCategory.trim() || category

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSaving(true)
    const payload = {
      type,
      amount: amt,
      category: type === 'income' ? 'Income' : finalCategory,
      note: note.trim() || null,
      date,
    }
    if (isEdit) {
      await supabase.from('transactions').update(payload).eq('id', transaction!.id)
    } else {
      await supabase.from('transactions').insert({ user_id: userId, ...payload })
    }
    onSaved()
  }

  const handleRemove = async () => {
    if (!transaction) return
    setRemoving(true)
    await supabase.from('transactions').delete().eq('id', transaction.id)
    onSaved()
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="type-toggle">
          <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>
            Expense
          </button>
          <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>
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
          <>
            <div className="sheet-section-label">Category</div>
            <div className="categories">
              {EXPENSE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`cat-btn${category === cat && !customCategory ? ' active' : ''}`}
                  onClick={() => { setCategory(cat); setCustomCategory('') }}
                >
                  {cat}
                </button>
              ))}
              <input
                type="text"
                className={`cat-btn cat-custom${customCategory ? ' active' : ''}`}
                placeholder="Custom…"
                value={customCategory}
                onChange={e => {
                  setCustomCategory(e.target.value)
                  if (e.target.value) setCategory('')
                }}
              />
            </div>
          </>
        )}

        <div className="sheet-section-label">Note</div>
        <input
          type="text"
          className="field-input"
          placeholder="Optional"
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        <div className="sheet-section-label">Date</div>
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
          {saving ? '…' : isEdit ? 'Update Transaction' : type === 'income' ? 'Add Income' : 'Add Expense'}
        </button>

        {isEdit && (
          <button className="signout-btn" onClick={handleRemove} disabled={removing}>
            {removing ? '…' : 'Delete Transaction'}
          </button>
        )}
      </div>
    </div>
  )
}
