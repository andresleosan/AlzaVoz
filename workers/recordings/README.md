# Evidencias T5: prueba aislada

## Publicación solicitada después de T5

La web `https://alzavoz.pages.dev` se construye con `pnpm build:pages` (HTML en `out` + Pages Functions). El binding privado `RECORDINGS` conecta con `alzavoz-recordings`, sin endpoint público, y su bucket `alzavoz-evidencias` separado de pruebas. Conserva expiración de siete días y los límites existentes; la publicación de lo implementado no completa T10 ni la validación de dispositivos físicos.

Un push a `main` activa Pages y Workers Builds. El backend usa `pnpm deploy:recordings` y `wrangler.production.jsonc`; la web usa `wrangler.jsonc`. No crear ramas para publicar. Ambos despliegues deben terminar correctamente. Los secretos `RECORDING_GATEWAY_SECRET` (Pages) y `GATEWAY_SECRET` (Worker) se guardan cifrados en Cloudflare, no en el repositorio. No configurar `RECORDING_API_URL` en producción: se usa el service binding.

Para comprobar el alojamiento de Pages localmente: `pnpm build:pages`, luego `PLAYWRIGHT_PAGES=1 pnpm test` (en PowerShell: `$env:PLAYWRIGHT_PAGES='1'; pnpm test`). El runner usa solo el bucket local de pruebas.

## Pruebas y contrato de grabación

`pnpm build` y `node scripts/recording-test-server.mjs` arrancan Next en 127.0.0.1:3000 y el Worker con R2 **local** en 8787. El secreto de pasarela es aleatorio por ejecución, no se imprime ni se guarda. `pnpm test` arranca y detiene este mismo conjunto; los puertos deben estar libres. No reutiliza servidores a menos que se indique `PLAYWRIGHT_REUSE_SERVER=1` conscientemente.

Para probar contra el bucket **remoto** privado `alzavoz-evidencias-pruebas`, con Wrangler autenticado: `node scripts/recording-test-server.mjs --remote`. Usa una sesión temporal de preview de Workers, no publica la aplicación. El bucket fue creado para T5 y tiene la regla `borrar-pruebas` para expirar `recordings/` después de siete días. Solo usar medios sintéticos. No contiene datos de otros proyectos.

Configuración de una pasarela independiente (variables exclusivamente de servidor, nunca `NEXT_PUBLIC_`):

- `RECORDING_APP_ORIGIN`: origen exacto de la interfaz, por ejemplo `http://127.0.0.1:3000`.
- `RECORDING_API_URL`: origen del Worker; HTTPS salvo loopback local.
- `RECORDING_GATEWAY_SECRET`: secreto aleatorio de al menos 32 caracteres, idéntico al binding secreto `GATEWAY_SECRET` del Worker.

Sin configuración, la API devuelve 503 y no inicia captura. El Worker no habilita CORS; todas las peticiones requieren el secreto de pasarela. Una sesión ciudadana devuelve UUID y capacidad de 256 bits, cuyo hash se almacena en R2. El secreto viaja en Authorization, nunca en URLs. El listado, la descarga y la subida exigen esa capacidad. La clave copiada permite recuperar después de cerrar; sessionStorage solo ayuda al recargar. El acceso caduca a siete días y las subidas a una hora. No hay cuenta ni recuperación de una clave perdida.

Cada parte ocupa un objeto R2 con recibo en customMetadata; PUT condicional impide sobrescrituras y permite reintentos idénticos. Las sesiones nuevas solicitan `x-recording-format: continuous-webm-v1` y conservan ese formato en R2. La cabecera EBML se exige en la primera parte; las continuaciones requieren el mismo MIME, orden y tiempos contiguos. Sin la cabecera de formato se conserva el contrato antiguo de archivos independientes, con EBML en cada clip. Esto no constituye una inspección profunda de codecs (T46). Descargas no-store, attachment y nosniff; el navegador verifica SHA-256 de cada parte antes de crear el archivo. SHA-256 detecta diferencia de bytes, no autentica lo que ocurrió en una escena.

Límites: 100 partes, 2 MiB por envío, 16 MiB pendientes en RAM y 64 MiB por grabación continua. Una sola instancia de MediaRecorder entrega datos aproximadamente cada tres segundos sin reiniciar el codificador. Un evento mayor se divide en envíos de bytes contiguos; se reserva espacio para el evento final. Inicio/fin son tiempos observados por el cliente, no certificación de duración ni cronología forense. Superar memoria o capacidad detiene la captura y señala la parte no conservada. No se elimina evidencia recibida para liberar memoria; se libera su copia RAM tras verificar el recibo. Cerrar o bloquear el dispositivo puede interrumpir la captura y perder pendientes.

Después de `onstop` y de recibir todas las partes, `POST /sessions/:id/complete` con `{clipCount}` registra un cierre inmutable, autenticado y reintentable. Valida índices desde cero, tiempos/MIME y tamaño total. La recuperación devuelve `format` y `completion`. El cliente exige todos los recibos esperados y verifica cada archivo antes de reunir los bytes en un único WebM reproducible/descargable. R2 no ofrece una transacción entre objetos: se comprueba el total otra vez al exportar, para no llamar completa a una lista modificada concurrentemente. Sin cierre se ofrece explícitamente una parte recuperada, cuya reproducción puede depender del dispositivo. Las sesiones antiguas mantienen reproducción individual y secuencial, sin concatenar WebM independientes.

El binding SESSION_LIMITER admite hasta 30 creaciones/minuto por ubicación Cloudflare, usando una clave global que no retiene IPs. Es un límite de prueba, no una cuota global exacta. Antes de T10 se deben definir capacidad y límites distribuidos del servicio, política de retención de producción, dominio/origen final, secretos administrados, adaptador de Next para Cloudflare y matriz de dispositivos físicos. T5 no despliega ni certifica esas condiciones.

Matriz comprobable de T5: Chromium con cámara/micrófono sintéticos, WebM VP8/Opus y Opus, viewport Pixel 5 y escritorio. iOS/Safari, llamadas entrantes, pantalla bloqueada y dispositivos reales requieren las pruebas de T101; no se promete captura en segundo plano.
