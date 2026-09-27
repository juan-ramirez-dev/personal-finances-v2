-- Lógica del ciclo en SQL. Todas security invoker: RLS aplica igual que en las tablas.

-- "Hoy" siempre en Bogotá, sin importar la zona del servidor.
create function public.bogota_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Bogota')::date;
$$;

-- Día de pago dentro del mes de p_month. Si el mes es más corto, el último día.
create function public.payday_in(p_month date, p_payday int)
returns date
language sql
immutable
set search_path = ''
as $$
  select date_trunc('month', p_month)::date + least(
    p_payday,
    extract(day from date_trunc('month', p_month) + interval '1 month - 1 day')::int
  ) - 1;
$$;

-- Mismo cálculo que getCycle en src/lib/finance/calc.ts. end_date es exclusivo.
create function public.get_cycle(
  p_payday int,
  p_today date,
  out start_date date,
  out end_date date
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_today)::date;
begin
  if p_today < public.payday_in(v_month, p_payday) then
    v_month := (v_month - interval '1 month')::date;
  end if;
  start_date := public.payday_in(v_month, p_payday);
  end_date := public.payday_in((v_month + interval '1 month')::date, p_payday);
end;
$$;

-- Todo lo que pinta el panel en un solo llamado. null si falta el onboarding.
create function public.cycle_summary(p_today date default null)
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

  with cycle_expenses as (
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
    'income', v_settings.monthly_income,
    'spent', t.spent,
    'committed', t.committed,
    'available', v_settings.monthly_income - t.spent - t.committed,
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
    ), '[]')
  )
  into v_result
  from totals t;

  return v_result;
end;
$$;

-- El aporte mensual vive como un fijo más (is_investment). Se sincroniza aquí.
create function public.save_investment(p jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_has boolean := coalesce((p ->> 'hasInvestments')::boolean, false);
  v_contribution bigint := coalesce((p ->> 'monthlyContribution')::bigint, 0);
  v_balance bigint := coalesce((p ->> 'totalBalance')::bigint, 0);
  v_amount bigint := case when v_has then v_contribution else 0 end;
begin
  insert into public.investments (user_id, has_investments, monthly_contribution, total_balance)
  values (v_uid, v_has, v_contribution, v_balance)
  on conflict (user_id) do update set
    has_investments = excluded.has_investments,
    monthly_contribution = excluded.monthly_contribution,
    total_balance = excluded.total_balance;

  if v_amount > 0 then
    update public.fixed_expenses set amount = v_amount
    where user_id = v_uid and is_investment and archived_at is null;
    if not found then
      insert into public.fixed_expenses (user_id, name, amount, due_day, is_investment)
      values (v_uid, 'Inversión', v_amount, 1, true);
    end if;
  else
    update public.fixed_expenses set archived_at = now()
    where user_id = v_uid and is_investment and archived_at is null;
  end if;
end;
$$;

-- Reemplaza la lista de fijos: upsert por id, archiva los que no vienen.
-- El de inversión solo cambia su día; el monto lo maneja save_investment.
create function public.save_fixed(p jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  update public.fixed_expenses f set archived_at = now()
  where f.user_id = v_uid
    and f.archived_at is null
    and not f.is_investment
    and f.id not in (
      select (x ->> 'id')::uuid from jsonb_array_elements(p) x
      where not coalesce((x ->> 'isInvestment')::boolean, false)
    );

  insert into public.fixed_expenses (id, user_id, name, amount, due_day)
  select
    (x ->> 'id')::uuid, v_uid, btrim(x ->> 'name'),
    (x ->> 'amount')::bigint, (x ->> 'dueDay')::smallint
  from jsonb_array_elements(p) x
  where not coalesce((x ->> 'isInvestment')::boolean, false)
  on conflict (id) do update set
    name = excluded.name,
    amount = excluded.amount,
    due_day = excluded.due_day;

  update public.fixed_expenses f set due_day = (x ->> 'dueDay')::smallint
  from jsonb_array_elements(p) x
  where coalesce((x ->> 'isInvestment')::boolean, false)
    and f.user_id = v_uid and f.is_investment and f.archived_at is null;
end;
$$;

-- Reemplaza la lista de categorías: upsert por id, archiva las que no vienen.
create function public.save_categories(p jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Primero archivar: así una categoría nueva puede reusar el nombre de una borrada.
  update public.categories c set archived_at = now()
  where c.user_id = v_uid
    and c.archived_at is null
    and c.id not in (select (x ->> 'id')::uuid from jsonb_array_elements(p) x);

  insert into public.categories (id, user_id, name, budget)
  select (x ->> 'id')::uuid, v_uid, btrim(x ->> 'name'), (x ->> 'budget')::bigint
  from jsonb_array_elements(p) x
  on conflict (id) do update set
    name = excluded.name,
    budget = excluded.budget;
end;
$$;

-- Todo el onboarding en una transacción: o queda completo o no queda nada.
create function public.complete_onboarding(p jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if exists (
    select 1 from public.finance_settings
    where user_id = v_uid and onboarded_at is not null
  ) then
    raise exception 'El onboarding ya está completo';
  end if;

  insert into public.finance_settings (user_id, monthly_income, payday, onboarded_at)
  values (
    v_uid,
    (p -> 'profile' ->> 'monthlyIncome')::bigint,
    (p -> 'profile' ->> 'payday')::smallint,
    now()
  )
  on conflict (user_id) do update set
    monthly_income = excluded.monthly_income,
    payday = excluded.payday,
    onboarded_at = excluded.onboarded_at;

  -- Inversión antes que fijos: save_fixed le pone el día al fijo que crea.
  perform public.save_investment(coalesce(p -> 'investment', '{}'));
  perform public.save_fixed(coalesce(p -> 'fixed', '[]'));
  perform public.save_categories(coalesce(p -> 'categories', '[]'));
end;
$$;

-- Marcar pagado = registrar lo pendiente hoy. Desmarcar = borrar sus pagos del ciclo.
create function public.toggle_fixed_paid(p_fixed_id uuid, p_today date default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := coalesce(p_today, public.bogota_today());
  v_fixed public.fixed_expenses;
  v_payday int;
  v_start date;
  v_end date;
  v_paid bigint;
begin
  select * into v_fixed from public.fixed_expenses
  where id = p_fixed_id and user_id = v_uid and archived_at is null;
  if not found then
    raise exception 'Gasto fijo no encontrado';
  end if;

  select payday into v_payday from public.finance_settings where user_id = v_uid;
  select c.start_date, c.end_date into v_start, v_end
  from public.get_cycle(v_payday, v_today) c;

  select coalesce(sum(amount), 0) into v_paid from public.expenses
  where fixed_expense_id = p_fixed_id and spent_on >= v_start and spent_on < v_end;

  if v_paid < v_fixed.amount then
    insert into public.expenses (user_id, amount, description, spent_on, fixed_expense_id)
    values (v_uid, v_fixed.amount - v_paid, v_fixed.name, v_today, p_fixed_id);
  else
    delete from public.expenses
    where fixed_expense_id = p_fixed_id and spent_on >= v_start and spent_on < v_end;
  end if;
end;
$$;

-- Solo usuarios con sesión. anon no tiene nada que hacer aquí.
revoke execute on function
  public.cycle_summary(date),
  public.save_investment(jsonb),
  public.save_fixed(jsonb),
  public.save_categories(jsonb),
  public.complete_onboarding(jsonb),
  public.toggle_fixed_paid(uuid, date)
from public, anon;

grant execute on function
  public.cycle_summary(date),
  public.save_investment(jsonb),
  public.save_fixed(jsonb),
  public.save_categories(jsonb),
  public.complete_onboarding(jsonb),
  public.toggle_fixed_paid(uuid, date)
to authenticated;
