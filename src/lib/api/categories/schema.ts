import type { Sealed } from '@/lib/vault/cipher'
import { list, object, sealed, uuid } from '../parse'

export interface CategoryDto {
  id: string
  name: Sealed
  budget: Sealed
}

export function parseCategoryList(body: unknown): CategoryDto[] {
  return list(body).map(item => {
    const input = object(item)
    return {
      id: uuid(input.id),
      name: sealed(input.name),
      budget: sealed(input.budget),
    }
  })
}
