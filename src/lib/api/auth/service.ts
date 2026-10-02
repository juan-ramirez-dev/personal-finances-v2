import 'server-only'

import { decodeJwt } from 'jose'
import { deleteSession, setSession } from '@/lib/auth/session'
import {
  createAdminClient,
  createAnonClient,
  createUserClient,
  type Db,
} from '@/lib/supabase/server'
import { normalizeEmail, type WrappedKey } from '@/lib/vault/keys'
import { hashRecoveryToken } from '@/lib/vault/recovery'
import { ApiError } from '../errors'
import type { Ctx } from '../http'
import {
  deleteRecoveryCode,
  deleteRecoveryCodes,
  findRecoveryCode,
  getUserEmail,
  getUserKey,
  getUserKeyById,
  insertRecoveryCodes,
  insertUserKey,
  listRecoveryCodes,
  setPassword,
  updateUserKey,
} from './repo'
import type {
  Credentials,
  RecoveryCodeEntry,
  RegisterResult,
  SealedRecoveryCode,
  VaultSession,
} from './schema'

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

// La llave se crea una sola vez, con sus códigos. Si otra pestaña ganó, se devuelve esa.
export async function saveUserKey(
  { db, user }: Ctx,
  input: { key: WrappedKey; codes: RecoveryCodeEntry[] },
): Promise<{ existing: WrappedKey | null }> {
  if (!(await insertUserKey(db, user.id, input.key))) {
    return { existing: await getUserKey(db) }
  }
  await insertRecoveryCodes(db, user.id, input.codes)
  return { existing: null }
}

export async function readUserKey({ db }: Ctx): Promise<WrappedKey> {
  const key = await getUserKey(db)
  if (!key) throw new ApiError(404, 'No encontrado')
  return key
}

export function listCodes({ db }: Ctx): Promise<SealedRecoveryCode[]> {
  return listRecoveryCodes(db)
}

// Primero inserta: si algo falla, los códigos viejos siguen sirviendo.
export async function replaceCodes(
  { db, user }: Ctx,
  codes: RecoveryCodeEntry[],
): Promise<void> {
  await insertRecoveryCodes(db, user.id, codes)
  await deleteRecoveryCodes(
    db,
    user.id,
    codes.map(code => code.id),
  )
}

// La dataKey no cambia: solo su envoltura. Si Supabase no acepta la contraseña,
// la envoltura vieja vuelve, o la contraseña vieja ya no abriría los datos.
async function rekey(
  db: Db,
  userId: string,
  key: WrappedKey,
  authPassword: string,
): Promise<void> {
  const previous = await getUserKeyById(db, userId)
  if (!previous) throw new ApiError(404, 'No encontrado')
  await updateUserKey(db, userId, key)
  try {
    await setPassword(createAdminClient(), userId, authPassword)
  } catch (error) {
    await updateUserKey(db, userId, previous)
    throw error
  }
}

export function changePassword(
  { db, user }: Ctx,
  input: { authPassword: string; key: WrappedKey },
): Promise<void> {
  return rekey(db, user.id, input.key, input.authPassword)
}

// Mismo mensaje si el código no existe o es de otro: no revela cuál falló.
async function findOwnedCode(admin: Db, email: string, authToken: string) {
  const code = await findRecoveryCode(admin, await hashRecoveryToken(authToken))
  const owner = code && (await getUserEmail(admin, code.userId))
  if (!code || !owner || normalizeEmail(owner) !== normalizeEmail(email)) {
    throw new ApiError(422, 'Email o código incorrectos')
  }
  return code
}

// Devuelve la copia de la dataKey que envuelve ese código. Solo él la abre.
export async function recoverStart(input: {
  email: string
  authToken: string
}): Promise<{ userId: string; key: WrappedKey }> {
  const code = await findOwnedCode(
    createAdminClient(),
    input.email,
    input.authToken,
  )
  return {
    userId: code.userId,
    key: { wrappedKey: code.wrappedKey, iv: code.iv },
  }
}

export async function recoverFinish(input: {
  email: string
  authPassword: string
  authToken: string
  key: WrappedKey
  newCode: RecoveryCodeEntry
}): Promise<VaultSession> {
  const admin = createAdminClient()
  const code = await findOwnedCode(admin, input.email, input.authToken)
  await rekey(admin, code.userId, input.key, input.authPassword)
  // Un uso: se gasta y llega uno nuevo. Los demás siguen sirviendo.
  await deleteRecoveryCode(admin, code.id)
  await insertRecoveryCodes(admin, code.userId, [input.newCode])
  return login({ email: input.email, authPassword: input.authPassword })
}

export function logout() {
  return deleteSession()
}
