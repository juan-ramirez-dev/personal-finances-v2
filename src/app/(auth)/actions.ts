'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE } from '@/lib/auth/constants'
import { deleteSession } from '@/lib/auth/session'
import { checkMockCredentials, MOCK_SESSION_VALUE } from '@/lib/mock/auth'

export interface LoginState {
  error: string | null
}

// Mock: la versión real (Supabase + jose) está en el historial del template.
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Email y contraseña requeridos' }
  if (!checkMockCredentials(email, password)) {
    return { error: 'Credenciales inválidas' }
  }

  const store = await cookies()
  store.set(SESSION_COOKIE, MOCK_SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 2,
  })

  redirect('/')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
