# CSS

- **Sin Tailwind.** CSS Modules: `mi-componente.module.css` junto al componente.
- Todos los valores salen de `src/app/globals.css`.

## Tokens

| Tipo    | Ejemplo                                     |
| ------- | ------------------------------------------- |
| Color   | `var(--color-primary)`, `var(--color-text)` |
| Espacio | `var(--space-4)`                            |
| Texto   | `var(--text-sm)`                            |
| Bordes  | `var(--radius-md)`                          |

## Reglas

- Colores literales (`#fff`, `rgb()`, `white`) **solo** en `globals.css`. Lint + hook lo bloquean.
- Falta un token → preguntar el nombre y agregarlo en `globals.css`. No inventar.
- Modo oscuro: redefinir el token dentro de `@media (prefers-color-scheme: dark)` en `globals.css`.
- Colores en TS (ej: imágenes OG) → `src/lib/constants/colors.ts`, espejo de los tokens.
