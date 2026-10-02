import type { CategoryDto } from '@/lib/api/categories/schema'
import type { ExpenseDto } from '@/lib/api/expenses/schema'
import type { FinanceDto } from '@/lib/api/finance/service'
import type { FixedDto, FixedInput } from '@/lib/api/fixed-expenses/schema'
import type { IncomeDto } from '@/lib/api/incomes/schema'
import type { InvestmentInput } from '@/lib/api/investment/schema'
import type { SettingsInput } from '@/lib/api/settings/schema'
import type {
  Category,
  Expense,
  FinanceProfile,
  FixedExpense,
  Income,
  Investment,
} from '@/lib/finance/types'
import { request } from './http'
import { createSealer } from './sealed'

// Lo que el usuario tiene guardado, ya descifrado.
export interface FinanceSnapshot {
  onboarded: boolean
  profile: FinanceProfile | null // null = onboarding sin empezar
  investment: Investment
  fixed: FixedExpense[]
  categories: Category[]
  expenses: Expense[]
  incomes: Income[]
}

export type FinanceApi = ReturnType<typeof createFinanceApi>

const NO_INVESTMENT: Investment = {
  hasInvestments: false,
  monthlyContribution: 0,
  totalBalance: 0,
}

// Única puerta del front a las finanzas: cifra al enviar, descifra al recibir.
export function createFinanceApi(key: CryptoKey, userId: string) {
  const s = createSealer(key, userId)

  const openFixed = async (f: FixedDto): Promise<FixedExpense> => ({
    id: f.id,
    name: await s.text('fixed_expenses', f.id, 'name', f.name),
    amount: await s.number('fixed_expenses', f.id, 'amount', f.amount),
    dueDay: f.dueDay,
    ...(f.isInvestment && { isInvestment: true }),
  })

  const openCategory = async (c: CategoryDto): Promise<Category> => ({
    id: c.id,
    name: await s.text('categories', c.id, 'name', c.name),
    budget: await s.number('categories', c.id, 'budget', c.budget),
  })

  const openExpense = async (e: ExpenseDto): Promise<Expense> => ({
    id: e.id,
    amount: await s.number('expenses', e.id, 'amount', e.amount),
    description: await s.text('expenses', e.id, 'description', e.description),
    date: e.date,
    target: e.target,
  })

  const openIncome = async (i: IncomeDto): Promise<Income> => ({
    id: i.id,
    amount: await s.number('incomes', i.id, 'amount', i.amount),
    description: await s.text('incomes', i.id, 'description', i.description),
    date: i.date,
  })

  const sealFixed = async (f: FixedExpense): Promise<FixedInput> =>
    f.isInvestment
      ? { id: f.id, isInvestment: true, dueDay: f.dueDay }
      : {
          id: f.id,
          isInvestment: false,
          name: await s.seal('fixed_expenses', f.id, 'name', f.name),
          amount: await s.seal('fixed_expenses', f.id, 'amount', f.amount),
          dueDay: f.dueDay,
        }

  return {
    async load(): Promise<FinanceSnapshot> {
      const dto = await request<FinanceDto>('GET', '/api/finance')
      const { settings, investment } = dto
      return {
        onboarded: settings?.onboarded ?? false,
        profile: settings && {
          monthlyIncome: await s.number(
            'finance_settings',
            userId,
            'monthly_income',
            settings.monthlyIncome,
          ),
          payday: settings.payday,
        },
        investment: investment
          ? {
              hasInvestments: investment.hasInvestments,
              monthlyContribution: await s.number(
                'investments',
                userId,
                'monthly_contribution',
                investment.monthlyContribution,
              ),
              totalBalance: await s.number(
                'investments',
                userId,
                'total_balance',
                investment.totalBalance,
              ),
            }
          : NO_INVESTMENT,
        fixed: await Promise.all(dto.fixed.map(openFixed)),
        categories: await Promise.all(dto.categories.map(openCategory)),
        expenses: await Promise.all(dto.expenses.map(openExpense)),
        incomes: await Promise.all(dto.incomes.map(openIncome)),
      }
    },

    async saveProfile(profile: FinanceProfile) {
      const body: SettingsInput = {
        monthlyIncome: await s.seal(
          'finance_settings',
          userId,
          'monthly_income',
          profile.monthlyIncome,
        ),
        payday: profile.payday,
      }
      return request('PUT', '/api/settings', body)
    },

    completeOnboarding() {
      return request('POST', '/api/settings/complete')
    },

    // `fixed` = el fijo de inversión ya sincronizado (o null si no hay aporte).
    async saveInvestment(investment: Investment, fixed: FixedExpense | null) {
      const body: InvestmentInput = {
        investment: {
          hasInvestments: investment.hasInvestments,
          monthlyContribution: await s.seal(
            'investments',
            userId,
            'monthly_contribution',
            investment.monthlyContribution,
          ),
          totalBalance: await s.seal(
            'investments',
            userId,
            'total_balance',
            investment.totalBalance,
          ),
        },
        fixed: fixed && {
          id: fixed.id,
          name: await s.seal('fixed_expenses', fixed.id, 'name', fixed.name),
          amount: await s.seal(
            'fixed_expenses',
            fixed.id,
            'amount',
            fixed.amount,
          ),
          dueDay: fixed.dueDay,
        },
      }
      return request('PUT', '/api/investment', body)
    },

    async saveFixed(fixed: FixedExpense[]) {
      return request(
        'PUT',
        '/api/fixed-expenses',
        await Promise.all(fixed.map(sealFixed)),
      )
    },

    async saveCategories(categories: Category[]) {
      const body: CategoryDto[] = await Promise.all(
        categories.map(async c => ({
          id: c.id,
          name: await s.seal('categories', c.id, 'name', c.name),
          budget: await s.seal('categories', c.id, 'budget', c.budget),
        })),
      )
      return request('PUT', '/api/categories', body)
    },

    async addExpense(expense: Expense) {
      const body: ExpenseDto = {
        id: expense.id,
        amount: await s.seal('expenses', expense.id, 'amount', expense.amount),
        description: await s.seal(
          'expenses',
          expense.id,
          'description',
          expense.description,
        ),
        date: expense.date,
        target: expense.target,
      }
      return request('POST', '/api/expenses', body)
    },

    removeExpense(id: string) {
      return request('DELETE', `/api/expenses/${id}`)
    },

    // Desmarcar un fijo pagado: borra sus pagos entre `from` (incluido) y `to`.
    clearPayments(fixedId: string, from: string, to: string) {
      const range = new URLSearchParams({ from, to })
      return request(
        'DELETE',
        `/api/fixed-expenses/${fixedId}/payments?${range}`,
      )
    },

    async addIncome(income: Income) {
      const body: IncomeDto = {
        id: income.id,
        amount: await s.seal('incomes', income.id, 'amount', income.amount),
        description: await s.seal(
          'incomes',
          income.id,
          'description',
          income.description,
        ),
        date: income.date,
      }
      return request('POST', '/api/incomes', body)
    },

    removeIncome(id: string) {
      return request('DELETE', `/api/incomes/${id}`)
    },
  }
}
