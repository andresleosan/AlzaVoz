# Evidencia T5 — 5 de noviembre de 2026 (America/Bogota)

## Alcance real

Captura con MediaRecorder real en Chromium; cámaras y audio **sintéticos**. CLI Playwright usa dispositivos falsos del navegador. MCP Playwright usa un canvas rotulado PRUEBA SINTÉTICA ALZAVOZ y un oscilador Web Audio. Ninguna prueba usa cámara física, evidencia ciudadana, llamadas o mensajes reales.

## Almacenamiento remoto comprobado

- Bucket privado: `alzavoz-evidencias-pruebas` (creado exclusivamente para esta tarea).
- Worker en sesión temporal `wrangler dev --remote`; Next local mediante pasarela con secreto efímero. No se publicó la aplicación final.
- Regla `borrar-pruebas`, prefijo `recordings/`: expirar objetos después de siete días, verificada con `wrangler r2 bucket lifecycle list`.
- Sesión sintética de video: `b390c722-ef46-40b5-b512-f5d8b137b85f`.

| Clip | Inicio observado (ms) | Fin observado (ms) | Bytes | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| 0 | 0 | 3003 | 62106 | 1e648939d6201b435175227b6f9a12e7f40d3ceb6e021c4ea9e6a4a5849d147f |
| 1 | 3005 | 6006 | 64285 | 188c27f669599604f7b01f657cbafbe49f571c8c2fe3fc859c378a1dba7bb8c5 |
| 2 | 6007 | 6509 | 10528 | 15aa9dffcecdbc0157474282e7678ebabde322449e4a0cd3ee0ecdd1289aa225 |

El clip 0 se descargó independientemente mediante `pnpm exec wrangler r2 object get alzavoz-evidencias-pruebas/recordings/b390c722-ef46-40b5-b512-f5d8b137b85f/clips/000 --remote --file test-results/t005-r2-remoto.webm`. `Get-FileHash -Algorithm SHA256` devolvió exactamente el hash del recibo. La copia de prueba no se versiona. Las pausas observadas entre clips fueron 2 y 1 ms en este recorrido, sin generalizar a otros dispositivos.

## MCP Playwright

- Video: 3 PUT con 201, listado y descarga con 200, reproducción del primer clip hasta `ended=true`.
- Audio y desconexión simulada: antes de reintentar, recibidos=0 y pendientes=2; después, recibidos=2 y pendientes=0. Reproducción hasta `ended=true`.
- Sin capacidad y capacidad incorrecta: 401. Archivo no WebM: 415. Permiso denegado simulado: cero recibidos y mensaje explícito.
- Móvil 390×844 y escritorio 1440×900 sin desbordamiento horizontal. Botón inicial móvil: x=16, y=680, ancho=358, alto=56, dentro del tercio inferior.
- Consola del flujo normal: cero errores y cero advertencias. Tras pruebas negativas: exactamente dos 401, un 415 y un ERR_INTERNET_DISCONNECTED inducidos; sin excepciones de aplicación.
- Capturas revisadas: `movil.png` y `escritorio.png`, tomadas de la versión final de la interfaz. Claves ocultas; no se guardan capacidades en esta evidencia.

## Rendimiento, límites y revisión

- Grabador separado en `/record`; enlace de portada con `prefetch=false`. Cero SDK/librería de grabación añadidos al cliente. Se libera el Blob RAM tras comprobar el recibo; límite de cola 16 MiB y clip 2 MiB.
- MCP midió 503361 bytes de JavaScript descomprimido en `/record` antes del pulido final de texto. No hay medición de campo, INP ni comparación equivalente de rendimiento antes/después: la ruta no existía. No se atribuye una mejora porcentual.
- Impeccable detector: `[]`; revisión visual en ambos tamaños. Cero `any` explícitos o supresiones TypeScript añadidos.
- Revisión independiente encontró y se corrigieron: diálogo de abandono que interfería con salida rápida, bloqueo al cancelar permisos pendientes y fin observado cero al detenerse automáticamente. Hay pruebas de regresión.
- Baseline: lint y TypeScript aprobados. RED inicial: POST sesiones 404; luego pruebas API verdes. UI ausente también produjo fallo antes de implementarla.
- Fallos intermedios corregidos: origen interno de Next diferente del origen público (ahora variable de origen confiable explícita), selector de alertas confundido con announcer de Next y fixture de Blob sobredimensionado cuyo listener corría después del consumidor.
- Una ejecución completa anterior falló al navegar a `/defender` con `ERR_NO_BUFFER_SPACE`; la repetición completa aprobó 30/30. No se modificó el flujo Defensor ni se ocultó el fallo.
- Wrangler 3.114.17 no pudo crear preview remoto; 4.158.0 fijado en package/lockfile sí lo creó. pnpm agregó excepciones exactas de edad mínima para Wrangler y su Miniflare beta; se conservan explícitas. El binding de rate limit limita 30 creaciones/minuto por ubicación, no es una cuota distribuida exacta.

## Límites pendientes fuera de T5

Safari/iOS, teléfonos físicos, bloqueo de pantalla, llamadas entrantes y segundo plano no verificados; T101 cubre dispositivos reales. T10 sigue siendo publicación final. T46 profundiza validación de archivos, T52 retención de producción y T104 capacidad. Cerrar puede perder datos sin recibo; la clave copiada es indispensable para recuperarlos después de cerrar. No hay certificación de continuidad, autenticidad de escenas ni privacidad absoluta.
