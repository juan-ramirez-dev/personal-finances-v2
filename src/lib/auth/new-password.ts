// Igual a minimum_password_length de supabase/config.toml.
// El server solo ve la derivada: la regla se valida aquí.
export const MIN_PASSWORD_LENGTH = 6

// Registro, reset y ajustes. null si está bien.
export function checkNewPassword(password: string, confirm: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`
  }
  if (password !== confirm) return 'Las contraseñas no coinciden'
  return null
}
