import { authed } from '@/lib/api/http'
import { uuid } from '@/lib/api/parse'
import { removeIncome } from '@/lib/api/incomes/service'

export const DELETE = authed(
  async (ctx, _req, { params }: { params: Promise<{ id: string }> }) =>
    removeIncome(ctx, uuid((await params).id)),
)
