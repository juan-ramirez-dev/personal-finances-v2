# CI/CD

## Qué corre y cuándo

| Workflow                  | Cuándo                                   | Qué hace                                       |
| ------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `ci.yml`                  | PR a feedback / staging / main           | lint, prettier, tipos, tests, build            |
| `validate-migrations.yml` | todo PR (salta si no toca `supabase/`)   | DB local limpia + todas las migraciones + seed |
| `migrate.yml`             | merge (push) a feedback / staging / main | `db push` al proyecto de Supabase de esa rama  |

Flujo: rama → PR → CI + migraciones en local pasan → merge → migraciones suben solas.

## Paso a paso (una vez por repo)

### 1. Ramas

```bash
git checkout -b feedback && git push -u origin feedback
git checkout -b staging && git push -u origin staging
```

`main` ya existe. Hacer `feedback` la rama por defecto si el equipo trabaja ahí.

### 2. Token de Supabase

- supabase.com → Account → Access Tokens → **Generate new token**.
- Uno solo sirve para todos los proyectos de la cuenta.

### 3. Environments en GitHub

Repo → Settings → Environments → crear **tres**: `feedback`, `staging`, `main`.
El nombre debe ser igual a la rama.

En cada uno, agregar estos secrets:

| Secret                  | De dónde sale                              |
| ----------------------- | ------------------------------------------ |
| `SUPABASE_ACCESS_TOKEN` | Paso 2 (el mismo en los tres)              |
| `SUPABASE_PROJECT_REF`  | Proyecto → Settings → General → Project ID |
| `SUPABASE_DB_PASSWORD`  | Password de la DB de ese proyecto          |

Opcional en `main`: **Required reviewers** → alguien aprueba antes de migrar producción.

### 4. Proteger ramas

Repo → Settings → Branches (o Rules) → regla para `main`, `staging`, `feedback`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass → marcar `check` y `validate`
- ✅ Do not allow bypassing the above settings

### 5. Probar

1. Rama nueva → `pnpm db:new prueba` → escribir un `create table`.
2. `pnpm db:reset` local → pasa.
3. PR a `feedback` → deben correr `CI` y `Validate migrations`.
4. Merge → corre `Migrate` → la tabla aparece en el proyecto feedback.

## Si algo falla

- **Validate falla:** la migración tiene error de SQL. Corre `pnpm db:reset` local y lee el error.
- **Migrate falla en link:** revisar `SUPABASE_PROJECT_REF` y `SUPABASE_ACCESS_TOKEN` del environment.
- **Migrate falla en push:** revisar `SUPABASE_DB_PASSWORD`, o hay una migración en remoto que no está en el repo (`supabase migration list`).
