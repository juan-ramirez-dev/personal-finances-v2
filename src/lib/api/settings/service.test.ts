/**
 * @jest-environment node
 */
import { ApiError } from '../errors'
import type { Ctx } from '../http'
import { getSettings, markOnboarded } from './repo'
import { completeOnboarding } from './service'

jest.mock('./repo', () => ({
  getSettings: jest.fn(),
  markOnboarded: jest.fn(),
  upsertSettings: jest.fn(),
}))

const ctx = { user: { id: 'user-a' }, db: {} } as unknown as Ctx
const settings = { monthlyIncome: 'aXY=.Y3Q=', payday: 1 }

describe('completeOnboarding', () => {
  it('responde 409 si ya estaba completo', async () => {
    jest.mocked(getSettings).mockResolvedValue({ ...settings, onboarded: true })
    await expect(completeOnboarding(ctx)).rejects.toEqual(
      new ApiError(409, 'El onboarding ya está completo'),
    )
    expect(markOnboarded).not.toHaveBeenCalled()
  })

  it('responde 422 si falta el perfil', async () => {
    jest.mocked(getSettings).mockResolvedValue(null)
    await expect(completeOnboarding(ctx)).rejects.toMatchObject({
      status: 422,
    })
    expect(markOnboarded).not.toHaveBeenCalled()
  })
})
