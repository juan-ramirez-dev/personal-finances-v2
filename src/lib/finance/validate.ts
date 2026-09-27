import type {
  Category,
  Expense,
  FinanceData,
  FinanceProfile,
  FixedExpense,
  Investment,
} from './types'

// Lo que llega a una server action viene de la red: los tipos no garantizan nada.
type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const fail = <T>(error: string): Result<T> => ({ ok: false, error })

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
const isMoney = (v: unknown, min: number): v is number =>
  Number.isSafeInteger(v) && (v as number) >= min
const isDay = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 31
const isName = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0
const isId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

export function validateId(input: unknown): Result<string> {
  return isId(input) ? ok(input) : fail('Id inválido')
}

export function validateProfile(input: unknown): Result<FinanceProfile> {
  if (!isObject(input)) return fail('Datos inválidos')
  if (!isMoney(input.monthlyIncome, 1)) {
    return fail('El ingreso debe ser mayor a 0')
  }
  if (!isDay(input.payday)) return fail('El día de pago va de 1 a 31')
  return ok({ monthlyIncome: input.monthlyIncome, payday: input.payday })
}

export function validateFixed(input: unknown): Result<FixedExpense[]> {
  if (!Array.isArray(input)) return fail('Datos inválidos')
  const items: FixedExpense[] = []
  for (const f of input) {
    if (!isObject(f)) return fail('Datos inválidos')
    if (!isDay(f.dueDay)) return fail('El día de pago va de 1 a 31')
    // El de inversión se maneja desde inversiones; solo importa su día.
    if (f.isInvestment === true) {
      items.push({
        id: String(f.id),
        name: 'Inversión',
        amount: 0,
        dueDay: f.dueDay,
        isInvestment: true,
      })
      continue
    }
    if (!isId(f.id)) return fail('Id inválido')
    if (!isName(f.name)) return fail('Cada gasto fijo necesita nombre')
    if (!isMoney(f.amount, 1)) return fail('Los montos deben ser mayores a 0')
    items.push({
      id: f.id,
      name: f.name.trim(),
      amount: f.amount,
      dueDay: f.dueDay,
    })
  }
  return ok(items)
}

export function validateCategories(input: unknown): Result<Category[]> {
  if (!Array.isArray(input)) return fail('Datos inválidos')
  const items: Category[] = []
  const names = new Set<string>()
  for (const c of input) {
    if (!isObject(c) || !isId(c.id)) return fail('Id inválido')
    if (!isName(c.name)) return fail('Cada categoría necesita nombre')
    if (!isMoney(c.budget, 0))
      return fail('El presupuesto no puede ser negativo')
    const key = c.name.trim().toLowerCase()
    if (names.has(key))
      return fail(`La categoría "${c.name.trim()}" está repetida`)
    names.add(key)
    items.push({ id: c.id, name: c.name.trim(), budget: c.budget })
  }
  return ok(items)
}

export function validateInvestment(input: unknown): Result<Investment> {
  if (!isObject(input) || typeof input.hasInvestments !== 'boolean') {
    return fail('Datos inválidos')
  }
  if (
    !isMoney(input.monthlyContribution, 0) ||
    !isMoney(input.totalBalance, 0)
  ) {
    return fail('Los montos no pueden ser negativos')
  }
  return ok({
    hasInvestments: input.hasInvestments,
    monthlyContribution: input.monthlyContribution,
    totalBalance: input.totalBalance,
  })
}

export function validateExpense(input: unknown): Result<Omit<Expense, 'id'>> {
  if (!isObject(input) || !isObject(input.target)) {
    return fail('Datos inválidos')
  }
  const { kind, id } = input.target
  if (kind !== 'fixed' && kind !== 'category') return fail('Datos inválidos')
  if (!isId(id)) return fail('Elige a qué va el gasto')
  if (!isMoney(input.amount, 1)) return fail('El monto debe ser mayor a 0')
  if (
    typeof input.date !== 'string' ||
    !ISO_DATE.test(input.date) ||
    Number.isNaN(Date.parse(input.date))
  ) {
    return fail('Fecha inválida')
  }
  return ok({
    amount: input.amount,
    description:
      typeof input.description === 'string' ? input.description.trim() : '',
    date: input.date,
    target: { kind, id },
  })
}

export function validateOnboarding(
  input: unknown,
): Result<Omit<FinanceData, 'expenses'>> {
  if (!isObject(input)) return fail('Datos inválidos')
  const profile = validateProfile(input.profile)
  if (!profile.ok) return profile
  const fixed = validateFixed(input.fixed)
  if (!fixed.ok) return fixed
  const categories = validateCategories(input.categories)
  if (!categories.ok) return categories
  const investment = validateInvestment(input.investment)
  if (!investment.ok) return investment
  return ok({
    profile: profile.value,
    fixed: fixed.value,
    categories: categories.value,
    investment: investment.value,
  })
}
