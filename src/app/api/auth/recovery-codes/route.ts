import { authed, readJson } from '@/lib/api/http'
import { parseRecoveryCodes } from '@/lib/api/auth/schema'
import { listCodes, replaceCodes } from '@/lib/api/auth/service'

export const GET = authed(async ctx => listCodes(ctx))

export const PUT = authed(async (ctx, req) =>
  replaceCodes(ctx, parseRecoveryCodes(await readJson(req))),
)
