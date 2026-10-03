'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { login } from '@/lib/api-client/auth'
import { errorMessage } from '@/lib/api-client/http'
import { clearDataKey } from '@/lib/vault/key-store'
import { deriveKeys } from '@/lib/vault/keys'
import { CodesStep } from '../codes-step'
import { unlockVault } from '../unlock-vault'
import styles from '../auth-form.module.css'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [codes, setCodes] = useState<string[] | null>(null)

  // Toda salida (logout, sesión vencida) termina aquí: la llave vieja no debe quedar.
  useEffect(() => {
    void clearDataKey()
  }, [])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')

    startTransition(async () => {
      // La contraseña real se queda aquí. Al server va solo la derivada.
      const { authPassword, masterKey } = await deriveKeys(email, password)
      let session
      try {
        session = await login(email, authPassword)
      } catch (failure) {
        setError(errorMessage(failure))
        return
      }
      const unlocked = await unlockVault(session, masterKey)
      if (!unlocked.ok) {
        setError(unlocked.error)
        return
      }
      // Primer login tras confirmar el email: aquí nace la llave y sus códigos.
      if (unlocked.recoveryCodes) setCodes(unlocked.recoveryCodes)
      else router.replace('/')
    })
  }

  if (codes) {
    return <CodesStep codes={codes} onDone={() => router.replace('/')} />
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div>
        <p className={styles.eyebrow}>Acceso</p>
        <h2 className={styles.title}>
          Bienvenido <em>de vuelta.</em>
        </h2>
      </div>

      <label className={field.field}>
        <span className={field.label}>Email</span>
        <input
          className={field.input}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>

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

      {error && <p className={styles.error}>{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>

      <p className={styles.switch}>
        <span>
          ¿No tienes cuenta? <Link href="/register">Crear cuenta</Link>
        </span>
        <Link href="/forgot">¿Olvidaste tu contraseña?</Link>
        <Link href="/privacy">Privacidad</Link>
      </p>
    </form>
  )
}
