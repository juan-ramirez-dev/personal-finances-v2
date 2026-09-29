'use client'

import { Dashboard } from './dashboard/dashboard'
import { useFinance } from './finance-provider'
import { Onboarding } from './onboarding/onboarding'

// Sin onboarding completo en DB no hay datos → onboarding.
export function FinanceApp({ userName }: { userName: string }) {
  const { data } = useFinance()
  return data ? (
    <Dashboard userName={userName} />
  ) : (
    <Onboarding userName={userName} />
  )
}
