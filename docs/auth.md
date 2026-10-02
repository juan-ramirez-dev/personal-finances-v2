# Auth

## Flujo

1. El navegador deriva `authPassword` de la contraseña (`docs/encryption.md`). La real nunca sale.
   - Registro (`/register`) → Supabase `signUp` con `authPassword` y `name` en metadata.
   - Si devuelve sesión → entra directo. Si pide confirmar email → mensaje.
   - Login (`/login`) → Supabase `signInWithPassword` con `authPassword`.
   - El action devuelve la llave envuelta. El navegador la abre y redirige.
2. Se guarda solo el `access_token` en cookie `session`:
   - httpOnly (JS del navegador no la lee)
   - `maxAge` = lo que le queda al token → vence junto con él
3. El refresh token se descarta. **Al vencer (2h) hay que hacer login otra vez.**
4. Cada request: `jose` verifica firma, issuer, audience y expiración.
5. `SessionTimer` borra la llave y manda a `/login` justo cuando vence.

## Dónde se configura la duración

- Local: `supabase/config.toml` → `jwt_expiry = 7200`.
- Hosted: dashboard de cada proyecto → Auth → JWT expiry = `7200`.

## Verificación del token

- `SUPABASE_JWT_SECRET` definido → HS256 (Supabase local, proyectos con secret legacy).
- Vacío → llaves públicas del proyecto (JWKS). Recomendado en proyectos hosted nuevos.

## Guards

Sin roles ni admin. Todos los usuarios son iguales y cada uno solo ve lo suyo (RLS).

| Función         | Uso           | Si falla          |
| --------------- | ------------- | ----------------- |
| `withAuth(fn)`  | Route Handler | 401 JSON          |
| `authorize()`   | Server Action | lanza `AuthError` |
| `requireUser()` | Página        | redirige a login  |
