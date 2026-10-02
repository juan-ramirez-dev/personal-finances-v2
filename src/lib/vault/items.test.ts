/**
 * @jest-environment node
 */
import type { FinanceData } from '@/lib/finance/types'
import { diffItems, toItems } from './items'

const SETTINGS = '00000000-0000-4000-8000-000000000001'
const RENT = '00000000-0000-4000-8000-000000000002'
const FOOD = '00000000-0000-4000-8000-000000000003'
const LUNCH = '00000000-0000-4000-8000-000000000004'
const NOW = new Date('2026-10-02T12:00:00Z')

const base: FinanceData = {
  profile: { monthlyIncome: 3_000_000, payday: 1 },
  investment: {
    hasInvestments: false,
    monthlyContribution: 0,
    totalBalance: 0,
  },
  fixed: [{ id: RENT, name: 'Arriendo', amount: 1_200_000, dueDay: 5 }],
  categories: [{ id: FOOD, name: 'Mercado', budget: 600_000 }],
  expenses: [
    {
      id: LUNCH,
      amount: 25_000,
      description: 'Almuerzo',
      date: '2026-10-01',
      target: { kind: 'category', id: FOOD },
    },
  ],
  incomes: [],
}
const prev = toItems(base, SETTINGS)

describe('diffItems', () => {
  it('solo sube lo que cambió', () => {
    const next = {
      ...base,
      categories: [{ id: FOOD, name: 'Mercado', budget: 700_000 }],
    }
    const diff = diffItems(prev, next, NOW)
    expect(diff.save.map(d => d.id)).toEqual([FOOD])
    expect(diff.remove).toEqual([])
  })

  it('detecta un gasto borrado', () => {
    const diff = diffItems(prev, { ...base, expenses: [] }, NOW)
    expect(diff.remove).toEqual([LUNCH])
    expect(diff.save).toEqual([])
  })

  it('borrar un fijo lo archiva en vez de borrarlo', () => {
    const diff = diffItems(prev, { ...base, fixed: [] }, NOW)
    expect(diff.remove).toEqual([])
    expect(diff.save).toEqual([
      {
        id: RENT,
        kind: 'fixed',
        value: {
          name: 'Arriendo',
          amount: 1_200_000,
          dueDay: 5,
          archivedAt: NOW.toISOString(),
        },
      },
    ])
  })
})
