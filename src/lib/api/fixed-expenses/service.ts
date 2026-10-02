import { ApiError } from '../errors'
import type { Ctx } from '../http'
import {
  archiveFixed,
  deletePayments,
  fixedExists,
  listActiveFixed,
  setDueDay,
  upsertFixed,
} from './repo'
import type { FixedInput, PaymentsRange } from './schema'

// Reemplaza la lista: upsert por id y archiva los que no vienen.
// El fijo de inversión nunca se archiva ni se edita aquí, salvo su día.
export async function replaceFixed({ db, user }: Ctx, items: FixedInput[]) {
  const active = await listActiveFixed(db)
  const investmentId = active.find(f => f.isInvestment)?.id

  const regular = items.filter(f => !f.isInvestment)
  if (regular.some(f => f.id === investmentId)) {
    throw new ApiError(422, 'La inversión se edita desde inversiones')
  }
  const keep = new Set(regular.map(f => f.id))
  const missing = active
    .filter(f => !f.isInvestment && !keep.has(f.id))
    .map(f => f.id)

  await upsertFixed(db, user.id, regular)
  await archiveFixed(db, missing)

  const investment = items.find(f => f.isInvestment)
  if (investment && investment.id === investmentId) {
    await setDueDay(db, investment.id, investment.dueDay)
  }
}

// Desmarcar pagado = borrar sus pagos del ciclo. Las fechas van en claro.
export async function clearPayments(
  { db }: Ctx,
  fixedId: string,
  range: PaymentsRange,
) {
  if (!(await fixedExists(db, fixedId))) {
    throw new ApiError(404, 'Gasto fijo no encontrado')
  }
  await deletePayments(db, fixedId, range)
}
