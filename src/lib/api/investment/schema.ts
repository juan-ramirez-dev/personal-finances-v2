import type { Sealed } from '@/lib/vault/cipher'
import { bool, day, object, sealed, uuid } from '../parse'

export interface InvestmentDto {
  hasInvestments: boolean
  monthlyContribution: Sealed
  totalBalance: Sealed
}

// El aporte mensual vive como un fijo más. Lo calcula y cifra el cliente.
export interface InvestmentFixedInput {
  id: string
  name: Sealed
  amount: Sealed
  dueDay: number
}

export interface InvestmentInput {
  investment: InvestmentDto
  fixed: InvestmentFixedInput | null // null = sin aporte: se archiva el fijo
}

export function parseInvestment(body: unknown): InvestmentInput {
  const input = object(body)
  const investment = object(input.investment)
  const fixed = input.fixed === null ? null : object(input.fixed)
  return {
    investment: {
      hasInvestments: bool(investment.hasInvestments),
      monthlyContribution: sealed(investment.monthlyContribution),
      totalBalance: sealed(investment.totalBalance),
    },
    fixed: fixed && {
      id: uuid(fixed.id),
      name: sealed(fixed.name),
      amount: sealed(fixed.amount),
      dueDay: day(fixed.dueDay),
    },
  }
}
