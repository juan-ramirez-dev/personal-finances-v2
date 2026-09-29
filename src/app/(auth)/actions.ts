'use server'

import { decodeJwt } from 'jose'
import { redirect } from 'next/navigation'
import { deleteSession, setSession } from '@/lib/auth/session'
import { createAnonClient } from '@/lib/supabase/server'
import { validateRegister } from './register/validate-register'

export interface LoginState {
  error: string | null
}

export interface RegisterState {
  error: string | null
  notice: string | null
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Email y contraseña requeridos' }

  const { data, error } = await createAnonClient().auth.signInWithPassword({
    email,
    password,
  })
  if (error || !data.session) return { error: 'Credenciales inválidas' }

  // Solo guardamos el access token. El refresh token se descarta a propósito.
  const { exp } = decodeJwt(data.session.access_token)
  if (!exp) return { error: 'Token sin expiración' }
  await setSession(data.session.access_token, exp * 1000)

  redirect('/')
}

export async function register(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const result = validateRegister(formData)
  if (!result.ok) return { error: result.error, notice: null }

  const { fullName, email, password } = result.data
  // `name` en metadata: verify-token lo lee para mostrarlo en la app.
  const { data, error } = await createAnonClient().auth.signUp({
    email,
    password,
    options: { data: { name: fullName } },
  })
  if (error) {
    console.error('No se pudo registrar', error.message)
    return { error: 'No se pudo crear la cuenta', notice: null }
  }

  // Sin sesión = el proyecto pide confirmar el email.
  if (!data.session) {
    return {
      error: null,
      notice: 'Revisa tu correo para confirmar la cuenta',
    }
  }

  const { exp } = decodeJwt(data.session.access_token)
  if (!exp) return { error: 'Token sin expiración', notice: null }
  await setSession(data.session.access_token, exp * 1000)

  redirect('/')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
