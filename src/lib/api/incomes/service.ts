import { ApiError } from '../errors'
import type { Ctx } from '../http'
import { deleteIncome, insertIncome } from './repo'
import type { IncomeDto } from './schema'

export function addIncome({ db, user }: Ctx, income: IncomeDto) {
  return insertIncome(db, user.id, income)
}

export async function removeIncome({ db }: Ctx, id: string) {
  if (!(await deleteIncome(db, id))) {
    throw new ApiError(404, 'Ingreso no encontrado')
  }
}
