// Igual a minimum_password_length de supabase/config.toml.
export const MIN_PASSWORD_LENGTH = 6

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
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    }
  }
  if (password !== confirm) {
    return { ok: false, error: 'Las contraseñas no coinciden' }
  }

  return { ok: true, data: { fullName, email, password } }
}
