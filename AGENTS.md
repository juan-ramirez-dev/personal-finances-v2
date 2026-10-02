<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Reglas para cualquier agente (Claude, Cursor, etc.) en este repo.
Leer completo antes de planear o escribir código.

---

## 1. Cómo escribir (lo más importante)

Quien lee este repo se cansa con párrafos largos. Todo texto debe ser corto.
Aplica a: planes, respuestas, `.md`, comentarios, commits y PRs.

- Frases cortas. Una idea por línea.
- Viñetas en vez de párrafos. Máximo 3 líneas seguidas de prosa.
- Palabras simples. Nada de jerga si hay una palabra común.
- Solo lo que importa para decidir o actuar. Si se puede borrar sin perder nada, se borra.
- No repetir lo que ya dijo el usuario ni lo que muestra el código.
- Comentarios en código: solo el **por qué**, nunca el qué. Una línea si se puede.

Ejemplos: `docs/writing-style.md`.

---

## 2. Planes

Todo plan sigue este formato. Nada más.

```markdown
## Qué voy a hacer

- 1-3 viñetas

## Por qué

- 1-2 viñetas

## Cómo va a funcionar

1. Paso del flujo
2. Paso del flujo

## Archivos

- `ruta/archivo.ts` → qué cambia

## Preguntas

(las que falten, con opciones)

## Tests

(casos elegidos por el usuario)
```

Reglas:

- **Siempre preguntar antes de decidir** en temas de:
  - Arquitectura (dónde vive la lógica, tabla nueva vs columna, server action vs route handler).
  - Negocio (quién puede hacer qué, qué pasa en el caso raro, qué ve el usuario si falla).
- Cada pregunta trae 2-4 opciones con una línea de pro/contra. Marcar la recomendada.
- Usar la herramienta de preguntas (AskUserQuestion) cuando exista.
- Si el código responde la pregunta, leer el código en vez de preguntar.
- El desarrollador debe terminar el plan sabiendo **qué** se hace y **por qué**.

---

## 3. Tests unitarios

- Solo **jest**. Archivo junto al código: `mi-archivo.test.ts`.
- **Antes de escribir tests, preguntar** qué casos probar:
  - Proponer edge cases reales como opciones (multi-select).
  - El usuario elige. Solo se escriben los elegidos.
- No escribir tests para:
  - Casos que no pueden pasar (tipos ya lo impiden, input ya validado antes).
  - Código sin lógica (componentes que solo pintan, wrappers, constantes).
  - Librerías externas (Supabase, Next, jose).
- Un test = un comportamiento. Nombre en español que diga qué se espera.

Guía completa: `docs/testing.md`. Agente: `test-planner`.

---

## 4. Stack y estructura

- Next.js 16 (App Router, `src/`), React 19, TypeScript estricto, **pnpm**.
- Supabase: Auth + Postgres. Migraciones en `supabase/migrations/`.
- Estructura:
  - `src/app/` → rutas. Componentes de un solo uso viven junto a su ruta.
  - `src/components/ui/` → componentes reusados en toda la app.
  - `src/app/api/<recurso>/route.ts` → endpoints. Solo HTTP: `authed` + parse + service.
  - `src/lib/api/<recurso>/` → backend por recurso:
    - `schema.ts` → forma del input (400). Tipos que comparten front y back.
    - `service.ts` → reglas de negocio (404/409/422).
    - `repo.ts` → Supabase. Único lugar que toca la DB.
  - `src/lib/api-client/` → único lugar del front que llama a `/api`. Cifra al enviar, descifra al recibir.
  - `src/lib/integrations/` → servicios externos (ej. OpenAI). Los llaman los services.
  - `src/lib/` → resto de lógica compartida (auth, vault, finance, env).
- Archivos en **kebab-case** (`mi-componente.tsx`). Lint lo bloquea.
- Sin barrels (`index.ts` que solo re-exporta).

---

## 5. Auth y guards

Flujo: login → token de Supabase en cookie httpOnly → vence en 2h → login otra vez. Sin refresh.
Datos cifrados en el navegador (E2E). El servidor nunca ve datos en claro ni la contraseña real.
Detalle: `docs/auth.md`, `docs/encryption.md`.

Usar siempre los guards de `src/lib/auth/guards.ts`. No crear lógica de permisos propia.

| Dónde    | Cómo                                                        |
| -------- | ----------------------------------------------------------- |
| Endpoint | `export const GET = authed(async ({ user, db }, req) => …)` |
| Página   | `const user = await requireUser()`                          |

- `proxy.ts` solo redirige rápido. **No es seguridad.** La seguridad está en los guards.
- Sin roles ni admin. Cada usuario solo lee y escribe lo suyo (RLS).
- Sin server actions: el front habla con el backend por `/api` (`src/lib/api-client/`).
- Columnas sensibles (montos, nombres, descripciones) van cifradas: tipo `sealed` en la DB. Nunca en claro.
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente.

---

## 6. CSS

- **Prohibido Tailwind.** CSS Modules (`archivo.module.css`) + variables.
- Colores, espacios y fuentes salen de `src/app/globals.css` con `var(--token)`.
- Colores literales (`#fff`, `rgb()`) solo en `globals.css`. Lint y hooks lo bloquean.
- Si falta un token, preguntar cuál agregar. No inventarlo.

Detalle: `docs/css.md`.

---

## 7. Base de datos

- Cambios de DB = migración nueva: `pnpm db:new nombre-corto`.
- Nunca editar una migración ya mergeada. Se crea otra.
- Probar local: `pnpm db:reset` antes de abrir el PR.
- Después de migrar: `pnpm db:types` para regenerar tipos.
- Toda tabla nueva con RLS activado.

---

## 8. Git

- Ramas protegidas: `main`, `staging`, `feedback`. **Nunca push directo.** Rama + PR.
- **Nunca** saltarse hooks: nada de `--no-verify`, `-n`, `HUSKY=0`.
- Si un hook falla, se arregla el error. No se rodea.

---

## 9. Prohibido

- Tailwind o cualquier librería de utilidades CSS.
- `any`. Usar el tipo real o `unknown` + validación.
- `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
- npm, yarn, bun, npx. Solo pnpm (`pnpm dlx` en vez de `npx`).
- Editar `.env*` o lockfiles a mano.
- Agregar librerías sin preguntar.
- Features, abstracciones o manejo de errores que nadie pidió.

Los hooks de `.claude/hooks/` bloquean casi todo esto. Si un hook bloquea: **no intentar rodearlo**. Arreglar o preguntar.

---

## 10. Tarea terminada

Una tarea NO está lista si falla algo de esto:

```bash
pnpm check   # lint + prettier + tipos + tests + build
```

Al terminar, responder con este formato (corto):

```markdown
**Qué cambió:** 1-2 líneas para producto.
**Detalle técnico:** 2-4 viñetas.
**Cómo probar:** pasos: qué correr, qué abrir, qué se debe ver.
```
