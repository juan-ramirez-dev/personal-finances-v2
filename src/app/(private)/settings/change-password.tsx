'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { changePassword } from '@/lib/api-client/auth'
import { errorMessage } from '@/lib/api-client/http'
import { checkNewPassword, MIN_PASSWORD_LENGTH } from '@/lib/auth/new-password'
import { deriveKeys, wrapDataKey } from '@/lib/vault/keys'
import { reopenDataKey } from './reopen-key'
import styles from './settings.module.css'

// La dataKey no cambia: solo se envuelve con la llave de la nueva contraseña.
export function ChangePassword({ email }: { email: string }) {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    const current = String(form.get('current') ?? '')
    const password = String(form.get('password') ?? '')
    const invalid = checkNewPassword(
      password,
      String(form.get('confirmPassword') ?? ''),
    )
    setDone(false)
    if (invalid) {
      setError(invalid)
      return
    }

    startTransition(async () => {
      try {
        const dataKey = await reopenDataKey(email, current)
        if (!dataKey) {
          setError('La contraseña actual no es correcta')
          return
        }
        const { authPassword, masterKey } = await deriveKeys(email, password)
        await changePassword(
          authPassword,
          await wrapDataKey(dataKey, masterKey),
        )
        target.reset()
        setError(null)
        setDone(true)
      } catch (failure) {
        setError(errorMessage(failure))
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className={styles.section}>
      <h2>Cambiar contraseña</h2>

      <label className={field.field}>
        <span className={field.label}>Contraseña actual</span>
        <input
          className={field.input}
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      <label className={field.field}>
        <span className={field.label}>Contraseña nueva</span>
        <input
          className={field.input}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>

      <label className={field.field}>
        <span className={field.label}>Confirmar contraseña</span>
        <input
          className={field.input}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}
      {done && <p className={styles.notice}>Listo. Usa la nueva al entrar.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  )
}
