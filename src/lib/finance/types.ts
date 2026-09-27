export interface FinanceProfile {
  monthlyIncome: number
  // Día del mes en que llega el pago. El ciclo va de pago a pago.
  payday: number
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  dueDay: number
  isInvestment?: boolean
}

export interface Category {
  id: string
  name: string
  budget: number
}

export type ExpenseTarget =
  | { kind: 'fixed'; id: string }
  | { kind: 'category'; id: string }

export interface Expense {
  id: string
  amount: number
  description: string
  date: string // YYYY-MM-DD
  target: ExpenseTarget
}

export interface Investment {
  hasInvestments: boolean
  monthlyContribution: number
  totalBalance: number
}

export interface FinanceData {
  profile: FinanceProfile
  fixed: FixedExpense[]
  categories: Category[]
  investment: Investment
  expenses: Expense[]
}
