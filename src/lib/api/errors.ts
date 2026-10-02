// 400 forma, 404 no existe o no es tuyo, 409 conflicto, 422 regla de negocio.
export class ApiError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message)
  }
}

interface DbError {
  code?: string
  message: string
}

// Traduce errores de Postgres a respuestas. Lo demás es un 500.
export function fromDb(error: DbError): Error {
  if (error.code === '23505') return new ApiError(409, 'Ya existe')
  if (error.code === '23503') return new ApiError(422, 'Referencia inválida')
  // RLS: la fila es de otro usuario. Para quien pregunta, no existe.
  if (error.code === '42501') return new ApiError(404, 'No encontrado')
  return new Error(error.message)
}
