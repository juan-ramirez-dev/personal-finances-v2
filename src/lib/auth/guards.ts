import 'server-only'

import { redirect } from 'next/navigation'
import { getUserRole, type Role } from './roles'
import { getSession } from './session'

export interface AuthUser {
  id: string
  email: string | null
  role: Role | null
  expiresAt: number
}

export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message)
  }
}

/**
 * Núcleo de los guards. Equivale a AuthGuard + RolesGuard de Nest.
 * - Sin sesión → 401
 * - `roles` dado y el rol no está → 403
 * Úsalo directo en Server Actions: `const user = await authorize(['admin'])`
 */
export async function authorize(roles?: readonly Role[]): Promise<AuthUser> {
  const session = await getSession()
  if (!session) throw new AuthError(401, 'No autenticado')

  const role = await getUserRole(session.userId, session.accessToken)
  if (roles && (!role || !roles.includes(role))) {
    throw new AuthError(403, 'Sin permiso')
  }

  return {
    id: session.userId,
    email: session.email,
    role,
    expiresAt: session.expiresAt,
  }
}

type RouteHandler<A extends unknown[]> = (
  user: AuthUser,
  ...args: A
) => Promise<Response>

/**
 * Para Route Handlers. Responde 401/403 en JSON si no pasa.
 * `export const GET = withRoles(['admin'], async (user, req) => ...)`
 */
export function withRoles<A extends unknown[]>(
  roles: readonly Role[] | undefined,
  handler: RouteHandler<A>,
) {
  return async (...args: A): Promise<Response> => {
    try {
      const user = await authorize(roles)
      return await handler(user, ...args)
    } catch (error) {
      if (error instanceof AuthError) {
        return Response.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
  }
}

/** Solo exige sesión. `export const GET = withAuth(async (user) => ...)` */
export function withAuth<A extends unknown[]>(handler: RouteHandler<A>) {
  return withRoles(undefined, handler)
}

/**
 * Para páginas (Server Components). Redirige en vez de responder 401/403.
 * - Sin sesión → borra la cookie y va a /login
 * - Rol no permitido → /
 */
export async function requireRole(roles?: readonly Role[]): Promise<AuthUser> {
  try {
    return await authorize(roles)
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(error.status === 401 ? '/api/auth/clear-session' : '/')
    }
    throw error
  }
}
