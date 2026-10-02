import type { RegisterResult, VaultSession } from '@/lib/api/auth/schema'
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

export function saveUserKey(key: WrappedKey) {
  return request<{ existing: WrappedKey | null }>('POST', '/api/auth/key', key)
}

export function logout() {
  return request<unknown>('POST', '/api/auth/logout')
}
