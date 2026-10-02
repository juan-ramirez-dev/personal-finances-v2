import { authed, readJson } from '@/lib/api/http'
import { parseIncome } from '@/lib/api/incomes/schema'
import { addIncome } from '@/lib/api/incomes/service'

export const POST = authed(async (ctx, req) =>
  addIncome(ctx, parseIncome(await readJson(req))),
)
