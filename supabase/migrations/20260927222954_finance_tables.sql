-- Montos en bigint: pesos enteros, sin decimales.

create table public.finance_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  monthly_income bigint not null check (monthly_income >= 0),
  payday smallint not null check (payday between 1 and 31),
  onboarded_at timestamptz
);

create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  amount bigint not null check (amount > 0),
  due_day smallint not null check (due_day between 1 and 31),
  is_investment boolean not null default false,
  -- Borrado lógico: los gastos viejos siguen apuntando al fijo.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  -- Para la FK compuesta de expenses.
  unique (id, user_id)
);

create unique index fixed_expenses_one_investment
  on public.fixed_expenses (user_id)
  where is_investment and archived_at is null;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  budget bigint not null default 0 check (budget >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index categories_unique_name
  on public.categories (user_id, lower(btrim(name)))
  where archived_at is null;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount bigint not null check (amount > 0),
  description text not null default '',
  spent_on date not null,
  fixed_expense_id uuid,
  category_id uuid,
  created_at timestamptz not null default now(),
  check (num_nonnulls(fixed_expense_id, category_id) = 1),
  -- FK con user_id: RLS no revisa FKs, así nadie apunta a filas de otro usuario.
  foreign key (fixed_expense_id, user_id) references public.fixed_expenses (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id)
);

create index expenses_user_spent_on on public.expenses (user_id, spent_on);
create index expenses_fixed on public.expenses (fixed_expense_id);
create index expenses_category on public.expenses (category_id);

create table public.investments (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  has_investments boolean not null default false,
  monthly_contribution bigint not null default 0 check (monthly_contribution >= 0),
  total_balance bigint not null default 0 check (total_balance >= 0)
);

alter table public.finance_settings enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.investments enable row level security;

create policy "finance_settings: solo el dueño" on public.finance_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "fixed_expenses: solo el dueño" on public.fixed_expenses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "categories: solo el dueño" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "expenses: solo el dueño" on public.expenses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "investments: solo el dueño" on public.investments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
