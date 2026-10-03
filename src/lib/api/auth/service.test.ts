/**
 * @jest-environment node
 */
import { createAnonClient } from '@/lib/supabase/server'
import { ApiError } from '../errors'
import {
  deleteRecoveryCode,
  deleteRecoveryCodes,
  findRecoveryCode,
  getUserEmail,
  getUserKeyById,
  insertRecoveryCodes,
  setPassword,
  updateUserKey,
} from './repo'
import type { RecoveryCodeEntry } from './schema'
import { recoverFinish } from './service'

jest.mock('./repo')
jest.mock('@/lib/auth/session', () => ({ setSession: jest.fn() }))
jest.mock('jose', () => ({ decodeJwt: () => ({ sub: 'user-a', exp: 2e9 }) }))
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => ({})),
  createAnonClient: jest.fn(),
  createUserClient: jest.fn(() => ({})),
}))

const used = {
  id: 'code-1',
  userId: 'user-a',
  wrappedKey: 'Y29weQ==',
  iv: 'aXY=',
}
const previous = { wrappedKey: 'dmllamE=', iv: 'aXY=' }
const newCode: RecoveryCodeEntry = {
  id: 'code-5',
  authHash: 'a'.repeat(64),
  wrappedKey: 'bnVldm8=',
  iv: 'aXY=',
  code: 'aXY=.Y3Q=',
}
const input = {
  email: 'ana@correo.co',
  authPassword: 'A'.repeat(43) + '=',
  authToken: 'B'.repeat(43) + '=',
  key: { wrappedKey: 'bnVldmE=', iv: 'aXY=' },
  newCode,
}

beforeEach(() => {
  jest.mocked(findRecoveryCode).mockResolvedValue(used)
  jest.mocked(getUserEmail).mockResolvedValue('Ana@Correo.co')
  jest.mocked(getUserKeyById).mockResolvedValue(previous)
  jest.mocked(createAnonClient).mockReturnValue({
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      }),
    },
  } as unknown as ReturnType<typeof createAnonClient>)
})

describe('recoverFinish', () => {
  it('gasta solo el código usado y guarda uno nuevo', async () => {
    await recoverFinish(input)
    expect(deleteRecoveryCode).toHaveBeenCalledWith({}, 'code-1')
    expect(deleteRecoveryCodes).not.toHaveBeenCalled()
    expect(insertRecoveryCodes).toHaveBeenCalledWith({}, 'user-a', [newCode])
  })

  it('un código ya usado responde 422 y no cambia nada', async () => {
    jest.mocked(findRecoveryCode).mockResolvedValue(null)
    await expect(recoverFinish(input)).rejects.toEqual(
      new ApiError(422, 'Email o código incorrectos'),
    )
    expect(updateUserKey).not.toHaveBeenCalled()
    expect(setPassword).not.toHaveBeenCalled()
  })

  it('un código válido con el email de otra persona no cambia nada', async () => {
    jest.mocked(getUserEmail).mockResolvedValue('otra@correo.co')
    await expect(recoverFinish(input)).rejects.toMatchObject({ status: 422 })
    expect(updateUserKey).not.toHaveBeenCalled()
    expect(setPassword).not.toHaveBeenCalled()
    expect(deleteRecoveryCode).not.toHaveBeenCalled()
  })

  it('si Supabase rechaza la contraseña, vuelve la llave vieja y el código no se gasta', async () => {
    jest.mocked(setPassword).mockRejectedValue(new Error('Supabase caído'))
    await expect(recoverFinish(input)).rejects.toThrow('Supabase caído')
    expect(updateUserKey).toHaveBeenLastCalledWith({}, 'user-a', previous)
    expect(deleteRecoveryCode).not.toHaveBeenCalled()
    expect(insertRecoveryCodes).not.toHaveBeenCalled()
  })
})
