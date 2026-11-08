# Evidencia T6 — 7 de noviembre de 2026 (America/Bogota)

## Alcance real

Inspección y limpieza binaria de metadatos de imágenes (`image/jpeg`, `image/png`, `image/webp`) y audio (`audio/wav`), transformación acústica opcional de voz mediante Web Audio API / DSP en el cliente, enlace verificado con sesiones de evidencia R2 de `/record` (T5) y persistencia de expedientes confidenciales con códigos únicos no secuenciales `ALZ-YYYY-XXXXXX` en Cloudflare D1 (`confidential_reports` y `report_attachments`). Todas las pruebas utilizan imágenes y ondas de audio **sintéticas** generadas en memoria. Ninguna prueba usa datos ciudadanos reales ni envía mensajes reales por WhatsApp o llamadas de emergencia.

## Base de datos D1 y almacenamiento R2 remotos comprobados

- Base de datos D1 de pruebas: `alzavoz-db-pruebas` (`2c86c769-94f0-4367-8bc7-6e311e03c97a`, región `ENAM`, colo `MIA`).
- Base de datos D1 de producción: `alzavoz-db` (`3977754d-245c-48ca-bad3-4d297d0dd9e8`, región `ENAM`).
- Migración ejecutada remotamente en ambas bases: `workers/recordings/migrations/0001_confidential_reports.sql` (`confidential_reports`, `report_attachments` e índices).
- Bucket privado R2 de pruebas: `alzavoz-evidencias-pruebas` con regla de ciclo de vida `borrar-reportes-pruebas` para el prefijo `reports/` (expiración a los 7 días).
- Sesión sintética de `/record` (T5) vinculada en R2: `9c5e666b-e78a-4cbf-ac6a-86f932b5985f` (1 clip WebM confirmado).
- Expediente sintético radicado en preview remoto (`wrangler dev --remote`): `ALZ-2026-RKPPEM` (y segunda corrida tras ajuste visual: `ALZ-2026-JBGEKV`).

| Adjunto | Tipo | MIME | Bytes originales | Bytes limpios | Marcadores eliminados / Transformación | SHA-256 en D1 y R2 |
| --- | --- | --- | ---: | ---: | --- | --- |
| 0 | `image` | `image/jpeg` | 874 | 301 | `APP1`, `EXIF`, `GPS`, `COM`, `APP2` (`verifiedClean: true`) | `031901797ea7cf64835846db343f30874ab68e9ff852ed6ef6bbec68a01428a7` |
| 1 | `audio` | `audio/wav` | 51244 | 51244 | `voiceTransformed: true`, `acousticDeltaPercent: 76`, sin `LIST/INFO/ID3` | `dabd6d1d1807ef6568a578bbcef642c82b77b35fb50ae3ee5585b4aea57f9dcf` |

- Comprobación directa en D1 remoto mediante `pnpm exec wrangler d1 execute alzavoz-db-pruebas --remote`:
  - `confidential_reports`: `code='ALZ-2026-RKPPEM'`, `category='extorsion-amenaza'`, `risk_level='alto'`, `commune='Comuna 13 - San Javier'`, `recording_session_id='9c5e666b-e78a-4cbf-ac6a-86f932b5985f'`, `recording_clip_count=1`, `expected_attachments=2`, `attachment_count=2`, `status='radicado'`.
  - `report_attachments`: filas `slot_index=0` (`reports/ALZ-2026-RKPPEM/attachments/00`) y `slot_index=1` (`reports/ALZ-2026-RKPPEM/attachments/01`) con hashes idénticos al recibo entregado al navegador.
- Los dos objetos se descargaron independientemente de `alzavoz-evidencias-pruebas` con `pnpm exec wrangler r2 object get --remote` y `Get-FileHash -Algorithm SHA256` devolvió exactamente `031901797EA7CF64835846DB343F30874AB68E9FF852ED6EF6BBEC68A01428A7` y `DABD6D1D1807EF6568A578BBCEF642C82B77B35FB50AE3EE5585B4AEA57F9DCF`. Los archivos temporales de comprobación fueron eliminados tras verificar el hash.

## Verificación de navegador y Playwright

- Nota de entorno: en este runtime Antigravity no está registrado el servidor MCP `sarin_playwright`, por lo que la verificación interactiva en navegador real Chromium se ejecutó mediante `@playwright/test` contra el servidor local + `wrangler dev --remote` y contra ambas compilaciones (`next start` y `wrangler pages dev out`).
- Flujo principal en `/report`:
  - Paso 1: selección de categoría, nivel de riesgo, comuna opcional, referencia barrial y relato.
  - Paso 2: rechazo de archivo no soportado (`application/pdf`) con alerta explicativa; limpieza de JPEG con `EXIF/GPS/COM` (`hasIdentifiableMetadata: false`); generación/procesamiento de audio WAV con modulación de voz activa (`acousticDeltaPercent: 76`) y aviso explícito de que no promete ni garantiza impedir la identificación; enlace con clave `id.secret` de `/record`.
  - Paso 3: comparativa explícita entre **Opción A · Bóveda AlzaVoz (Cloudflare D1 + R2)** y **Opción B · Compartir por WhatsApp (+57 3234306794)**; explicación detallada de qué limpia localmente la **Salida Rápida** y qué puede permanecer fuera de la aplicación; radicación en D1 (`POST /api/reports` → `201`), subida de 2 evidencias limpias (`PUT /api/reports/:code/attachments/0..1` → `201`) y consulta posterior con clave privada (`GET /api/reports/:code` → `200`).
- Casos negativos y resiliencia verificados:
  - Consulta sin token o con token inválido: `401 Unauthorized`.
  - Subida de MIME no soportado (`application/pdf`) al endpoint de adjuntos: `415 Unsupported Media Type`.
  - Subida directa al servidor de un JPEG que aún conserva segmentos `EXIF/GPS`: `422 Unprocessable Entity` (rechazado por `inspectMediaMetadata` en el Worker antes de tocar R2).
  - Corte de red simulado durante la subida del segundo adjunto: el expediente conserva estado `pendiente_adjuntos` (`1 / 2`) y al reintentar sube únicamente el adjunto faltante sin duplicar el caso en D1 (`requestId` idempotente).
  - Salida Rápida (`Salir Rápido`): limpia `sessionStorage` y `alzavoz_report_draft` en `localStorage`, emite `alzavoz:escape` para detener audio activo y ejecuta `window.location.replace`.
- Móvil `390×844`, `320×851` y escritorio `1440×900`: `scrollWidth <= innerWidth` (`mobileOverflow: false`, `desktopOverflow: false`). Botón primario de paso en móvil: `x=33, y=1309, ancho=324, alto=56` (`>= 56px`).
- Consola del flujo normal: `0` errores, `0` advertencias y `0` excepciones de página (`pageerror`).
- Capturas revisadas: `docs/evidencias/T006/movil.png` y `docs/evidencias/T006/escritorio.png`, sin superposición de controles ni exposición de secretos.

## Rendimiento, seguridad y calidad de código

- Ruta `/report` aislada; enlace desde `/` con `prefetch={false}` para no penalizar la carga inicial de Inicio ni de `/sos`.
- Cero dependencias o librerías externas añadidas a `package.json`: el inspector/limpiador binario (`src/lib/report/sanitizer.ts`) y el procesador acústico DSP/WAV (`src/lib/report/voice.ts`) usan APIs nativas (`Uint8Array`, `DataView`, `Canvas`, `AudioContext`, `crypto.subtle`).
- Bytes de JavaScript descomprimidos medidos en `/report`: `555 483` bytes.
- Seguridad verificada:
  - El servidor nunca almacena en D1 el secreto del ciudadano ni el secreto de la sesión `/record`; almacena únicamente `access_hash` (SHA-256) y `recording_session_id`.
  - Consultas D1 100 % parametrizadas (`prepare(...).bind(...)`).
  - Cabeceras `Cache-Control: no-store` y `X-Content-Type-Options: nosniff` en todas las respuestas de `/api/reports` y del Worker.
- Detector Impeccable (`impeccable.cmd detect --json`): `[]` (cero hallazgos).
- Suites automatizadas: `pnpm lint` (0 errores), `pnpm exec tsc --noEmit` (0 errores), `pnpm build` (OK), `pnpm build:pages` (OK), `pnpm test` (**74/74 aprobadas**) y `PLAYWRIGHT_PAGES=1 pnpm test` (**74/74 aprobadas**).
