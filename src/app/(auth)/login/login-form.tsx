'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { clearDataKey } from '@/lib/vault/key-store'
import { deriveKeys } from '@/lib/vault/keys'
import { login } from '../actions'
import { unlockVault } from '../unlock-vault'
import styles from './login.module.css'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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
      const result = await login({ email, authPassword })
      if (!result.session) {
        setError(result.error)
        return
      }
      const failed = await unlockVault(result.session, masterKey)
      if (failed) {
        setError(failed)
        return
      }
      router.replace('/')
    })
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div>
        <p className={styles.eyebrow}>Acceso</p>
        <h2 className={styles.title}>Bienvenido</h2>
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
        ¿No tienes cuenta? <Link href="/register">Crear cuenta</Link>
        <br />
        <Link href="/privacy">Privacidad</Link>
      </p>
    </form>
  )
}
