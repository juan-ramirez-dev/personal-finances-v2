-- Ingresos extra (bonos, trabajos sueltos). Solo suman en el ciclo de su fecha.

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount bigint not null check (amount > 0),
  description text not null default '',
  received_on date not null,
  created_at timestamptz not null default now()
);

create index incomes_user_received_on on public.incomes (user_id, received_on);

alter table public.incomes enable row level security;

create policy "incomes: solo el dueño" on public.incomes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Todo lo que pinta el panel en un solo llamado. null si falta el onboarding.
create or replace function public.cycle_summary(p_today date default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := coalesce(p_today, public.bogota_today());
  v_settings public.finance_settings;
  v_start date;
  v_end date;
  v_result jsonb;
begin
  select * into v_settings from public.finance_settings where user_id = v_uid;
  if not found or v_settings.onboarded_at is null then
    return null;
  end if;

  select c.start_date, c.end_date into v_start, v_end
  from public.get_cycle(v_settings.payday, v_today) c;

  with cycle_incomes as (
    select i.*
    from public.incomes i
    where i.user_id = v_uid and i.received_on >= v_start and i.received_on < v_end
  ),
  cycle_expenses as (
    select e.*
    from public.expenses e
    where e.user_id = v_uid and e.spent_on >= v_start and e.spent_on < v_end
  ),
  fixed as (
    select
      f.id, f.name, f.amount, f.due_day, f.is_investment, f.created_at,
      coalesce(sum(e.amount), 0)::bigint as paid
    from public.fixed_expenses f
    left join cycle_expenses e on e.fixed_expense_id = f.id
    where f.user_id = v_uid and f.archived_at is null
    group by f.id
  ),
  categories as (
    select
      c.id, c.name, c.budget, c.created_at,
      coalesce(sum(e.amount), 0)::bigint as spent
    from public.categories c
    left join cycle_expenses e on e.category_id = c.id
    where c.user_id = v_uid and c.archived_at is null
    group by c.id
  ),
  totals as (
    select
      (select coalesce(sum(amount), 0) from cycle_incomes)::bigint as extra,
      (select coalesce(sum(amount), 0) from cycle_expenses)::bigint as spent,
      (select coalesce(sum(greatest(amount - paid, 0)), 0) from fixed)::bigint as committed
  )
  select jsonb_build_object(
    'today', v_today,
    'cycle', jsonb_build_object('start', v_start, 'end', v_end),
    'daysToPayday', v_end - v_today,
    'profile', jsonb_build_object(
      'monthlyIncome', v_settings.monthly_income,
      'payday', v_settings.payday
    ),
    'investment', coalesce(
      (select jsonb_build_object(
        'hasInvestments', i.has_investments,
        'monthlyContribution', i.monthly_contribution,
        'totalBalance', i.total_balance
      ) from public.investments i where i.user_id = v_uid),
      '{"hasInvestments": false, "monthlyContribution": 0, "totalBalance": 0}'
    ),
    'income', v_settings.monthly_income + t.extra,
    'extraIncome', t.extra,
    'spent', t.spent,
    'committed', t.committed,
    'available', v_settings.monthly_income + t.extra - t.spent - t.committed,
    'fixed', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'name', f.name,
        'amount', f.amount,
        'dueDay', f.due_day,
        'isInvestment', f.is_investment,
        'paid', f.paid,
        'pending', greatest(f.amount - f.paid, 0)
      ) order by f.due_day, f.created_at)
      from fixed f
    ), '[]'),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'budget', c.budget,
        'spent', c.spent,
        'remaining', greatest(c.budget - c.spent, 0),
        'over', greatest(c.spent - c.budget, 0),
        -- null = infinito (gastó sin presupuesto). JSON no tiene Infinity.
        'ratio', case
          when c.budget > 0 then c.spent::numeric / c.budget
          when c.spent > 0 then null
          else 0
        end
      ) order by c.created_at)
      from categories c
    ), '[]'),
    'expenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'amount', e.amount,
        'description', e.description,
        'date', e.spent_on,
        'kind', case when e.fixed_expense_id is null then 'category' else 'fixed' end,
        'targetId', coalesce(e.fixed_expense_id, e.category_id)
      ) order by e.spent_on desc, e.created_at desc)
      from cycle_expenses e
    ), '[]'),
    'incomes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'amount', i.amount,
        'description', i.description,
        'date', i.received_on
      ) order by i.received_on desc, i.created_at desc)
      from cycle_incomes i
    ), '[]')
  )
  into v_result
  from totals t;

  return v_result;
end;
$$;
