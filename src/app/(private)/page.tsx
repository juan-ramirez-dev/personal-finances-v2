import { requireUser } from '@/lib/auth/guards'
import { FinanceApp } from './finance-app'
import { FinanceProvider } from './finance-provider'
import { SessionTimer } from './session-timer'

// Los datos llegan cifrados por /api/finance y se descifran en el navegador.
export default async function HomePage() {
  const user = await requireUser()

  return (
    <FinanceProvider userId={user.id}>
      <SessionTimer expiresAt={user.expiresAt} />
      <FinanceApp userName={user.name ?? user.email ?? ''} />
    </FinanceProvider>
  )
}
