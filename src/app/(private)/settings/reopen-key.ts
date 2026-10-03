import { getUserKey } from '@/lib/api-client/auth'
import { deriveKeys, unwrapDataKey } from '@/lib/vault/keys'

// La de IndexedDB no es exportable. Para re-envolverla hay que abrirla
// otra vez con la contraseña. Si no abre, la contraseña está mal.
export async function reopenDataKey(
  email: string,
  password: string,
): Promise<CryptoKey | null> {
  const { masterKey } = await deriveKeys(email, password)
  try {
    return await unwrapDataKey(await getUserKey(), masterKey, true)
  } catch {
    return null
  }
}
