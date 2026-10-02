'use server'

import { AuthError, authorize } from '@/lib/auth/guards'
import { validateIds, validateRows } from '@/lib/vault/rows'
import { createSessionClient } from '@/lib/supabase/server'

export interface ActionResult {
  error: string | null
}

type Db = Awaited<ReturnType<typeof createSessionClient>>
type Write = (
  db: Db,
  userId: string,
) => PromiseLike<{ error: { message: string } | null }>

async function run(write: Write): Promise<ActionResult> {
  let userId: string
  try {
    userId = (await authorize()).id
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Tu sesión venció. Vuelve a entrar.' }
    }
    throw error
  }

  const { error } = await write(await createSessionClient(), userId)
  if (error) {
    console.error('Error guardando finanzas', error.message)
    return { error: 'No se pudo guardar. Intenta de nuevo.' }
  }
  return { error: null }
}

// El contenido llega cifrado: aquí solo se valida la forma.
// Las reglas de negocio corren en el navegador antes de cifrar (validate.ts).

export async function saveItems(input: unknown): Promise<ActionResult> {
  const parsed = validateRows(input)
  if (!parsed.ok) return { error: parsed.error }
  if (parsed.value.length === 0) return { error: null }
  // user_id sale de la sesión, nunca del cliente. RLS bloquea pisar filas ajenas.
  return run((db, userId) =>
    db
      .from('vault_items')
      .upsert(parsed.value.map(row => ({ ...row, user_id: userId }))),
  )
}

export async function deleteItems(ids: unknown): Promise<ActionResult> {
  const parsed = validateIds(ids)
  if (!parsed.ok) return { error: parsed.error }
  if (parsed.value.length === 0) return { error: null }
  return run(db => db.from('vault_items').delete().in('id', parsed.value))
}
