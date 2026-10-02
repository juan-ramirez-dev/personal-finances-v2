import 'server-only'

import type { Db } from '@/lib/supabase/server'
import { KDF_ITERATIONS, type WrappedKey } from '@/lib/vault/keys'
import { fromDb } from '../errors'

export async function getUserKey(db: Db): Promise<WrappedKey | null> {
  const { data, error } = await db
    .from('user_keys')
    .select('wrapped_key, iv')
    .maybeSingle()
  if (error) throw fromDb(error)
  return data && { wrappedKey: data.wrapped_key, iv: data.iv }
}

// false si ya existía (otra pestaña la creó primero).
export async function insertUserKey(
  db: Db,
  userId: string,
  key: WrappedKey,
): Promise<boolean> {
  const { error } = await db.from('user_keys').insert({
    user_id: userId,
    wrapped_key: key.wrappedKey,
    iv: key.iv,
    kdf_iterations: KDF_ITERATIONS,
  })
  if (error?.code === '23505') return false
  if (error) throw fromDb(error)
  return true
}
