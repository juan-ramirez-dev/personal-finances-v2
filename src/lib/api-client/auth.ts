import type {
  RecoveryCodeEntry,
  RegisterResult,
  SealedRecoveryCode,
  VaultSession,
} from '@/lib/api/auth/schema'
import type { WrappedKey } from '@/lib/vault/keys'
import { request } from './http'

// Al server va solo authPassword. La contraseña real se queda en el navegador.

export function login(email: string, authPassword: string) {
  return request<VaultSession>('POST', '/api/auth/login', {
    email,
    authPassword,
  })
}

export function register(
  fullName: string,
  email: string,
  authPassword: string,
) {
  return request<RegisterResult>('POST', '/api/auth/register', {
    fullName,
    email,
    authPassword,
  })
}

export function saveUserKey(key: WrappedKey, codes: RecoveryCodeEntry[]) {
  return request<{ existing: WrappedKey | null }>('POST', '/api/auth/key', {
    key,
    codes,
  })
}

export function getUserKey() {
  return request<WrappedKey>('GET', '/api/auth/key')
}

export function changePassword(authPassword: string, key: WrappedKey) {
  return request<unknown>('PUT', '/api/auth/password', { authPassword, key })
}

export function getRecoveryCodes() {
  return request<SealedRecoveryCode[]>('GET', '/api/auth/recovery-codes')
}

export function replaceRecoveryCodes(codes: RecoveryCodeEntry[]) {
  return request<unknown>('PUT', '/api/auth/recovery-codes', codes)
}

// Al server va un token que sale del código. El código se queda aquí.
export function recoverStart(email: string, authToken: string) {
  return request<{ userId: string; key: WrappedKey }>(
    'POST',
    '/api/auth/recover/start',
    { email, authToken },
  )
}

export function recoverFinish(input: {
  email: string
  authPassword: string
  authToken: string
  key: WrappedKey
  newCode: RecoveryCodeEntry
}) {
  return request<VaultSession>('POST', '/api/auth/recover/finish', input)
}

export function logout() {
  return request<unknown>('POST', '/api/auth/logout')
}
