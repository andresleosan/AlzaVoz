# T7 — Evidencia de verificación

Fecha de trabajo: 7 de noviembre de 2026 (America/Bogota). Datos exclusivamente sintéticos; ningún contacto, llamada o denuncia real.

## Captura y privacidad
- AudioWorklet real del navegador: seno generado con Web Audio, 1 kHz, amplitud 0,5; resultado −9,0 dBFS, pico 0,500, 15,00 s, 44.100 Hz y 661.500 muestras. `MediaStreamTrack.readyState` terminó en `ended`.
- Prueba del processor con seno/silencio/amplitud máxima a 44.100 y 48.000 Hz: RMS contra amplitud/√2, conteo exacto de muestras y 60 mensajes escalares; no se transmite PCM al hilo principal ni al servidor.
- Interrupción, permiso tardío cancelado, permiso denegado, micrófono ausente y API no compatible tienen estados explícitos; la captura parcial no produce resultado completo.
- Día civil de Bogotá y ventana de 30 días validados; fechas inexistentes, futuras, antiguas y campos adicionales se rechazan.
- SQL en D1 local con bindings reales: envíos concurrentes de mismo UUID agregan una sola observación, cambio de contenido con UUID repetido devuelve 409. No se envían dBFS, audio, coordenadas ni identificadores del dispositivo.
- Pérdida de confirmación después de escribir: reintento conserva exactamente el payload, incluso tras cambiar el reloj de la página al día siguiente.
- Camuflaje probado en detalles, lectura principal y selector de comuna; los datos no se guardan en localStorage/sessionStorage.

## MCP Playwright
- Móvil 390×844: sin desbordamiento horizontal; acción principal en x=16, y=688, 358×56 px. Escritorio 1440×1000: dos columnas y controles de 56 px.
- Flujo real contra Next + Worker/D1 local: GET 200, captura sintética, compartir voluntariamente comuna 3/categoría música y GET agregado 200. Las pruebas automatizadas utilizan otras zonas/categorías.
- Permiso denegado y micrófono inexistente simulados mediante `getUserMedia`: mensaje accionable, micrófono apagado y sin botón de compartir.
- Mapa 503 simulado con ruta interceptada: error explícito, no cero falso; retirar interceptación y reintentar recupera tabla.
- POST directo sin cabecera de cliente: 403. Red normal solo endpoint comunitario local; sin audio ni mapas remotos.
- Consola final normal: cero errores. Los 503 y 403 deliberados se observaron como respuestas de error esperadas, no como fallos del flujo normal.
- [Móvil](mobile.png), [escritorio con señal conocida](desktop.png).

## Correcciones verificadas
1. Selectores de test acotados a cada región para excluir anunciador vacío de Next.
2. Atributos sensibles corregidos: la prueba RED encontró `filter: none`; versión final usa `data-sensitive="true"` en lectura/detalles/selecciones.
3. Hidratación SVG: MCP y test `pageerror` reprodujeron React #418. El entorno de desarrollo identificó `<title>` con array de hijos; se cambió a un único string. Navegación final sin errores de hidratación.
4. Lint de efectos y refs: carga asíncrona con callbacks de promesas y estado explícito de intento, sin supresiones.

## Rendimiento y seguridad
- Sin dependencias nuevas. Chunk propio de /community: 14.132 bytes; Worklet: 1.015 bytes. No son cifras de transferencia total ni Core Web Vitals de campo.
- Avatar en Pages: original PNG de 1.633.880 bytes para 72 px sustituido por derivado WebP de 144×144 y 5.348 bytes (−99,67%); original conservado. Conversión con Sharp ya incluido en Next, sin instalar dependencias. Contraste calculado: texto 18,33:1; botón principal 12,56:1.
- 4 mensajes/s y memoria constante para RMS/pico; no se retiene audio. Mapa SVG local con tabla accesible y centros aproximados ya existentes.
- Allowlist de campos y categorías, JSON de hasta 512 bytes, origen/cabecera de cliente, gateway privado, rate limit global sin retener IP, SQL parametrizado, salida React y `Cache-Control: no-store`.
- Detector Impeccable: sin hallazgos (`[]`); revisión independiente de código realizada, hallazgo de antiespía corregido.
- Migración `0002_community_observations.sql` aplicada correctamente en D1 remoto **de pruebas**: 2 consultas. Esto verifica creación de esquema, no una captura acústica física.

## Límites
Chromium automatizado y medios sintéticos; no Safari/iOS ni hardware físico. Sin calibrador o sonómetro de referencia. La lectura dBFS no mide presión sonora, dBA ni infracción. La agregación cuenta observaciones no verificadas y no personas distintas; no garantiza anonimato absoluto ni representatividad. Retención: consulta excluye días fuera de ventana; limpieza de registros antiguos ocurre al siguiente envío. El servidor recibe metadatos técnicos de conexión propios del alojamiento, aunque no se guardan en la tabla de observaciones.

## Resultados finales
- `pnpm lint`, `pnpm build`, `pnpm exec tsc --noEmit` y `pnpm build:pages`: exit 0.
- `pnpm test`: 88/88, 3,5 min. `PLAYWRIGHT_PAGES=1 pnpm test`: 88/88, 3,8 min.
- Último cambio limitado al avatar: builds nuevos y `pnpm test e2e/community.spec.ts` 14/14 (58,0 s); misma suite con `PLAYWRIGHT_PAGES=1` 14/14 (58,7 s). MCP comprobó WebP 200, 5.348 bytes y `complete/naturalWidth` válidos, sin errores normales de consola.
- `node --test scripts/actualizar-seguimiento.test.mjs`: 11/11.
- Código `0a0605006254f8c083d933180f37c5d74b907218` enviado a origin/main y SHA comprobado con fetch nuevo. Cambios previos de planificación conservados.
- Pages deploy `35b64dd3-a98a-4cee-992a-d780094c11c0`: success para ese SHA. Worker deploy `5f478a20-c31c-433d-96b7-5219d7b13cf1`, versión `600090a7-0cb4-48cb-8652-0dc477b5001d` al 100%; contenido remoto incluye ruta y tabla T7, ausentes antes del push. La consulta de historial Workers Builds dio 403 con OAuth disponible; las APIs de deployments/content y el recorrido integrado sí permitieron verificar la publicación.
- Lecturas de producción: `/community` 200, Worklet 200 (1.015 bytes), avatar 200 (5.348 bytes), `/api/community` 200, `no-store`, `{groups:[],days:30}`. No se realizaron POST de prueba en producción. T10 sigue pendiente.
