import { readJson, open } from '@/lib/api/http'
import { parseCredentials } from '@/lib/api/auth/schema'
import { login } from '@/lib/api/auth/service'

export const POST = open(async req =>
  login(parseCredentials(await readJson(req))),
)
