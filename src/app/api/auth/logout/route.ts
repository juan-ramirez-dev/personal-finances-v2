import { open } from '@/lib/api/http'
import { logout } from '@/lib/api/auth/service'

// Sin sesión también responde: salir nunca debe fallar.
export const POST = open(() => logout())
