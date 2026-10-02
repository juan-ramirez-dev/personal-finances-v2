import { readJson, open } from '@/lib/api/http'
import { parseRegister } from '@/lib/api/auth/schema'
import { register } from '@/lib/api/auth/service'

export const POST = open(async req =>
  register(parseRegister(await readJson(req))),
)
