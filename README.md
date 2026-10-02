# Finanzas personales

Cuánto tengo disponible y en qué se me va el dinero.
Basado en `next-supabase-template`.

## Estado

- Registro público en `/register`. Sin admin: cada usuario ve solo lo suyo.
- Datos cifrados en el navegador (E2E). El servidor guarda solo texto cifrado. Ver `/privacy`.
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
- `docs/encryption.md` → cifrado E2E
- `docs/password-recovery.md` → recuperar contraseña (pendiente)
- `docs/css.md` → tokens y estilos
