# Recuperar contraseña

**Estado:** sin hacer. Tarea aparte, que incluye tomar la decisión.

## El problema

- La llave que abre los datos sale de la contraseña (`docs/encryption.md`).
- Olvidar la contraseña = nadie puede abrir los datos. Ni nosotros.
- Resetearla desde el dashboard de Supabase rompe el login: la app deriva otra `authPassword`.

## Opciones

1. **Sin recuperación** (hoy).
   - Pro: cero riesgo, cero código.
   - Contra: olvidar = perder todo.
2. **Código de recuperación** al registrarse.
   - Se muestra una vez. Envuelve una segunda copia de `dataKey`.
   - Pro: estándar (Bitwarden, Proton).
   - Contra: el usuario tiene que guardarlo bien.
3. **Cambiar contraseña con sesión activa.**
   - Re-envuelve `dataKey` con la nueva `masterKey` y cambia `authPassword` en Supabase.
   - Pro: barato (una sola llave).
   - Contra: no sirve si ya la olvidaste. Complementa a 2, no la reemplaza.

## Qué toca cambiar en cualquier caso

- Policy de update en `user_keys` (hoy no existe a propósito).
- Copy de `/privacy` y del registro.
