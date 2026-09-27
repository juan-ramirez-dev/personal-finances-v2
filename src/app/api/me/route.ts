import { withAuth } from '@/lib/auth/guards'

// Ejemplo de Route Handler protegido. Sin sesión → 401.
export const GET = withAuth(async user => Response.json(user))
