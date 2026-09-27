import { getCycle, toISODate } from './calc'
import type { Expense, FinanceData } from './types'

// Datos de ejemplo para saltar el onboarding. Fechas relativas al ciclo actual.
export function createDemoData(today: Date): FinanceData {
  const payday = 30
  const { start } = getCycle(payday, today)
  const day = (offset: number) => {
    const date = new Date(start)
    date.setDate(date.getDate() + offset)
    return toISODate(date > today ? today : date)
  }

  return {
    profile: { monthlyIncome: 6_500_000, payday },
    fixed: [
      { id: 'f-arriendo', name: 'Arriendo', amount: 1_800_000, dueDay: 1 },
      { id: 'f-admin', name: 'Administración', amount: 280_000, dueDay: 5 },
      { id: 'f-servicios', name: 'Servicios', amount: 220_000, dueDay: 10 },
      {
        id: 'f-internet',
        name: 'Internet + celular',
        amount: 150_000,
        dueDay: 12,
      },
      { id: 'f-gym', name: 'Gimnasio', amount: 120_000, dueDay: 15 },
      {
        id: 'f-inversion',
        name: 'Inversión',
        amount: 500_000,
        dueDay: 1,
        isInvestment: true,
      },
    ],
    categories: [
      { id: 'c-mercado', name: 'Mercado', budget: 700_000 },
      { id: 'c-novia', name: 'Novia', budget: 300_000 },
      { id: 'c-salidas', name: 'Salidas', budget: 350_000 },
      { id: 'c-transporte', name: 'Transporte', budget: 250_000 },
      { id: 'c-ropa', name: 'Ropa', budget: 200_000 },
      { id: 'c-antojos', name: 'Antojos', budget: 120_000 },
    ],
    investment: {
      hasInvestments: true,
      monthlyContribution: 500_000,
      totalBalance: 12_400_000,
    },
    expenses: [
      e('d1', 1_800_000, 'Arriendo', day(1), 'fixed', 'f-arriendo'),
      e('d2', 500_000, 'Aporte fondo', day(1), 'fixed', 'f-inversion'),
      e('d3', 280_000, 'Administración', day(4), 'fixed', 'f-admin'),
      e('d4', 312_000, 'Mercado grande', day(2), 'category', 'c-mercado'),
      e('d5', 185_000, 'Cena aniversario', day(3), 'category', 'c-novia'),
      e('d6', 170_000, 'Flores y regalo', day(6), 'category', 'c-novia'),
      e('d7', 96_000, 'Uber semana', day(5), 'category', 'c-transporte'),
      e('d8', 210_000, 'Concierto', day(7), 'category', 'c-salidas'),
      e('d9', 145_000, 'Cafés y postres', day(8), 'category', 'c-antojos'),
      e('d10', 88_000, 'Mercado semana', day(9), 'category', 'c-mercado'),
    ],
  }
}

function e(
  id: string,
  amount: number,
  description: string,
  date: string,
  kind: 'fixed' | 'category',
  targetId: string,
): Expense {
  return { id, amount, description, date, target: { kind, id: targetId } }
}
