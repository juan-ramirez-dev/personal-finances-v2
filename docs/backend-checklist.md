# Backend · checklist

Estado del backend. Todo vive en Supabase.

## 1. Usuario semilla

- [x] Migración `seed_user`: usuario en `auth.users` + `auth.identities`, email confirmado.
- [x] Trigger `handle_new_user` crea su `profiles` con rol `user`.
- [x] Signup on (`/register`). Local: `supabase/config.toml`.
- [ ] Hosted: Auth → Providers → Email → "Allow new users" on.
- [ ] Hosted: cambiar la clave temporal tras el primer deploy.

## 2. Tablas (RLS: `user_id = auth.uid()`)

- [x] `finance_settings`, `fixed_expenses`, `categories`, `expenses`, `investments`.
- [x] Montos `bigint`. Borrado lógico (`archived_at`) en fijos y categorías.
- [x] Gasto va a un fijo **o** a una categoría (check). FK con `user_id`: no se apunta a filas ajenas.

## 3. Lógica (SQL, `supabase/migrations/*_finance_functions.sql`)

- [x] `get_cycle` = `getCycle` de `calc.ts`.
- [x] `cycle_summary`: todo el panel en un llamado. `null` si falta onboarding.
- [x] "Hoy" en `America/Bogota` (`bogota_today`).
- [x] `complete_onboarding`, `toggle_fixed_paid`, `save_fixed`, `save_categories`, `save_investment`.
- [x] Aporte de inversión = fijo `is_investment`, sincronizado en `save_investment`.

## 4. Server actions (`src/app/(private)/actions.ts`)

- [x] `authorize()` → validación (`src/lib/finance/validate.ts`) → RLS → `revalidatePath('/')`.

## 5. Auth

- [x] `signInWithPassword` real. Mock borrado.
- [x] `/` con `requireRole()`. Onboarding si no hay `onboarded_at`.
- [x] `SessionTimer` (2h).
- [x] Registro público en `/register`.

## 6. Frontend

- [x] `FinanceProvider` recibe datos del server + `useOptimistic`.
- [x] Sin "Usar datos demo" ni "Reiniciar".
- [x] Errores y estado "Guardando…" en modales.

## 7. Calidad

- [x] Tests RLS: `supabase/tests/rls.test.sql` (`supabase test db`, corre en CI).
- [ ] Tests de `calc.ts` (pendiente, no elegidos aún).
