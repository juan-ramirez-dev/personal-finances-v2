'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { login, type LoginState } from '../actions'
import styles from './login.module.css'

const initialState: LoginState = { error: null }

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState)

  return (
    <form action={action} className={styles.form}>
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

      {state.error && <p className={styles.error}>{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
