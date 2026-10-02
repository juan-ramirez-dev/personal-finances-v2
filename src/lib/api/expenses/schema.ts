import type { Sealed } from '@/lib/vault/cipher'
import { ApiError } from '../errors'
import { date, object, sealed, uuid } from '../parse'

export interface ExpenseDto {
  id: string
  amount: Sealed
  description: Sealed
  date: string // YYYY-MM-DD, en claro
  target: { kind: 'fixed' | 'category'; id: string }
}

export function parseExpense(body: unknown): ExpenseDto {
  const input = object(body)
  const target = object(input.target)
  if (target.kind !== 'fixed' && target.kind !== 'category') {
    throw new ApiError(400, 'Elige a qué va el gasto')
  }
  return {
    id: uuid(input.id),
    amount: sealed(input.amount),
    description: sealed(input.description),
    date: date(input.date),
    target: { kind: target.kind, id: uuid(target.id) },
  }
}
