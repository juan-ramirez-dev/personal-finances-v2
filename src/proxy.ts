import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/constants'

// Chequeo rápido: solo mira si existe la cookie.
// La seguridad real está en los guards (src/lib/auth/guards.ts).
const PUBLIC_ROUTES = ['/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)
  const isPublic = PUBLIC_ROUTES.includes(pathname)

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Todo menos api, archivos estáticos e imágenes.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
