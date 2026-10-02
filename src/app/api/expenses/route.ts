import { authed, readJson } from '@/lib/api/http'
import { parseExpense } from '@/lib/api/expenses/schema'
import { addExpense } from '@/lib/api/expenses/service'

export const POST = authed(async (ctx, req) =>
  addExpense(ctx, parseExpense(await readJson(req))),
)
