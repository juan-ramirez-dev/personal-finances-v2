import type { Ctx } from '../http'
import {
  archiveCategories,
  listActiveCategories,
  upsertCategories,
} from './repo'
import type { CategoryDto } from './schema'

// Reemplaza la lista: upsert por id y archiva las que no vienen.
// Nombres repetidos: el server no los puede comparar (cifrados). Lo valida el cliente.
export async function replaceCategories(
  { db, user }: Ctx,
  items: CategoryDto[],
) {
  const active = await listActiveCategories(db)
  const keep = new Set(items.map(c => c.id))
  await upsertCategories(db, user.id, items)
  await archiveCategories(
    db,
    active.filter(c => !keep.has(c.id)).map(c => c.id),
  )
}
