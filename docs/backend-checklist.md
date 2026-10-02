# Backend · checklist

Estado del backend. Supabase guarda auth + datos cifrados. La lógica vive en el navegador.

## 1. Usuarios

- [x] Registro público (`/register`). Sin usuario semilla en el repo.
- [x] Sin roles ni admin. RLS: cada usuario solo lo suyo.
- [ ] Hosted: Auth → Providers → Email → "Allow new users" on.

## 2. Tablas (RLS dueño)

- [x] `user_keys`: llave de datos envuelta. Sin update.
- [x] `vault_items`: un registro cifrado por fila. Check de `kind` y de tamaño.
- [x] Un `settings` por usuario (índice único parcial).

## 3. Lógica (navegador)

- [x] `summarize()` en `calc.ts`: todo el panel.
- [x] Reglas (marcar pagado, inversión como fijo, archivar) en `finance-provider.tsx`.
- [x] Validación de negocio en `validate.ts` antes de cifrar.

## 4. Server actions (`src/app/(private)/actions.ts`)

- [x] `saveItems` / `deleteItems`: `authorize()` → forma (`src/lib/vault/rows.ts`) → RLS.

## 5. Auth

- [x] Contraseña derivada en el navegador (`docs/encryption.md`).
- [x] `/` con `requireUser()`. Onboarding si no hay `settings`.
- [x] `SessionTimer` (2h) borra la llave.

## 6. Calidad

- [x] Tests RLS: `supabase/tests/rls.test.sql` (`supabase test db`, corre en CI).
- [x] Tests de cifrado, llaves, diff y aislamiento (`src/lib/vault/*.test.ts`).
- [ ] Recuperar contraseña (`docs/password-recovery.md`).
