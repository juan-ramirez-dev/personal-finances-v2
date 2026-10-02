import 'server-only'

import { decodeJwt } from 'jose'
import { deleteSession, setSession } from '@/lib/auth/session'
import { createAnonClient, createUserClient } from '@/lib/supabase/server'
import type { WrappedKey } from '@/lib/vault/keys'
import { ApiError } from '../errors'
import type { Ctx } from '../http'
import { getUserKey, insertUserKey } from './repo'
import type { Credentials, RegisterResult, VaultSession } from './schema'

async function startSession(accessToken: string): Promise<VaultSession> {
  // Solo guardamos el access token. El refresh token se descarta a propósito.
  const { exp, sub } = decodeJwt(accessToken)
  if (!exp || !sub) throw new Error('Token sin expiración o sin usuario')
  const expiresAt = exp * 1000
  await setSession(accessToken, expiresAt)
  return {
    userId: sub,
    expiresAt,
    wrappedKey: await getUserKey(createUserClient(accessToken)),
  }
}

export async function login(input: Credentials): Promise<VaultSession> {
  const { data, error } = await createAnonClient().auth.signInWithPassword({
    email: input.email,
    password: input.authPassword,
  })
  if (error || !data.session) {
    throw new ApiError(422, 'Credenciales inválidas')
  }
  return startSession(data.session.access_token)
}

export async function register(
  input: Credentials & { fullName: string },
): Promise<RegisterResult> {
  // `name` en metadata: verify-token lo lee para mostrarlo en la app.
  const { data, error } = await createAnonClient().auth.signUp({
    email: input.email,
    password: input.authPassword,
    options: { data: { name: input.fullName } },
  })
  if (error) {
    console.error('No se pudo registrar', error.message)
    throw new ApiError(422, 'No se pudo crear la cuenta')
  }
  // Sin sesión = el proyecto pide confirmar el email. La llave se crea en el primer login.
  if (!data.session) {
    return {
      session: null,
      notice: 'Revisa tu correo para confirmar la cuenta',
    }
  }
  return {
    session: await startSession(data.session.access_token),
    notice: null,
  }
}

// La llave se crea una sola vez. Si otra pestaña ganó, se devuelve esa.
export async function saveUserKey(
  { db, user }: Ctx,
  key: WrappedKey,
): Promise<{ existing: WrappedKey | null }> {
  if (await insertUserKey(db, user.id, key)) return { existing: null }
  return { existing: await getUserKey(db) }
}

export function logout() {
  return deleteSession()
}
