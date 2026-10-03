import { recoverFinish, recoverStart } from '@/lib/api-client/auth'
import { errorMessage } from '@/lib/api-client/http'
import { createRecoveryCodes } from '@/lib/api-client/recovery-codes'
import { deriveKeys, unwrapDataKey, wrapDataKey } from '@/lib/vault/keys'
import { deriveRecoveryKeys, normalizeRecoveryCode } from '@/lib/vault/recovery'
import { unlockVault } from '../unlock-vault'

export type RecoverResult =
  | { ok: true; newCode: string }
  | { ok: false; error: string }

// El código abre la copia de la dataKey; la nueva contraseña la vuelve a envolver.
// Los datos no se tocan: la dataKey es la misma.
export async function recoverAccount(
  email: string,
  rawCode: string,
  password: string,
): Promise<RecoverResult> {
  const code = normalizeRecoveryCode(rawCode)
  if (!code)
    return { ok: false, error: 'Ese código no tiene el formato correcto' }

  try {
    const { authToken, codeKey } = await deriveRecoveryKeys(code)
    const found = await recoverStart(email, authToken)
    const dataKey = await unwrapDataKey(found.key, codeKey, true)
    const { authPassword, masterKey } = await deriveKeys(email, password)
    const { codes, entries } = await createRecoveryCodes(
      dataKey,
      found.userId,
      1,
    )
    const session = await recoverFinish({
      email,
      authPassword,
      authToken,
      key: await wrapDataKey(dataKey, masterKey),
      newCode: entries[0],
    })
    const unlocked = await unlockVault(session, masterKey)
    if (!unlocked.ok) return unlocked
    return { ok: true, newCode: codes[0] }
  } catch (failure) {
    return { ok: false, error: errorMessage(failure) }
  }
}
