import 'server-only'

import type { Db } from '@/lib/supabase/server'
import { fromDb } from '../errors'
import type { FixedDto, FixedInput, PaymentsRange } from './schema'

type Regular = Extract<FixedInput, { isInvestment: false }>

export async function listActiveFixed(db: Db): Promise<FixedDto[]> {
  const { data, error } = await db
    .from('fixed_expenses')
    .select('id, name, amount, due_day, is_investment')
    .is('archived_at', null)
    .order('due_day')
    .order('created_at')
  if (error) throw fromDb(error)
  return data.map(f => ({
    id: f.id,
    name: f.name,
    amount: f.amount,
    dueDay: f.due_day,
    isInvestment: f.is_investment,
  }))
}

export async function upsertFixed(db: Db, userId: string, items: Regular[]) {
  if (items.length === 0) return
  const { error } = await db.from('fixed_expenses').upsert(
    items.map(f => ({
      id: f.id,
      user_id: userId,
      name: f.name,
      amount: f.amount,
      due_day: f.dueDay,
    })),
  )
  if (error) throw fromDb(error)
}

export async function setDueDay(db: Db, id: string, dueDay: number) {
  const { error } = await db
    .from('fixed_expenses')
    .update({ due_day: dueDay })
    .eq('id', id)
  if (error) throw fromDb(error)
}

export async function archiveFixed(db: Db, ids: string[]) {
  if (ids.length === 0) return
  const { error } = await db
    .from('fixed_expenses')
    .update({ archived_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw fromDb(error)
}

export async function fixedExists(db: Db, id: string): Promise<boolean> {
  const { data, error } = await db
    .from('fixed_expenses')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw fromDb(error)
  return data !== null
}

export async function deletePayments(
  db: Db,
  fixedId: string,
  range: PaymentsRange,
) {
  const { error } = await db
    .from('expenses')
    .delete()
    .eq('fixed_expense_id', fixedId)
    .gte('spent_on', range.from)
    .lt('spent_on', range.to)
  if (error) throw fromDb(error)
}
