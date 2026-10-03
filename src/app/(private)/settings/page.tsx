import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/guards'
import { SessionTimer } from '../session-timer'
import { Settings } from './settings'

export const metadata: Metadata = { title: 'Ajustes · Lucka' }

export default async function SettingsPage() {
  const user = await requireUser()

  return (
    <>
      <SessionTimer expiresAt={user.expiresAt} />
      <Settings userId={user.id} email={user.email ?? ''} />
    </>
  )
}
