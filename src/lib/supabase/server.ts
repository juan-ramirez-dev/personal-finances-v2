import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth/session'
import { env } from '@/lib/env'
import type { Database } from './database.types'

// Sin sesión persistida: el token vive solo en nuestra cookie httpOnly.
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
}

export function createAnonClient() {
  return createClient<Database>(
    env.supabaseUrl,
    env.supabasePublishableKey,
    options,
  )
}

// Consultas como el usuario: RLS aplica con su token.
export function createUserClient(accessToken: string) {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    ...options,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

// Usar después de authorize()/requireRole(): ahí ya se validó la sesión.
export async function createSessionClient() {
  const session = await getSession()
  if (!session) throw new Error('Sin sesión')
  return createUserClient(session.accessToken)
}
