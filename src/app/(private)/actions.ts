'use server'

import { revalidatePath } from 'next/cache'
import { AuthError, authorize } from '@/lib/auth/guards'
import {
  validateCategories,
  validateExpense,
  validateFixed,
  validateId,
  validateInvestment,
  validateOnboarding,
  validateProfile,
} from '@/lib/finance/validate'
import type { Json } from '@/lib/supabase/database.types'
import { createSessionClient } from '@/lib/supabase/server'

export interface ActionResult {
  error: string | null
}

type Db = Awaited<ReturnType<typeof createSessionClient>>
type Write = (
  db: Db,
  userId: string,
) => PromiseLike<{ error: { message: string } | null }>

// Las interfaces no encajan en el tipo Json de Supabase, aunque ya son JSON válido.
const json = (value: object) => value as Json

async function run(write: Write): Promise<ActionResult> {
  let userId: string
  try {
    userId = (await authorize()).id
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Tu sesión venció. Vuelve a entrar.' }
    }
    throw error
  }

  const { error } = await write(await createSessionClient(), userId)
  if (error) {
    console.error('Error guardando finanzas', error.message)
    return { error: 'No se pudo guardar. Intenta de nuevo.' }
  }
  revalidatePath('/')
  return { error: null }
}

// Los inputs se tipan como unknown: vienen de la red, se validan aquí.

export async function completeOnboarding(
  input: unknown,
): Promise<ActionResult> {
  const parsed = validateOnboarding(input)
  if (!parsed.ok) return { error: parsed.error }
  return run(db => db.rpc('complete_onboarding', { p: json(parsed.value) }))
}

export async function addExpense(input: unknown): Promise<ActionResult> {
  const parsed = validateExpense(input)
  if (!parsed.ok) return { error: parsed.error }
  const { amount, description, date, target } = parsed.value
  return run(db =>
    db.from('expenses').insert({
      amount,
      description,
      spent_on: date,
      fixed_expense_id: target.kind === 'fixed' ? target.id : null,
      category_id: target.kind === 'category' ? target.id : null,
    }),
  )
}

export async function removeExpense(id: unknown): Promise<ActionResult> {
  const parsed = validateId(id)
  if (!parsed.ok) return { error: parsed.error }
  return run(db => db.from('expenses').delete().eq('id', parsed.value))
}

export async function toggleFixedPaid(id: unknown): Promise<ActionResult> {
  const parsed = validateId(id)
  if (!parsed.ok) return { error: parsed.error }
  return run(db => db.rpc('toggle_fixed_paid', { p_fixed_id: parsed.value }))
}

export async function saveFixed(input: unknown): Promise<ActionResult> {
  const parsed = validateFixed(input)
  if (!parsed.ok) return { error: parsed.error }
  return run(db => db.rpc('save_fixed', { p: json(parsed.value) }))
}

export async function saveCategories(input: unknown): Promise<ActionResult> {
  const parsed = validateCategories(input)
  if (!parsed.ok) return { error: parsed.error }
  return run(db => db.rpc('save_categories', { p: json(parsed.value) }))
}

export async function saveProfile(input: unknown): Promise<ActionResult> {
  const parsed = validateProfile(input)
  if (!parsed.ok) return { error: parsed.error }
  const { monthlyIncome, payday } = parsed.value
  return run((db, userId) =>
    db
      .from('finance_settings')
      .update({ monthly_income: monthlyIncome, payday })
      .eq('user_id', userId),
  )
}

export async function saveInvestment(input: unknown): Promise<ActionResult> {
  const parsed = validateInvestment(input)
  if (!parsed.ok) return { error: parsed.error }
  return run(db => db.rpc('save_investment', { p: json(parsed.value) }))
}
