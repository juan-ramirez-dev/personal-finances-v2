import type { WrappedKey } from '@/lib/vault/keys'
import { RECOVERY_CODE_COUNT } from '@/lib/vault/recovery'
import { ApiError } from '../errors'
import { list, object, sealed, uuid } from '../parse'

// Lo que el navegador necesita para abrir (o crear) su llave de datos.
export interface VaultSession {
  userId: string
  expiresAt: number // ms
  wrappedKey: WrappedKey | null // null = primer login
}

export type RegisterResult =
  | { session: VaultSession; notice: null }
  | { session: null; notice: string }

// Un código de recuperación como lo guarda la DB. El texto va sellado con la dataKey.
export interface RecoveryCodeEntry extends WrappedKey {
  id: string
  authHash: string
  code: string
}

// Lo que ve ajustes: solo el texto sellado, para descifrarlo en el navegador.
export interface SealedRecoveryCode {
  id: string
  code: string
}

export interface Credentials {
  email: string
  authPassword: string
}

// authPassword y authToken: base64 de 32 bytes. Ni la contraseña ni el código llegan aquí.
const TOKEN_32 = /^[A-Za-z0-9+/]{43}=$/
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/
const SHA256_HEX = /^[0-9a-f]{64}$/

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function parseCredentials(body: unknown): Credentials {
  const input = object(body)
  const email = text(input.email).toLowerCase()
  const authPassword = text(input.authPassword)
  if (!email || !TOKEN_32.test(authPassword)) {
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

function recoveryCode(value: unknown): RecoveryCodeEntry {
  const input = object(value)
  if (typeof input.authHash !== 'string' || !SHA256_HEX.test(input.authHash)) {
    throw new ApiError(400, 'Datos inválidos')
  }
  return {
    ...parseWrappedKey(input),
    id: uuid(input.id),
    authHash: input.authHash,
    code: sealed(input.code),
  }
}

// Siempre el juego completo: así nadie queda con menos códigos de los que cree.
export function parseRecoveryCodes(value: unknown): RecoveryCodeEntry[] {
  const codes = list(value).map(recoveryCode)
  if (codes.length !== RECOVERY_CODE_COUNT) {
    throw new ApiError(400, 'Datos inválidos')
  }
  return codes
}

export function parseNewVault(body: unknown) {
  const input = object(body)
  return {
    key: parseWrappedKey(input.key),
    codes: parseRecoveryCodes(input.codes),
  }
}

function authToken(value: unknown): string {
  if (typeof value !== 'string' || !TOKEN_32.test(value)) {
    throw new ApiError(400, 'Código inválido')
  }
  return value
}

export function parseRecoverStart(body: unknown) {
  const input = object(body)
  const email = text(input.email).toLowerCase()
  if (!email) throw new ApiError(400, 'Email y código requeridos')
  return { email, authToken: authToken(input.authToken) }
}

export function parseRecoverFinish(body: unknown) {
  const input = object(body)
  const { email, authPassword } = parseCredentials(input)
  return {
    email,
    authPassword,
    authToken: authToken(input.authToken),
    key: parseWrappedKey(input.key),
    // El código gastado se reemplaza por uno nuevo.
    newCode: recoveryCode(input.newCode),
  }
}

export function parsePasswordChange(body: unknown) {
  const input = object(body)
  const authPassword = text(input.authPassword)
  if (!TOKEN_32.test(authPassword)) {
    throw new ApiError(400, 'Contraseña requerida')
  }
  return { authPassword, key: parseWrappedKey(input.key) }
}
