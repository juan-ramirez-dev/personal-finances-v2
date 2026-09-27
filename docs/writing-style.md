# Cómo escribir

Regla: si se puede borrar sin perder nada, se borra.
Aplica a planes, `.md`, comentarios, commits y PRs.

## Planes

❌ Largo:

> Para implementar esta funcionalidad, primero vamos a analizar la estructura actual del módulo de autenticación, considerando las distintas alternativas disponibles en el ecosistema de Next.js, y posteriormente procederemos a crear un nuevo componente que se encargará de gestionar...

✅ Corto:

> **Qué:** botón de logout en el header.
> **Por qué:** hoy solo se puede salir desde /dashboard.
> **Cómo:** reusa la action `logout` de `(auth)/actions.ts`.

## Comentarios en código

❌ `// Esta función obtiene el rol del usuario desde la base de datos usando el id`
✅ `// Se consulta en cada request para que un cambio de rol aplique al instante.`

El qué lo dice el código. El comentario dice el por qué. Si no hay por qué, no hay comentario.

## Preguntas

❌ "¿Cómo quieres manejar los permisos?"
✅ "¿Quién puede borrar un proyecto?

1. Solo admin (recomendado): simple, cero riesgo.
2. Admin + dueño: más flexible, requiere columna `owner_id`."

## Commits

- `feat: logout en header`
- `fix: loop de redirect con token vencido`
- Minúsculas, presente, máximo ~60 caracteres.
