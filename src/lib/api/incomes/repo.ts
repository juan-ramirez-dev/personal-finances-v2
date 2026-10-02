import 'server-only'

import type { Db } from '@/lib/supabase/server'
import { fromDb } from '../errors'
import type { IncomeDto } from './schema'

export async function listIncomes(db: Db): Promise<IncomeDto[]> {
  const { data, error } = await db
    .from('incomes')
    .select('id, amount, description, received_on')
    .order('received_on', { ascending: false })
  if (error) throw fromDb(error)
  return data.map(i => ({
    id: i.id,
    amount: i.amount,
    description: i.description,
    date: i.received_on,
  }))
}

export async function insertIncome(db: Db, userId: string, i: IncomeDto) {
  const { error } = await db.from('incomes').insert({
    id: i.id,
    user_id: userId,
    amount: i.amount,
    description: i.description,
    received_on: i.date,
  })
  if (error) throw fromDb(error)
}

export async function deleteIncome(db: Db, id: string): Promise<boolean> {
  const { data, error } = await db
    .from('incomes')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw fromDb(error)
  return data.length > 0
}
