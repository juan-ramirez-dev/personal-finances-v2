# Finanzas personales

Cuánto tengo disponible y en qué se me va el dinero.
Basado en `next-supabase-template`.

## Estado

- Datos en Supabase. Sin registro: un solo usuario creado por migración.
- Usuario: `juan@finanzas.co` · clave temporal: `finanzas123`.
  - En hosted: cambiarla en el dashboard tras el primer deploy.
- Checklist del backend: `docs/backend-checklist.md`.

## Arrancar

```bash
pnpm install
pnpm dev
```

`.env.local` necesita `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`).

DB local: `pnpm db:start` → `pnpm db:reset`. Tests de RLS: `supabase test db`.

## Cómo funciona

- Mes financiero: de día de pago a día de pago.
- **Disponible** = ingreso − gastado − fijos pendientes.
- Gasto → va a un fijo (lo marca pagado) o a una categoría (cuenta contra su presupuesto).
- Aporte a inversiones = gasto fijo "Inversión".

## Scripts

| Script          | Qué hace                                |
| --------------- | --------------------------------------- |
| `pnpm check`    | lint + prettier + tipos + tests + build |
| `pnpm db:new x` | nueva migración                         |
| `pnpm db:reset` | DB local desde cero                     |
| `pnpm db:types` | regenera tipos de la DB                 |

## Docs

- `AGENTS.md` → reglas (humanos y agentes)
- `docs/backend-checklist.md` → lo que falta en backend
- `docs/auth.md` → sesión y guards
- `docs/css.md` → tokens y estilos
