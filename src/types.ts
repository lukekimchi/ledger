export interface Transaction {
  id: string
  user_id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  note: string | null
  date: string
  created_at: string
}

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Groceries',
  'Dining',
  'Transport',
  'Subscriptions',
  'Bills',
  'Tithing',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export type RecurringCadence = 'weekly' | 'fortnightly' | 'monthly' | 'annually'

export const CADENCE_LABELS: Record<RecurringCadence, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  annually: 'Annually',
}

export const CADENCE_SHORT: Record<RecurringCadence, string> = {
  weekly: '/wk',
  fortnightly: '/fortnight',
  monthly: '/mo',
  annually: '/yr',
}

export interface RecurringBill {
  id: string
  user_id: string
  name: string
  amount: number
  category: string
  cadence: RecurringCadence
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  weekly_amount: number
  created_at: string
}

export function weeklyEquivalent(amount: number, cadence: RecurringCadence): number {
  switch (cadence) {
    case 'weekly': return amount
    case 'fortnightly': return amount / 2
    case 'monthly': return (amount * 12) / 52
    case 'annually': return amount / 52
  }
}
