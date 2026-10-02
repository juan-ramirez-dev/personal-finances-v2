import { ApiError } from '../errors'
import type { Ctx } from '../http'
import { archiveFixed } from '../fixed-expenses/repo'
import {
  activeInvestmentFixedId,
  upsertInvestment,
  upsertInvestmentFixed,
} from './repo'
import type { InvestmentInput } from './schema'

// Un solo fijo de inversión activo. Sin aporte, se archiva.
export async function saveInvestment(
  { db, user }: Ctx,
  input: InvestmentInput,
) {
  const activeId = await activeInvestmentFixedId(db)
  const { fixed } = input

  if (input.investment.hasInvestments && fixed) {
    // El valor viene cifrado con su id en el AAD: no se puede mover a otra fila.
    if (activeId && activeId !== fixed.id) {
      throw new ApiError(409, 'Ya tienes otro fijo de inversión')
    }
    await upsertInvestmentFixed(db, user.id, fixed)
  } else if (activeId) {
    await archiveFixed(db, [activeId])
  }

  await upsertInvestment(db, user.id, input.investment)
}
