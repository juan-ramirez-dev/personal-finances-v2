import { fromBase64, toBase64, utf8 } from './encoding'

// Recomendación OWASP 2023 para PBKDF2-SHA256. ~0.5 s en un portátil.
export const KDF_ITERATIONS = 600_000

export interface DerivedKeys {
  // Lo que recibe Supabase como contraseña. No sirve para descifrar.
  authPassword: string
  // Solo envuelve/abre la dataKey. Nunca sale del navegador.
  masterKey: CryptoKey
}

export interface WrappedKey {
  wrappedKey: string
  iv: string
}

const AES = { name: 'AES-GCM', length: 256 } as const

// Mismo criterio que el login: así el salt no cambia por mayúsculas o espacios.
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hkdf(info: string): HkdfParams {
  return {
    name: 'HKDF',
    hash: 'SHA-256',
    salt: new Uint8Array(0),
    info: utf8.encode(info),
  }
}

export async function deriveKeys(
  email: string,
  password: string,
): Promise<DerivedKeys> {
  const subtle = crypto.subtle
  const passwordKey = await subtle.importKey(
    'raw',
    utf8.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const base = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: utf8.encode(normalizeEmail(email)),
      iterations: KDF_ITERATIONS,
    },
    passwordKey,
    256,
  )
  // HKDF es de una sola vía: con authPassword no se llega a masterKey.
  const baseKey = await subtle.importKey('raw', base, 'HKDF', false, [
    'deriveBits',
    'deriveKey',
  ])
  const auth = await subtle.deriveBits(hkdf('auth'), baseKey, 256)
  const masterKey = await subtle.deriveKey(hkdf('enc'), baseKey, AES, false, [
    'wrapKey',
    'unwrapKey',
  ])
  return { authPassword: toBase64(auth), masterKey }
}

// Extraíble solo para poder envolverla. La que se usa sale de unwrapDataKey.
export function createDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES, true, ['encrypt', 'decrypt'])
}

export async function wrapDataKey(
  dataKey: CryptoKey,
  masterKey: CryptoKey,
): Promise<WrappedKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await crypto.subtle.wrapKey('raw', dataKey, masterKey, {
    name: 'AES-GCM',
    iv,
  })
  return { wrappedKey: toBase64(wrapped), iv: toBase64(iv) }
}

// Lanza si la masterKey no es la correcta (AES-GCM no autentica).
// extractable solo para re-envolverla (cambio de contraseña, códigos nuevos).
export function unwrapDataKey(
  wrapped: WrappedKey,
  masterKey: CryptoKey,
  extractable = false,
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    fromBase64(wrapped.wrappedKey),
    masterKey,
    { name: 'AES-GCM', iv: fromBase64(wrapped.iv) },
    AES,
    extractable,
    ['encrypt', 'decrypt'],
  )
}
