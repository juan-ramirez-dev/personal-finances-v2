import { fromBase64, toBase64, utf8 } from './encoding'
import type { VaultKind } from './rows'

export interface ItemRef {
  userId: string
  id: string
  kind: VaultKind
}

export interface Encrypted {
  ciphertext: string
  iv: string
}

// AAD: amarra el blob a su fila. Moverlo a otro id, kind o usuario rompe el descifrado.
const aad = ({ userId, id, kind }: ItemRef) =>
  utf8.encode(`${userId}:${id}:${kind}`)

export async function encryptItem(
  key: CryptoKey,
  ref: ItemRef,
  value: unknown,
): Promise<Encrypted> {
  // iv nuevo en cada guardado: AES-GCM se rompe si se repite con la misma llave.
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(ref) },
    key,
    utf8.encode(JSON.stringify(value)),
  )
  return { ciphertext: toBase64(ciphertext), iv: toBase64(iv) }
}

// Lanza si la llave o el AAD no coinciden, o si alguien tocó el blob.
export async function decryptItem(
  key: CryptoKey,
  ref: ItemRef,
  item: Encrypted,
): Promise<unknown> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(item.iv), additionalData: aad(ref) },
    key,
    fromBase64(item.ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plain))
}
