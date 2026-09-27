'use client'

import { createContext, useContext, useOptimistic, useTransition } from 'react'
import {
  summarize,
  syncInvestmentFixed,
  toISODate,
  type Summary,
} from '@/lib/finance/calc'
import type { FinanceState } from '@/lib/finance/queries'
import type {
  Category,
  Expense,
  FinanceData,
  FinanceProfile,
  FixedExpense,
  Investment,
} from '@/lib/finance/types'
import {
  addExpense,
  completeOnboarding,
  removeExpense,
  saveCategories,
  saveFixed,
  saveInvestment,
  saveProfile,
  toggleFixedPaid,
  type ActionResult,
} from './actions'

// Cada acción devuelve el error a mostrar, o null si se guardó.
type Run = Promise<string | null>

interface FinanceContextValue {
  data: FinanceData | null
  summary: Summary | null
  complete: (data: Omit<FinanceData, 'expenses'>) => Run
  addExpense: (expense: Omit<Expense, 'id'>) => Run
  removeExpense: (id: string) => Run
  toggleFixedPaid: (id: string) => Run
  setFixed: (fixed: FixedExpense[]) => Run
  setCategories: (categories: Category[]) => Run
  setProfile: (profile: FinanceProfile) => Run
  setInvestment: (investment: Investment) => Run
}

type Update = (d: FinanceData) => FinanceData

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function newId() {
  return crypto.randomUUID()
}

// Marcar pagado = registrar lo que falta. Desmarcar = borrar sus pagos del ciclo.
// Solo para la vista optimista: la regla real vive en toggle_fixed_paid (SQL).
function togglePaid(d: FinanceData, id: string): FinanceData {
  const summary = summarize(d, new Date())
  const status = summary.fixed.find(f => f.fixed.id === id)
  if (!status) return d
  if (!status.isPaid) {
    const payment: Expense = {
      id: newId(),
      amount: status.pending,
      description: status.fixed.name,
      date: toISODate(new Date()),
      target: { kind: 'fixed', id },
    }
    return { ...d, expenses: [...d.expenses, payment] }
  }
  const cycleIds = new Set(summary.cycleExpenses.map(e => e.id))
  return {
    ...d,
    expenses: d.expenses.filter(
      e =>
        !(
          e.target.kind === 'fixed' &&
          e.target.id === id &&
          cycleIds.has(e.id)
        ),
    ),
  }
}

export function FinanceProvider({
  initial,
  children,
}: {
  initial: FinanceState | null
  children: React.ReactNode
}) {
  const [data, applyOptimistic] = useOptimistic(
    initial?.data ?? null,
    (d: FinanceData | null, update: Update) => (d ? update(d) : d),
  )
  const [, startTransition] = useTransition()

  // El cambio se ve al instante; al terminar llega el dato real del server.
  const run = (update: Update | null, action: () => Promise<ActionResult>) =>
    new Promise<string | null>(resolve => {
      startTransition(async () => {
        if (update) applyOptimistic(update)
        try {
          resolve((await action()).error)
        } catch {
          resolve('No se pudo conectar. Intenta de nuevo.')
        }
      })
    })

  // Sin cambios pendientes se usa el resumen del server (fuente de verdad).
  const summary =
    !data || !initial
      ? null
      : data === initial.data
        ? initial.summary
        : summarize(data, new Date())

  const value: FinanceContextValue = {
    data,
    summary,
    complete: d => run(null, () => completeOnboarding(d)),
    addExpense: expense =>
      run(
        d => ({ ...d, expenses: [...d.expenses, { ...expense, id: newId() }] }),
        () => addExpense(expense),
      ),
    removeExpense: id =>
      run(
        d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }),
        () => removeExpense(id),
      ),
    toggleFixedPaid: id =>
      run(
        d => togglePaid(d, id),
        () => toggleFixedPaid(id),
      ),
    setFixed: fixed =>
      run(
        d => ({ ...d, fixed }),
        () => saveFixed(fixed),
      ),
    setCategories: categories =>
      run(
        d => ({ ...d, categories }),
        () => saveCategories(categories),
      ),
    setProfile: profile =>
      run(
        d => ({ ...d, profile }),
        () => saveProfile(profile),
      ),
    setInvestment: investment =>
      run(
        d => ({
          ...d,
          investment,
          fixed: syncInvestmentFixed(d.fixed, investment),
        }),
        () => saveInvestment(investment),
      ),
  }

  return <FinanceContext value={value}>{children}</FinanceContext>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance fuera de FinanceProvider')
  return ctx
}
