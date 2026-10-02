// Forma de una fila de vault_items tal como viaja por la red.
// Se usa en cliente y servidor: sin 'server-only' ni Web Crypto.

export const VAULT_KINDS = [
  'settings',
  'fixed',
  'category',
  'expense',
  'income',
] as const
export type VaultKind = (typeof VAULT_KINDS)[number]

export interface VaultRow {
  id: string
  kind: VaultKind
  ciphertext: string
  iv: string
}

// Igual al check de la tabla. Un registro real pesa < 1 KB.
export const MAX_CIPHERTEXT = 65_536
export const MAX_ROWS_PER_CALL = 500

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/
// AES-GCM usa iv de 12 bytes = 16 caracteres base64.
const IV_LENGTH = 16

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
export const isKind = (v: unknown): v is VaultKind =>
  VAULT_KINDS.some(kind => kind === v)
export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && UUID.test(v)

// El servidor no puede leer el contenido: solo revisa la forma.
export function validateRows(input: unknown): Result<VaultRow[]> {
  if (!Array.isArray(input) || input.length > MAX_ROWS_PER_CALL) {
    return { ok: false, error: 'Datos inválidos' }
  }
  const rows: VaultRow[] = []
  for (const row of input) {
    if (
      !isObject(row) ||
      !isUuid(row.id) ||
      !isKind(row.kind) ||
      typeof row.ciphertext !== 'string' ||
      row.ciphertext.length > MAX_CIPHERTEXT ||
      !BASE64.test(row.ciphertext) ||
      typeof row.iv !== 'string' ||
      row.iv.length !== IV_LENGTH ||
      !BASE64.test(row.iv)
    ) {
      return { ok: false, error: 'Datos inválidos' }
    }
    rows.push({
      id: row.id,
      kind: row.kind,
      ciphertext: row.ciphertext,
      iv: row.iv,
    })
  }
  return { ok: true, value: rows }
}

export function validateIds(input: unknown): Result<string[]> {
  if (
    !Array.isArray(input) ||
    input.length > MAX_ROWS_PER_CALL ||
    !input.every(isUuid)
  ) {
    return { ok: false, error: 'Datos inválidos' }
  }
  return { ok: true, value: input }
}
