import { fromBase64, toBase64, utf8 } from './encoding'

// Códigos de recuperación de un uso. Cada uno envuelve una copia de la dataKey.
// Ver docs/password-recovery.md.

export const RECOVERY_CODE_COUNT = 4

// Base32 sin 0/1/8/9: no se confunden con O/I/B/g al copiarlos a mano.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const LENGTH = 20 // 100 bits: sin PBKDF2, adivinarlo no es viable.
const GROUP = 5

export interface RecoveryKeys {
  // Prueba que tienes el código. Al server llega, nunca el código.
  authToken: string
  // Envuelve / abre la copia de la dataKey. Nunca sale del navegador.
  codeKey: CryptoKey
}

export function generateRecoveryCode(): string {
  // 256 es múltiplo de 32: el módulo no sesga ninguna letra.
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH))
  const chars = Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length])
  const groups = []
  for (let i = 0; i < LENGTH; i += GROUP) {
    groups.push(chars.slice(i, i + GROUP).join(''))
  }
  return groups.join('-')
}

// Acepta lo que el usuario pegue: minúsculas, espacios, guiones. null si no es un código.
export function normalizeRecoveryCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '')
  if (code.length !== LENGTH) return null
  for (const char of code) if (!ALPHABET.includes(char)) return null
  return code
}

function hkdf(info: string): HkdfParams {
  return {
    name: 'HKDF',
    hash: 'SHA-256',
    salt: new Uint8Array(0),
    info: utf8.encode(info),
  }
}

// Recibe el código ya normalizado.
export async function deriveRecoveryKeys(code: string): Promise<RecoveryKeys> {
  const subtle = crypto.subtle
  const base = await subtle.importKey('raw', utf8.encode(code), 'HKDF', false, [
    'deriveBits',
    'deriveKey',
  ])
  const auth = await subtle.deriveBits(hkdf('recovery-auth'), base, 256)
  const codeKey = await subtle.deriveKey(
    hkdf('recovery-enc'),
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  )
  return { authToken: toBase64(auth), codeKey }
}

// Lo que guarda la DB. Así un dump no sirve para pedir un reset.
export async function hashRecoveryToken(authToken: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', fromBase64(authToken))
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
