/**
 * @jest-environment node
 */
import { decryptItem, encryptItem, type ItemRef } from './cipher'
import { createDataKey } from './keys'

const ref: ItemRef = {
  userId: 'aaaaaaaa-0000-4000-8000-000000000000',
  id: 'aaaaaaaa-1111-4000-8000-000000000000',
  kind: 'expense',
}
const expense = { amount: 45000, description: 'Mercado', date: '2026-09-28' }

describe('encryptItem / decryptItem', () => {
  it('descifra el mismo objeto que se cifró', async () => {
    const key = await createDataKey()
    const sealed = await encryptItem(key, ref, expense)
    await expect(decryptItem(key, ref, sealed)).resolves.toEqual(expense)
  })

  it('falla con otra llave', async () => {
    const sealed = await encryptItem(await createDataKey(), ref, expense)
    await expect(
      decryptItem(await createDataKey(), ref, sealed),
    ).rejects.toThrow()
  })

  it('falla si el blob se mueve a otro id', async () => {
    const key = await createDataKey()
    const sealed = await encryptItem(key, ref, expense)
    const moved = { ...ref, id: 'aaaaaaaa-2222-4000-8000-000000000000' }
    await expect(decryptItem(key, moved, sealed)).rejects.toThrow()
  })
})
