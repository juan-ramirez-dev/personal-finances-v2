-- RLS: un usuario no ve ni toca nada de otro. Correr: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000000', 'authenticated', 'authenticated', 'a@test.co'),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000000', 'authenticated', 'authenticated', 'b@test.co');

-- Usuario A guarda su llave y un registro.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}', true);

insert into public.user_keys (user_id, wrapped_key, iv, kdf_iterations)
values ('aaaaaaaa-0000-4000-8000-000000000000', 'llave-a', 'iv-a', 600000);
insert into public.vault_items (id, kind, ciphertext, iv)
values ('aaaaaaaa-1111-4000-8000-000000000000', 'expense', 'blob-a', 'iv-a');

select is(
  (select user_id from public.vault_items),
  'aaaaaaaa-0000-4000-8000-000000000000'::uuid,
  'user_id sale de la sesión'
);
select throws_ok(
  $$ insert into public.vault_items (id, kind, ciphertext, iv)
     values (gen_random_uuid(), 'otro', 'x', 'x') $$,
  '23514', null,
  'Un kind desconocido no entra'
);
select throws_ok(
  $$ insert into public.vault_items (id, kind, ciphertext, iv) values
     (gen_random_uuid(), 'settings', 'x', 'x'),
     (gen_random_uuid(), 'settings', 'y', 'y') $$,
  '23505', null,
  'Solo un settings por usuario'
);

-- Usuario B.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000000","role":"authenticated"}', true);

select is_empty('select 1 from public.vault_items', 'B no ve registros de A');
select is_empty('select 1 from public.user_keys', 'B no ve la llave de A');
select is_empty(
  $$ update public.vault_items set ciphertext = 'hack' returning id $$,
  'B no edita registros de A'
);
select is_empty(
  $$ delete from public.vault_items returning id $$,
  'B no borra registros de A'
);
select is_empty(
  $$ update public.user_keys set wrapped_key = 'hack' returning user_id $$,
  'Nadie edita llaves (tampoco B)'
);
select throws_ok(
  $$ insert into public.vault_items (id, user_id, kind, ciphertext, iv)
     values (gen_random_uuid(), 'aaaaaaaa-0000-4000-8000-000000000000', 'expense', 'x', 'x') $$,
  '42501', null,
  'B no crea registros a nombre de A'
);
select throws_ok(
  $$ insert into public.user_keys (user_id, wrapped_key, iv, kdf_iterations)
     values ('aaaaaaaa-0000-4000-8000-000000000000', 'x', 'x', 1) $$,
  '42501', null,
  'B no crea llaves a nombre de A'
);
-- Upsert sobre el id de A: choca y RLS bloquea el update.
select throws_ok(
  $$ insert into public.vault_items (id, kind, ciphertext, iv)
     values ('aaaaaaaa-1111-4000-8000-000000000000', 'expense', 'hack', 'x')
     on conflict (id) do update set ciphertext = excluded.ciphertext $$,
  '42501', null,
  'B no pisa un registro de A por id'
);

-- De vuelta en A: nada cambió.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}', true);
select results_eq(
  $$ select ciphertext from public.vault_items $$,
  $$ values ('blob-a') $$,
  'El registro de A sigue intacto'
);
select results_eq(
  $$ select wrapped_key from public.user_keys $$,
  $$ values ('llave-a') $$,
  'La llave de A sigue intacta'
);

select * from finish();
rollback;
