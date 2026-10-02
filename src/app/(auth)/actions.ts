'use server'

import { decodeJwt } from 'jose'
import { redirect } from 'next/navigation'
import { AuthError, authorize } from '@/lib/auth/guards'
import { deleteSession, setSession } from '@/lib/auth/session'
import {
  createAnonClient,
  createSessionClient,
  createUserClient,
} from '@/lib/supabase/server'
import { KDF_ITERATIONS, type WrappedKey } from '@/lib/vault/keys'

// Lo que el navegador necesita para abrir (o crear) su llave de datos.
export interface VaultSession {
  userId: string
  expiresAt: number // ms
  wrappedKey: WrappedKey | null // null = primer login
}

export type LoginResult =
  | { error: string; session: null }
  | { error: null; session: VaultSession }

export type RegisterResult =
  | LoginResult
  | { error: null; session: null; notice: string }

export interface SaveKeyResult {
  error: string | null
  // Si otra pestaña la creó primero, se usa esa.
  existing: WrappedKey | null
}

// authPassword: base64 de 32 bytes. La contraseña real nunca llega aquí.
const AUTH_PASSWORD = /^[A-Za-z0-9+/]{43}=$/
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function readCredentials(input: unknown) {
  if (!isObject(input)) return null
  const email = text(input.email).toLowerCase()
  const authPassword = text(input.authPassword)
  if (!email || !AUTH_PASSWORD.test(authPassword)) return null
  return { email, authPassword }
}

async function startSession(accessToken: string): Promise<LoginResult> {
  // Solo guardamos el access token. El refresh token se descarta a propósito.
  const { exp, sub } = decodeJwt(accessToken)
  if (!exp || !sub) return { error: 'Token inválido', session: null }
  const expiresAt = exp * 1000
  await setSession(accessToken, expiresAt)

  const { data, error } = await createUserClient(accessToken)
    .from('user_keys')
    .select('wrapped_key, iv')
    .maybeSingle()
  if (error) {
    console.error('No se pudo leer la llave', error.message)
    return { error: 'No se pudo abrir tu cuenta', session: null }
  }

  return {
    error: null,
    session: {
      userId: sub,
      expiresAt,
      wrappedKey: data ? { wrappedKey: data.wrapped_key, iv: data.iv } : null,
    },
  }
}

export async function login(input: unknown): Promise<LoginResult> {
  const credentials = readCredentials(input)
  if (!credentials) {
    return { error: 'Email y contraseña requeridos', session: null }
  }

  const { data, error } = await createAnonClient().auth.signInWithPassword({
    email: credentials.email,
    password: credentials.authPassword,
  })
  if (error || !data.session) {
    return { error: 'Credenciales inválidas', session: null }
  }
  return startSession(data.session.access_token)
}

export async function register(input: unknown): Promise<RegisterResult> {
  const credentials = readCredentials(input)
  const fullName = isObject(input) ? text(input.fullName) : ''
  if (!credentials || !fullName) {
    return { error: 'Nombre, email y contraseña requeridos', session: null }
  }

  // `name` en metadata: verify-token lo lee para mostrarlo en la app.
  const { data, error } = await createAnonClient().auth.signUp({
    email: credentials.email,
    password: credentials.authPassword,
    options: { data: { name: fullName } },
  })
  if (error) {
    console.error('No se pudo registrar', error.message)
    return { error: 'No se pudo crear la cuenta', session: null }
  }

  // Sin sesión = el proyecto pide confirmar el email. La llave se crea en el primer login.
  if (!data.session) {
    return {
      error: null,
      session: null,
      notice: 'Revisa tu correo para confirmar la cuenta',
    }
  }
  return startSession(data.session.access_token)
}

export async function saveUserKey(input: unknown): Promise<SaveKeyResult> {
  if (
    !isObject(input) ||
    typeof input.wrappedKey !== 'string' ||
    typeof input.iv !== 'string' ||
    !BASE64.test(input.wrappedKey) ||
    !BASE64.test(input.iv)
  ) {
    return { error: 'Datos inválidos', existing: null }
  }

  let userId: string
  try {
    userId = (await authorize()).id
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Tu sesión venció. Vuelve a entrar.', existing: null }
    }
    throw error
  }

  const db = await createSessionClient()
  const { error } = await db.from('user_keys').insert({
    user_id: userId,
    wrapped_key: input.wrappedKey,
    iv: input.iv,
    kdf_iterations: KDF_ITERATIONS,
  })
  if (!error) return { error: null, existing: null }

  // 23505 = ya existe: dos pestañas entraron a la vez. Gana la primera.
  if (error.code === '23505') {
    const { data } = await db
      .from('user_keys')
      .select('wrapped_key, iv')
      .maybeSingle()
    if (data) {
      return {
        error: null,
        existing: { wrappedKey: data.wrapped_key, iv: data.iv },
      }
    }
  }
  console.error('No se pudo guardar la llave', error.message)
  return { error: 'No se pudo preparar tu cuenta', existing: null }
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
