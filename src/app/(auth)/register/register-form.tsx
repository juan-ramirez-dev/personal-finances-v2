'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { register, type RegisterState } from '../actions'
import styles from '../login/login.module.css'
import { MIN_PASSWORD_LENGTH } from './validate-register'

const initialState: RegisterState = { error: null, notice: null }

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initialState)

  return (
    <form action={action} className={styles.form}>
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

      {state.error && <p className={styles.error}>{state.error}</p>}
      {state.notice && <p className={styles.notice}>{state.notice}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Creando…' : 'Crear cuenta'}
      </Button>

      <p className={styles.switch}>
        ¿Ya tienes cuenta? <Link href="/login">Entrar</Link>
      </p>
    </form>
  )
}
