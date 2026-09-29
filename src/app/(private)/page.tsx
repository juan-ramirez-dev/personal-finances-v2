import { requireRole } from '@/lib/auth/guards'
import { getSession } from '@/lib/auth/session'
import { createUserClient } from '@/lib/supabase/server'
import { FinanceApp } from './finance-app'

export default async function HomePage() {
  const user = await requireRole()
  const session = await getSession()

  const { data } = session
    ? await createUserClient(session.accessToken)
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  return <FinanceApp userName={data?.full_name ?? user.email ?? ''} />
}
