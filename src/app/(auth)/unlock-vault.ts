import { saveDataKey } from '@/lib/vault/key-store'
import { createDataKey, unwrapDataKey, wrapDataKey } from '@/lib/vault/keys'
import { saveUserKey, type VaultSession } from './actions'

// Abre la dataKey (o la crea en el primer login) y la deja en IndexedDB.
// Devuelve el error a mostrar, o null si quedó lista.
export async function unlockVault(
  session: VaultSession,
  masterKey: CryptoKey,
): Promise<string | null> {
  try {
    let wrapped = session.wrappedKey
    if (!wrapped) {
      const fresh = await wrapDataKey(await createDataKey(), masterKey)
      const saved = await saveUserKey(fresh)
      if (saved.error) return saved.error
      wrapped = saved.existing ?? fresh
    }
    // Se re-abre como no exportable: la extraíble solo existió para envolverla.
    const key = await unwrapDataKey(wrapped, masterKey)
    await saveDataKey({
      key,
      userId: session.userId,
      expiresAt: session.expiresAt,
    })
    return null
  } catch (error) {
    console.error('No se pudo abrir la llave', error)
    return 'No se pudieron abrir tus datos. Intenta de nuevo.'
  }
}
