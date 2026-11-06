# Grabación continua y descarga única

## Alcance y decisión

El usuario solicita eliminar los cortes periódicos de las grabaciones nuevas y descargar toda la sesión en un archivo. La causa actual es detener y crear otro MediaRecorder cada tres segundos. La reproducción seguida anterior no puede eliminar esos cortes.

Se usará una sola instancia `MediaRecorder.start(3000)`. Cada evento entrega bytes del mismo WebM sin detener el capturador. Los fragmentos se envían y verifican con la infraestructura privada existente. Para reproducir o descargar se reúnen en orden los bytes verificados, sin recodificar. El formato seguirá siendo WebM, compatible con los navegadores ya admitidos por la app. No se añade una dependencia multimedia pesada.

La alternativa de esperar hasta el final para subir un archivo único pierde todo ante un cierre; no satisface la recuperación existente. La unión de archivos antiguos independientes requiere remultiplexarlos y no puede restaurar huecos: esas sesiones conservan su reproductor anterior.

## Contratos y límites

- Sesión nueva: cabecera de creación `x-recording-format: continuous-webm-v1`; formato persistente. Ausencia identifica sesiones antiguas y permite desplegar frontend/backend por separado.
- `RecordingCompletion = { clipCount: number }`; `RecordingSession` añade `format?` y `completion?`. Recuperación conserva esos valores.
- `POST /sessions/:id/complete`, autenticado y con cuerpo limitado, confirma el número final después de recibir todos los fragmentos. Valida índices contiguos desde cero, un solo MIME, tiempos contiguos y tamaño total. Reintentos son idempotentes; no reemplaza contenido previo.
- Continúan 2 MiB por envío, 100 fragmentos y 16 MiB pendientes. Archivo total máximo 64 MiB. Un evento grande se divide en envíos de bytes contiguos; no se reinicia el grabador. Se reserva espacio para el evento final.
- Sin cierre confirmado se identifica como parte recuperada, nunca completa. Si faltan fragmentos intermedios o falla la integridad, no se genera un archivo engañosamente completo.
- Cerrar/bloquear el navegador o perder permisos puede interrumpir la captura. Esta mejora elimina reinicios programados, no restricciones del dispositivo.

## Ejecución

1. Prueba RED: captura sintética durante más de seis segundos, una sola construcción e inicio y cero paradas antes de detener. Pruebas API de formato, continuación y cierre.
2. Contratos, proxy y Worker: negociación de formato, validación de fragmentos, cierre persistente. Mantener autorización, integridad, límites y compatibilidad legacy.
3. Capturador y cliente: captura continua, cola existente, cierre/reintento; ensamblado verificado cancelable con memoria limitada.
4. Interfaz: un reproductor continuo y descarga única. Lista de envíos en detalle; conservar interfaz anterior para sesiones legacy. Diferenciar completo, pendiente e incompleto.
5. Pruebas reales con medios sintéticos: audio/video, duración que cruza 3 y 6 segundos, descarga y reproducción del archivo, recuperación en otra pestaña, pausa, red y errores. Revisar timestamps del medio cuando sea posible.
6. Lint, tipos, build Pages, suite completa y revisión. Commit/push exclusivamente de archivos del cambio en main. Verificar Pages y Workers Builds, luego una prueba sintética de producción.

## Referencias

- [W3C MediaStream Recording: data handling](https://www.w3.org/TR/mediastream-recording/#data-handling): los fragmentos de una misma captura terminada pueden reunirse para reproducirla.
- [MDN MediaRecorder.start](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/start): timeslice entrega partes sin reiniciar; el intervalo real no es exacto.

## Validación de la implementación

La prueba inicial observó tres instancias y dos paradas antes de pulsar Detener, y falló como se esperaba. Las cuatro nuevas pruebas API también fallaron antes de implementar formato y cierre.

Versión final: lint, TypeScript y build Pages aprobados. La suite completa `PLAYWRIGHT_PAGES=1 pnpm test` pasó **70/70 en 2,4 minutos**. Incluye audio/video con una sola instancia y sin stop previo al botón, recuperación, pausa, descarga del WebM real y reproducción independiente; corrupción de una parte impide exportar. Cubre reintento del cierre, sesiones antiguas, permisos, red, evento mayor de 2 MiB, evento final vacío, reserva de cola y parte 100. Revisión independiente sin hallazgos bloqueantes.

Los WebM descargados de la app se decodificaron enteros con el FFmpeg existente. Audio: 6,420 s, 107 paquetes Opus sin huecos. Video: audio 6,360 s, 128 cuadros VP8 hasta 6,404 s; separación máxima de cuadros 64 ms frente a 50 ms nominales. Timestamps originales monótonos en ambas pistas y sin reinicios a 3 o 6 segundos. Esto elimina los cortes programados; no promete que un dispositivo nunca pierda cuadros o suspenda su captura.

Evidencia local en `output/playwright/continuous-{audio,video}.{webm,png,analysis.json}`. Son medios sintéticos, no Android físico. El WebM de MediaRecorder puede carecer de duración declarada: Chromium informa Infinity inicialmente y calcula la duración al terminar. La prueba de plataforma pudo buscar a 5 s antes de reproducir y ambos archivos finales se reprodujeron completos; no se alteraron bytes para añadir metadatos.
