# Plan: Lucka de escritorio (macOS + Windows)

## 0. Contexto

- Origen: `github.com/juan-ramirez-dev/personal-finances-v2` (Next.js 16 + Supabase, web con login y cifrado E2E).
- Destino: app de escritorio **local-first**, open source.
  - Sin login, sin registro, sin servidor, sin cifrado.
  - Todo vive en una base SQLite en la máquina del usuario.
- Se distribuye **sin firmar** desde una landing en GitHub Pages.
- El repo original **no se toca** (salvo este doc). Se trabaja en repos nuevos.

## 1. Decisiones ya tomadas (no reabrir)

| Tema         | Decisión                                                         |
| ------------ | ---------------------------------------------------------------- |
| Shell        | Tauri v2                                                         |
| Plataformas  | macOS (universal: Apple Silicon + Intel) y Windows x64           |
| UI           | Se mantiene Next.js con `output: 'export'` + React + CSS Modules |
| Datos        | SQLite local vía `tauri-plugin-sql`                              |
| Auth/cifrado | Se eliminan                                                      |
| Firma        | Ninguna (ni Apple ni Windows). macOS con firma ad-hoc (`-`)      |
| Validaciones | Se mantienen todas: hooks de commit/push + CI en cada PR         |
| Publicación  | GitHub Actions al mergear a `main` → GitHub Releases             |
| Updates      | `tauri-plugin-updater` leyendo `latest.json` del último Release  |
| Repos        | Dos: app (`lucka`) y landing (`lucka-landing`)                   |
| Licencia     | MIT                                                              |

## 2. Reglas para el agente

Se heredan de `AGENTS.md`. Las más importantes:

- Textos cortos. Viñetas. Comentarios solo con el **por qué**.
- Solo **pnpm** (`pnpm dlx`, nunca `npx`).
- Prohibido Tailwind, `any`, `eslint-disable`, `@ts-ignore`, `--no-verify`.
- Archivos en kebab-case. Sin barrels.
- Colores literales solo en `globals.css`.
- Antes de escribir tests: **preguntar qué casos** (multi-select).
- Next.js 16 tiene cambios: leer `node_modules/next/dist/docs/` antes de tocar config o rutas.
- Cada fase termina con `pnpm check` en verde (y `cargo check` cuando exista `src-tauri`).
- Commit por fase, mensaje corto en español.

Librerías **ya aprobadas**:

- `@tauri-apps/cli`, `@tauri-apps/api`
- `@tauri-apps/plugin-sql` (+ crate `tauri-plugin-sql` con feature `sqlite`)
- `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-process`
- `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`

Cualquier otra: preguntar.

## 3. Preguntas antes de empezar (AskUserQuestion, juntas)

1. Usuario/organización de GitHub y nombres finales de los dos repos.
2. Identificador de la app (ej. `com.juanramirez.lucka`). No se cambia después sin perder datos.
3. ¿Montos siempre enteros (COP)? Revisar `money-input.tsx` antes; si el código responde, no preguntar.

---

## Fase 1. Repo nuevo de la app

- Crear repo `lucka` desde una copia del código (sin historia de git).
- Agregar `LICENSE` (MIT).
- Quitar workflows de Supabase: `validate-migrations.yml`, `deploy-main.yml`.
- **Mantener sin cambios**:
  - `.husky/pre-commit` → `lint-staged` (eslint + prettier en lo cambiado).
  - `.husky/pre-push` → bloquea push directo a `main`, `staging`, `feedback`.
  - `ci.yml` → lint, prettier, tipos, tests, build en cada PR.
  - eslint, prettier, jest, `pnpm check`.
- Activar protección de ramas en GitHub: PR obligatorio y CI verde para mergear.

**Listo cuando:** el repo existe y `pnpm install && pnpm check` pasa igual que en el original.

## Fase 2. Podar lo que ya no aplica

Borrar:

- `src/app/api/` completo.
- `src/lib/api/` (antes, mover tipos de `schema.ts` que use el front a `src/lib/finance/types.ts`).
- `src/lib/auth/`, `src/lib/vault/`, `src/lib/supabase/`, `src/lib/env.ts`.
- `src/lib/api-client/auth.ts`, `sealed.ts`, `recovery-codes.ts`.
- `src/proxy.ts`.
- `src/app/(auth)/` completo.
- `src/app/(private)/session-timer.tsx`.
- `src/app/(private)/settings/change-password.tsx`, `recovery-section.tsx`, `reopen-key.ts`.
- `src/components/ui/recovery-codes.*`.
- `supabase/`.
- Dependencias: `@supabase/supabase-js`, `jose`, `server-only`.
- Scripts `db:*` de `package.json`.
- Docs: `auth.md`, `encryption.md`, `password-recovery.md`, `backend-checklist.md`.

Ajustar:

- `dashboard.tsx`: quitar logout.
- `(private)/page.tsx`: sin `requireUser`. Monta `FinanceProvider` y `FinanceApp`.
- Si `(private)` ya no tiene sentido, aplanar: `/` y `/settings`.
- `finance-provider.tsx`: quitar `loadDataKey`/`clearDataKey` y `userId`.
- `src/app/privacy/page.tsx`: "tus datos nunca salen de tu computador".

**Listo cuando:** sin imports a auth, vault, supabase ni `/api`. Tipos y lint en verde.

## Fase 3. Next.js como sitio estático

- `next.config.ts`: `output: 'export'`, `images: { unoptimized: true }`, `trailingSlash: true`.
- Nada de servidor: sin `cookies()`, `headers()`, route handlers, server actions.
- `src/app/icon.tsx`: si rompe el export, pasar a archivo estático.
- Verificar `next/font` (se auto-hospeda en el build).

**Listo cuando:** `pnpm build` genera `out/` y `pnpm dlx serve out` muestra la app navegable.

## Fase 4. Integrar Tauri

- `pnpm tauri init` → crea `src-tauri/`.
- `tauri.conf.json`:
  - `productName: "Lucka"`, `identifier` de la pregunta 2.
  - `build.devUrl: "http://localhost:3000"`, `build.frontendDist: "../out"`.
  - `build.beforeDevCommand: "pnpm dev"`, `build.beforeBuildCommand: "pnpm build"`.
  - `bundle.targets: ["dmg", "app", "nsis", "msi"]`.
  - `bundle.macOS.signingIdentity: "-"` (sin esto, en Apple Silicon sale "dañada").
  - `bundle.windows.webviewInstallMode: downloadBootstrapper`.
  - `bundle.createUpdaterArtifacts: true`.
  - Ventana con tamaño mínimo razonable.
  - CSP estricta: solo `self`.
- Íconos: `pnpm tauri icon <png-1024>`.
- Scripts: `"tauri": "tauri"`, `"desktop": "tauri dev"`, `"desktop:build": "tauri build"`.
- `pnpm check` suma `cargo check` en `src-tauri`.
- `.gitignore`: `src-tauri/target`, `out`.

**Listo cuando:** `pnpm tauri dev` abre la ventana con la UI.

## Fase 5. SQLite como "backend"

### Esquema

- `src-tauri/migrations/0001_init.sql`, cargado con `tauri_plugin_sql::Builder::add_migrations("sqlite:lucka.db", …)`.
- Portar `supabase/migrations/20261002000001_finance_tables.sql`:
  - Sin `user_id`, RLS, `sealed`, ni tablas de llaves/recovery.
  - Montos `INTEGER` (o `REAL` según pregunta 3), textos `TEXT`.
  - `uuid` → `TEXT`. `date` → `TEXT` `YYYY-MM-DD`. `timestamptz` → `TEXT` ISO.
  - `finance_settings` e `investments`: una fila (`id INTEGER PRIMARY KEY CHECK (id = 1)`).
  - Mantener checks `due_day`/`payday` (1–31), FK de `expenses`, check "fijo o categoría", índice único de fijo de inversión activo, índices por fecha.
- `PRAGMA foreign_keys = ON` en cada conexión.
- `src-tauri/capabilities/default.json`: `sql:default`, `sql:allow-execute`.

### Capa de datos

- `src/lib/local-db/`:
  - `db.ts` → abre la conexión una vez.
  - Un archivo por recurso (`settings.ts`, `fixed-expenses.ts`, `categories.ts`, `expenses.ts`, `incomes.ts`, `investment.ts`). Único lugar con SQL.
- Reescribir `src/lib/api-client/finance.ts`:
  - **Misma interfaz pública** (`load`, `saveProfile`, `completeOnboarding`, `saveInvestment`, `saveFixed`, `saveCategories`, `addExpense`, `removeExpense`, `clearPayments`, `addIncome`, `removeIncome`).
  - `createFinanceApi()` sin `key` ni `userId`.
  - Mapea filas ↔ tipos de `src/lib/finance/types.ts`.
  - Errores como `ApiClientError` con el mismo texto.

### Reglas de negocio a portar (de `src/lib/api/*/service.ts`)

- `saveFixed`: reemplaza lista, upsert por id, archiva los que no vienen. Fijo de inversión solo cambia `due_day`. 422 "La inversión se edita desde inversiones".
- `saveCategories`: reemplaza lista, upsert por id, archiva las que no vienen.
- `saveInvestment`: un solo fijo de inversión activo. Sin aporte → archiva. 409 si hay otro activo.
- `completeOnboarding`: 422 sin settings; 409 si ya estaba completo.
- `addExpense`: 422 sin destino.
- `removeExpense` / `removeIncome` / `clearPayments`: 404 si no existe.
- `load`: solo fijos y categorías **no archivados**.

### Atomicidad

- El plugin usa un pool: `BEGIN` y `COMMIT` pueden caer en conexiones distintas.
- Verificarlo antes de confiar.
- Si no es atómico: `saveFixed`, `saveCategories`, `saveInvestment` pasan a comandos Rust con transacción real.

**Listo cuando:** todo el flujo funciona en `pnpm tauri dev` y los datos persisten al reabrir.

## Fase 6. Ajustes sin cuenta

En `/settings`:

- **Exportar datos** → JSON (`plugin-dialog` + `plugin-fs`).
- **Importar datos** → valida forma y versión, reemplaza todo en una transacción. Confirmar antes.
- **Borrar todos mis datos** → doble confirmación. Vuelve al onboarding.
- Ruta del archivo de la base (`appDataDir`).
- Versión de la app.

Formato: `{ "version": 1, "exportedAt": …, "data": … }`.

**Listo cuando:** exportar → borrar → importar deja la app igual.

## Fase 7. Auto-update

- Llaves: `pnpm tauri signer generate -w ~/.tauri/lucka.key` (no es firma Apple/Windows).
- Pública → `plugins.updater.pubkey`.
- Endpoint: `https://github.com/<usuario>/lucka/releases/latest/download/latest.json`.
- Al abrir: si hay update, aviso discreto → descargar, instalar, reiniciar (`plugin-process`).
- Sin internet: seguir normal, sin error.
- Llave privada y contraseña → secrets. **Nunca** commitear.

**Listo cuando:** con `v0.1.0` instalada, publicar `v0.1.1` la actualiza sola.

## Fase 8. CI y publicación

### Validaciones (se mantienen)

- Commit: `lint-staged` (eslint + prettier).
- Push: bloqueo a ramas protegidas.
- PR: `ci.yml`.

### `ci.yml` (ajustar)

- Dispara en PR a `feedback`, `staging`, `main` (igual que hoy).
- Quitar env falsas de Supabase.
- Agregar `workflow_call` para reusarlo desde `release.yml`.
- Job nuevo: `cargo check` + `cargo clippy` en `src-tauri` (ubuntu, con dependencias de Tauri).
- Sigue: lint, prettier, tipos, tests, build de Next.

### `release.yml` (nuevo)

- Dispara con **push a `main`** (al mergear un PR).
- `permissions: contents: write`.
- Job 1: reusa `ci.yml`. Si falla, no publica.
- Job 2: lee versión de `tauri.conf.json`. Si el tag `v<versión>` ya existe → termina sin publicar.
- Job 3, matriz:
  - `macos-latest` con `--target universal-apple-darwin` (ambos targets de Rust).
  - `windows-latest` sin args.
- Pasos: checkout → pnpm → Node 20 → Rust stable → `pnpm install` → `tauri-apps/tauri-action@v0`.
- `tauri-action`: `tagName: v<versión>`, `releaseName: "Lucka v<versión>"`, `releaseDraft: false`.
- Env: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- Paso final: `gh release upload <tag> <archivo> --clobber` con nombre fijo:
  - `Lucka-macos.dmg`
  - `Lucka-windows-setup.exe`

Para publicar: subir versión en el PR → mergear a `main`.

Resultado por Release:

- `Lucka_<v>_universal.dmg`, `Lucka_<v>_x64-setup.exe`, `Lucka_<v>_x64_en-US.msi`
- `Lucka-macos.dmg`, `Lucka-windows-setup.exe`
- `latest.json` + firmas del updater

**Listo cuando:**

- PR con error de lint → CI rojo, no se puede mergear.
- Merge a `main` con versión nueva → Release con todos los archivos.
- Merge sin subir versión → validaciones pasan, no publica.
- Instaladores abren la app en máquinas limpias.

## Fase 9. Documentación del repo de la app

- `README.md`: qué es + captura, descarga (landing), desarrollo (Node 20, pnpm, Rust; Xcode CLT / MSVC Build Tools; `pnpm install && pnpm tauri dev`), cómo publicar (subir versión → PR → merge a `main`).
- `CONTRIBUTING.md`: `AGENTS.md` corto + cómo abrir PR + qué valida el CI.
- `AGENTS.md`: actualizar stack, auth, DB y estructura.
- `docs/data.md`: esquema SQLite, ruta del archivo por sistema, formato del JSON.
- Plantillas de issue (bug / feature).

## Fase 10. Repo de la landing (`lucka-landing`)

- HTML + CSS estático, una página, sin build.
- Secciones: qué es, captura, descarga, privacidad, link al repo.
- Botón según sistema (`navigator.userAgent`), link al otro debajo.
- Links fijos:
  - `https://github.com/<usuario>/lucka/releases/latest/download/Lucka-macos.dmg`
  - `https://github.com/<usuario>/lucka/releases/latest/download/Lucka-windows-setup.exe`
- "Primera vez que la abres":
  - **macOS**: aviso → Ajustes → Privacidad y seguridad → "Abrir igualmente". Técnicos: `xattr -dr com.apple.quarantine /Applications/Lucka.app`.
  - **Windows**: "Windows protegió su PC" → Más información → Ejecutar de todas formas.
  - Espacio para capturas.
- Deploy: GitHub Pages con `actions/deploy-pages`.
- Meta tags (título, descripción, Open Graph) y favicon.

**Listo cuando:** la URL de Pages abre y ambos botones descargan el último instalador.

---

## 4. Fuera de alcance

- Firma Apple/Windows, notarización, tiendas.
- Sincronización o nube.
- Linux (se puede sumar luego).
- Cambios de código al repo `personal-finances-v2`.

## 5. Tarea terminada

- Fases 1–10, un commit cada una.
- `pnpm check` y `cargo check` en verde.
- Release `v0.1.0` instalado a mano en Mac y Windows.
- Respuesta final con formato de `AGENTS.md` + secrets a crear + capturas a tomar.
