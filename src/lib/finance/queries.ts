import 'server-only'

import { createSessionClient } from '@/lib/supabase/server'
import { parseISODate, type Summary } from './calc'
import type {
  Category,
  Expense,
  FinanceData,
  FixedExpense,
  Income,
} from './types'

export interface FinanceState {
  data: FinanceData
  summary: Summary
}

// Forma fija que devuelve la función SQL cycle_summary.
interface CycleSummaryRow {
  cycle: { start: string; end: string }
  daysToPayday: number
  profile: FinanceData['profile']
  investment: FinanceData['investment']
  income: number
  extraIncome: number
  spent: number
  committed: number
  available: number
  fixed: (Required<FixedExpense> & { paid: number; pending: number })[]
  categories: (Category & {
    spent: number
    remaining: number
    over: number
    ratio: number | null
  })[]
  expenses: {
    id: string
    amount: number
    description: string
    date: string
    kind: Expense['target']['kind']
    targetId: string
  }[]
  incomes: Income[]
}

// null = falta el onboarding.
export async function getFinance(): Promise<FinanceState | null> {
  const db = await createSessionClient()
  const { data, error } = await db.rpc('cycle_summary')
  if (error) throw new Error(`cycle_summary: ${error.message}`)
  if (!data) return null
  return toState(data as unknown as CycleSummaryRow)
}

function toState(row: CycleSummaryRow): FinanceState {
  const fixed = row.fixed.map(({ paid, pending, ...f }) => ({
    fixed: f,
    paid,
    pending,
    isPaid: pending === 0,
  }))
  const categories = row.categories.map(
    ({ spent, remaining, over, ratio, ...c }) => ({
      category: c,
      spent,
      remaining,
      over,
      ratio: ratio ?? Infinity,
    }),
  )
  const expenses: Expense[] = row.expenses.map(e => ({
    id: e.id,
    amount: e.amount,
    description: e.description,
    date: e.date,
    target: { kind: e.kind, id: e.targetId },
  }))

  return {
    data: {
      profile: row.profile,
      investment: row.investment,
      fixed: fixed.map(f => f.fixed),
      categories: categories.map(c => c.category),
      expenses,
      incomes: row.incomes,
    },
    summary: {
      cycle: {
        start: parseISODate(row.cycle.start),
        end: parseISODate(row.cycle.end),
      },
      income: row.income,
      extraIncome: row.extraIncome,
      spent: row.spent,
      committed: row.committed,
      available: row.available,
      fixed,
      categories,
      overBudget: categories
        .filter(c => c.over > 0 && c.category.budget > 0)
        .sort((a, b) => b.over - a.over),
      cycleExpenses: expenses,
      cycleIncomes: row.incomes,
      daysToPayday: row.daysToPayday,
    },
  }
}
