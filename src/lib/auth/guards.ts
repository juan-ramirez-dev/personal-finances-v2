import 'server-only'

import { redirect } from 'next/navigation'
import { getSession } from './session'

// Sin roles: nadie tiene más permisos que otro. Cada usuario solo ve lo suyo (RLS).
export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  expiresAt: number
}

export class AuthError extends Error {
  readonly status = 401
}

/**
 * Núcleo de los guards. Sin sesión válida → 401.
 * Úsalo directo en Server Actions: `const user = await authorize()`
 */
export async function authorize(): Promise<AuthUser> {
  const session = await getSession()
  if (!session) throw new AuthError('No autenticado')

  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    expiresAt: session.expiresAt,
  }
}

type RouteHandler<A extends unknown[]> = (
  user: AuthUser,
  ...args: A
) => Promise<Response>

/** Para Route Handlers. `export const GET = withAuth(async (user) => ...)` */
export function withAuth<A extends unknown[]>(handler: RouteHandler<A>) {
  return async (...args: A): Promise<Response> => {
    try {
      const user = await authorize()
      return await handler(user, ...args)
    } catch (error) {
      if (error instanceof AuthError) {
        return Response.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
  }
}

/** Para páginas. Sin sesión → borra la cookie y va a /login. */
export async function requireUser(): Promise<AuthUser> {
  try {
    return await authorize()
  } catch (error) {
    if (error instanceof AuthError) redirect('/api/auth/clear-session')
    throw error
  }
}
