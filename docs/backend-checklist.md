# Backend · checklist

Hoy todo vive en memoria (`src/app/(private)/finance-provider.tsx`).
Esto es lo que falta para que sea real. Nada está hecho.

## 1. Usuario semilla

- [ ] Migración que crea un usuario en `auth.users` (email + password con `crypt()`), `email_confirmed_at` lleno.
- [ ] Fila en `auth.identities` para ese usuario (si no, el login con password falla).
- [ ] El trigger `handle_new_user` ya crea su `profiles` con rol `user`. Verificar.
- [ ] Password solo en la migración de local/seed. En hosted: crear el usuario a mano en el dashboard.
- [ ] Desactivar signup público en Supabase (Auth → Providers → Email → "Allow new users" off).

## 2. Tablas (todas con RLS: `user_id = auth.uid()`)

- [ ] `finance_settings`: `user_id` (pk), `monthly_income`, `payday` (1-31, check), `onboarded_at`.
- [ ] `fixed_expenses`: `id`, `user_id`, `name`, `amount`, `due_day`, `is_investment`, `archived_at`.
- [ ] `categories`: `id`, `user_id`, `name` (único por usuario), `budget` (>= 0), `archived_at`.
- [ ] `expenses`: `id`, `user_id`, `amount` (> 0), `description`, `spent_on` (date), `fixed_expense_id` null, `category_id` null.
  - [ ] Check: exactamente uno de `fixed_expense_id` / `category_id`.
  - [ ] Índice `(user_id, spent_on)`.
- [ ] `investments`: `user_id` (pk), `has_investments`, `monthly_contribution`, `total_balance`.
- [ ] Montos en `bigint` (pesos enteros, sin decimales).
- [ ] Borrado lógico (`archived_at`) en fijos y categorías para no romper gastos viejos.

## 3. Lógica

- [ ] Función SQL o módulo server `getCycle(payday, today)` → mismo cálculo que `src/lib/finance/calc.ts`.
- [ ] Resumen del ciclo en un solo query (RPC `cycle_summary`): disponible, gastado, comprometido, fijos con estado, categorías con gastado/excedido.
- [ ] Zona horaria fija `America/Bogota` para "hoy" y fechas de gasto.
- [ ] Aporte de inversión = fijo con `is_investment = true`, sincronizado al guardar inversiones.

## 4. Server actions (todas con `authorize()` al inicio)

- [ ] `completeOnboarding(data)` → inserta settings, fijos, categorías, inversiones en una transacción (RPC).
- [ ] `addExpense`, `removeExpense`.
- [ ] `toggleFixedPaid(id)` → crea pago por lo pendiente o borra pagos del ciclo.
- [ ] `saveFixed`, `saveCategories`, `saveProfile`, `saveInvestment`.
- [ ] Validación de input en el server (montos > 0, día 1-31, nombres no vacíos).
- [ ] `revalidatePath('/')` después de cada cambio.

## 5. Auth real

- [ ] Volver a `signInWithPassword` en `src/app/(auth)/actions.ts` (ver template).
- [ ] Borrar `src/lib/mock/auth.ts`.
- [ ] Página `/` con `requireRole()` y datos leídos en el server.
- [ ] Redirigir a onboarding si `finance_settings.onboarded_at` es null.
- [ ] Restaurar `SessionTimer` (vence a las 2h).

## 6. Frontend al conectar

- [ ] `FinanceProvider` recibe datos iniciales del server en vez de `useState(null)`.
- [ ] Acciones del provider llaman server actions (optimistic UI con `useOptimistic`).
- [ ] Quitar botones "Usar datos demo" y "Reiniciar".
- [ ] Estados de error y carga en modales.

## 7. Calidad

- [ ] `pnpm db:types` tras migrar.
- [ ] Tests de `calc.ts` (ciclo, disponible, excedidos).
- [ ] Tests de las policies RLS (otro usuario no ve nada).
- [ ] `pnpm check` en verde.
