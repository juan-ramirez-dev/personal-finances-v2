import { authed, readJson } from '@/lib/api/http'
import { parseSettings } from '@/lib/api/settings/schema'
import { saveSettings } from '@/lib/api/settings/service'

export const PUT = authed(async (ctx, req) =>
  saveSettings(ctx, parseSettings(await readJson(req))),
)
