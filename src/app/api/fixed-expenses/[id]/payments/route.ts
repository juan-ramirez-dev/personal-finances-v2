import { authed } from '@/lib/api/http'
import { uuid } from '@/lib/api/parse'
import { parsePaymentsRange } from '@/lib/api/fixed-expenses/schema'
import { clearPayments } from '@/lib/api/fixed-expenses/service'

// ?from=YYYY-MM-DD&to=YYYY-MM-DD (to excluido)
export const DELETE = authed(
  async (ctx, req, { params }: { params: Promise<{ id: string }> }) =>
    clearPayments(
      ctx,
      uuid((await params).id),
      parsePaymentsRange(new URL(req.url).searchParams),
    ),
)
