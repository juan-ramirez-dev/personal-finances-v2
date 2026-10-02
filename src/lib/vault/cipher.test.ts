/**
 * @jest-environment node
 */
import { openField, sealField, type FieldRef } from './cipher'
import { createDataKey } from './keys'

const ref: FieldRef = {
  userId: 'aaaaaaaa-0000-4000-8000-000000000000',
  table: 'expenses',
  id: 'aaaaaaaa-1111-4000-8000-000000000000',
  column: 'amount',
}

describe('sealField / openField', () => {
  it('descifra el mismo valor que se cifró', async () => {
    const key = await createDataKey()
    const sealed = await sealField(key, ref, 45000)
    await expect(openField(key, ref, sealed)).resolves.toBe(45000)
  })

  it('falla si el valor se mueve a otra columna', async () => {
    const key = await createDataKey()
    const sealed = await sealField(key, ref, 45000)
    await expect(
      openField(key, { ...ref, column: 'description' }, sealed),
    ).rejects.toThrow()
  })

  it('falla si el valor se mueve a otra fila', async () => {
    const key = await createDataKey()
    const sealed = await sealField(key, ref, 45000)
    const other = { ...ref, id: 'aaaaaaaa-2222-4000-8000-000000000000' }
    await expect(openField(key, other, sealed)).rejects.toThrow()
  })
})
