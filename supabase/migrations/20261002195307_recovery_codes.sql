-- Códigos de recuperación de un uso. Cada uno envuelve una copia de la dataKey.
-- El código en claro nunca llega: se guarda su hash (para entrar) y su texto
-- sellado con la dataKey (para verlo en ajustes). Ver docs/password-recovery.md.
create table public.recovery_codes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- sha256 del token que sale del código. Lo busca el reset, sin sesión.
  auth_hash text not null unique check (auth_hash ~ '^[0-9a-f]{64}$'),
  wrapped_key text not null,
  iv text not null,
  code public.sealed not null,
  created_at timestamptz not null default now()
);

create index recovery_codes_user_id_idx on public.recovery_codes (user_id);

alter table public.recovery_codes enable row level security;

create policy "recovery_codes: leer los propios"
  on public.recovery_codes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "recovery_codes: crear los propios"
  on public.recovery_codes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "recovery_codes: borrar los propios"
  on public.recovery_codes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Cambiar contraseña re-envuelve la misma dataKey.
create policy "user_keys: editar la propia"
  on public.user_keys for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
