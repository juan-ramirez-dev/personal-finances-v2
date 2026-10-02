import type { WrappedKey } from '@/lib/vault/keys'
import { ApiError } from '../errors'
import { object } from '../parse'

// Lo que el navegador necesita para abrir (o crear) su llave de datos.
export interface VaultSession {
  userId: string
  expiresAt: number // ms
  wrappedKey: WrappedKey | null // null = primer login
}

export type RegisterResult =
  | { session: VaultSession; notice: null }
  | { session: null; notice: string }

export interface Credentials {
  email: string
  authPassword: string
}

// authPassword: base64 de 32 bytes. La contraseña real nunca llega aquí.
const AUTH_PASSWORD = /^[A-Za-z0-9+/]{43}=$/
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function parseCredentials(body: unknown): Credentials {
  const input = object(body)
  const email = text(input.email).toLowerCase()
  const authPassword = text(input.authPassword)
  if (!email || !AUTH_PASSWORD.test(authPassword)) {
    throw new ApiError(400, 'Email y contraseña requeridos')
  }
  return { email, authPassword }
}

export function parseRegister(body: unknown) {
  const fullName = text(object(body).fullName)
  if (!fullName)
    throw new ApiError(400, 'Nombre, email y contraseña requeridos')
  return { ...parseCredentials(body), fullName }
}

export function parseWrappedKey(body: unknown): WrappedKey {
  const input = object(body)
  if (
    typeof input.wrappedKey !== 'string' ||
    typeof input.iv !== 'string' ||
    !BASE64.test(input.wrappedKey) ||
    !BASE64.test(input.iv)
  ) {
    throw new ApiError(400, 'Datos inválidos')
  }
  return { wrappedKey: input.wrappedKey, iv: input.iv }
}
