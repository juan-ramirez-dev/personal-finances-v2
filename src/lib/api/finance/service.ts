import type { CategoryDto } from '../categories/schema'
import { listActiveCategories } from '../categories/repo'
import { listExpenses } from '../expenses/repo'
import type { ExpenseDto } from '../expenses/schema'
import { listActiveFixed } from '../fixed-expenses/repo'
import type { FixedDto } from '../fixed-expenses/schema'
import type { Ctx } from '../http'
import { listIncomes } from '../incomes/repo'
import type { IncomeDto } from '../incomes/schema'
import { getInvestment } from '../investment/repo'
import type { InvestmentDto } from '../investment/schema'
import { getSettings } from '../settings/repo'
import type { SettingsDto } from '../settings/schema'

// Todo lo del usuario, cifrado. El navegador descifra y calcula el panel.
export interface FinanceDto {
  settings: SettingsDto | null // null = onboarding sin empezar
  investment: InvestmentDto | null
  fixed: FixedDto[]
  categories: CategoryDto[]
  expenses: ExpenseDto[]
  incomes: IncomeDto[]
}

export async function getFinance({ db, user }: Ctx): Promise<FinanceDto> {
  const [settings, investment, fixed, categories, expenses, incomes] =
    await Promise.all([
      getSettings(db, user.id),
      getInvestment(db, user.id),
      listActiveFixed(db),
      listActiveCategories(db),
      listExpenses(db),
      listIncomes(db),
    ])
  return { settings, investment, fixed, categories, expenses, incomes }
}
