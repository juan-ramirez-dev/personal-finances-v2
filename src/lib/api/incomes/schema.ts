import type { Sealed } from '@/lib/vault/cipher'
import { date, object, sealed, uuid } from '../parse'

export interface IncomeDto {
  id: string
  amount: Sealed
  description: Sealed
  date: string // YYYY-MM-DD, en claro
}

export function parseIncome(body: unknown): IncomeDto {
  const input = object(body)
  return {
    id: uuid(input.id),
    amount: sealed(input.amount),
    description: sealed(input.description),
    date: date(input.date),
  }
}
