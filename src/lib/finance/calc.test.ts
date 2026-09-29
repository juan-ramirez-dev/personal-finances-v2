import { summarize } from './calc'
import type { FinanceData, Income } from './types'

// Pago el 15: el ciclo de hoy va del 15-sep al 15-oct (exclusivo).
const TODAY = new Date(2026, 8, 20)

function data(incomes: Omit<Income, 'id'>[]): FinanceData {
  return {
    profile: { monthlyIncome: 1_000_000, payday: 15 },
    fixed: [],
    categories: [],
    investment: {
      hasInvestments: false,
      monthlyContribution: 0,
      totalBalance: 0,
    },
    expenses: [],
    incomes: incomes.map((i, n) => ({ ...i, id: `i${n}` })),
  }
}

describe('summarize con ingresos extra', () => {
  it('un ingreso dentro del ciclo sube el ingreso y el disponible', () => {
    const base = summarize(data([]), TODAY)
    const withExtra = summarize(
      data([{ amount: 400_000, description: 'Bono', date: '2026-09-18' }]),
      TODAY,
    )

    expect(withExtra.income).toBe(base.income + 400_000)
    expect(withExtra.available).toBe(base.available + 400_000)
  })

  it('un ingreso del ciclo pasado no suma', () => {
    const summary = summarize(
      data([{ amount: 400_000, description: '', date: '2026-09-14' }]),
      TODAY,
    )

    expect(summary.income).toBe(1_000_000)
    expect(summary.cycleIncomes).toHaveLength(0)
  })

  it('un ingreso el día de pago cuenta en el ciclo nuevo, no en el viejo', () => {
    const income = { amount: 400_000, description: '', date: '2026-09-15' }

    const newCycle = summarize(data([income]), TODAY)
    const oldCycle = summarize(data([income]), new Date(2026, 8, 14))

    expect(newCycle.extraIncome).toBe(400_000)
    expect(oldCycle.extraIncome).toBe(0)
  })
})
