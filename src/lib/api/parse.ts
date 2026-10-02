import { ApiError } from './errors'

// Lo que llega a un endpoint viene de la red: los tipos no garantizan nada.
// Cada función devuelve el valor ya tipado o lanza 400.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
// Igual al dominio `sealed` de la DB.
const SEALED = /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/
const MAX_SEALED = 4096
export const MAX_LIST = 200

const bad = (message = 'Datos inválidos') => new ApiError(400, message)

export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw bad()
  }
  return value as Record<string, unknown>
}

export function list(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > MAX_LIST) throw bad()
  return value
}

export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw bad('Id inválido')
  return value
}

export function sealed(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > MAX_SEALED ||
    !SEALED.test(value)
  ) {
    throw bad('Valor cifrado inválido')
  }
  return value
}

export function day(value: unknown): number {
  if (
    !Number.isInteger(value) ||
    (value as number) < 1 ||
    (value as number) > 31
  ) {
    throw bad('El día va de 1 a 31')
  }
  return value as number
}

export function date(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !ISO_DATE.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw bad('Fecha inválida')
  }
  return value
}

export function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw bad()
  return value
}
