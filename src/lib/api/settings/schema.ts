import type { Sealed } from '@/lib/vault/cipher'
import { day, object, sealed } from '../parse'

export interface SettingsInput {
  monthlyIncome: Sealed
  payday: number
}

export interface SettingsDto extends SettingsInput {
  onboarded: boolean
}

export function parseSettings(body: unknown): SettingsInput {
  const input = object(body)
  return {
    monthlyIncome: sealed(input.monthlyIncome),
    payday: day(input.payday),
  }
}
