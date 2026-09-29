-- Único usuario de la app (no hay registro público).
-- Clave temporal: cambiarla en el dashboard tras el primer deploy.
-- Idempotente: si el email ya existe (creado a mano en hosted), no hace nada.
do $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := 'juan@finanzas.co';
begin
  if exists (select 1 from auth.users where email = v_email) then
    return;
  end if;

  -- Los campos token van en '' porque GoTrue falla al leer NULL.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt('finanzas123', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{"name":"Juan"}',
    now(), now(),
    '', '', '', ''
  );

  -- Sin identidad el login con password falla.
  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    now(), now(), now()
  );
end;
$$;
