# Tests

Jest + Testing Library. Correr: `pnpm test`.

## Antes de escribir un test

1. Listar casos posibles (agente `test-planner`).
2. El usuario elige cuáles. Multi-select.
3. Solo se escriben los elegidos.

## Qué sí probar

- Lógica con condiciones: permisos, cálculos, estados.
- Errores que el usuario va a ver.
- Bugs arreglados: un test que falle sin el fix.

## Qué NO probar

- Casos imposibles: los tipos o una validación previa ya los bloquean.
- Componentes que solo pintan props.
- Wrappers, constantes, re-exports.
- Librerías externas (Supabase, Next, jose). Se mockean, no se prueban.
- Detalles internos. Se prueba lo que entra y lo que sale.

## Cómo escribirlos

- Archivo junto al código: `guards.ts` → `guards.test.ts`.
- Un test = un comportamiento.
- Nombre en español que diga el resultado esperado:
  - ✅ `responde 403 si el rol no está permitido`
  - ❌ `test withRoles case 2`
- Sin lógica dentro del test (sin `if`, sin loops).
- Mocks solo en el borde: DB, red, cookies.

## Ejemplo

```ts
import { authorize } from './guards'
import { getSession } from './session'
import { getUserRole } from './roles'

jest.mock('./session')
jest.mock('./roles')

it('lanza 403 si el rol no está permitido', async () => {
  jest.mocked(getSession).mockResolvedValue(fakeSession)
  jest.mocked(getUserRole).mockResolvedValue('user')

  await expect(authorize(['admin'])).rejects.toMatchObject({ status: 403 })
})
```

> Código de servidor (`src/lib/**`): agrega `/** @jest-environment node */` al inicio del archivo.
