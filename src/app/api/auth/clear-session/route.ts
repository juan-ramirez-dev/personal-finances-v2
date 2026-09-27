import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/constants'

// Borra una cookie inválida o vencida y manda a /login.
// Evita el loop proxy (/login → /) ↔ guard (/ → /login).
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.delete(SESSION_COOKIE)
  return response
}
