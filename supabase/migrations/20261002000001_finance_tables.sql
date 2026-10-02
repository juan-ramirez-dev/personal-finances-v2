-- Tablas de finanzas. Lo que el usuario escribe con valor sensible va cifrado
-- en el navegador (tipo `sealed`). Ids, relaciones, fechas y días van en claro.
-- Ver docs/encryption.md.

-- Valor cifrado: "iv.ciphertext" en base64. El servidor no puede leerlo.
create domain public.sealed as text
  check (value ~ '^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$' and length(value) <= 4096);

-- Los ids los genera el cliente: los necesita para el AAD antes de cifrar.

create table public.finance_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  monthly_income public.sealed not null,
  payday smallint not null check (payday between 1 and 31),
  -- null = onboarding a medias. Se guarda paso a paso.
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.fixed_expenses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name public.sealed not null,
  amount public.sealed not null,
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
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name public.sealed not null,
  budget public.sealed not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.expenses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount public.sealed not null,
  description public.sealed not null,
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

-- Ingresos extra (bonos, trabajos sueltos). Solo suman en el ciclo de su fecha.
create table public.incomes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount public.sealed not null,
  description public.sealed not null,
  received_on date not null,
  created_at timestamptz not null default now()
);

create index incomes_user_received_on on public.incomes (user_id, received_on);

create table public.investments (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  has_investments boolean not null default false,
  monthly_contribution public.sealed not null,
  total_balance public.sealed not null
);

alter table public.finance_settings enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.incomes enable row level security;
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

create policy "incomes: solo el dueño" on public.incomes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "investments: solo el dueño" on public.investments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
