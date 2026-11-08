# T8 — Evidencia de verificación

Trabajo iniciado el 7 de noviembre de 2026 (America/Bogota). Solo datos sintéticos; no mensajes, llamadas ni avisos de prueba en producción.

## Estado inicial e infraestructura

- `node scripts/verificar-repositorio.mjs --sync`: exit 0, main y origin/main en `52152296afa3388d749b009fa5afb229cf2b90b5`. Cambios locales anteriores conservados.
- Cloudflare previo: Pages `9acc345b-1708-4722-8d93-91e089fbbca7` success para ese commit; Worker versión `659e1306-8374-45d4-af5a-30f1d6083501` al 100%, sin tablas/ruta search en su código remoto.
- `pnpm exec wrangler d1 execute alzavoz-db-pruebas --remote --config workers/recordings/wrangler.jsonc --file workers/recordings/migrations/0003_search_notices.sql`: exit 0; tres consultas en base remota de pruebas, creación de tablas e índice. No implica todavía prueba de lectura/escritura remota del flujo.

## Revisión previa

- Builder-check independiente confirmó cobertura de T8. Se separó requestId privado de ID público para evitar un oráculo de contacto privado mediante idempotencia.
- Revisión de backend identificó ausencia de limitador antes de DeepSeek; corrección y prueba requeridas antes del cierre.

## Pruebas dirigidas y revisión

- RED inicial de creación API antes de implementar: POST devolvía 404. RED de título multilínea y dos regresiones de validación definitiva documentados en el informe de implementación. El fallo de importación de un módulo aún inexistente no se cuenta como RED conductual.
- Primeras pruebas dirigidas: 10/10. Primera suite completa Next: 98/98 en 3,5 minutos.
- Revisión independiente: separación público/privado, idempotencia, limitador IA, validación de IDs candidatos, Canvas y gateways correctos por inspección. Único P2: un 400 bloqueaba permanentemente el formulario. Corregido con parsers compartidos antes de congelar y liberación de edición solo ante 400; valores y consentimiento se conservan. Timeout/red/503/429 mantienen el payload para reintento.
- Fechas imposibles retornan null, títulos rechazan CR/LF, descripción se ajusta al espacio disponible antes del QR. Tests decodifican también afiche con título de 80 y descripción de 1200 caracteres.

## MCP Playwright

- Chromium/Edge, móvil 390×844 y escritorio 1440×1000, Next + Worker/D1 locales. Wizard completo, revisión, consentimiento, creación y pista con respuestas 200; datos únicamente sintéticos.
- Aviso `72ddfeef-3db8-48ed-a005-4e835954d564`: GET solo contiene `id, kind, title, description, commune, eventDate, createdAt`; contactos y pistas centinela ausentes.
- Descarga real `afiche-mcp.png`, 1200×1700. Decoder independiente jsQR devuelve exactamente `http://127.0.0.1:3000/search?id=72ddfeef-3db8-48ed-a005-4e835954d564`.
- Pista de espacios y letra (`  a`) permanece editable y conserva texto. 400 simulado conserva texto y consentimiento; corregir y reenviar produce 200 real. 503 simulado del listado muestra error; al retirar interceptación, Reintentar recupera los tableros.
- DeepSeek ausente en entorno local: 503 real y mensaje explícito. Respuesta de sugerencias simulada solo para validar presentación y enlace; se etiqueta como hipótesis. No se presenta esta simulación como llamada real al proveedor.
- Modo antiespía aplicado a textarea privada: `blur(8px)` tras transición. Sin desbordamiento horizontal; botón de descarga 204,9×56 px. Sin permisos de cámara, micrófono ni geolocalización en este módulo.
- Consola final de navegación normal: cero errores. Los 400/503 deliberados aparecen como errores de red esperados. Un timeout de automatización por esperar una microcopia distinta se corrigió leyendo el snapshot; no fue un fallo de producto.
- Capturas inspeccionadas: [móvil](mobile.png), [escritorio](desktop.png), [afiche sintético](afiche-mcp.png).

## Rendimiento y seguridad

- Generador y QR solo se descargan al pulsar el botón: dos chunks adicionales observados de 1483 y 9149 bytes transferidos en Next local. No estaban en las solicitudes anteriores a la descarga. Esto no constituye una medición de Core Web Vitals de campo.
- Contraste calculado: texto #F9FAFB sobre #111827, 16,98:1; texto secundario #CBD5E1 sobre #111827, 11,95:1; botón #0B0F19 sobre #6EE7B7, 12,56:1.
- Reutiliza avatar WebP existente con dimensiones explícitas. Lista limitada a 60 y candidatos a 20, alcance informado en interfaz. SQL parametrizado, JSON acotado, origen/cabecera propios, gateway privado, proyecciones de campos y no-store. Sin any, supresiones TS, HTML arbitrario ni almacenamiento navegador añadidos.
- Chunk propio final de /search: 17.840 bytes sin comprimir; antes de T8 esta ruta no existía. No se infieren mejoras de latencia a partir de ese tamaño.
- Impeccable context ejecutado: leyó DESIGN.md; no existe PRODUCT.md, sin cambiar la documentación global para una auditoría acotada. Detector ejecutado una vez: exit 1 con dos advertencias estilísticas `side-tab` en bordes de aviso/revisión (CSS líneas 7 y 23). Revisadas visualmente: son acentos de privacidad y de revisión dentro del modo Radar; no implican fallo funcional, contraste ni accesibilidad. Se conservan por coherencia del producto, conforme a anti-slop (no editar solo por una señal estética del detector).
- Límite de coincidencias antes de leer candidatos y llamar IA; 429 preservado. Reintentos ya persistidos no consumen cuota de nuevas mutaciones. requestId privado distinto al UUID público; payload incluye noticeId en pistas.

## Límites

No se probó Safari/iOS, cámara de teléfono leyendo un afiche impreso ni calidad semántica de DeepSeek en vivo; respuesta IA y sus fallos se validan con respuestas controladas. D1 local sí almacena datos reales sintéticos; D1 remoto de pruebas tiene el esquema verificado. No se promete anonimato absoluto, verificación de avisos ni seguimiento inmediato de pistas. El panel del equipo, moderación y caducidad corresponden a tareas posteriores.

## Resultados finales

- Builds finales Next/Pages, lint y tsc: exit 0.
- `pnpm test` final: 100/100, 3,6 minutos, incluidas las dos regresiones nuevas de corrección tras validación.
- MCP final sobre Pages: detalle 200, proyección pública correcta y envío sin origen autorizado 403; sin desbordamiento móvil.
- `PLAYWRIGHT_PAGES=1 pnpm test` final: 100/100, 3,5 minutos. Revisión independiente final aprobada; auditoría de seguridad sin nuevos defectos concretos.
- Código enviado: `b22e0e8c1f596b3eda90d8062cad9d6139949594`; `node scripts/verificar-repositorio.mjs` confirmó igualdad con origin/main tras fetch nuevo.
- Pages `168ca2bc-7396-4aaf-b700-f555322789c8`: success para ese SHA. Worker deployment `b7079938-27b1-4ed2-aa2f-b093356c4917`, versión `a88b327a-64d7-4504-8c01-afdbd265d640` al 100%; contenido remoto incorpora search_notices y search_tips.
- Producción `/search` 200 y `/api/search` 200, `Cache-Control: no-store`, `{notices:[]}`. Sin POST sintéticos en producción. T10 sigue pendiente; esto verifica la publicación continua de T8.
- [Salida completa Next](next-tests.txt), [salida completa Pages](pages-tests.txt), [revisión independiente](revision.md), [auditoría de seguridad](seguridad.md). Los informes de implementación/revisión conservan sus estados históricos; este apartado registra el cierre posterior.
