# CI/CD

## Qué corre y cuándo

| Workflow                  | Cuándo                                                        | Qué hace                                           |
| ------------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| `ci.yml`                  | PR a feedback / staging / main                                | lint, prettier, tipos, tests, build                |
| `validate-migrations.yml` | PR a feedback / staging / main que toca `supabase/migrations` | DB local limpia + todas las migraciones (sin seed) |
| `deploy-main.yml`         | push a `main` que toca `supabase/migrations`                  | `db push` al proyecto de Supabase de producción    |

Flujo: rama → PR → CI + migraciones en local pasan → merge → al llegar a `main`, las migraciones suben solas a producción.

`feedback` y `staging` no migran automáticamente.

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

### 3. Secrets en GitHub

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret                      | De dónde sale                                            |
| --------------------------- | -------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`     | Paso 2                                                   |
| `SUPABASE_MAIN_PROJECT_REF` | Proyecto de producción → Settings → General → Project ID |

### 4. Proteger ramas

Repo → Settings → Branches (o Rules) → regla para `main`, `staging`, `feedback`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass → marcar `check`
- ✅ Do not allow bypassing the above settings

No marcar `validate-migrations` como obligatorio: solo corre si el PR toca migraciones, y en los demás PRs GitHub se queda esperándolo para siempre.

### 5. Probar

1. Rama nueva → `pnpm db:new prueba` → escribir un `create table`.
2. `pnpm db:reset` local → pasa.
3. PR a `feedback` → deben correr `CI` y `Validate Supabase migrations (local)`.
4. Llevar el cambio a `main` → corre `Run migrations on main` → la tabla aparece en el proyecto de producción.

## Si algo falla

- **Validate falla:** la migración tiene error de SQL. Corre `pnpm db:reset` local y lee el error.
- **Run migrations on main falla en link:** revisar `SUPABASE_MAIN_PROJECT_REF` y `SUPABASE_ACCESS_TOKEN`.
- **Run migrations on main falla en push:** hay una migración en remoto que no está en el repo (`supabase migration list`).
