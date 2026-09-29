import type {
  Category,
  Expense,
  FinanceData,
  FixedExpense,
  Income,
  Investment,
} from './types'

export interface Cycle {
  start: Date
  end: Date // exclusivo: día del próximo pago
}

// `month` puede salirse de 0-11: Date lo normaliza al año que toca.
// Si el pago es el 31 y el mes tiene 30 días, se paga el último día.
function paydayIn(year: number, month: number, payday: number) {
  const first = new Date(year, month, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(payday, last))
}

export function getCycle(payday: number, today: Date): Cycle {
  const y = today.getFullYear()
  const m = today.getMonth()
  const thisMonth = paydayIn(y, m, payday)
  const offset = today >= thisMonth ? 0 : -1
  return {
    start: paydayIn(y, m + offset, payday),
    end: paydayIn(y, m + offset + 1, payday),
  }
}

export function toISODate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function parseISODate(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function inCycle(item: Expense | Income, cycle: Cycle) {
  const date = parseISODate(item.date)
  return date >= cycle.start && date < cycle.end
}

export function paidForFixed(fixed: FixedExpense, expenses: Expense[]) {
  return expenses
    .filter(e => e.target.kind === 'fixed' && e.target.id === fixed.id)
    .reduce((sum, e) => sum + e.amount, 0)
}

export interface FixedStatus {
  fixed: FixedExpense
  paid: number
  pending: number
  isPaid: boolean
}

export interface CategoryStatus {
  category: Category
  spent: number
  remaining: number
  over: number
  ratio: number
}

export interface Summary {
  cycle: Cycle
  income: number
  extraIncome: number
  spent: number
  committed: number
  available: number
  fixed: FixedStatus[]
  categories: CategoryStatus[]
  overBudget: CategoryStatus[]
  cycleExpenses: Expense[]
  cycleIncomes: Income[]
  daysToPayday: number
}

const DAY_MS = 86_400_000

export function summarize(data: FinanceData, today: Date): Summary {
  const cycle = getCycle(data.profile.payday, today)
  const cycleExpenses = data.expenses
    .filter(e => inCycle(e, cycle))
    .sort((a, b) => b.date.localeCompare(a.date))
  const cycleIncomes = data.incomes
    .filter(i => inCycle(i, cycle))
    .sort((a, b) => b.date.localeCompare(a.date))

  const fixed = data.fixed.map(f => {
    const paid = paidForFixed(f, cycleExpenses)
    const pending = Math.max(0, f.amount - paid)
    return { fixed: f, paid, pending, isPaid: pending === 0 }
  })

  const categories = data.categories.map(c => {
    const spent = cycleExpenses
      .filter(e => e.target.kind === 'category' && e.target.id === c.id)
      .reduce((sum, e) => sum + e.amount, 0)
    return {
      category: c,
      spent,
      remaining: Math.max(0, c.budget - spent),
      over: Math.max(0, spent - c.budget),
      ratio: c.budget > 0 ? spent / c.budget : spent > 0 ? Infinity : 0,
    }
  })

  const spent = cycleExpenses.reduce((sum, e) => sum + e.amount, 0)
  const committed = fixed.reduce((sum, f) => sum + f.pending, 0)
  const extraIncome = cycleIncomes.reduce((sum, i) => sum + i.amount, 0)
  const income = data.profile.monthlyIncome + extraIncome
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  return {
    cycle,
    income,
    extraIncome,
    spent,
    committed,
    available: income - spent - committed,
    fixed,
    categories,
    overBudget: categories
      // Sin presupuesto definido no hay nada que "pasar".
      .filter(c => c.over > 0 && c.category.budget > 0)
      .sort((a, b) => b.over - a.over),
    cycleExpenses,
    cycleIncomes,
    daysToPayday: Math.round(
      (cycle.end.getTime() - startOfToday.getTime()) / DAY_MS,
    ),
  }
}

// Lo que queda del ingreso tras fijos y presupuestos. Se muestra en el onboarding.
export function unassigned(data: Omit<FinanceData, 'expenses' | 'incomes'>) {
  const fixed = data.fixed.reduce((sum, f) => sum + f.amount, 0)
  const budgets = data.categories.reduce((sum, c) => sum + c.budget, 0)
  return data.profile.monthlyIncome - fixed - budgets
}

export const INVESTMENT_FIXED_ID = 'fixed-investment'

// El aporte mensual a inversiones vive como un gasto fijo más.
export function syncInvestmentFixed(
  fixed: FixedExpense[],
  investment: Investment,
): FixedExpense[] {
  const rest = fixed.filter(f => !f.isInvestment)
  if (!investment.hasInvestments || investment.monthlyContribution <= 0) {
    return rest
  }
  const current = fixed.find(f => f.isInvestment)
  return [
    ...rest,
    {
      id: current?.id ?? INVESTMENT_FIXED_ID,
      name: 'Inversión',
      amount: investment.monthlyContribution,
      dueDay: current?.dueDay ?? 1,
      isInvestment: true,
    },
  ]
}
