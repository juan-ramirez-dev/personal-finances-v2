# Auth

## Flujo

1. Registro (`/register`) → Supabase `signUp` con `full_name` en metadata.
   - Si devuelve sesión → entra directo. Si pide confirmar email → mensaje.
   - Login (`/login`) → Supabase `signInWithPassword`.
2. Se guarda solo el `access_token` en cookie `session`:
   - httpOnly (JS del navegador no la lee)
   - `maxAge` = lo que le queda al token → vence junto con él
3. El refresh token se descarta. **Al vencer (2h) hay que hacer login otra vez.**
4. Cada request: `jose` verifica firma, issuer, audience y expiración.
5. `SessionTimer` manda a `/login` justo cuando vence.

## Dónde se configura la duración

- Local: `supabase/config.toml` → `jwt_expiry = 7200`.
- Hosted: dashboard de cada proyecto → Auth → JWT expiry = `7200`.

## Verificación del token

- `SUPABASE_JWT_SECRET` definido → HS256 (Supabase local, proyectos con secret legacy).
- Vacío → llaves públicas del proyecto (JWKS). Recomendado en proyectos hosted nuevos.

## Guards

| Función                | Uso           | Si falla          |
| ---------------------- | ------------- | ----------------- |
| `withAuth(fn)`         | Route Handler | 401 JSON          |
| `withRoles(roles, fn)` | Route Handler | 401 / 403 JSON    |
| `authorize(roles?)`    | Server Action | lanza `AuthError` |
| `requireRole(roles?)`  | Página        | redirige          |

- Rol: `profiles.role_id → roles.role_slug`. Consulta a DB en cada request (con `cache()` por request).
- Al registrarse, un trigger crea el perfil con rol `user` y `full_name`.
- Hacer admin a alguien (SQL editor):

```sql
update public.profiles
set role_id = (select id from public.roles where role_slug = 'admin')
where id = '<user-id>';
```

## Agregar un rol

1. Migración: `insert into public.roles (role_slug) values ('nuevo');`
2. Agregarlo a `ROLES` en `src/lib/auth/roles.ts`.
