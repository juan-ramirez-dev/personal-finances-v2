import 'server-only'

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

// Next solo inyecta NEXT_PUBLIC_* si se leen de forma literal.
export const env = {
  supabaseUrl: required(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabasePublishableKey: required(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  jwtSecret: process.env.SUPABASE_JWT_SECRET || null,
}

// Se lee al usarse: solo el reset y el cambio de contraseña lo necesitan.
export function serviceRoleKey(): string {
  return required(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}
