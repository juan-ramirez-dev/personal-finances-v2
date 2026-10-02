import { authed } from '@/lib/api/http'
import { completeOnboarding } from '@/lib/api/settings/service'

export const POST = authed(ctx => completeOnboarding(ctx))
