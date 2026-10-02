/**
 * @jest-environment node
 */
import { fromBase64 } from './encoding'
import { createDataKey, deriveKeys, unwrapDataKey, wrapDataKey } from './keys'

// PBKDF2 con 600k vueltas tarda: se deriva una vez por combinación.
jest.setTimeout(30_000)

describe('deriveKeys', () => {
  it('misma clave y email dan la misma authPassword', async () => {
    const a = await deriveKeys('ana@correo.co', 'clave-segura')
    const b = await deriveKeys('ana@correo.co', 'clave-segura')
    expect(a.authPassword).toBe(b.authPassword)
  })

  it('ignora mayúsculas y espacios del email', async () => {
    const a = await deriveKeys('ana@correo.co', 'clave-segura')
    const b = await deriveKeys('  Ana@Correo.CO ', 'clave-segura')
    expect(a.authPassword).toBe(b.authPassword)
  })

  it('la authPassword no sirve como llave de cifrado', async () => {
    const { authPassword, masterKey } = await deriveKeys(
      'ana@correo.co',
      'clave-segura',
    )
    const wrapped = await wrapDataKey(await createDataKey(), masterKey)
    // Lo que ve el servidor, usado como si fuera la masterKey.
    const fromServer = await crypto.subtle.importKey(
      'raw',
      fromBase64(authPassword),
      'AES-GCM',
      false,
      ['unwrapKey'],
    )
    await expect(unwrapDataKey(wrapped, fromServer)).rejects.toThrow()
  })
})

describe('wrapDataKey / unwrapDataKey', () => {
  it('abre con la contraseña correcta', async () => {
    const { masterKey } = await deriveKeys('ana@correo.co', 'clave-segura')
    const wrapped = await wrapDataKey(await createDataKey(), masterKey)
    const again = await deriveKeys('ana@correo.co', 'clave-segura')
    await expect(
      unwrapDataKey(wrapped, again.masterKey),
    ).resolves.toBeInstanceOf(CryptoKey)
  })

  it('falla con otra contraseña', async () => {
    const { masterKey } = await deriveKeys('ana@correo.co', 'clave-segura')
    const wrapped = await wrapDataKey(await createDataKey(), masterKey)
    const wrong = await deriveKeys('ana@correo.co', 'otra-clave')
    await expect(unwrapDataKey(wrapped, wrong.masterKey)).rejects.toThrow()
  })
})
