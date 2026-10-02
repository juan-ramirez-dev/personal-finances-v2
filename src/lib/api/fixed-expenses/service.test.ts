/**
 * @jest-environment node
 */
import type { Ctx } from '../http'
import { archiveFixed, listActiveFixed, setDueDay, upsertFixed } from './repo'
import { replaceFixed } from './service'

// Borde = DB: el repo se mockea.
jest.mock('./repo', () => ({
  listActiveFixed: jest.fn(),
  upsertFixed: jest.fn(),
  archiveFixed: jest.fn(),
  setDueDay: jest.fn(),
}))

const ctx = { user: { id: 'user-a' }, db: {} } as unknown as Ctx
const SEALED = 'aXY=.Y3Q='
const RENT = '00000000-0000-4000-8000-000000000001'
const GYM = '00000000-0000-4000-8000-000000000002'
const INVEST = '00000000-0000-4000-8000-000000000003'

const active = (id: string, isInvestment = false) => ({
  id,
  name: SEALED,
  amount: SEALED,
  dueDay: 1,
  isInvestment,
})

beforeEach(() => {
  jest
    .mocked(listActiveFixed)
    .mockResolvedValue([active(RENT), active(GYM), active(INVEST, true)])
})

describe('replaceFixed', () => {
  it('archiva los fijos que no vienen en la lista', async () => {
    await replaceFixed(ctx, [
      {
        id: RENT,
        isInvestment: false,
        name: SEALED,
        amount: SEALED,
        dueDay: 5,
      },
    ])
    expect(archiveFixed).toHaveBeenCalledWith(ctx.db, [GYM])
  })

  it('nunca archiva ni edita el fijo de inversión', async () => {
    await replaceFixed(ctx, [])
    expect(archiveFixed).toHaveBeenCalledWith(ctx.db, [RENT, GYM])
    expect(upsertFixed).toHaveBeenCalledWith(ctx.db, 'user-a', [])
    expect(setDueDay).not.toHaveBeenCalled()
  })
})
