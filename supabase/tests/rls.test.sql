-- RLS: un usuario no ve ni toca nada de otro. Correr: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000000', 'authenticated', 'authenticated', 'a@test.co'),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000000', 'authenticated', 'authenticated', 'b@test.co');

-- Usuario A crea sus datos.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}', true);

select public.complete_onboarding('{
  "profile": {"monthlyIncome": 1000000, "payday": 1},
  "fixed": [{"id": "aaaaaaaa-1111-4000-8000-000000000000", "name": "Arriendo", "amount": 500000, "dueDay": 1}],
  "categories": [{"id": "aaaaaaaa-2222-4000-8000-000000000000", "name": "Mercado", "budget": 200000}],
  "investment": {"hasInvestments": true, "monthlyContribution": 100000, "totalBalance": 0}
}');
insert into public.expenses (amount, spent_on, category_id)
values (50000, public.bogota_today(), 'aaaaaaaa-2222-4000-8000-000000000000');
insert into public.incomes (amount, received_on) values (400000, public.bogota_today());

select isnt(public.cycle_summary(), null, 'A ve su resumen');
select is(
  (public.cycle_summary() ->> 'available')::bigint,
  (1000000 + 400000 - 50000 - 500000 - 100000)::bigint,
  'El ingreso extra sube el disponible de A'
);

-- Usuario B.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000000","role":"authenticated"}', true);

select is_empty('select 1 from public.finance_settings', 'B no ve settings de A');
select is_empty('select 1 from public.fixed_expenses', 'B no ve fijos de A');
select is_empty('select 1 from public.categories', 'B no ve categorías de A');
select is_empty('select 1 from public.expenses', 'B no ve gastos de A');
select is_empty('select 1 from public.investments', 'B no ve inversiones de A');
select is_empty('select 1 from public.incomes', 'B no ve ingresos de A');
select is(public.cycle_summary(), null, 'B no recibe el resumen de A');

select is_empty(
  $$ update public.categories set name = 'Hack' returning id $$,
  'B no edita categorías de A'
);
select is_empty(
  $$ delete from public.expenses returning id $$,
  'B no borra gastos de A'
);
select is_empty(
  $$ delete from public.incomes returning id $$,
  'B no borra ingresos de A'
);
select throws_ok(
  $$ insert into public.expenses (amount, spent_on, category_id)
     values (1, public.bogota_today(), 'aaaaaaaa-2222-4000-8000-000000000000') $$,
  '23503', null,
  'B no registra gastos en una categoría de A'
);
select throws_ok(
  $$ insert into public.categories (user_id, name)
     values ('aaaaaaaa-0000-4000-8000-000000000000', 'Hack') $$,
  '42501', null,
  'B no crea filas a nombre de A'
);
select throws_ok(
  $$ select public.toggle_fixed_paid('aaaaaaaa-1111-4000-8000-000000000000') $$,
  'P0001', 'Gasto fijo no encontrado',
  'B no marca pagado un fijo de A'
);
select lives_ok(
  $$ select public.save_categories('[]') $$,
  'save_categories de B no falla'
);

-- De vuelta en A: nada cambió.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}', true);
select results_eq(
  $$ select name, archived_at is null from public.categories $$,
  $$ values ('Mercado', true) $$,
  'Las categorías de A siguen intactas'
);

select * from finish();
rollback;
