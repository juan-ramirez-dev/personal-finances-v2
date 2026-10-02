import 'server-only'

import { createSessionClient } from '@/lib/supabase/server'
import { isKind, type VaultRow } from '@/lib/vault/rows'

// Solo ciphertext. Se descifra en el navegador (FinanceProvider).
export async function getVault(): Promise<VaultRow[]> {
  const db = await createSessionClient()
  const { data, error } = await db
    .from('vault_items')
    .select('id, kind, ciphertext, iv')
  if (error) throw new Error(`vault_items: ${error.message}`)
  // La tabla ya tiene check de kind; esto solo afina el tipo.
  return data.flatMap(row =>
    isKind(row.kind) ? [{ ...row, kind: row.kind }] : [],
  )
}
