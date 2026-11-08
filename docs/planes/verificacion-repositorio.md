# Verificación automática del repositorio en /avanzar

## Objetivo y decisiones

Antes de seleccionar una tarea, comprobar que el checkout usa `main` y que las URLs de lectura y escritura de `origin` corresponden a `https://github.com/andresleosan/AlzaVoz`. Obtener `main` del remoto y comparar su SHA con `HEAD`; una referencia local antigua no demuestra sincronización.

Se implementa un script Node con Git y sin dependencias nuevas. Solo instrucciones en Markdown dejarían la comprobación a criterio de cada sesión. Un hook de commit llegaría demasiado tarde para evitar trabajar sobre una base desactualizada.

- Coinciden los commits: continuar; identificar y conservar los cambios locales si existen.
- Atraso con checkout limpio: `--sync` permite únicamente `merge --ff-only`; comprobar de nuevo los SHA.
- Atraso con cambios, adelanto o divergencia: salida no exitosa e indicación del siguiente paso. Sin stash, reset, clean ni push automáticos.
- Rama equivocada, HEAD separado, conflictos, operación Git en curso, remoto incorrecto o fallo de fetch: detener antes de seleccionar tareas.
- Después del push: repetir el control sin `--sync`; igualdad de commits no acredita despliegue Cloudflare.

La comparación cubre commits; los cambios sin commit se informan por separado y nunca se describen como publicados.

## Archivos y verificación

- `scripts/verificar-repositorio.mjs`: comprobación y actualización opcional segura; CLI sin opciones para cambiar el repositorio esperado.
- `scripts/verificar-repositorio.test.mjs`: repositorios Git temporales reales, sin red ni cambios en el checkout de trabajo.
- `.agent/workflows/avanzar.md`, `.claude/commands/avanzar.md`, `PLANIFICACION.md` y skill personal `avanzar/SKILL.md`: ejecutar el control antes del contexto y después del push.
- `AGENTS.md`: conservar el requisito para futuras sesiones en este repositorio.

No se modifica la interfaz, los datos ciudadanos ni las APIs; las reglas visuales de `DESIGN.md` no afectan a este control de desarrollo. Mantener los cambios anteriores del usuario, incluidos workers, planes y panel local.

## Pasos

- [x] Escribir pruebas de estados Git y comprobar el fallo inicial.
- [x] Implementar el control y pasar sus pruebas y ESLint.
- [x] Integrar las instrucciones y validar la skill.
- [x] Ejecutar el control sobre AlzaVoz y revisar el diff propio.

## Evidencia

- `node --test scripts/verificar-repositorio.test.mjs`: 15/15 pruebas aprobadas. Usan remotos locales temporales y comprueban conservación de HEAD, índice, archivos y archivos ignorados. La revisión independiente detectó el reemplazo por defecto de archivos ignorados; su prueba falló antes del arreglo y pasó usando `--no-overwrite-ignore` y `--no-autostash`.
- `pnpm exec eslint scripts/verificar-repositorio.mjs scripts/verificar-repositorio.test.mjs`: aprobado.
- `quick_validate.py` sobre la skill personal `avanzar`: aprobada.
- `node scripts/verificar-repositorio.mjs --sync`: `main`, remoto correcto y ambos SHA `05433a3460e19f2bdd60665b24a31decd6071499` antes de enviar este cambio. Se identificaron y conservaron los cambios locales anteriores y el trabajo paralelo.
- El envío se cierra con el mismo control sin `--sync` sobre el commit nuevo; la respuesta de cierre registra el resultado observado.
