import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'
import { SESSION_COOKIE } from './constants'
import { verifyToken, type TokenClaims } from './verify-token'

export interface Session extends TokenClaims {
  accessToken: string
}

// La cookie vence exactamente cuando vence el token (2h). Sin refresh.
export async function setSession(accessToken: string, expiresAt: number) {
  const maxAge = Math.floor((expiresAt - Date.now()) / 1000)
  const store = await cookies()
  store.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

export async function deleteSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

// Una verificación por request, aunque se llame varias veces.
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies()
  const accessToken = store.get(SESSION_COOKIE)?.value
  if (!accessToken) return null

  const claims = await verifyToken(accessToken)
  return claims ? { ...claims, accessToken } : null
})
