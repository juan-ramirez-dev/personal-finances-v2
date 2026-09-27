import 'server-only'

// Login simulado mientras no hay backend. Ver docs/backend-checklist.md.
export const MOCK_USER = {
  name: 'Juan',
  email: 'juan@finanzas.co',
  password: 'finanzas123',
}

export const MOCK_SESSION_VALUE = 'mock'

export function checkMockCredentials(email: string, password: string) {
  return (
    email.toLowerCase() === MOCK_USER.email && password === MOCK_USER.password
  )
}
