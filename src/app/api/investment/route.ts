import { authed, readJson } from '@/lib/api/http'
import { parseInvestment } from '@/lib/api/investment/schema'
import { saveInvestment } from '@/lib/api/investment/service'

export const PUT = authed(async (ctx, req) =>
  saveInvestment(ctx, parseInvestment(await readJson(req))),
)
