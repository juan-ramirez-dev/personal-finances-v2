'use client'

import { Dashboard } from './dashboard/dashboard'
import { useFinance } from './finance-provider'
import { Onboarding } from './onboarding/onboarding'

// Sin settings guardado no hay datos → onboarding.
export function FinanceApp({ userName }: { userName: string }) {
  const { data, ready } = useFinance()
  // Descifrando: no mostrar el onboarding por error a quien ya tiene datos.
  if (!ready) return null
  return data ? (
    <Dashboard userName={userName} />
  ) : (
    <Onboarding userName={userName} />
  )
}
