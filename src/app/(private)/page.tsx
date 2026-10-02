import { requireUser } from '@/lib/auth/guards'
import { getVault } from '@/lib/finance/queries'
import { FinanceApp } from './finance-app'
import { FinanceProvider } from './finance-provider'
import { SessionTimer } from './session-timer'

export default async function HomePage() {
  const user = await requireUser()
  const rows = await getVault()

  return (
    <FinanceProvider rows={rows} userId={user.id}>
      <SessionTimer expiresAt={user.expiresAt} />
      <FinanceApp userName={user.name ?? user.email ?? ''} />
    </FinanceProvider>
  )
}
