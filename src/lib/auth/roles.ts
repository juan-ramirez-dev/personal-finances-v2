import 'server-only'

import { cache } from 'react'
import { createUserClient } from '@/lib/supabase/server'

export const ROLES = ['admin', 'user'] as const
export type Role = (typeof ROLES)[number]

function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role)
}

// Se consulta en DB en cada request (cambios de rol aplican de inmediato).
// cache() evita repetir la consulta dentro del mismo request.
export const getUserRole = cache(
  async (userId: string, accessToken: string): Promise<Role | null> => {
    const { data, error } = await createUserClient(accessToken)
      .from('profiles')
      .select('roles(role_slug)')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('No se pudo leer el rol', error.message)
      return null
    }
    const slug = data?.roles?.role_slug
    return isRole(slug) ? slug : null
  },
)
