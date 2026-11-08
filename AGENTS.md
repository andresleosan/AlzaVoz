# Instrucciones de AlzaVoz

## Comprobación automática en `/avanzar`

- Antes de leer el contexto o seleccionar una tarea, ejecuta `node scripts/verificar-repositorio.mjs --sync` desde el checkout. Comprueba `origin` de lectura y escritura, rama `main`, operaciones Git pendientes y los SHA local/remoto tras un fetch nuevo. Solo actualiza automáticamente por fast-forward con el checkout limpio.
- Una salida no exitosa impide comenzar otra tarea: resuelve primero el cierre pendiente, el atraso o la divergencia conservando el trabajo. Los cambios sin commit se informan y preservan; igualdad de commits no significa que esos archivos estén publicados. No uses stash, reset ni limpieza automática para eludir el control.
- Después del push, ejecuta `node scripts/verificar-repositorio.mjs` y exige igualdad de los SHA antes de afirmar que quedó enviado. La comprobación del despliegue en Cloudflare es independiente.

## Git y publicación

- Preferencia explícita del usuario: trabajar directamente en `main` y enviar los cambios verificados a `origin/main`.
- No crear ramas de tarea ni worktrees con ramas nuevas salvo petición expresa del usuario. Esta instrucción prevalece sobre recomendaciones genéricas de skills de crear ramas.
- Conservar los cambios locales previos y preparar únicamente los archivos o fragmentos del trabajo autorizado.
- No hacer force-push. Ante divergencias, integrar sin perder trabajo ni sobrescribir historial.
- Si el usuario solicita un PR para integrar una rama existente, crearlo hacia `main`, fusionarlo y eliminar la rama después de verificar que sus commits quedaron integrados. Al terminar, dejar el checkout en `main`.
- `main` es la rama destinada a producción. Distinguir siempre un push o una fusión confirmados de un despliegue terminado; verificar el estado del proveedor antes de afirmar que está publicado.
- Cloudflare Pages y Workers Builds publican automáticamente desde `main`: web con `pnpm build:pages` a `out`, backend con `pnpm deploy:recordings`. Verificar ambos resultados.
- Las APIs de producción son Pages Functions en `functions/`, con lógica compartida en `src/lib/`; los Route Handlers de Next se usan en desarrollo. Una API nueva necesita su entrada de Pages. Probar cambios de alojamiento con `PLAYWRIGHT_PAGES=1 pnpm test` después de `pnpm build:pages`.
