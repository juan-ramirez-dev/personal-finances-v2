/**
 * @jest-environment node
 */
import { createDataKey, unwrapDataKey, wrapDataKey } from './keys'
import {
  deriveRecoveryKeys,
  generateRecoveryCode,
  normalizeRecoveryCode,
} from './recovery'

async function wrapWith(code: string) {
  const dataKey = await createDataKey()
  const { codeKey } = await deriveRecoveryKeys(normalizeRecoveryCode(code)!)
  return wrapDataKey(dataKey, codeKey)
}

describe('códigos de recuperación', () => {
  it('el código abre la copia que envolvió', async () => {
    const code = generateRecoveryCode()
    const wrapped = await wrapWith(code)
    const { codeKey } = await deriveRecoveryKeys(normalizeRecoveryCode(code)!)
    await expect(unwrapDataKey(wrapped, codeKey)).resolves.toBeDefined()
  })

  it('otro código no abre la copia', async () => {
    const wrapped = await wrapWith(generateRecoveryCode())
    const other = normalizeRecoveryCode(generateRecoveryCode())!
    const { codeKey } = await deriveRecoveryKeys(other)
    await expect(unwrapDataKey(wrapped, codeKey)).rejects.toThrow()
  })

  it('acepta el código en minúsculas, con espacios o sin guiones', () => {
    const code = generateRecoveryCode()
    const expected = normalizeRecoveryCode(code)
    expect(normalizeRecoveryCode(` ${code.toLowerCase()} `)).toBe(expected)
    expect(normalizeRecoveryCode(code.replaceAll('-', ''))).toBe(expected)
    expect(normalizeRecoveryCode(code.replaceAll('-', ' '))).toBe(expected)
  })
})
