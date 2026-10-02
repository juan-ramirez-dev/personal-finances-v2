import { readJson, open } from '@/lib/api/http'
import { parseRecoverFinish } from '@/lib/api/auth/schema'
import { recoverFinish } from '@/lib/api/auth/service'

export const POST = open(async req =>
  recoverFinish(parseRecoverFinish(await readJson(req))),
)
