import { authed, readJson } from '@/lib/api/http'
import { parsePasswordChange } from '@/lib/api/auth/schema'
import { changePassword } from '@/lib/api/auth/service'

export const PUT = authed(async (ctx, req) =>
  changePassword(ctx, parsePasswordChange(await readJson(req))),
)
