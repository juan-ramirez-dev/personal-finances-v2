import { requireRole } from '@/lib/auth/guards'
import { getFinance } from '@/lib/finance/queries'
import { FinanceApp } from './finance-app'
import { FinanceProvider } from './finance-provider'
import { SessionTimer } from './session-timer'

export default async function HomePage() {
  const user = await requireRole()
  const finance = await getFinance()

  return (
    <FinanceProvider initial={finance}>
      <SessionTimer expiresAt={user.expiresAt} />
      <FinanceApp userName={user.name ?? user.email ?? ''} />
    </FinanceProvider>
  )
}
