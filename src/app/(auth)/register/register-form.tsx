'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { register } from '@/lib/api-client/auth'
import { errorMessage } from '@/lib/api-client/http'
import { clearDataKey } from '@/lib/vault/key-store'
import { deriveKeys } from '@/lib/vault/keys'
import styles from '../login/login.module.css'
import { unlockVault } from '../unlock-vault'
import { MIN_PASSWORD_LENGTH, validateRegister } from './validate-register'

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    void clearDataKey()
  }, [])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    // El server ya no ve la contraseña real: sus reglas se validan aquí.
    const valid = validateRegister(new FormData(event.currentTarget))
    if (!valid.ok) {
      setError(valid.error)
      return
    }
    const { fullName, email, password } = valid.data

    startTransition(async () => {
      const { authPassword, masterKey } = await deriveKeys(email, password)
      let result
      try {
        result = await register(fullName, email, authPassword)
      } catch (failure) {
        setError(errorMessage(failure))
        return
      }
      setError(null)
      if (!result.session) {
        setNotice(result.notice)
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
        <p className={styles.eyebrow}>Registro</p>
        <h2 className={styles.title}>Crea tu cuenta</h2>
      </div>

      <label className={field.field}>
        <span className={field.label}>Nombre</span>
        <input
          className={field.input}
          name="fullName"
          type="text"
          autoComplete="name"
          required
        />
      </label>

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

      <p className={styles.privacy}>
        Tus datos se cifran en tu navegador con tu contraseña. Ni nosotros
        podemos verlos. Si la olvidas, no se pueden recuperar.{' '}
        <Link href="/privacy">Cómo funciona</Link>
      </p>

      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Creando…' : 'Crear cuenta'}
      </Button>

      <p className={styles.switch}>
        ¿Ya tienes cuenta? <Link href="/login">Entrar</Link>
      </p>
    </form>
  )
}
