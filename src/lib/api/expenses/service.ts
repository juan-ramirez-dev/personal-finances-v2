import { ApiError } from '../errors'
import type { Ctx } from '../http'
import { deleteExpense, insertExpense, targetIsActive } from './repo'
import type { ExpenseDto } from './schema'

// El monto va cifrado: que sea > 0 lo valida el cliente antes de cifrar.
export async function addExpense({ db, user }: Ctx, expense: ExpenseDto) {
  if (!(await targetIsActive(db, expense.target))) {
    throw new ApiError(422, 'Elige a qué va el gasto')
  }
  await insertExpense(db, user.id, expense)
}

export async function removeExpense({ db }: Ctx, id: string) {
  if (!(await deleteExpense(db, id))) {
    throw new ApiError(404, 'Gasto no encontrado')
  }
}
