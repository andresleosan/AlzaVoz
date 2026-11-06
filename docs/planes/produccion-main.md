# Corregir producción y publicar desde main

Solicitud explícita: integrar T5 mediante PR, eliminar ramas de tarea, trabajar en main y resolver el 404 de alzavoz.pages.dev enlazando las funciones existentes.

## Diagnóstico

- PR #1 fusionado en main, merge 2be94a6; rama T5 eliminada local/remotamente. AGENTS.md registra main como única rama de trabajo.
- GET / y /record en alzavoz.pages.dev devuelven 404 vacíos.
- Pages tiene GitHub conectado a main y el último despliegue aparece exitoso, pero el panel pide `npx next build` con directorio `out`, mientras wrangler.jsonc declara `.next`. Ninguno configura una exportación estática válida ni runtime Next.
- No hay variables de servidor en Pages; la configuración incluye D1 provisional y un bucket de producción todavía ausente.

## Decisión y alcance

Las páginas implementadas son exportables: interfaces cliente y metadatos estáticos. Mantener el dominio Pages con exportación estática de Next y Pages Functions para las dos APIs existentes. Alternativa OpenNext/Workers requeriría cambiar alojamiento y un adaptador de runtime completo que estas vistas no necesitan. No transformar las APIs en respuestas estáticas.

- Crear build de Pages en carpeta generada aislada, sin APIs Next; exportar interfaz a `out`. Mantener `pnpm build/start/test` actuales para desarrollo.
- Compartir implementaciones de API entre Route Handlers Next y Functions, sin duplicar autorización ni lógica del Defensor.
- Pages → service binding privado → Worker de evidencias → R2 privado separado del bucket de pruebas. Secretos de pasarela solo en Cloudflare; origen producción exacto.
- Configurar Pages build automático desde main y directorio out. Workers Builds también conectado a andresleosan/AlzaVoz, main, comando `pnpm deploy:recordings`, sin previews. La configuración explícita del Worker conserva el backend separado de Pages.
- Preservar cambios locales previos de planificación fuera de los commits de despliegue.

## Verificación y cierre

- lint, TypeScript, build Next, build Pages y pruebas automatizadas.
- Probar salida Pages y Functions reales en local; comprobar origen/autorización.
- Publicar desde main; esperar deployment success del commit nuevo.
- HTTP 200 en /, /record, /sos, /defender y assets; API Defensor; captura sintética y recuperación R2 por HTTPS con MCP. No enviar mensajes ni usar evidencia real.
- Registrar hashes, URL, resultados y límites. No marcar T10 completa: la petición habilita publicación de lo implementado, no implementa las tareas futuras.

## Evidencia previa al push

- `pnpm build:pages`: HTML exportado correctamente para las cuatro rutas; Functions compiladas con Wrangler.
- `pnpm lint`, `pnpm build`, `pnpm exec tsc --noEmit`: aprobados.
- Pages local + Functions + Worker/R2 local: 35/35 pruebas E2E aprobadas, 47.3 s. Se detectó y corrigió incompatibilidad de `redirect: error` en workerd: usar `manual` y rechazar 3xx explícitamente, sin seguir redirecciones ni reenviar credenciales.
- Cloudflare: bucket privado `alzavoz-evidencias`, lifecycle `recordings/` de siete días; Worker `alzavoz-recordings` sin URL pública, R2 y limitador enlazados. Secreto generado y guardado cifrado en Worker y Pages, nunca en Git.
- Pages configurado con build `pnpm build:pages`, destino `out`; GitHub main conserva despliegue automático. Backend conectado desde Chrome a la misma rama usando la integración y token de Builds existentes.
- Next local + Worker/R2 local: 35/35 pruebas E2E aprobadas, 46.6 s, después del build final.

## Publicación y comprobación en producción

- Commit `efd86a300d9dd48b59e27f6223d2d025d3f6f6ae`, push directo a main. GitHub: solo rama main; PR #1 fusionado y ningún PR abierto.
- Pages disparado por Git: deployment `328f7880-b066-468f-bab0-b6b4bac5a4b5`, terminado success el 2026-11-06 04:35:15 UTC. Dominio canónico https://alzavoz.pages.dev.
- Workers Builds disparado por el mismo push: build `51b32eb0-3798-40d7-bf46-abb01c64eac8`, éxito de instalación y despliegue; versión `69b86df2-7cec-4ecd-a5d5-7a6b42672e7e`. Se usó la integración GitHub y token de Builds existentes; previews desactivados.
- GET /, /record, /sos, /defender, manifest e imágenes: HTTP 200. MCP escritorio 1365×900 y móvil 390×844 sin desbordamiento. Captura: docs/evidencias/produccion-main.png.
- MCP en HTTPS: video/audio sintéticos generados por canvas y oscilador (sin cámara ni micrófono físicos); dos clips recibidos, cero pendientes, reproducción 320×240 y recuperación de dos clips tras limpiar sessionStorage/recargar.
- Clip inicial: 33958 bytes, SHA-256 `0fbe97ea5ca654cdf442bc994f16ac6ab3a049ec009c29452545a1771db92ce3`. Coinciden recibo, descarga por la API y descarga independiente vía Wrangler del bucket remoto de producción. Sesión sintética `d6dbc0e6-ebae-459c-8b7f-6cc62891aec1`; clave nunca registrada.
- Reintento idéntico 200, lectura sin clave 401, escritura sin cabecera cliente 403; respuestas de clips no-store. Defensor 200 con fuente local-instant; consulta vacía 400. Los errores de red observados en esas peticiones negativas son esperados.
- DeepSeek sin clave configurada usa el fallback local existente; D1/Firebase y tareas futuras no se presentan como implementados. La interfaz conserva los límites de T5; T10 y matriz de dispositivos reales siguen pendientes.
