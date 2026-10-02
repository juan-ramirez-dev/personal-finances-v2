import 'server-only'

import type { Db } from '@/lib/supabase/server'
import { fromDb } from '../errors'
import type { ExpenseDto } from './schema'

export async function listExpenses(db: Db): Promise<ExpenseDto[]> {
  const { data, error } = await db
    .from('expenses')
    .select('id, amount, description, spent_on, fixed_expense_id, category_id')
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw fromDb(error)
  return data.map(e => ({
    id: e.id,
    amount: e.amount,
    description: e.description,
    date: e.spent_on,
    // El check de la tabla garantiza que solo uno de los dos existe.
    target: e.fixed_expense_id
      ? { kind: 'fixed', id: e.fixed_expense_id }
      : { kind: 'category', id: e.category_id ?? '' },
  }))
}

// Activo = existe, es del usuario (RLS) y no está archivado.
export async function targetIsActive(
  db: Db,
  target: ExpenseDto['target'],
): Promise<boolean> {
  const table = target.kind === 'fixed' ? 'fixed_expenses' : 'categories'
  const { data, error } = await db
    .from(table)
    .select('id')
    .eq('id', target.id)
    .is('archived_at', null)
    .maybeSingle()
  if (error) throw fromDb(error)
  return data !== null
}

export async function insertExpense(db: Db, userId: string, e: ExpenseDto) {
  const { error } = await db.from('expenses').insert({
    id: e.id,
    user_id: userId,
    amount: e.amount,
    description: e.description,
    spent_on: e.date,
    fixed_expense_id: e.target.kind === 'fixed' ? e.target.id : null,
    category_id: e.target.kind === 'category' ? e.target.id : null,
  })
  if (error) throw fromDb(error)
}

// true si borró algo. RLS: una fila ajena no se borra (ni se ve).
export async function deleteExpense(db: Db, id: string): Promise<boolean> {
  const { data, error } = await db
    .from('expenses')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw fromDb(error)
  return data.length > 0
}
