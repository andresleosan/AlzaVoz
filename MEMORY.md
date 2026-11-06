# MEMORY: ALZAVOZ & ALZA BOT (MEDELLÍN)

## Contexto técnico
- Next.js App Router 16.4.5, React 19.3, TypeScript estricto, Tailwind v4 y pnpm. Wrangler 4.158.0 fijado para preview remoto compatible.
- Ciudadanos sin cuenta. DESIGN.md define UX bajo estrés; PLANIFICACION.md es el contrato común local.
- D1/Firebase/DeepSeek y despliegue final deben verificarse antes de describirlos como integrados. T10 no es prerrequisito de desarrollo local.

## Estado y continuidad
- T5 implementada y verificada: /record, video/audio WebM en clips ~3 s, tiempos/pausas observados, recibos SHA-256, clave privada, recuperación y reintento sin sobrescritura.
- R2 remoto de prueba: alzavoz-evidencias-pruebas, privado, objetos recordings/ con lifecycle de siete días. Worker temporal de preview; app de producción no publicada.
- Verificación 2026-11-05: lint, build y tsc aprobados; pnpm test 35/35 (17 nuevos). MCP móvil/escritorio, audio/video sintéticos, permisos, errores y R2 real; hash contrastado por CLI.
- Plan/evidencia: docs/planes/T005.md y docs/evidencias/T005/verificacion.md. Una ejecución previa tuvo ERR_NO_BUFFER_SPACE; repetición completa verde.
- Pruebas locales: pnpm build; pnpm test. Prueba manual: node scripts/recording-test-server.mjs; añadir --remote usa R2 real de pruebas. Puertos 3000/8787 libres; nunca evidencia real.
- Límites: Chromium probado con dispositivos sintéticos; no Safari/iOS ni hardware real. Cierre pierde pendientes sin recibo; guardar clave. Cola RAM 16 MiB, clip 2 MiB, máximo 100 clips.
- T5 enviada a origin/codex/t5-grabacion-r2; implementación 3486a56, push confirmado. Sin cierre funcional pendiente; cambios locales de organización se conservan aparte.
- Próxima elegible: T6, Denuncia Confidencial y Enlace Cloudflare D1. GPT-6-Astra (High): privacidad, archivos y persistencia con permisos.
- Plan local ampliado: 111 tareas T0–T110, ahora 6 completadas y 105 pendientes. Las 100 mejoras T11–T110 son planificación, no implementación.
- Se preserva organización previa sin commit: workflows, PLANIFICACION.md, catálogo, plantilla, documentación y panel/scripts. TASKS se prepara en Git solo para el bloque T5; el resto queda local.
- Panel local seguimiento.html y seguimiento-data.js: regenerar con node scripts/actualizar-seguimiento.mjs y comprobar con --check tras actualizar TASKS/MEMORY.
- Cada avanzar ejecuta primera pendiente elegible, crea su plan con PLANTILLA.md y aplica brainstorming/writing-plans/grilling, diseño/seguridad, anti-slop/ponytail/performance y verificación final MCP.
- Alias: antislop→anti-slop; taste/redesign→design-taste-frontend; grill-me→grilling. Skills instaladas; no duplicarlas.
