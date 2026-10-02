import { authed } from '@/lib/api/http'
import { uuid } from '@/lib/api/parse'
import { removeExpense } from '@/lib/api/expenses/service'

export const DELETE = authed(
  async (ctx, _req, { params }: { params: Promise<{ id: string }> }) =>
    removeExpense(ctx, uuid((await params).id)),
)
