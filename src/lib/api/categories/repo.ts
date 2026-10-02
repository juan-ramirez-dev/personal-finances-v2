import 'server-only'

import type { Db } from '@/lib/supabase/server'
import { fromDb } from '../errors'
import type { CategoryDto } from './schema'

export async function listActiveCategories(db: Db): Promise<CategoryDto[]> {
  const { data, error } = await db
    .from('categories')
    .select('id, name, budget')
    .is('archived_at', null)
    .order('created_at')
  if (error) throw fromDb(error)
  return data
}

export async function upsertCategories(
  db: Db,
  userId: string,
  items: CategoryDto[],
) {
  if (items.length === 0) return
  const { error } = await db
    .from('categories')
    .upsert(items.map(c => ({ ...c, user_id: userId })))
  if (error) throw fromDb(error)
}

export async function archiveCategories(db: Db, ids: string[]) {
  if (ids.length === 0) return
  const { error } = await db
    .from('categories')
    .update({ archived_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw fromDb(error)
}
