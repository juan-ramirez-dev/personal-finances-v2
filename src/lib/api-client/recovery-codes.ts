import type { RecoveryCodeEntry } from '@/lib/api/auth/schema'
import { wrapDataKey } from '@/lib/vault/keys'
import {
  deriveRecoveryKeys,
  generateRecoveryCode,
  hashRecoveryToken,
  normalizeRecoveryCode,
} from '@/lib/vault/recovery'
import { getRecoveryCodes } from './auth'
import { createSealer } from './sealed'

export interface NewRecoveryCodes {
  codes: string[] // para mostrar una vez
  entries: RecoveryCodeEntry[] // lo que va a la DB
}

// `dataKey` debe ser extraíble: cada código envuelve una copia.
export async function createRecoveryCodes(
  dataKey: CryptoKey,
  userId: string,
  count: number,
): Promise<NewRecoveryCodes> {
  const sealer = createSealer(dataKey, userId)
  const codes = Array.from({ length: count }, generateRecoveryCode)
  const entries = await Promise.all(
    codes.map(async code => {
      // Un código recién generado siempre es válido.
      const { authToken, codeKey } = await deriveRecoveryKeys(
        normalizeRecoveryCode(code) ?? code,
      )
      const id = crypto.randomUUID()
      return {
        id,
        authHash: await hashRecoveryToken(authToken),
        ...(await wrapDataKey(dataKey, codeKey)),
        code: await sealer.seal('recovery_codes', id, 'code', code),
      }
    }),
  )
  return { codes, entries }
}

// Para ajustes: con la dataKey de la sesión basta para leerlos.
export async function readRecoveryCodes(
  dataKey: CryptoKey,
  userId: string,
): Promise<string[]> {
  const sealer = createSealer(dataKey, userId)
  const rows = await getRecoveryCodes()
  return Promise.all(
    rows.map(row => sealer.text('recovery_codes', row.id, 'code', row.code)),
  )
}
