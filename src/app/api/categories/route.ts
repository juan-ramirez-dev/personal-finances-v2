import { authed, readJson } from '@/lib/api/http'
import { parseCategoryList } from '@/lib/api/categories/schema'
import { replaceCategories } from '@/lib/api/categories/service'

export const PUT = authed(async (ctx, req) =>
  replaceCategories(ctx, parseCategoryList(await readJson(req))),
)
