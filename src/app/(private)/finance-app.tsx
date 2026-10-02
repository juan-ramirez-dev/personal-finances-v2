'use client'

import { Dashboard } from './dashboard/dashboard'
import { useFinance } from './finance-provider'
import { Onboarding } from './onboarding/onboarding'

// Sin onboarding completo no hay panel → onboarding.
export function FinanceApp({ userName }: { userName: string }) {
  const { data, ready, loadError } = useFinance()
  // Descifrando: no mostrar el onboarding por error a quien ya tiene datos.
  if (!ready) return null
  if (loadError) return <p role="alert">{loadError}</p>
  return data ? (
    <Dashboard userName={userName} />
  ) : (
    <Onboarding userName={userName} />
  )
}
