# Instrucciones de AlzaVoz

## Git y publicación

- Preferencia explícita del usuario: trabajar directamente en `main` y enviar los cambios verificados a `origin/main`.
- No crear ramas de tarea ni worktrees con ramas nuevas salvo petición expresa del usuario. Esta instrucción prevalece sobre recomendaciones genéricas de skills de crear ramas.
- Conservar los cambios locales previos y preparar únicamente los archivos o fragmentos del trabajo autorizado.
- No hacer force-push. Ante divergencias, integrar sin perder trabajo ni sobrescribir historial.
- Si el usuario solicita un PR para integrar una rama existente, crearlo hacia `main`, fusionarlo y eliminar la rama después de verificar que sus commits quedaron integrados. Al terminar, dejar el checkout en `main`.
- `main` es la rama destinada a producción. Distinguir siempre un push o una fusión confirmados de un despliegue terminado; verificar el estado del proveedor antes de afirmar que está publicado.
