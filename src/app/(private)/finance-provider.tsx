'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import {
  summarize,
  syncInvestmentFixed,
  toISODate,
  type Summary,
} from '@/lib/finance/calc'
import { createDemoData } from '@/lib/finance/demo-data'
import type {
  Category,
  Expense,
  FinanceData,
  FinanceProfile,
  FixedExpense,
  Investment,
} from '@/lib/finance/types'

// Solo memoria: al recargar se pierde todo. El backend reemplaza esto.
interface FinanceContextValue {
  data: FinanceData | null
  summary: Summary | null
  complete: (data: Omit<FinanceData, 'expenses'>) => void
  loadDemo: () => void
  reset: () => void
  addExpense: (expense: Omit<Expense, 'id'>) => void
  removeExpense: (id: string) => void
  toggleFixedPaid: (id: string) => void
  setFixed: (fixed: FixedExpense[]) => void
  setCategories: (categories: Category[]) => void
  setProfile: (profile: FinanceProfile) => void
  setInvestment: (investment: Investment) => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function newId() {
  return crypto.randomUUID()
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<FinanceData | null>(null)

  const value = useMemo<FinanceContextValue>(() => {
    const update = (fn: (d: FinanceData) => FinanceData) =>
      setData(d => (d ? fn(d) : d))

    return {
      data,
      summary: data ? summarize(data, new Date()) : null,
      complete: d =>
        setData({
          ...d,
          fixed: syncInvestmentFixed(d.fixed, d.investment),
          expenses: [],
        }),
      loadDemo: () => setData(createDemoData(new Date())),
      reset: () => setData(null),
      addExpense: expense =>
        update(d => ({
          ...d,
          expenses: [...d.expenses, { ...expense, id: newId() }],
        })),
      removeExpense: id =>
        update(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) })),
      // Marcar pagado = registrar lo que falta. Desmarcar = borrar sus pagos del ciclo.
      toggleFixedPaid: id =>
        update(d => {
          const status = summarize(d, new Date()).fixed.find(
            f => f.fixed.id === id,
          )
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
          const cycleIds = new Set(
            summarize(d, new Date()).cycleExpenses.map(e => e.id),
          )
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
        }),
      setFixed: fixed => update(d => ({ ...d, fixed })),
      setCategories: categories => update(d => ({ ...d, categories })),
      setProfile: profile => update(d => ({ ...d, profile })),
      setInvestment: investment =>
        update(d => ({
          ...d,
          investment,
          fixed: syncInvestmentFixed(d.fixed, investment),
        })),
    }
  }, [data])

  return <FinanceContext value={value}>{children}</FinanceContext>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance fuera de FinanceProvider')
  return ctx
}
