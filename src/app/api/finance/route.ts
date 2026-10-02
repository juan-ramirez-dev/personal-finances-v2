import { authed } from '@/lib/api/http'
import { getFinance } from '@/lib/api/finance/service'

export const GET = authed(ctx => getFinance(ctx))
