'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { RecoveryCodes } from '@/components/ui/recovery-codes'
import { replaceRecoveryCodes } from '@/lib/api-client/auth'
import { errorMessage } from '@/lib/api-client/http'
import {
  createRecoveryCodes,
  readRecoveryCodes,
} from '@/lib/api-client/recovery-codes'
import { loadDataKey } from '@/lib/vault/key-store'
import { RECOVERY_CODE_COUNT } from '@/lib/vault/recovery'
import { reopenDataKey } from './reopen-key'
import styles from './settings.module.css'

interface RecoverySectionProps {
  userId: string
  email: string
}

export function RecoverySection({ userId, email }: RecoverySectionProps) {
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [pending, startTransition] = useTransition()

  // Se descifran con la llave de la sesión: el server solo tiene texto cifrado.
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const key = await loadDataKey(userId)
        if (!key) throw new Error('Sin llave')
        const read = await readRecoveryCodes(key, userId)
        if (active) setCodes(read)
      } catch (failure) {
        console.error('No se pudieron leer los códigos', failure)
        if (active)
          setError('No se pudieron leer tus códigos. Vuelve a entrar.')
      }
    })()
    return () => {
      active = false
    }
  }, [userId])

  function onRegenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const password = String(
      new FormData(event.currentTarget).get('password') ?? '',
    )
    startTransition(async () => {
      try {
        const dataKey = await reopenDataKey(email, password)
        if (!dataKey) {
          setError('Contraseña incorrecta')
          return
        }
        const fresh = await createRecoveryCodes(
          dataKey,
          userId,
          RECOVERY_CODE_COUNT,
        )
        await replaceRecoveryCodes(fresh.entries)
        setCodes(fresh.codes)
        setAsking(false)
        setError(null)
      } catch (failure) {
        setError(errorMessage(failure))
      }
    })
  }

  return (
    <section className={styles.section}>
      <h2>Códigos de recuperación</h2>
      <p className={styles.hint}>
        Si olvidas tu contraseña, cualquiera de estos la cambia sin perder tus
        datos. Cada uno sirve una vez. Te quedan {codes?.length ?? '…'} de{' '}
        {RECOVERY_CODE_COUNT}.
      </p>

      {codes && codes.length > 0 && <RecoveryCodes codes={codes} />}

      {asking ? (
        <form onSubmit={onRegenerate} className={styles.section}>
          <p className={styles.hint}>
            Los códigos actuales dejan de servir. Confirma con tu contraseña.
          </p>
          <label className={field.field}>
            <span className={field.label}>Contraseña</span>
            <input
              className={field.input}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? 'Generando…' : 'Generar códigos nuevos'}
          </Button>
        </form>
      ) : (
        <Button type="button" variant="ghost" onClick={() => setAsking(true)}>
          Generar códigos nuevos
        </Button>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  )
}
