import { useState } from 'react'
import { supabase } from './supabase'
import { Budget } from './types'

interface Props {
  userId: string
  budget?: Budget
  availableCategories: readonly string[]
  onClose: () => void
  onSaved: () => void
}

export default function BudgetSheet({ userId, budget, availableCategories, onClose, onSaved }: Props) {
  const isEdit = !!budget
  const [category, setCategory] = useState(budget?.category ?? availableCategories[0] ?? '')
  const [customCategory, setCustomCategory] = useState('')
  const [amount, setAmount] = useState(budget ? String(budget.weekly_amount) : '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const finalCategory = customCategory.trim() || category

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!finalCategory || !amt || amt <= 0) return
    setSaving(true)
    if (isEdit) {
      await supabase.from('budgets').update({ weekly_amount: amt }).eq('id', budget!.id)
    } else {
      await supabase.from('budgets').insert({ user_id: userId, category: finalCategory, weekly_amount: amt })
    }
    onSaved()
  }

  const handleRemove = async () => {
    if (!budget) return
    setRemoving(true)
    await supabase.from('budgets').delete().eq('id', budget.id)
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
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            autoFocus
          />
          <span className="amount-suffix">/ wk limit</span>
        </div>

        {isEdit ? (
          <div className="sheet-section-label">{budget!.category}</div>
        ) : (
          <>
            <div className="sheet-section-label">Category</div>
            <div className="categories">
              {availableCategories.map(cat => (
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

        <button
          className="save-btn save-expense"
          onClick={handleSave}
          disabled={saving || !amount || parseFloat(amount) <= 0}
        >
          {saving ? '…' : isEdit ? 'Update Limit' : 'Set Limit'}
        </button>

        {isEdit && (
          <button className="signout-btn" onClick={handleRemove} disabled={removing}>
            {removing ? '…' : 'Remove Limit'}
          </button>
        )}
      </div>
    </div>
  )
}
