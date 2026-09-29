'use server'

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
  if (error || !data.session?.expires_at) {
    return { error: 'Credenciales inválidas' }
  }

  // Solo el access token. El refresh se descarta (ver docs/auth.md).
  await setSession(data.session.access_token, data.session.expires_at * 1000)
  redirect('/')
}

export async function register(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const result = validateRegister(formData)
  if (!result.ok) return { error: result.error, notice: null }

  const { fullName, email, password } = result.data
  const { data, error } = await createAnonClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) {
    console.error('No se pudo registrar', error.message)
    return { error: 'No se pudo crear la cuenta', notice: null }
  }

  // Sin sesión = el proyecto pide confirmar el email.
  if (!data.session?.expires_at) {
    return {
      error: null,
      notice: 'Revisa tu correo para confirmar la cuenta',
    }
  }

  await setSession(data.session.access_token, data.session.expires_at * 1000)
  redirect('/')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
