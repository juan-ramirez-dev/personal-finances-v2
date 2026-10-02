import type { Sealed } from '@/lib/vault/cipher'
import { date, day, list, object, sealed, uuid } from '../parse'

export interface FixedDto {
  id: string
  name: Sealed
  amount: Sealed
  dueDay: number
  isInvestment: boolean
}

// El de inversión lo maneja /api/investment: aquí solo cambia su día.
export type FixedInput =
  | { id: string; isInvestment: true; dueDay: number }
  | {
      id: string
      isInvestment: false
      name: Sealed
      amount: Sealed
      dueDay: number
    }

export interface PaymentsRange {
  from: string // incluido
  to: string // excluido: día del próximo pago
}

export function parseFixedList(body: unknown): FixedInput[] {
  return list(body).map(item => {
    const input = object(item)
    if (input.isInvestment === true) {
      return {
        id: uuid(input.id),
        isInvestment: true,
        dueDay: day(input.dueDay),
      }
    }
    return {
      id: uuid(input.id),
      isInvestment: false,
      name: sealed(input.name),
      amount: sealed(input.amount),
      dueDay: day(input.dueDay),
    }
  })
}

export function parsePaymentsRange(params: URLSearchParams): PaymentsRange {
  return { from: date(params.get('from')), to: date(params.get('to')) }
}
