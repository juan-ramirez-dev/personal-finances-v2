# Backend · checklist

Estado del backend. Supabase guarda auth + tablas con columnas cifradas.

## 1. Usuarios

- [x] Registro público (`/register`). Sin usuario semilla en el repo.
- [x] Sin roles ni admin. RLS: cada usuario solo lo suyo.
- [ ] Hosted: Auth → Providers → Email → "Allow new users" on.

## 2. Tablas (RLS dueño)

- [x] `user_keys`: llave de datos envuelta. Sin update.
- [x] `finance_settings`, `investments`, `fixed_expenses`, `categories`, `expenses`, `incomes`.
- [x] Columnas sensibles con dominio `sealed` (`docs/encryption.md`).
- [x] FKs compuestas `(id, user_id)`: nadie apunta a filas de otro usuario.
- [x] Sin funciones SQL.

## 3. Endpoints (`src/app/api/`)

Capas por recurso en `src/lib/api/<recurso>/`: `schema` (400) → `service` (404/409/422) → `repo` (DB).

| Ruta                                       | Regla                                       |
| ------------------------------------------ | ------------------------------------------- |
| `POST /api/auth/{login,register,logout}`   | contraseña derivada; cookie httpOnly        |
| `POST /api/auth/key`                       | llave se crea una vez                       |
| `GET /api/finance`                         | todo lo del usuario, cifrado                |
| `PUT /api/settings`, `POST .../complete`   | completar sin perfil 422; dos veces 409     |
| `PUT /api/investment`                      | un fijo de inversión; sin aporte se archiva |
| `PUT /api/fixed-expenses`                  | archiva faltantes; no toca el de inversión  |
| `DELETE /api/fixed-expenses/[id]/payments` | borra pagos del rango                       |
| `PUT /api/categories`                      | archiva faltantes                           |
| `POST /api/expenses`, `DELETE [id]`        | target activo y propio                      |
| `POST /api/incomes`, `DELETE [id]`         | fecha válida                                |

## 4. Front

- [x] `src/lib/api-client/` es la única puerta a `/api`.
- [x] `FinanceProvider`: descifra, calcula con `summarize()`, vista optimista y vuelve atrás si falla.
- [x] Onboarding guarda paso a paso y se retoma tras recargar.

## 5. Calidad

- [x] Tests RLS: `supabase/tests/rls.test.sql` (`supabase test db`, corre en CI).
- [x] Tests de cifrado, llaves, aislamiento y services.
- [ ] Recuperar contraseña (`docs/password-recovery.md`).
