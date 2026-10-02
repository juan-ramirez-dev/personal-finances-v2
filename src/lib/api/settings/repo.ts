import 'server-only'

import type { Db } from '@/lib/supabase/server'
import { fromDb } from '../errors'
import type { SettingsDto, SettingsInput } from './schema'

export async function getSettings(
  db: Db,
  userId: string,
): Promise<SettingsDto | null> {
  const { data, error } = await db
    .from('finance_settings')
    .select('monthly_income, payday, onboarded_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw fromDb(error)
  if (!data) return null
  return {
    monthlyIncome: data.monthly_income,
    payday: data.payday,
    onboarded: data.onboarded_at !== null,
  }
}

// Upsert solo con estas columnas: onboarded_at no se toca.
export async function upsertSettings(
  db: Db,
  userId: string,
  input: SettingsInput,
) {
  const { error } = await db.from('finance_settings').upsert({
    user_id: userId,
    monthly_income: input.monthlyIncome,
    payday: input.payday,
  })
  if (error) throw fromDb(error)
}

export async function markOnboarded(db: Db, userId: string) {
  const { error } = await db
    .from('finance_settings')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw fromDb(error)
}
