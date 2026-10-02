import type { VaultSession } from '@/lib/api/auth/schema'
import { saveUserKey } from '@/lib/api-client/auth'
import { createRecoveryCodes } from '@/lib/api-client/recovery-codes'
import { saveDataKey } from '@/lib/vault/key-store'
import { createDataKey, unwrapDataKey, wrapDataKey } from '@/lib/vault/keys'
import { RECOVERY_CODE_COUNT } from '@/lib/vault/recovery'

export type UnlockResult =
  | { ok: true; recoveryCodes: string[] | null } // códigos solo si se creó la llave
  | { ok: false; error: string }

// Abre la dataKey (o la crea con sus códigos en el primer login) y la deja en IndexedDB.
export async function unlockVault(
  session: VaultSession,
  masterKey: CryptoKey,
): Promise<UnlockResult> {
  try {
    let wrapped = session.wrappedKey
    let recoveryCodes: string[] | null = null
    if (!wrapped) {
      const dataKey = await createDataKey()
      const fresh = await wrapDataKey(dataKey, masterKey)
      const { codes, entries } = await createRecoveryCodes(
        dataKey,
        session.userId,
        RECOVERY_CODE_COUNT,
      )
      const { existing } = await saveUserKey(fresh, entries)
      wrapped = existing ?? fresh
      // Si otra pestaña ganó, estos códigos no se guardaron.
      if (!existing) recoveryCodes = codes
    }
    await storeSession(session, await unwrapDataKey(wrapped, masterKey))
    return { ok: true, recoveryCodes }
  } catch (error) {
    console.error('No se pudo abrir la llave', error)
    return {
      ok: false,
      error: 'No se pudieron abrir tus datos. Intenta de nuevo.',
    }
  }
}

// Se guarda no exportable: la extraíble solo existió para envolverla.
function storeSession(session: VaultSession, key: CryptoKey) {
  return saveDataKey({
    key,
    userId: session.userId,
    expiresAt: session.expiresAt,
  })
}
