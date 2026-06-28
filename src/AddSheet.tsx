import { useState } from 'react'
import { supabase } from './supabase'
import { Transaction, EXPENSE_CATEGORIES, CADENCE_LABELS, RecurringCadence } from './types'

interface Props {
  userId: string
  transaction?: Transaction
  defaultType?: EntryType
  onClose: () => void
  onSaved: () => void
}

type EntryType = 'expense' | 'income' | 'recurring'

const CADENCES: RecurringCadence[] = ['weekly', 'fortnightly', 'monthly', 'annually']

function initCategory(tx?: Transaction): string {
  if (!tx || tx.type === 'income') return 'Groceries'
  return (EXPENSE_CATEGORIES as readonly string[]).includes(tx.category) ? tx.category : ''
}

function initCustomCategory(tx?: Transaction): string {
  if (!tx || tx.type === 'income') return ''
  return (EXPENSE_CATEGORIES as readonly string[]).includes(tx.category) ? '' : tx.category
}

export default function AddSheet({ userId, transaction, defaultType, onClose, onSaved }: Props) {
  const isEdit = !!transaction
  const [type, setType] = useState<EntryType>(transaction?.type ?? defaultType ?? 'expense')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [category, setCategory] = useState<string>(initCategory(transaction))
  const [customCategory, setCustomCategory] = useState(initCustomCategory(transaction))
  const [note, setNote] = useState(transaction?.note ?? '')
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().split('T')[0])
  const [recurName, setRecurName] = useState('')
  const [cadence, setCadence] = useState<RecurringCadence>('monthly')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const finalCategory = customCategory.trim() || category

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    if (type === 'recurring' && !recurName.trim()) return
    setSaving(true)

    if (type === 'recurring') {
      await supabase.from('recurring_bills').insert({
        user_id: userId,
        name: recurName.trim(),
        amount: amt,
        category: finalCategory,
        cadence,
      })
    } else {
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
    }
    onSaved()
  }

  const handleRemove = async () => {
    if (!transaction) return
    setRemoving(true)
    await supabase.from('transactions').delete().eq('id', transaction.id)
    onSaved()
  }

  const saveLabel = () => {
    if (saving) return '…'
    if (type === 'recurring') return 'Add Recurring Bill'
    if (isEdit) return 'Update Transaction'
    return type === 'income' ? 'Add Income' : 'Add Expense'
  }

  const canSave = !!amount && parseFloat(amount) > 0 && (type !== 'recurring' || !!recurName.trim())

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
          {!isEdit && (
            <button className={type === 'recurring' ? 'active' : ''} onClick={() => setType('recurring')}>
              Recurring
            </button>
          )}
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
          {type === 'recurring' && <span className="amount-suffix">/bill</span>}
        </div>

        {type === 'recurring' ? (
          <>
            <div className="sheet-section-label">Name</div>
            <input
              type="text"
              className="field-input"
              placeholder="e.g. Rent, Netflix"
              value={recurName}
              onChange={e => setRecurName(e.target.value)}
            />

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

            <div className="sheet-section-label">Repeats</div>
            <div className="cadence-toggle">
              {CADENCES.map(c => (
                <button
                  key={c}
                  className={cadence === c ? 'active' : ''}
                  onClick={() => setCadence(c)}
                >
                  {CADENCE_LABELS[c]}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        <button
          className={`save-btn ${type === 'income' ? 'save-income' : 'save-expense'}`}
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saveLabel()}
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
