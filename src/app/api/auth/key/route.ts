import { authed, readJson } from '@/lib/api/http'
import { parseNewVault } from '@/lib/api/auth/schema'
import { readUserKey, saveUserKey } from '@/lib/api/auth/service'

// La envoltura actual: ajustes la abre con la contraseña para re-envolverla.
export const GET = authed(async ctx => readUserKey(ctx))

export const POST = authed(async (ctx, req) =>
  saveUserKey(ctx, parseNewVault(await readJson(req))),
)
