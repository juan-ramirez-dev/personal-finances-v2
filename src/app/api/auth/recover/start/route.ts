import { readJson, open } from '@/lib/api/http'
import { parseRecoverStart } from '@/lib/api/auth/schema'
import { recoverStart } from '@/lib/api/auth/service'

export const POST = open(async req =>
  recoverStart(parseRecoverStart(await readJson(req))),
)
