# T008 — Revisión de seguridad

Revisión estática final: no se identificaron nuevos defectos concretos con impacto en el alcance inspeccionado. Este resultado no certifica ausencia de vulnerabilidades ni sustituye pruebas de despliegue.

## Alcance y método

Se inspeccionaron `src/lib/search/contracts.ts`, `proxy.ts`, `matches.ts`, `poster.ts`, `src/components/search/SearchPanel.tsx` y `workers/recordings/search.ts`. Se contrastó también la entrada autenticada de búsqueda en `workers/recordings/index.ts`. No se modificó código ni se repitieron pruebas; la única escritura de esta revisión es este informe.

Skills leídas: `C:/Users/Drean Skate/.codex/skills/security-best-practices/SKILL.md` y `C:/Users/Drean Skate/.codex/skills/frontend-security-coder/SKILL.md`.

Referencias consultadas realmente bajo `C:/Users/Drean Skate/.codex/skills/security-best-practices/references/`:

- `javascript-typescript-nextjs-web-server-security.md`: límites de confianza, secretos, autorización, origen, XSS, cachés, peticiones externas, SQL y errores.
- `javascript-typescript-react-web-frontend-security.md`: renderizado JSX, URLs, almacenamiento, autorización servidor, comunicación de red y scripts externos.
- `javascript-general-web-frontend-security.md`: sinks DOM, ejecución dinámica, navegación, CSP, almacenamiento y recursos de terceros.

Se aplicaron las secciones pertinentes a T8; no se realizó una auditoría global de infraestructura ni una comprobación de avisos actuales de dependencias.

## Controles observados

- La proyección pública excluye contacto, texto de pistas, payload y requestId. El afiche y la petición IA se construyen con campos públicos.
- El UUID público es independiente del requestId privado. La comparación idempotente incluye campos privados y el aviso destino de las pistas; una colisión con distinto payload devuelve 409. Las confirmaciones existentes se resuelven antes del límite de nuevas escrituras.
- Se validan claves, tipos, UUID, fecha, comuna, consentimiento y longitud. El gateway limita el cuerpo, comprueba origen y cabecera propia y restringe métodos y rutas. Las consultas D1 parametrizan valores externos.
- El control de candidatos aplica `search-matches` mediante SESSION_LIMITER; el gateway propaga 429 antes de llamar a DeepSeek. Su efectividad operativa depende del binding del despliegue.
- La IA usa destino fijo, tiempo máximo, rechazo de redirecciones, hasta 20 candidatos complementarios y hasta tres IDs validados. El motivo se presenta como texto y la interfaz explica que son sugerencias.
- React representa contenido mediante JSX; Canvas usa fillText. No se observó uso de HTML dinámico, eval ni persistencia Web Storage en los módulos revisados. Los campos privados llevan data-sensitive y autocomplete desactivado.
- Las URLs del tablero mantienen una ruta propia; el QR usa el origen actual y un UUID público. La descarga es un blob PNG creado localmente y su URL se revoca.

## Límites

Los encabezados efectivos de producción, configuración de rate limiting, permisos D1 y despliegues requieren verificación independiente. La inspección no demuestra resistencia completa a abuso distribuido ni exactitud semántica de las sugerencias IA. Los campos públicos libres pueden contener datos sensibles introducidos por un autor pese a advertencias; T8 no implementa moderación ni retirada, según su alcance documentado.
