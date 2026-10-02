# Recuperar contraseña

**Decisión:** códigos de recuperación de un uso. Datos intactos. E2E intacto.

## El problema

- La llave que abre los datos sale de la contraseña (`docs/encryption.md`).
- Cambiar la contraseña sin la vieja = nadie puede re-envolver `dataKey`.
- Por eso un reset solo por email no sirve: entras, pero sin datos.

## Códigos

- 4 por usuario. Se crean en el navegador junto con `dataKey` (registro o primer login).
- 20 caracteres base32, 100 bits. Sin PBKDF2: adivinarlo no es viable.
- De cada código salen dos cosas por HKDF:
  - `authToken` → prueba que lo tienes. La DB guarda `sha256(authToken)`.
  - `codeKey` → envuelve una copia de `dataKey`.
- El texto del código va `sealed` con `dataKey`: se puede ver en Ajustes con sesión.
- Tabla `recovery_codes`. Código: `src/lib/vault/recovery.ts`.

## Flujos

**Olvidé mi contraseña** (`/forgot`: email + código + nueva)

1. Navegador saca `authToken` y `codeKey` del código.
2. `POST /api/auth/recover/start` → server busca el hash y valida el email → devuelve la copia envuelta.
3. Navegador abre `dataKey`, la envuelve con la nueva `masterKey` y crea 1 código nuevo.
4. `POST /api/auth/recover/finish` → re-valida, cambia envoltura y contraseña, gasta el código, guarda el nuevo, inicia sesión.

**Ajustes** (`/settings`, con sesión)

- Ver códigos: se descifran con la `dataKey` de la sesión.
- Generar nuevos: pide la contraseña, reemplaza los 4.
- Cambiar contraseña: pide la actual, re-envuelve `dataKey`.

## Reglas

- Un código sirve una vez. Al usarlo llega otro. Los demás siguen sirviendo.
- Email o código mal → mismo error. No se revela cuál falló.
- Si Supabase no acepta la contraseña nueva, vuelve la envoltura vieja y el código no se gasta.
- El reset y el cambio de contraseña usan `SUPABASE_SERVICE_ROLE_KEY` (solo server).

## Riesgos aceptados

- Perder la contraseña **y** todos los códigos = perder los datos.
- Quien tenga un código y tu email puede cambiar tu contraseña. Igual que en cualquier app con códigos de respaldo.
