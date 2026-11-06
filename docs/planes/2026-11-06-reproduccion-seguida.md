# Reproducción seguida de una grabación

El ensayo Android confirmó captura con imagen y sonido y recuperación con la clave. El usuario señaló que escuchar o ver cada clip de tres segundos por separado resulta incómodo. Solicitó reproducirlos seguidos o unirlos.

## Decisión

Añadir «Reproducir toda la grabación» para recorrer los clips recibidos en orden. Conservar la reproducción y descarga individuales. Cada archivo seguirá almacenado y verificado por separado: el capturador crea un WebM independiente por segmento, por lo que concatenar sus bytes no produce un archivo multimedia único fiable.

El reproductor avanza al terminar cada clip y prepara el siguiente con memoria acotada. Debe conservar la pausa del usuario, permitir detener la secuencia y mostrar qué clip se reproduce. Si falta un clip o falla su descarga, debe decirlo. Esta mejora no recupera pausas ni datos que no se capturaron.

## Ejecución y validación

1. Pruebas de audio y video reales con medios sintéticos, recuperación y avance natural al terminar. Confirmar fallo antes del cambio.
2. Implementar la cola en la interfaz de grabación, reutilizando la descarga privada y la verificación de integridad. Cancelar solicitudes y liberar recursos al cambiar de selección, reiniciar o salir.
3. Comprobar pausa, sustitución de una selección, errores de descarga y reproducción individual. Ejecutar lint, tipos, build de Pages y suite completa.
4. Enviar cambios verificados a `main`, verificar Pages y Workers Builds y revisar la interfaz publicada. Repetir en el Android del usuario con una grabación ya recibida.

La reproducción programática puede requerir una nueva interacción según el navegador. Se manejará el rechazo de `play()` y se mantendrán los controles de reproducción. Referencias de plataforma: [HTMLMediaElement.play](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play) y [evento ended](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended_event).

## Resultado de validación

Cuatro pruebas nuevas fallaron por ausencia del botón antes de implementar. Después comprobaron avance real de audio y video, pausa, recuperación, fallo del siguiente clip y cancelación de una descarga tardía. La revisión visual motivó centrar el reproductor al iniciar, para mantener los controles por encima de la barra fija en móvil.

La primera suite completa tuvo 55 aprobadas y un fallo en una prueba previa: `url.replace('/0', '/1')` podía cambiar el UUID de una sesión que empezara por cero, en vez del índice del clip. Se corrigió la construcción de la URL de prueba, conservando las verificaciones de autenticación, formato y tamaño. No requirió cambios de backend.

Versión final: `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm build:pages` aprobados. `PLAYWRIGHT_PAGES=1 pnpm test`: **56/56 aprobadas en 1,9 minutos**. Medios sintéticos y R2 local. El ensayo de reproducción consecutiva en el Android físico queda pendiente; el usuario ya había confirmado captura, sonido y recuperación individual.
