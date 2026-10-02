import 'server-only'

import type { Db } from '@/lib/supabase/server'
import { KDF_ITERATIONS, type WrappedKey } from '@/lib/vault/keys'
import { fromDb } from '../errors'
import type { RecoveryCodeEntry, SealedRecoveryCode } from './schema'

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

export async function updateUserKey(
  db: Db,
  userId: string,
  key: WrappedKey,
): Promise<void> {
  const { error } = await db
    .from('user_keys')
    .update({ wrapped_key: key.wrappedKey, iv: key.iv })
    .eq('user_id', userId)
  if (error) throw fromDb(error)
}

export async function insertRecoveryCodes(
  db: Db,
  userId: string,
  codes: RecoveryCodeEntry[],
): Promise<void> {
  const { error } = await db.from('recovery_codes').insert(
    codes.map(code => ({
      id: code.id,
      user_id: userId,
      auth_hash: code.authHash,
      wrapped_key: code.wrappedKey,
      iv: code.iv,
      code: code.code,
    })),
  )
  if (error) throw fromDb(error)
}

export async function listRecoveryCodes(db: Db): Promise<SealedRecoveryCode[]> {
  const { data, error } = await db
    .from('recovery_codes')
    .select('id, code')
    .order('created_at')
  if (error) throw fromDb(error)
  return data
}

// Borra los del usuario que no estén en `keep`.
export async function deleteRecoveryCodes(
  db: Db,
  userId: string,
  keep: string[],
): Promise<void> {
  let query = db.from('recovery_codes').delete().eq('user_id', userId)
  if (keep.length) query = query.not('id', 'in', `(${keep.join(',')})`)
  const { error } = await query
  if (error) throw fromDb(error)
}

export async function deleteRecoveryCode(db: Db, id: string): Promise<void> {
  const { error } = await db.from('recovery_codes').delete().eq('id', id)
  if (error) throw fromDb(error)
}

// Sin sesión: lo llama el reset con el cliente admin.
export async function findRecoveryCode(
  admin: Db,
  authHash: string,
): Promise<(WrappedKey & { id: string; userId: string }) | null> {
  const { data, error } = await admin
    .from('recovery_codes')
    .select('id, user_id, wrapped_key, iv')
    .eq('auth_hash', authHash)
    .maybeSingle()
  if (error) throw fromDb(error)
  return (
    data && {
      id: data.id,
      userId: data.user_id,
      wrappedKey: data.wrapped_key,
      iv: data.iv,
    }
  )
}

export async function getUserKeyById(
  db: Db,
  userId: string,
): Promise<WrappedKey | null> {
  const { data, error } = await db
    .from('user_keys')
    .select('wrapped_key, iv')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw fromDb(error)
  return data && { wrappedKey: data.wrapped_key, iv: data.iv }
}

export async function getUserEmail(
  admin: Db,
  userId: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error) throw new Error(error.message)
  return data.user.email ?? null
}

export async function setPassword(
  admin: Db,
  userId: string,
  password: string,
): Promise<void> {
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) throw new Error(error.message)
}
