'use client'

import { useEffect } from 'react'
import { clearDataKey } from '@/lib/vault/key-store'

// Al vencer el token (2h), borra la llave y la cookie y manda a /login.
export function SessionTimer({ expiresAt }: { expiresAt: number }) {
  useEffect(() => {
    const timeout = setTimeout(
      () =>
        void clearDataKey().then(() =>
          window.location.replace('/api/auth/clear-session'),
        ),
      Math.max(expiresAt - Date.now(), 0),
    )
    return () => clearTimeout(timeout)
  }, [expiresAt])

  return null
}
