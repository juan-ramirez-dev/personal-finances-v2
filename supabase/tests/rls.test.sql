-- RLS: un usuario no ve ni toca nada de otro. Correr: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000000', 'authenticated', 'authenticated', 'a@test.co'),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000000', 'authenticated', 'authenticated', 'b@test.co');

-- Usuario A guarda su llave y sus datos. 'iv.ct' imita un valor cifrado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}', true);

insert into public.user_keys (user_id, wrapped_key, iv, kdf_iterations)
values ('aaaaaaaa-0000-4000-8000-000000000000', 'llave-a', 'iv-a', 600000);
insert into public.finance_settings (monthly_income, payday) values ('aXY=.Y3Q=', 1);
insert into public.investments (monthly_contribution, total_balance) values ('aXY=.Y3Q=', 'aXY=.Y3Q=');
insert into public.fixed_expenses (id, name, amount, due_day)
values ('aaaaaaaa-1111-4000-8000-000000000000', 'aXY=.Y3Q=', 'aXY=.Y3Q=', 5);
insert into public.categories (id, name, budget)
values ('aaaaaaaa-2222-4000-8000-000000000000', 'aXY=.Y3Q=', 'aXY=.Y3Q=');
insert into public.expenses (id, amount, description, spent_on, category_id)
values ('aaaaaaaa-3333-4000-8000-000000000000', 'aXY=.Y3Q=', 'aXY=.Y3Q=', current_date, 'aaaaaaaa-2222-4000-8000-000000000000');
insert into public.incomes (id, amount, description, received_on)
values ('aaaaaaaa-4444-4000-8000-000000000000', 'aXY=.Y3Q=', 'aXY=.Y3Q=', current_date);

select throws_ok(
  $$ insert into public.categories (id, name, budget) values (gen_random_uuid(), 'Mercado', 'aXY=.Y3Q=') $$,
  '23514', null,
  'Un valor sin cifrar no entra en una columna sealed'
);

-- Usuario B.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000000","role":"authenticated"}', true);

select is_empty('select 1 from public.user_keys', 'B no ve la llave de A');
select is_empty('select 1 from public.finance_settings', 'B no ve settings de A');
select is_empty('select 1 from public.investments', 'B no ve inversiones de A');
select is_empty('select 1 from public.fixed_expenses', 'B no ve fijos de A');
select is_empty('select 1 from public.categories', 'B no ve categorías de A');
select is_empty('select 1 from public.expenses', 'B no ve gastos de A');
select is_empty('select 1 from public.incomes', 'B no ve ingresos de A');

select is_empty(
  $$ update public.categories set name = 'aGFj.aw==' returning id $$,
  'B no edita categorías de A'
);
select is_empty(
  $$ update public.user_keys set wrapped_key = 'hack' returning user_id $$,
  'Nadie edita llaves (tampoco B)'
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
  $$ insert into public.expenses (id, amount, description, spent_on, category_id)
     values (gen_random_uuid(), 'aXY=.Y3Q=', 'aXY=.Y3Q=', current_date, 'aaaaaaaa-2222-4000-8000-000000000000') $$,
  '23503', null,
  'B no registra gastos en una categoría de A'
);
select throws_ok(
  $$ insert into public.categories (id, user_id, name, budget)
     values (gen_random_uuid(), 'aaaaaaaa-0000-4000-8000-000000000000', 'aXY=.Y3Q=', 'aXY=.Y3Q=') $$,
  '42501', null,
  'B no crea filas a nombre de A'
);
select throws_ok(
  $$ insert into public.user_keys (user_id, wrapped_key, iv, kdf_iterations)
     values ('aaaaaaaa-0000-4000-8000-000000000000', 'x', 'x', 1) $$,
  '42501', null,
  'B no crea llaves a nombre de A'
);
-- Upsert sobre el id de A: choca y RLS bloquea el update.
select throws_ok(
  $$ insert into public.categories (id, name, budget)
     values ('aaaaaaaa-2222-4000-8000-000000000000', 'aGFj.aw==', 'aGFj.aw==')
     on conflict (id) do update set name = excluded.name $$,
  '42501', null,
  'B no pisa una categoría de A por id'
);

-- De vuelta en A: nada cambió.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}', true);
select results_eq(
  $$ select name::text from public.categories $$,
  $$ values ('aXY=.Y3Q=') $$,
  'Las categorías de A siguen intactas'
);
select results_eq(
  $$ select count(*)::int from public.expenses $$,
  $$ values (1) $$,
  'Los gastos de A siguen intactos'
);
select results_eq(
  $$ select wrapped_key from public.user_keys $$,
  $$ values ('llave-a') $$,
  'La llave de A sigue intacta'
);

select * from finish();
rollback;
