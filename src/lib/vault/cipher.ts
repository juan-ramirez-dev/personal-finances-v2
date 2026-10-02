import { fromBase64, toBase64, utf8 } from './encoding'

// Dónde vive un valor cifrado. Va en el AAD: el valor queda amarrado a su celda.
export interface FieldRef {
  userId: string
  table: string
  id: string
  column: string
}

// "iv.ciphertext" en base64. Mismo formato que el dominio `sealed` de la DB.
export type Sealed = string

const aad = ({ userId, table, id, column }: FieldRef) =>
  utf8.encode(`${userId}:${table}:${id}:${column}`)

export async function sealField(
  key: CryptoKey,
  ref: FieldRef,
  value: unknown,
): Promise<Sealed> {
  // iv nuevo en cada guardado: AES-GCM se rompe si se repite con la misma llave.
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(ref) },
    key,
    utf8.encode(JSON.stringify(value)),
  )
  return `${toBase64(iv)}.${toBase64(ciphertext)}`
}

// Lanza si la llave o la celda no coinciden, o si alguien tocó el valor.
export async function openField(
  key: CryptoKey,
  ref: FieldRef,
  sealed: Sealed,
): Promise<unknown> {
  const [iv = '', ciphertext = ''] = sealed.split('.')
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv), additionalData: aad(ref) },
    key,
    fromBase64(ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plain))
}
