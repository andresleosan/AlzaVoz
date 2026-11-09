# MEMORY: ALZAVOZ & ALZA BOT (MEDELLÍN)

## Contexto técnico
- Next.js App Router 16.4.5, React 19.3, TypeScript estricto, Tailwind v4 y pnpm. Wrangler 4.158.0 fijado para preview remoto compatible.
- Ciudadanos sin cuenta. DESIGN.md define UX bajo estrés; PLANIFICACION.md es el contrato común local.
- DeepSeek integrado en producción: DEEPSEEK_API_KEY cifrada en Pages, deepseek-flash sin thinking; consultas libres IA, presets locales inmediatos, fallback local ante errores.
- Firebase Auth (T9) verificado con tokens RS256 Web Crypto sin SDKs pesados de Node. Despliegue final T10 espera al resto.

## Estado y continuidad
- T5 implementada y verificada: /record, video/audio WebM en clips ~3 s, recibos SHA-256, clave privada, recuperación y reintento sin sobrescritura (docs/planes/T005.md y docs/evidencias/T005/verificacion.md).
- T6 implementada y verificada (2026-11-07): /report en modo Escudo Violeta, limpieza binaria en cliente/servidor de metadatos EXIF/GPS/XMP/IPTC/COM/tEXt/LIST-INFO (JPEG, PNG, WebP, WAV), transformación de voz Web Audio, vínculo con sesiones R2 de /record, radicación ALZ-YYYY-XXXXXX en Cloudflare D1 (`alzavoz-db-pruebas` y `alzavoz-db`).
- T7 implementada y verificada: /community, AudioWorklet 15 s, RMS dBFS, descarte de audio y apagado de micrófono; agregados D1 a 30 días sin coordenadas individuales (docs/planes/T007.md y docs/evidencias/T007/verificacion.md).
- T8 implementada y verificada: /search, cuatro categorías D1, requestId privado separado, pistas privadas, sugerencias DeepSeek con consentimiento/límite y afiche Canvas PNG con QR decodificado (docs/planes/T008.md y docs/evidencias/T008/verificacion.md).
- T9 implementada y verificada (2026-11-08): /admin con Firebase Auth RS256, gestión de casos D1 con filtros multicriterio, visor/descarga R2 de adjuntos y clips de grabación, actualización de estados de radicado y generador de Derechos de Petición/Oficios con IA (DeepSeek) y revisión humana obligatoria (docs/planes/T009.md y docs/evidencias/T009/verificacion.md). 5/5 pruebas E2E en Next y Pages.
- T11 implementada y verificada (2026-11-08): Contacto en condiciones seguras (I001). Ciudadano elige canal (WhatsApp, teléfono, Signal, correo), franjas COT, días o no contacto; actualización y retirada con clave privada en /report. Panel /admin muestra regla activa, semáforo en vivo COT y bloquea simulaciones fuera de franja con explicación de riesgo (docs/planes/T011.md). 4/4 pruebas E2E en Next y Pages; 109/109 en suite.
- Pruebas locales: pnpm build; pnpm test. Prueba manual: node scripts/recording-test-server.mjs; añadir --remote usa D1 y R2 reales de pruebas. Puertos 3000/8787 libres; nunca evidencia real.
- Límites: Chromium probado con dispositivos y medios sintéticos; no Safari/iOS ni hardware físico real. No se promete anonimato absoluto ni impedir identificación forense de voz.
- Publicación continua: Pages ejecuta pnpm build:pages → out; backend pnpm deploy:recordings → workers/recordings/wrangler.production.jsonc. Secretos cifrados solo en Cloudflare, binding privado RECORDINGS; sin URL pública del Worker.
- Preferencia permanente: trabajar directamente en main y hacer push a origin/main; no crear ramas salvo petición expresa. Regla persistida en AGENTS.md.
- Próxima elegible: T12: Vista previa de lo que se comparte (I002). GPT-6.1-Sol (Medium): vista previa unificada de destinatarios, adjuntos y precisión antes de despachar.
- Plan local ampliado: 111 tareas T0–T110, ahora 11 completadas y 100 pendientes. Las 100 mejoras T11–T110 son planificación, no implementación.
- Se preserva organización previa sin commit: workflows, PLANIFICACION.md, catálogo, plantilla y documentación. TASKS prepara T9 sobre la versión publicada; panel/scripts requeridos se incorporan con el catálogo de Git. El panel local conserva las 111 tareas y sus referencias.
- Panel local seguimiento.html y seguimiento-data.js: regenerar con node scripts/actualizar-seguimiento.mjs y comprobar con --check tras actualizar TASKS/MEMORY.
- Cada avanzar ejecuta primera pendiente elegible, crea su plan con PLANTILLA.md y aplica brainstorming/writing-plans/grilling, diseño/seguridad, anti-slop/ponytail/performance y verificación final.
- Alias: antislop→anti-slop; taste/redesign→design-taste-frontend; grill-me→grilling. Skills instaladas; no duplicarlas.
