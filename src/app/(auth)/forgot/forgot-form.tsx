'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { checkNewPassword, MIN_PASSWORD_LENGTH } from '@/lib/auth/new-password'
import { clearDataKey } from '@/lib/vault/key-store'
import { CodesStep } from '../codes-step'
import styles from '../auth-form.module.css'
import { recoverAccount } from './recover-account'

export function ForgotForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    void clearDataKey()
  }, [])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase()
    const code = String(form.get('code') ?? '')
    const password = String(form.get('password') ?? '')
    const invalid = checkNewPassword(
      password,
      String(form.get('confirmPassword') ?? ''),
    )
    if (invalid) {
      setError(invalid)
      return
    }

    startTransition(async () => {
      const result = await recoverAccount(email, code, password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setNewCode(result.newCode)
    })
  }

  if (newCode) {
    return <CodesStep codes={[newCode]} onDone={() => router.replace('/')} />
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div>
        <p className={styles.eyebrow}>Recuperar</p>
        <h2 className={styles.title}>Nueva contraseña</h2>
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
        <span className={field.label}>Código de recuperación</span>
        <input
          className={field.input}
          name="code"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
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

      <p className={styles.privacy}>
        Usa uno de los códigos que guardaste al crear la cuenta. Tus datos se
        mantienen. Ese código se gasta y te damos uno nuevo.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Cambiando…' : 'Cambiar contraseña'}
      </Button>

      <p className={styles.switch}>
        <Link href="/login">Volver a entrar</Link>
      </p>
    </form>
  )
}
