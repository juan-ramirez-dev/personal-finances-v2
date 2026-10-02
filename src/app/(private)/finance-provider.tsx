'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  createFinanceApi,
  type FinanceApi,
  type FinanceSnapshot,
} from '@/lib/api-client/finance'
import { ApiClientError, errorMessage } from '@/lib/api-client/http'
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
  validateProfile,
} from '@/lib/finance/validate'
import { clearDataKey, loadDataKey } from '@/lib/vault/key-store'

// Cada acción devuelve el error a mostrar, o null si se guardó.
type Run = Promise<string | null>

interface FinanceContextValue {
  // false mientras se descifra. Evita mostrar el onboarding a quien ya tiene datos.
  ready: boolean
  // Error al cargar (sin datos no hay panel).
  loadError: string | null
  data: FinanceData | null // null = onboarding sin terminar
  // Lo guardado del onboarding, para retomarlo tras recargar.
  draft: FinanceSnapshot | null
  summary: Summary | null
  setProfile: (profile: FinanceProfile) => Run
  setFixed: (fixed: FixedExpense[]) => Run
  setCategories: (categories: Category[]) => Run
  setInvestment: (investment: Investment) => Run
  complete: () => Run
  addExpense: (expense: Omit<Expense, 'id'>) => Run
  removeExpense: (id: string) => Run
  addIncome: (income: Omit<Income, 'id'>) => Run
  removeIncome: (id: string) => Run
  toggleFixedPaid: (id: string) => Run
}

// Qué cambia en pantalla y cómo se guarda. O el error de validación.
interface Change {
  next: FinanceSnapshot
  save: (api: FinanceApi) => Promise<unknown>
}
type Plan = (s: FinanceSnapshot) => Change | string

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function newId() {
  return crypto.randomUUID()
}

function toData(s: FinanceSnapshot): FinanceData | null {
  if (!s.onboarded || !s.profile) return null
  const { profile, investment, fixed, categories, expenses, incomes } = s
  return { profile, investment, fixed, categories, expenses, incomes }
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

const targetExists = (s: FinanceSnapshot, target: Expense['target']) =>
  target.kind === 'fixed'
    ? s.fixed.some(f => f.id === target.id)
    : s.categories.some(c => c.id === target.id)

// Sin llave o sin sesión no hay cómo leer: se sale y se vuelve a entrar.
function leave() {
  void clearDataKey().then(() =>
    window.location.replace('/api/auth/clear-session'),
  )
}

export function FinanceProvider({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Refs: las acciones van en cola y cada una parte del estado que dejó la anterior.
  const latest = useRef<FinanceSnapshot | null>(null)
  const api = useRef<FinanceApi | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const key = await loadDataKey(userId)
      if (!key) return leave()
      const client = createFinanceApi(key, userId)
      try {
        const loaded = await client.load()
        if (cancelled) return
        api.current = client
        latest.current = loaded
        setSnapshot(loaded)
      } catch (error) {
        // Otra llave (o datos alterados) = no descifra: mejor volver a entrar.
        if (!(error instanceof ApiClientError) || error.status === 401) {
          console.error('No se pudieron abrir los datos', error)
          return leave()
        }
        if (!cancelled) setLoadError(errorMessage(error))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const show = (next: FinanceSnapshot) => {
    latest.current = next
    setSnapshot(next)
  }

  // El cambio se ve al instante. Si el server falla, se vuelve atrás.
  const run = (plan: Plan): Run => {
    const task = queue.current.then(async (): Run => {
      const current = latest.current
      if (!current || !api.current) return 'Tus datos aún no cargan.'
      const change = plan(current)
      if (typeof change === 'string') return change

      show(change.next)
      try {
        await change.save(api.current)
        return null
      } catch (error) {
        show(current)
        if (error instanceof ApiClientError && error.status === 401) leave()
        return errorMessage(error)
      }
    })
    queue.current = task.catch(() => null)
    return task
  }

  // Solo con el onboarding completo (gastos, ingresos, pagos).
  const inPanel = (
    plan: (s: FinanceSnapshot, d: FinanceData) => Change | string,
  ) =>
    run(s => {
      const d = toData(s)
      return d ? plan(s, d) : 'Primero completa tu perfil'
    })

  const addExpenseTo = (s: FinanceSnapshot, expense: Expense): Change => ({
    next: { ...s, expenses: [...s.expenses, expense] },
    save: client => client.addExpense(expense),
  })

  const data = snapshot && toData(snapshot)

  const value: FinanceContextValue = {
    ready: snapshot !== null || loadError !== null,
    loadError,
    data,
    draft: snapshot,
    summary: data ? summarize(data, new Date()) : null,

    setProfile: profile =>
      run(s => {
        const parsed = validateProfile(profile)
        if (!parsed.ok) return parsed.error
        return {
          next: { ...s, profile: parsed.value },
          save: client => client.saveProfile(parsed.value),
        }
      }),

    setFixed: fixed =>
      run(s => {
        const parsed = validateFixed(fixed)
        if (!parsed.ok) return parsed.error
        const list = withInvestmentFixed(parsed.value, s.fixed, s.investment)
        return {
          next: { ...s, fixed: list },
          save: client => client.saveFixed(list),
        }
      }),

    setCategories: categories =>
      run(s => {
        const parsed = validateCategories(categories)
        if (!parsed.ok) return parsed.error
        return {
          next: { ...s, categories: parsed.value },
          save: client => client.saveCategories(parsed.value),
        }
      }),

    setInvestment: investment =>
      run(s => {
        const parsed = validateInvestment(investment)
        if (!parsed.ok) return parsed.error
        const fixed = syncInvestmentFixed(s.fixed, parsed.value)
        const investmentFixed = fixed.find(f => f.isInvestment) ?? null
        return {
          next: { ...s, investment: parsed.value, fixed },
          save: client => client.saveInvestment(parsed.value, investmentFixed),
        }
      }),

    complete: () =>
      run(s => {
        if (s.onboarded) return 'El onboarding ya está completo'
        if (!s.profile) return 'Primero guarda tu ingreso'
        return {
          next: { ...s, onboarded: true },
          save: client => client.completeOnboarding(),
        }
      }),

    addExpense: expense =>
      inPanel(s => {
        const parsed = validateExpense(expense)
        if (!parsed.ok) return parsed.error
        if (!targetExists(s, parsed.value.target)) {
          return 'Elige a qué va el gasto'
        }
        return addExpenseTo(s, { ...parsed.value, id: newId() })
      }),

    removeExpense: id =>
      inPanel(s => ({
        next: { ...s, expenses: s.expenses.filter(e => e.id !== id) },
        save: client => client.removeExpense(id),
      })),

    addIncome: income =>
      inPanel(s => {
        const parsed = validateIncome(income)
        if (!parsed.ok) return parsed.error
        const created = { ...parsed.value, id: newId() }
        return {
          next: { ...s, incomes: [...s.incomes, created] },
          save: client => client.addIncome(created),
        }
      }),

    removeIncome: id =>
      inPanel(s => ({
        next: { ...s, incomes: s.incomes.filter(i => i.id !== id) },
        save: client => client.removeIncome(id),
      })),

    // Marcar pagado = registrar lo que falta. Desmarcar = borrar sus pagos del ciclo.
    toggleFixedPaid: id =>
      inPanel((s, d) => {
        const summary = summarize(d, new Date())
        const status = summary.fixed.find(f => f.fixed.id === id)
        if (!status) return 'Gasto fijo no encontrado'
        if (!status.isPaid) {
          return addExpenseTo(s, {
            id: newId(),
            amount: status.pending,
            description: status.fixed.name,
            date: toISODate(new Date()),
            target: { kind: 'fixed', id },
          })
        }
        const cycleIds = new Set(summary.cycleExpenses.map(e => e.id))
        const { start, end } = summary.cycle
        return {
          next: {
            ...s,
            expenses: s.expenses.filter(
              e =>
                !(
                  e.target.kind === 'fixed' &&
                  e.target.id === id &&
                  cycleIds.has(e.id)
                ),
            ),
          },
          save: client =>
            client.clearPayments(id, toISODate(start), toISODate(end)),
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
