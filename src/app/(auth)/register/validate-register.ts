import { checkNewPassword } from '@/lib/auth/new-password'

export interface RegisterInput {
  fullName: string
  email: string
  password: string
}

export type RegisterValidation =
  | { ok: true; data: RegisterInput }
  | { ok: false; error: string }

export function validateRegister(formData: FormData): RegisterValidation {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  if (!fullName || !email || !password) {
    return { ok: false, error: 'Nombre, email y contraseña requeridos' }
  }
  const error = checkNewPassword(password, confirm)
  if (error) return { ok: false, error }

  return { ok: true, data: { fullName, email, password } }
}
