# Cifrado E2E

Lo sensible se cifra en el navegador. Postgres guarda tablas normales con esas columnas cifradas.
Ni el servidor ni quien tenga acceso a la DB puede leer montos, nombres ni descripciones.

## Llaves

| Llave          | Sale de                    | Para qué                   | Dónde vive                                   |
| -------------- | -------------------------- | -------------------------- | -------------------------------------------- |
| `authPassword` | `HKDF(base, "auth")`       | Contraseña para Supabase   | Se envía en login/registro                   |
| `masterKey`    | `HKDF(base, "enc")`        | Envolver / abrir `dataKey` | Memoria, solo durante el login               |
| `dataKey`      | Al azar en el primer login | Cifrar cada campo          | `user_keys` (envuelta) + IndexedDB (abierta) |

- `base = PBKDF2-SHA256(password, salt = email normalizado, 600_000)`.
- HKDF es de una vía: con `authPassword` no se llega a `masterKey`.
- `dataKey` no depende de la contraseña: cambiarla solo re-envuelve una llave.
- En IndexedDB es un `CryptoKey` no exportable, con `expiresAt` = sesión.

Código: `src/lib/vault/`.

## Qué se cifra

| Tabla              | Cifrado (`sealed`)                      | En claro                                      |
| ------------------ | --------------------------------------- | --------------------------------------------- |
| `finance_settings` | `monthly_income`                        | `payday`, `onboarded_at`                      |
| `investments`      | `monthly_contribution`, `total_balance` | `has_investments`                             |
| `fixed_expenses`   | `name`, `amount`                        | `due_day`, `is_investment`, `archived_at`     |
| `categories`       | `name`, `budget`                        | `archived_at`                                 |
| `expenses`         | `amount`, `description`                 | `spent_on`, `fixed_expense_id`, `category_id` |
| `incomes`          | `amount`, `description`                 | `received_on`                                 |

Ids, `user_id` y `created_at` siempre en claro.

## Formato de un campo

- Dominio `sealed`: texto `iv.ciphertext` en base64, máx. 4096.
- AES-GCM 256, `iv` nuevo en cada guardado.
- AAD = `user_id:tabla:id:columna`. Mover un valor a otra celda, fila o usuario rompe el descifrado.
- Settings e investments usan `user_id` como `id`.
- Los ids los genera el cliente: los necesita para el AAD antes de cifrar.
- El valor va como JSON: `45000` y `"Mercado"` se distinguen al abrir.

## Quién hace qué

- `src/lib/api-client/` cifra al enviar y descifra al recibir. Ningún componente cifra a mano.
- El backend (`src/lib/api/`) valida forma y reglas que no necesitan valores: dueño, FKs, archivados, fechas.
- Lo que sí necesita valores (monto > 0, nombre único, totales) corre en el navegador (`validate.ts`, `calc.ts`).

## Flujos

1. Login/registro: navegador deriva → `/api/auth/*` recibe `authPassword` → devuelve `wrappedKey` → navegador la abre (o la crea) → IndexedDB.
2. Panel: `GET /api/finance` → filas con campos cifrados → `FinanceProvider` descifra → `summarize()`.
3. Cambio: `validate.ts` → api-client cifra → endpoint → service → repo.
4. Salida: la llave se borra (logout, `SessionTimer`, y siempre al abrir `/login`).

## Qué ve el servidor

- Email y nombre (auth), fechas, días de pago, relaciones entre filas, si tienes inversiones.
- El largo del texto cifrado (aceptado: no se rellena).

Riesgos y recuperación: `docs/password-recovery.md`.
