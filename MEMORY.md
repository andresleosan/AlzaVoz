# MEMORY: ALZAVOZ & ALZA BOT (MEDELLÍN)

## Contexto técnico
- Next.js App Router 16.4.5, React 19.3, TypeScript estricto, Tailwind v4 y pnpm. Wrangler 4.158.0 fijado para preview remoto compatible.
- Ciudadanos sin cuenta. DESIGN.md define UX bajo estrés; PLANIFICACION.md es el contrato común local.
- Firebase Auth (T9) y despliegue final T10 siguen pendientes. DeepSeek integrado en producción: DEEPSEEK_API_KEY cifrada en Pages, deepseek-flash sin thinking; consultas libres IA, presets locales inmediatos, fallback local ante errores.

## Estado y continuidad
- T5 implementada y verificada: /record, video/audio WebM en clips ~3 s, recibos SHA-256, clave privada, recuperación y reintento sin sobrescritura (docs/planes/T005.md y docs/evidencias/T005/verificacion.md).
- T6 implementada y verificada (2026-11-07): /report en modo Escudo Violeta, limpieza binaria en cliente/servidor de metadatos EXIF/GPS/XMP/IPTC/COM/tEXt/LIST-INFO (JPEG, PNG, WebP, WAV), transformación opcional de voz Web Audio con aviso de límites, vínculo verificado con sesiones R2 de /record, radicación idempotente con códigos ALZ-YYYY-XXXXXX en Cloudflare D1 (`alzavoz-db-pruebas` y `alzavoz-db`), comparativa D1/R2 vs WhatsApp y explicación de Salida Rápida.
- Evidencia T6: docs/planes/T006.md y docs/evidencias/T006/verificacion.md. Verificados lint, tsc, build, build:pages y 74/74 pruebas E2E en Next y Pages (`PLAYWRIGHT_PAGES=1 pnpm test`), más comprobación remota en `alzavoz-db-pruebas` y `alzavoz-evidencias-pruebas` (`ALZ-2026-RKPPEM`, SHA-256 contrastado por CLI).
- Producción activa: https://alzavoz.pages.dev con Pages estático + Functions (`functions/api/defender`, `recordings`, `reports`); Worker privado `alzavoz-recordings` con bindings R2 (`alzavoz-evidencias`) y D1 (`alzavoz-db`). Pruebas usan `alzavoz-evidencias-pruebas` y `alzavoz-db-pruebas` separados con lifecycle R2 de 7 días para `recordings/` y `reports/`.
- Pruebas locales: pnpm build; pnpm test. Prueba manual: node scripts/recording-test-server.mjs; añadir --remote usa D1 y R2 reales de pruebas. Puertos 3000/8787 libres; nunca evidencia real.
- Límites: Chromium probado con dispositivos y medios sintéticos; no Safari/iOS ni hardware físico real. No se promete anonimato absoluto ni impedir identificación forense de voz.
- Publicación continua: Pages ejecuta pnpm build:pages → out; backend pnpm deploy:recordings → workers/recordings/wrangler.production.jsonc. Secretos cifrados solo en Cloudflare, binding privado RECORDINGS; sin URL pública del Worker.
- Preferencia permanente: trabajar directamente en main y hacer push a origin/main; no crear ramas salvo petición expresa. Regla persistida en AGENTS.md.
- T7 implementada y verificada (2026-11-07): /community, AudioWorklet 15 s, RMS dBFS sin calibración física, descarte de audio y apagado del micrófono; envío opcional comuna/categoría/día con UUID idempotente a D1 y mapa/tablas de agregados de 30 días sin coordenadas individuales.
- Evidencia T7: docs/planes/T007.md y docs/evidencias/T007/verificacion.md; lint, tsc, ambos builds, 88/88 Next y Pages; repetición 14/14 T7 en ambos tras avatar WebP (1,63 MB → 5,3 KB). MCP móvil/escritorio, seno conocido, permisos/fallos, sin errores normales de consola; migración remota solo en D1 de pruebas. No hardware físico ni certificación acústica.
- Cierre T7: commit/push y estado de Cloudflare se verifican después del cierre documental; consultar resultado final del chat. No confundir verificación local con publicación.
- Próxima elegible: T8, Bloque 4: Tableros de Búsqueda y Afiches con QR en Canvas. GPT-6-Astra (Medium): avisos públicos/privados, pistas, QR y sugerencias de coincidencia con varias integraciones.
- Plan local ampliado: 111 tareas T0–T110, ahora 8 completadas y 103 pendientes. Las 100 mejoras T11–T110 son planificación, no implementación.
- Se preserva organización previa sin commit: workflows, PLANIFICACION.md, catálogo, plantilla y documentación. TASKS prepara solo T7 sobre la versión publicada; panel/scripts requeridos se incorporan con el catálogo de Git. El panel local conserva las 111 tareas y sus referencias.
- Panel local seguimiento.html y seguimiento-data.js: regenerar con node scripts/actualizar-seguimiento.mjs y comprobar con --check tras actualizar TASKS/MEMORY.
- Cada avanzar ejecuta primera pendiente elegible, crea su plan con PLANTILLA.md y aplica brainstorming/writing-plans/grilling, diseño/seguridad, anti-slop/ponytail/performance y verificación final.
- Alias: antislop→anti-slop; taste/redesign→design-taste-frontend; grill-me→grilling. Skills instaladas; no duplicarlas.
