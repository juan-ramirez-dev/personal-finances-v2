// Única forma de hablar con /api desde el navegador.

export class ApiClientError extends Error {
  constructor(
    readonly status: number, // 0 = sin conexión
    message: string,
  ) {
    super(message)
  }
}

function readError(body: unknown): string {
  const error =
    typeof body === 'object' && body !== null
      ? Reflect.get(body, 'error')
      : null
  return typeof error === 'string' ? error : 'Algo falló. Intenta de nuevo.'
}

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiClientError(0, 'No se pudo conectar. Intenta de nuevo.')
  }

  const json: unknown = await response.json().catch(() => null)
  if (response.status === 401) {
    throw new ApiClientError(401, 'Tu sesión venció. Vuelve a entrar.')
  }
  if (!response.ok) throw new ApiClientError(response.status, readError(json))
  // El contrato lo define el endpoint (tipos en src/lib/api/*/schema.ts).
  return json as T
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiClientError
    ? error.message
    : 'Algo falló. Intenta de nuevo.'
}
