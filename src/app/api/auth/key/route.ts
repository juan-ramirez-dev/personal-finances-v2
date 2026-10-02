import { authed, readJson } from '@/lib/api/http'
import { parseWrappedKey } from '@/lib/api/auth/schema'
import { saveUserKey } from '@/lib/api/auth/service'

export const POST = authed(async (ctx, req) =>
  saveUserKey(ctx, parseWrappedKey(await readJson(req))),
)
