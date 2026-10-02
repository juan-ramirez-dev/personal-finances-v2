/**
 * @jest-environment node
 */
import { decryptItem, encryptItem } from './cipher'
import { createDataKey, deriveKeys, unwrapDataKey, wrapDataKey } from './keys'

jest.setTimeout(30_000)

// Dos usuarios con su propia llave. Nada de A debe abrirse con lo de B.
const A = 'aaaaaaaa-0000-4000-8000-000000000000'
const B = 'bbbbbbbb-0000-4000-8000-000000000000'
const ITEM = 'aaaaaaaa-1111-4000-8000-000000000000'
const expense = { amount: 45000, description: 'Mercado', date: '2026-09-28' }

describe('aislamiento entre usuarios', () => {
  it('B con su llave no descifra un registro de A', async () => {
    const ref = { userId: A, id: ITEM, kind: 'expense' as const }
    const sealed = await encryptItem(await createDataKey(), ref, expense)
    await expect(
      decryptItem(await createDataKey(), ref, sealed),
    ).rejects.toThrow()
  })

  it('B no abre la llave envuelta de A con su contraseña', async () => {
    const a = await deriveKeys('a@correo.co', 'clave-de-a')
    const b = await deriveKeys('b@correo.co', 'clave-de-b')
    const wrappedA = await wrapDataKey(await createDataKey(), a.masterKey)
    await expect(unwrapDataKey(wrappedA, b.masterKey)).rejects.toThrow()
  })

  it('un blob de A copiado a una fila de B no descifra', async () => {
    // Peor caso: misma llave. Solo el AAD (user_id) lo frena.
    const key = await createDataKey()
    const sealed = await encryptItem(
      key,
      { userId: A, id: ITEM, kind: 'expense' },
      expense,
    )
    await expect(
      decryptItem(key, { userId: B, id: ITEM, kind: 'expense' }, sealed),
    ).rejects.toThrow()
  })

  it('misma contraseña con otro email da llaves distintas', async () => {
    const a = await deriveKeys('a@correo.co', 'misma-clave')
    const b = await deriveKeys('b@correo.co', 'misma-clave')
    expect(a.authPassword).not.toBe(b.authPassword)
    const wrappedA = await wrapDataKey(await createDataKey(), a.masterKey)
    await expect(unwrapDataKey(wrappedA, b.masterKey)).rejects.toThrow()
  })
})
