-- Nombre visible del usuario. Llega en el signUp como user_metadata.full_name.
alter table public.profiles add column full_name text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role_id, full_name)
  select new.id, r.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  from public.roles r
  where r.role_slug = 'user';
  return new;
end;
$$;
