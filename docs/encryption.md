# Cifrado E2E

Todo se cifra en el navegador. Postgres guarda solo texto cifrado.
Ni el servidor ni quien tenga acceso a la DB puede leer los datos.

## Llaves

| Llave          | Sale de                    | Para qué                   | Dónde vive                                   |
| -------------- | -------------------------- | -------------------------- | -------------------------------------------- |
| `authPassword` | `HKDF(base, "auth")`       | Contraseña para Supabase   | Se envía en login/registro                   |
| `masterKey`    | `HKDF(base, "enc")`        | Envolver / abrir `dataKey` | Memoria, solo durante el login               |
| `dataKey`      | Al azar en el primer login | Cifrar cada registro       | `user_keys` (envuelta) + IndexedDB (abierta) |

- `base = PBKDF2-SHA256(password, salt = email normalizado, 600_000)`.
- HKDF es de una vía: con `authPassword` no se llega a `masterKey`.
- `dataKey` no depende de la contraseña: cambiarla solo re-envuelve una llave.
- En IndexedDB es un `CryptoKey` no exportable, con `expiresAt` = sesión.

Código: `src/lib/vault/`.

## Tablas

- `user_keys(user_id, wrapped_key, iv, kdf_iterations)`. Sin update: llega con recuperación.
- `vault_items(id, user_id, kind, ciphertext, iv, created_at, updated_at)`.
  - `kind`: `settings`, `fixed`, `category`, `expense`, `income`.
  - Un `settings` por usuario = onboarding completo.
- RLS dueño en las dos.

## Cifrado de un registro

- AES-GCM 256, `iv` nuevo en cada guardado.
- AAD = `user_id:id:kind`. Mover el blob a otra fila o usuario rompe el descifrado.
- Fijo/categoría borrado = `archivedAt` dentro del blob. Gastos viejos siguen apuntando.

## Flujos

1. Login/registro: navegador deriva → server recibe `authPassword` → devuelve `wrappedKey` → navegador la abre (o la crea) → IndexedDB.
2. `/`: server manda filas cifradas → `FinanceProvider` descifra → `summarize()`.
3. Cambio: `validate.ts` → `diffItems` → cifra lo cambiado → `saveItems` / `deleteItems`.
4. Salida: la llave se borra (logout, `SessionTimer`, y siempre al abrir `/login`).

## Qué no se cifra

- Email y nombre (auth). Tipo de registro. Fechas de sistema.

Riesgos y recuperación: `docs/password-recovery.md`.
