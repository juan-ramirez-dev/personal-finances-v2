import 'server-only'

import type { Db } from '@/lib/supabase/server'
import { fromDb } from '../errors'
import type { InvestmentDto, InvestmentFixedInput } from './schema'

export async function getInvestment(
  db: Db,
  userId: string,
): Promise<InvestmentDto | null> {
  const { data, error } = await db
    .from('investments')
    .select('has_investments, monthly_contribution, total_balance')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw fromDb(error)
  return (
    data && {
      hasInvestments: data.has_investments,
      monthlyContribution: data.monthly_contribution,
      totalBalance: data.total_balance,
    }
  )
}

export async function upsertInvestment(
  db: Db,
  userId: string,
  input: InvestmentDto,
) {
  const { error } = await db.from('investments').upsert({
    user_id: userId,
    has_investments: input.hasInvestments,
    monthly_contribution: input.monthlyContribution,
    total_balance: input.totalBalance,
  })
  if (error) throw fromDb(error)
}

export async function activeInvestmentFixedId(db: Db): Promise<string | null> {
  const { data, error } = await db
    .from('fixed_expenses')
    .select('id')
    .eq('is_investment', true)
    .is('archived_at', null)
    .maybeSingle()
  if (error) throw fromDb(error)
  return data?.id ?? null
}

export async function upsertInvestmentFixed(
  db: Db,
  userId: string,
  fixed: InvestmentFixedInput,
) {
  const { error } = await db.from('fixed_expenses').upsert({
    id: fixed.id,
    user_id: userId,
    name: fixed.name,
    amount: fixed.amount,
    due_day: fixed.dueDay,
    is_investment: true,
  })
  if (error) throw fromDb(error)
}
