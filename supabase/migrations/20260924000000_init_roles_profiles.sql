-- Roles de la app. Los guards leen roles.role_slug.
create table public.roles (
  id smallint generated always as identity primary key,
  role_slug text not null unique,
  created_at timestamptz not null default now()
);

insert into public.roles (role_slug) values ('admin'), ('user');

-- Un perfil por usuario de auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role_id smallint not null references public.roles (id),
  created_at timestamptz not null default now()
);

alter table public.roles enable row level security;
alter table public.profiles enable row level security;

-- Cada usuario solo lee su propio perfil. Cambiar roles = service role.
create policy "profiles: leer el propio"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "roles: lectura autenticada"
  on public.roles for select
  to authenticated
  using (true);

-- Al registrarse, se crea el perfil con rol 'user'.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role_id)
  select new.id, r.id from public.roles r where r.role_slug = 'user';
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
