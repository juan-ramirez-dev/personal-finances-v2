-- Todos los datos de finanzas, cifrados en el navegador (AES-GCM).
-- Una fila por registro. El servidor solo ve el tipo y el blob.
-- Ver docs/encryption.md.
create table public.vault_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('settings', 'fixed', 'category', 'expense', 'income')),
  ciphertext text not null check (length(ciphertext) <= 65536),
  iv text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vault_items_user on public.vault_items (user_id);

-- Un solo registro de settings (perfil + inversión) por usuario.
create unique index vault_items_one_settings
  on public.vault_items (user_id) where kind = 'settings';

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger vault_items_touch
  before update on public.vault_items
  for each row execute function public.touch_updated_at();

alter table public.vault_items enable row level security;

create policy "vault_items: leer los propios"
  on public.vault_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "vault_items: crear los propios"
  on public.vault_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- with check: nadie puede pasar una fila a otro usuario.
create policy "vault_items: editar los propios"
  on public.vault_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "vault_items: borrar los propios"
  on public.vault_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);
