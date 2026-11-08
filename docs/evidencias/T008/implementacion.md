# T008 · Task 1 integrada

## Estado

Implementación completa para revisión independiente y verificación final de root. Sin commit/push. Archivos previos, TASKS/MEMORY/panel y producción conservados.

## Cambios

- `src/lib/search/contracts.ts`: cuatro categorías, parsers estrictos, UUID privado requestId separado del UUID público generado por Worker, consentimiento explícito, fechas reales hasta hoy Bogotá, comuna 1–16, límites de campos/cuerpo, título de una línea.
- `workers/recordings/search.ts`, `migrations/0003_search_notices.sql`, entrada en `index.ts`: D1 aislado de denuncias; proyección explícita pública; últimos 60 avisos; candidatos complementarios últimos 20; pistas privadas sin lectura pública; INSERT ON CONFLICT seguido de comparación completa para idempotencia concurrente. Payload canónico incluye noticeId en pistas, impide mover un requestId a otro caso. Reintentos ya persistidos no consumen límite de nuevas mutaciones.
- `src/lib/search/proxy.ts`, gateways Pages/Next: mismo origen y cabecera propia en POST, sin consultas arbitrarias ni endpoint público candidates, cuerpo acotado, timeout/errores explícitos y no-store.
- `src/lib/search/matches.ts`: DeepSeek en gateway con endpoint/modelo existente, `thinking:disabled`, JSON estructurado, solo proyección pública, candidatos complementarios acotados y validación de ID/motivo/duplicados. Límite Worker de matches, preservación 429; no candidatos no llama IA y devuelve `source: no-candidates` explícito (ajuste revisado con root).
- `SearchPanel.tsx`/CSS: wizard de cinco pasos con 1–2 preguntas, revisión/consentimiento, cuatro tableros con límite claramente explicado, detalle estático por query, pistas sin cuenta, reintento de payload congelado, estados de carga/error/IA indisponible. Datos privados solo en memoria y `data-sensitive`; sin almacenamiento navegador.
- `poster.ts`: Canvas blanco 1200×1700, texto público envuelto/acotado, descripción truncada con indicación del texto completo, espacio reservado para QR, descarga PNG. QR y generador cargados dinámicamente tras pulsar descarga. Home, nombre de página, modo Radar y export Pages conectados.
- Dependencias `qrcode@1.5.4`, tipos y decoders independientes de pruebas `jsqr@1.4.0`/`pngjs@7.0.0`.

## Evidencia RED/GREEN

- RED inicial: `pnpm exec playwright test e2e/search.spec.ts --grep 'persiste cuatro'` exit 1: respuestas POST no exitosas antes de existir API. La prueba integrada de creación/cuatro tipos/privacidad/idempotencia se escribió antes de implementación.
- La primera colección de contratos/IA dio módulo matches inexistente; fue error de recolección y no se cuenta como RED conductual.
- RED título multilínea: `pnpm exec playwright test e2e/search-contracts.spec.ts --grep parsers` exit 1: parser devolvía objeto con título con salto de línea, expected null; corregido y GREEN.
- GREEN inicial: 7/7 API/UI/contratos/PNG.
- GREEN final dirigido: `pnpm exec playwright test e2e/search.spec.ts e2e/search-contracts.spec.ts` exit 0, **10 passed (9.4s)**. Incluye persistencia real D1 local; concurrencia; datos centinela privados; origen/validación/tamaño; inexistentes; pistas requestId otro caso 409; reintento real tras perder respuesta tanto publicación como pista; IA inválida/ausente/error/sin candidatos/429; listado recuperable; PNG descargado decodificado con jsQR y navegación a URL exacta; PNG con título80/description1200.
- `pnpm build`: exit 0 con /search estático y API dinámica. Último build dirigido es anterior a endurecimiento final del parser de título y normalización defensiva Canvas; root reconstruirá la versión final.
- `pnpm exec tsc --noEmit`: exit 0 final.
- `pnpm exec eslint src/lib/search src/components/search workers/recordings/search.ts e2e/search.spec.ts e2e/search-contracts.spec.ts`: exit 0 final.
- Fallos intermedios resueltos: lint de lecturas ref durante render (se agregó estado attempted), selector Playwright alert incluía anunciador Next (se acotó a contenido), cuota global contaba reintentos persistidos (se confirmó antes del límite). No se ocultaron fallos de producto.

## Skills aplicadas

- impeccable/design-taste-frontend: un sistema existente Radar, jerarquía corta, avatar WebP existente con dimensiones, foco visible, botones >=56px, formularios progresivos y tablero textual responsivo. DESIGN.md prevalece sobre reglas comerciales genéricas.
- security-best-practices/frontend-security-coder: tipos estrictos sin any añadido, SQL parametrizado, allowlists y límites, proyección pública explícita en D1 e IA, textos React/Canvas sin HTML, IDs opacos y requestId privado, origen/cabecera en mutaciones, sin claves cliente ni datos personales reales en IA.
- anti-slop/ponytail: reutilización Worker/gateway/AppShell/D1 actuales, una única API integrada y sin capa de cuentas/fotos/moderación fuera de T8; errores conservados, prueba observable frente a base real y QR decodificado por biblioteca independiente.
- web-performance-optimization: no QR en home ni al abrir tablero, import dinámico de generador y qrcode al descargar, avatar optimizado existente. Root mantiene baseline chunks y medirá tamaño real diferido final; no se infieren CWV de bytes ni se afirma Lighthouse.
- test-driven-development: RED de API integrada previo a implementación y RED de título antes de corrección; evidencia real arriba. Casos ampliados tras integración se reportan como regresión/integración, no como RED individual de cada función.

## Pendiente de root / límites

Revisión independiente, ambas suites completas con build vigente, build Pages y MCP móvil/escritorio, medición exacta QR diferido y cierre Git/despliegue. No se llamó DeepSeek real con datos personales. No se validó entrega de pistas a equipo ni moderación: pertenecen a T9/tareas posteriores y la UI no ofrece seguimiento inmediato.

## Corrección de revisión P2 · errores definitivos del formulario

- Hallazgo: minLength HTML contaba espacios exteriores pero parser exige longitud tras trim. Un título/pista `  a` podía recibir400 y quedar congelado para siempre.
- RED: contra build anterior y servidor existente, `PLAYWRIGHT_REUSE_SERVER=1 pnpm exec playwright test e2e/search.spec.ts --grep 'rechazo de validación|aviso inválido'` falló ambos casos esperados: pista disabled después del rechazo y publicación inválida que sí llegaba a POST.
- Fix: `parseCreateNotice`/`parseTip` compartidos se ejecutan antes de congelar payload y hacer petición. Rechazo local mantiene edición y valores. Error HTTP conserva status; solo400 definitivo libera pending/attempted para corregir, manteniendo texto/contacto/consentimiento.503,429,timeout y resultados inciertos mantienen UUID y payload congelado.
- Nuevas pruebas: título/pista con espacios no generan POST;400 simulado de servidor permite editar conservando valores y consentimiento; fecha corregida tras400 usa payload actualizado y requestId nuevo; desmarcar consentimiento vuelve a bloquear publicación. Las pruebas anteriores mantienen verificación de payload idéntico tras503.
- `pnpm exec tsc --noEmit` y ESLint focal después del fix: exit0. GREEN de estas dos regresiones pendiente del rebuild coordinado por root; no se construyó en paralelo con sus suites.
