'use client'

import { useEffect } from 'react'

// Al vencer el token (2h), borra la cookie y manda a /login.
export function SessionTimer({ expiresAt }: { expiresAt: number }) {
  useEffect(() => {
    const timeout = setTimeout(
      () => window.location.replace('/api/auth/clear-session'),
      Math.max(expiresAt - Date.now(), 0),
    )
    return () => clearTimeout(timeout)
  }, [expiresAt])

  return null
}
