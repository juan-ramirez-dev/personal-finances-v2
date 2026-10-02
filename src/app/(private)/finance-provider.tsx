'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  summarize,
  syncInvestmentFixed,
  toISODate,
  type Summary,
} from '@/lib/finance/calc'
import type {
  Category,
  Expense,
  FinanceData,
  FinanceProfile,
  FixedExpense,
  Income,
  Investment,
} from '@/lib/finance/types'
import {
  validateCategories,
  validateExpense,
  validateFixed,
  validateIncome,
  validateInvestment,
  validateOnboarding,
  validateProfile,
} from '@/lib/finance/validate'
import {
  decryptRows,
  diffItems,
  encryptDocs,
  fromItems,
  type VaultDoc,
} from '@/lib/vault/items'
import { clearDataKey, loadDataKey } from '@/lib/vault/key-store'
import type { VaultRow } from '@/lib/vault/rows'
import { deleteItems, saveItems } from './actions'

// Cada acción devuelve el error a mostrar, o null si se guardó.
type Run = Promise<string | null>

interface FinanceContextValue {
  // false mientras se descifra. Evita mostrar el onboarding a quien ya tiene datos.
  ready: boolean
  data: FinanceData | null
  summary: Summary | null
  complete: (data: Omit<FinanceData, 'expenses' | 'incomes'>) => Run
  addExpense: (expense: Omit<Expense, 'id'>) => Run
  removeExpense: (id: string) => Run
  addIncome: (income: Omit<Income, 'id'>) => Run
  removeIncome: (id: string) => Run
  toggleFixedPaid: (id: string) => Run
  setFixed: (fixed: FixedExpense[]) => Run
  setCategories: (categories: Category[]) => Run
  setProfile: (profile: FinanceProfile) => Run
  setInvestment: (investment: Investment) => Run
}

interface Vault {
  docs: VaultDoc[] // incluye archivados: base del próximo diff
  data: FinanceData | null
}

// Devuelve los datos nuevos, o el error de validación a mostrar.
type Update = (d: FinanceData | null) => FinanceData | string

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function newId() {
  return crypto.randomUUID()
}

// Marcar pagado = registrar lo que falta. Desmarcar = borrar sus pagos del ciclo.
function togglePaid(d: FinanceData, id: string): FinanceData | string {
  const summary = summarize(d, new Date())
  const status = summary.fixed.find(f => f.fixed.id === id)
  if (!status) return 'Gasto fijo no encontrado'
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

// El fijo de inversión lo maneja inversiones: aquí solo cambia su día.
function withInvestmentFixed(
  incoming: FixedExpense[],
  current: FixedExpense[],
  investment: Investment,
) {
  const kept = current.find(f => f.isInvestment)
  const list =
    kept && !incoming.some(f => f.isInvestment) ? [...incoming, kept] : incoming
  return syncInvestmentFixed(list, investment)
}

const targetExists = (d: FinanceData, target: Expense['target']) =>
  target.kind === 'fixed'
    ? d.fixed.some(f => f.id === target.id)
    : d.categories.some(c => c.id === target.id)

// Sin llave no hay cómo leer: se cierra la sesión y se vuelve a entrar.
function leave() {
  void clearDataKey().then(() =>
    window.location.replace('/api/auth/clear-session'),
  )
}

export function FinanceProvider({
  rows,
  userId,
  children,
}: {
  rows: VaultRow[]
  userId: string
  children: React.ReactNode
}) {
  const [vault, setVault] = useState<Vault | null>(null)
  // Refs: las acciones van en cola y cada una parte del estado que dejó la anterior.
  const latest = useRef<Vault | null>(null)
  const key = useRef<CryptoKey | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const dataKey = await loadDataKey(userId)
      if (!dataKey) return leave()
      let docs: VaultDoc[]
      try {
        docs = await decryptRows(dataKey, userId, rows)
      } catch (error) {
        console.error('No se pudieron descifrar los datos', error)
        return leave()
      }
      if (cancelled) return
      key.current = dataKey
      latest.current = { docs, data: fromItems(docs) }
      setVault(latest.current)
    })()
    return () => {
      cancelled = true
    }
  }, [rows, userId])

  const show = (next: Vault) => {
    latest.current = next
    setVault(next)
  }

  // El cambio se ve al instante. Si el server falla, se vuelve atrás.
  const run = (update: Update): Run => {
    const task = queue.current.then(async (): Run => {
      const current = latest.current
      if (!current || !key.current) return 'Tus datos aún no cargan.'
      const next = update(current.data)
      if (typeof next === 'string') return next

      const diff = diffItems(current.docs, next, new Date())
      show({ docs: diff.docs, data: next })
      try {
        const saved = await saveItems(
          await encryptDocs(key.current, userId, diff.save),
        )
        const error = saved.error ?? (await deleteItems(diff.remove)).error
        if (error) show(current)
        return error
      } catch {
        show(current)
        return 'No se pudo conectar. Intenta de nuevo.'
      }
    })
    queue.current = task.catch(() => null)
    return task
  }

  const edit = (update: (d: FinanceData) => FinanceData | string) =>
    run(d => (d ? update(d) : 'Primero completa tu perfil'))

  const data = vault?.data ?? null

  const value: FinanceContextValue = {
    ready: vault !== null,
    data,
    summary: data ? summarize(data, new Date()) : null,
    complete: input =>
      run(d => {
        if (d) return 'El onboarding ya está completo'
        const parsed = validateOnboarding(input)
        if (!parsed.ok) return parsed.error
        const { fixed, investment } = parsed.value
        return {
          ...parsed.value,
          fixed: withInvestmentFixed(fixed, [], investment),
          expenses: [],
          incomes: [],
        }
      }),
    addExpense: expense =>
      edit(d => {
        const parsed = validateExpense(expense)
        if (!parsed.ok) return parsed.error
        if (!targetExists(d, parsed.value.target)) {
          return 'Elige a qué va el gasto'
        }
        return {
          ...d,
          expenses: [...d.expenses, { ...parsed.value, id: newId() }],
        }
      }),
    removeExpense: id =>
      edit(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) })),
    addIncome: income =>
      edit(d => {
        const parsed = validateIncome(income)
        if (!parsed.ok) return parsed.error
        return {
          ...d,
          incomes: [...d.incomes, { ...parsed.value, id: newId() }],
        }
      }),
    removeIncome: id =>
      edit(d => ({ ...d, incomes: d.incomes.filter(i => i.id !== id) })),
    toggleFixedPaid: id => edit(d => togglePaid(d, id)),
    setFixed: fixed =>
      edit(d => {
        const parsed = validateFixed(fixed)
        if (!parsed.ok) return parsed.error
        return {
          ...d,
          fixed: withInvestmentFixed(parsed.value, d.fixed, d.investment),
        }
      }),
    setCategories: categories =>
      edit(d => {
        const parsed = validateCategories(categories)
        if (!parsed.ok) return parsed.error
        return { ...d, categories: parsed.value }
      }),
    setProfile: profile =>
      edit(d => {
        const parsed = validateProfile(profile)
        if (!parsed.ok) return parsed.error
        return { ...d, profile: parsed.value }
      }),
    setInvestment: investment =>
      edit(d => {
        const parsed = validateInvestment(investment)
        if (!parsed.ok) return parsed.error
        return {
          ...d,
          investment: parsed.value,
          fixed: syncInvestmentFixed(d.fixed, parsed.value),
        }
      }),
  }

  return <FinanceContext value={value}>{children}</FinanceContext>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance fuera de FinanceProvider')
  return ctx
}
