-- Llave de datos de cada usuario, envuelta (cifrada) con su masterKey.
-- La masterKey sale de la contraseña en el navegador: el servidor no puede abrirla.
-- Ver docs/encryption.md.
create table public.user_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wrapped_key text not null,
  iv text not null,
  -- Vueltas de PBKDF2 con que se derivó. Permite subirlas a futuro.
  kdf_iterations integer not null,
  created_at timestamptz not null default now()
);

alter table public.user_keys enable row level security;

create policy "user_keys: leer la propia"
  on public.user_keys for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Solo se crea una vez. Cambiarla llega con la tarea de recuperar contraseña.
create policy "user_keys: crear la propia"
  on public.user_keys for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
