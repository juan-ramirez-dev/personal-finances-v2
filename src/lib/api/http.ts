import 'server-only'

import { withAuth, type AuthUser } from '@/lib/auth/guards'
import { createSessionClient, type Db } from '@/lib/supabase/server'
import { ApiError } from './errors'

export interface Ctx {
  user: AuthUser
  db: Db // con el token del usuario: RLS aplica en todo
}

type Handler<A extends unknown[]> = (
  ctx: Ctx,
  req: Request,
  ...args: A
) => Promise<unknown>

function toResponse(result: unknown) {
  return Response.json(result ?? { ok: true })
}

function onError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error('Error en la API', error)
  return Response.json(
    { error: 'Algo falló. Intenta de nuevo.' },
    { status: 500 },
  )
}

/** Endpoint con sesión. `export const POST = authed(async ({ user, db }, req) => …)` */
export function authed<A extends unknown[]>(handler: Handler<A>) {
  return withAuth(async (user, req: Request, ...args: A) => {
    try {
      const db = await createSessionClient()
      return toResponse(await handler({ user, db }, req, ...args))
    } catch (error) {
      return onError(error)
    }
  })
}

/** Endpoint sin sesión (login, registro). */
export function open(handler: (req: Request) => Promise<unknown>) {
  return async (req: Request): Promise<Response> => {
    try {
      return toResponse(await handler(req))
    } catch (error) {
      return onError(error)
    }
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new ApiError(400, 'Datos inválidos')
  }
}
