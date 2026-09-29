import 'server-only'

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { env } from '@/lib/env'

const issuer = `${env.supabaseUrl}/auth/v1`
const audience = 'authenticated'

// Proyectos con llaves asimétricas: se verifican con las llaves públicas.
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))

export interface TokenClaims {
  userId: string
  email: string | null
  name: string | null
  expiresAt: number // ms
}

async function verify(token: string): Promise<JWTPayload> {
  const options = { issuer, audience }
  if (env.jwtSecret) {
    const secret = new TextEncoder().encode(env.jwtSecret)
    return (await jwtVerify(token, secret, options)).payload
  }
  return (await jwtVerify(token, jwks, options)).payload
}

function readName(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null) return null
  const name: unknown = Reflect.get(metadata, 'name')
  return typeof name === 'string' ? name : null
}

// Devuelve null si el token es inválido o venció. Nunca lanza.
export async function verifyToken(token: string): Promise<TokenClaims | null> {
  try {
    const payload = await verify(token)
    if (!payload.sub || !payload.exp) return null
    return {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      name: readName(payload.user_metadata),
      expiresAt: payload.exp * 1000,
    }
  } catch {
    return null
  }
}
