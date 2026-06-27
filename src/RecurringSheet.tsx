import { useState } from 'react'
import { supabase } from './supabase'
import { EXPENSE_CATEGORIES, CADENCE_LABELS, RecurringBill, RecurringCadence } from './types'

interface Props {
  userId: string
  bill?: RecurringBill
  onClose: () => void
  onSaved: () => void
}

const CADENCES: RecurringCadence[] = ['weekly', 'fortnightly', 'monthly', 'annually']

function initCategory(bill?: RecurringBill) {
  if (!bill) return 'Bills'
  return (EXPENSE_CATEGORIES as readonly string[]).includes(bill.category) ? bill.category : ''
}

function initCustomCategory(bill?: RecurringBill) {
  if (!bill) return ''
  return (EXPENSE_CATEGORIES as readonly string[]).includes(bill.category) ? '' : bill.category
}

export default function RecurringSheet({ userId, bill, onClose, onSaved }: Props) {
  const isEdit = !!bill
  const [name, setName] = useState(bill?.name ?? '')
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '')
  const [category, setCategory] = useState<string>(initCategory(bill))
  const [customCategory, setCustomCategory] = useState(initCustomCategory(bill))
  const [cadence, setCadence] = useState<RecurringCadence>(bill?.cadence ?? 'monthly')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const finalCategory = customCategory.trim() || category

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!name.trim() || !amt || amt <= 0) return
    setSaving(true)
    if (isEdit) {
      await supabase.from('recurring_bills').update({
        name: name.trim(),
        amount: amt,
        category: finalCategory,
        cadence,
      }).eq('id', bill!.id)
    } else {
      await supabase.from('recurring_bills').insert({
        user_id: userId,
        name: name.trim(),
        amount: amt,
        category: finalCategory,
        cadence,
      })
    }
    onSaved()
  }

  const handleRemove = async () => {
    if (!bill) return
    setRemoving(true)
    await supabase.from('recurring_bills').delete().eq('id', bill.id)
    onSaved()
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

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

        <div className="sheet-section-label">Name</div>
        <input
          type="text"
          className="field-input"
          placeholder="e.g. Rent, Netflix"
          value={name}
          onChange={e => setName(e.target.value)}
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

        <button
          className="save-btn save-expense"
          onClick={handleSave}
          disabled={saving || !name.trim() || !amount || parseFloat(amount) <= 0}
        >
          {saving ? '…' : isEdit ? 'Update Bill' : 'Add Recurring Bill'}
        </button>

        {isEdit && (
          <button className="signout-btn" onClick={handleRemove} disabled={removing}>
            {removing ? '…' : 'Remove Bill'}
          </button>
        )}
      </div>
    </div>
  )
}
