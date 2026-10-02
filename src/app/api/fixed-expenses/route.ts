import { authed, readJson } from '@/lib/api/http'
import { parseFixedList } from '@/lib/api/fixed-expenses/schema'
import { replaceFixed } from '@/lib/api/fixed-expenses/service'

export const PUT = authed(async (ctx, req) =>
  replaceFixed(ctx, parseFixedList(await readJson(req))),
)
