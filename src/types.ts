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
  'Subscriptions',
  'Groceries',
  'Bills',
  'Tithing',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
