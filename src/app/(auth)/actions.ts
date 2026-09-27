'use server'

import { decodeJwt } from 'jose'
import { redirect } from 'next/navigation'
import { deleteSession, setSession } from '@/lib/auth/session'
import { createAnonClient } from '@/lib/supabase/server'

export interface LoginState {
  error: string | null
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
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

export async function logout() {
  await deleteSession()
  redirect('/login')
}
