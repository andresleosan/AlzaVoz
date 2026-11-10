# PLAN MAESTRO DE TAREAS: ALZAVOZ & ALZA BOT (MEDELLÍN)
## Plan de desarrollo y mejoras aprobadas (111 tareas)

**Estado al incorporar el catálogo:** 111 tareas numeradas T0–T110: 5 completadas y 106 pendientes. T0–T4 conservan su estado y evidencia histórica; las 100 ideas se incorporan como T11–T110, una por idea, sin declarar implementación ni pruebas nuevas.

## Contrato común de planificación y ejecución

- Antes de implementar cada tarea pendiente, usar PLANIFICACION.md y DESIGN.md; leer el contexto y dependencias pertinentes y redactar su plan específico en la ruta del campo **Plan**. Las rutas son destinos previstos: no afirman que el archivo ya exista ni que el plan esté aprobado.
- Aplicar el pipeline de /avanzar: brainstorming, writing-plans y grill-me/grilling para elaborar y auditar el plan; skills de diseño pertinentes a la superficie y al alcance, seguridad por archivo, pulido anti-slop/web-performance-optimization/ponytail y verificación final con Superpowers y MCP Playwright. La resolución de nombres y reglas detalladas vive en PLANIFICACION.md y la skill; una plantilla genérica no sustituye el plan específico revisado.
- Cada plan define entregables, límites, cambios previstos, riesgos, datos y permisos, pruebas observables y orden de pasos. Las prioridades originales Esencial/Después/Explorar se conservan como contexto; todas las ideas están incorporadas al plan. En propuestas exploratorias, concretar investigación, prototipo y decisión verificable antes de ampliar la construcción.
- Ejecutar la **primera tarea pendiente elegible** por número: aquella cuyas dependencias explícitas estén completadas. Las dependencias expresan capacidades necesarias, no todas las relaciones temáticas del catálogo. Registrar bloqueos reales sin saltar silenciosamente a otra tarea.
- Implementar y comprobar en local o en entornos de preview aislados con datos de prueba. La publicación final de producción es **T10**, elegible únicamente tras completar T5–T9 y T11–T110; ninguna otra tarea depende de T10. Preparar infraestructura de prueba no significa publicar el producto final.
- Los criterios son condiciones por verificar, no garantías. No presentar anonimato, certificación acústica, continuidad de captura al cerrar el navegador ni ausencia absoluta de vulnerabilidades como capacidades demostradas. Registrar límites y resultados realmente observados.
- Marcar [x] solo con criterios satisfechos y verificación registrada. Las pruebas citadas en T0–T4 son históricas: ampliar este plan no las vuelve a ejecutar. Actualizar memoria y seguimiento según el proceso de cierre; las pruebas no autorizan mensajes ni denuncias reales a terceros.

---

## Índice compacto de tareas y dependencias

Consultar este índice y las casillas de los encabezados para seleccionar la primera pendiente elegible sin cargar todos los detalles o planes. El estado vigente está en cada encabezado; al cambiar dependencias, mantener este índice coherente con el campo de la tarea.

| Tarea | Nombre | Dependencias |
| --- | --- | --- |
| T0 | Cimentación Estratégica, Guía de Diseño y Pipeline de Automatización | Ninguna |
| T1 | Setup del Proyecto Next.js, Cloudflare, PWA y Organización de Assets | Ninguna |
| T2 | Arquitectura del Sistema de Diseño "UX Bajo Estrés" y Avatar Dinámico de Alza Bot | Ninguna |
| T3 | Bloque 1 (Parte A): Botón SOS Inteligente de Emergencia y Alerta Rápida | Ninguna |
| T4 | Bloque 1 (Parte B): Alza Bot Defensor Legal en Vivo y Choques "Solo Latas" | Ninguna |
| T5 | Bloque 1 (Parte C): Caja Negra de Grabación en la Nube y Enlace Cloudflare R2 | T1, T2 |
| T6 | Bloque 2: Denuncia Confidencial y Enlace Cloudflare D1 | T5 |
| T7 | Bloque 3: Convivencia y Alerta Barrial (Sonómetro Web) | T1, T2 |
| T8 | Bloque 4: Tableros de Búsqueda y Afiches con QR en Canvas | T6 |
| T9 | Bloque 5: Panel Privado de Gestión y Enlace Firebase Auth | T5, T6 |
| T10 | Publicación Final en Cloudflare, CI/CD y Validación Integral | T5, T6, T7, T8, T9, T11, T12, T13, T14, T15, T16, T17, T18, T19, T20, T21, T22, T23, T24, T25, T26, T27, T28, T29, T30, T31, T32, T33, T34, T35, T36, T37, T38, T39, T40, T41, T42, T43, T44, T45, T46, T47, T48, T49, T50, T51, T52, T53, T54, T55, T56, T57, T58, T59, T60, T61, T62, T63, T64, T65, T66, T67, T68, T69, T70, T71, T72, T73, T74, T75, T76, T77, T78, T79, T80, T81, T82, T83, T84, T85, T86, T87, T88, T89, T90, T91, T92, T93, T94, T95, T96, T97, T98, T99, T100, T101, T102, T103, T104, T105, T106, T107, T108, T109, T110 |
| T11 | Contacto en condiciones seguras | T6, T9 |
| T12 | Vista previa de lo que se comparte | T3, T6 |
| T13 | Cámara y micrófono siempre visibles | T5 |
| T14 | Modo de práctica sin envíos | T3, T6 |
| T15 | Sesión en dispositivo compartido | T6 |
| T16 | Límites claros de la salida rápida | T2, T6 |
| T17 | Ubicación con edad y precisión | T3 |
| T18 | Comprobación previa del dispositivo | T3, T5 |
| T19 | Revisar acciones difíciles de deshacer | T5, T8 |
| T20 | Lectura voluntaria de indicaciones | T4 |
| T21 | Recorrido completo con lector de pantalla | T2, T3, T6 |
| T22 | Texto grande sin perder acciones | T2 |
| T23 | Movimiento y vibración a elección | T2 |
| T24 | Controles para mano izquierda | T2 |
| T25 | Alternativas cuando no se puede hablar | T3, T6 |
| T26 | Teclado y controles de apoyo | T2, T6 |
| T27 | Lectura a plena luz | T2 |
| T28 | Traducción a lenguaje sencillo | T4, T6 |
| T29 | Idiomas con revisión humana | T2 |
| T30 | Errores que ayudan a continuar | T6, T8, T9 |
| T31 | Capturado, pendiente y confirmado | T5, T6 |
| T32 | Bandeja de reintentos sin duplicados | T31 |
| T33 | Borradores guardados por elección | T6 |
| T34 | Disponibilidad real antes de enviar | T1, T6 |
| T35 | Espacio disponible para pendientes | T32 |
| T36 | Captura de bajo consumo de datos | T5 |
| T37 | Recuperación al volver a abrir | T32, T33 |
| T38 | Actualizar sin cortar una operación | T1, T32 |
| T39 | Alternativa cuando una función no existe | T3, T5, T7 |
| T40 | Guías básicas disponibles sin señal | T1, T4 |
| T41 | Paquete de evidencia con manifiesto | T5, T6 |
| T42 | Cronología de grabación y huecos | T5, T31 |
| T43 | Ocultar rostros y placas en una copia | T49 |
| T44 | Notas junto a cada archivo | T5, T6 |
| T45 | Detección de archivos repetidos | T5, T6 |
| T46 | Validación real de archivos recibidos | T5, T6 |
| T47 | Enlaces compartidos que se puedan revocar | T93 |
| T48 | Visor que empieza con una vista ligera | T9, T46 |
| T49 | Conservar el original y sus derivados | T5, T6 |
| T50 | Subtítulos revisables para audios | T5, T49 |
| T51 | Separar expediente y ficha pública | T6, T8 |
| T52 | Retención explicada por tipo de dato | T5, T6, T9 |
| T53 | Seguimiento de solicitudes de eliminación | T52 |
| T54 | Cachés que excluyen información privada | T1, T6, T9 |
| T55 | Registros técnicos sin datos del caso | T9 |
| T56 | Decisiones de uso de datos por separado | T6, T8 |
| T57 | Permisos del dispositivo a la vista | T3, T5 |
| T58 | Mapas con umbrales de publicación | T7 |
| T59 | Medición de uso con datos mínimos | T6, T55 |
| T60 | Controles de retención en copias de respaldo | T52, T103 |
| T61 | Buzón privado con código y secreto | T6 |
| T62 | Cronología ciudadana del expediente | T9, T61 |
| T63 | Añadir información a un caso existente | T61 |
| T64 | Corregir datos con historial | T61 |
| T65 | Pedir revisión de un cierre | T70 |
| T66 | Lista clara de información pendiente | T9, T61 |
| T67 | Preguntas y respuestas dentro del caso | T9, T61 |
| T68 | Preferencias de notificación por evento | T11, T62 |
| T69 | Acceso delegado y revocable | T61, T93 |
| T70 | Cierre explicado con próximos pasos | T9, T62 |
| T71 | Caducidad y cierre de avisos públicos | T8 |
| T72 | Reportar publicaciones dañinas | T8 |
| T73 | Estado de verificación visible | T8, T97 |
| T74 | Directorio de organizaciones de apoyo | T2 |
| T75 | Suscripciones por tema y comuna | T7, T11, T71 |
| T76 | Revisión especial de publicaciones sensibles | T51, T97 |
| T77 | Revisión humana de posibles coincidencias | T8, T97 |
| T78 | Unir avisos duplicados sin perder aportes | T7, T8 |
| T79 | Contacto mediado con quien aporta una pista | T61, T72 |
| T80 | Correcciones visibles en el mapa comunitario | T7, T73 |
| T81 | Fuentes y fecha junto a las respuestas | T4 |
| T82 | Reconocer incertidumbre y derivar | T4, T81 |
| T83 | Enviar a la IA solo lo necesario | T4, T6 |
| T84 | Contenido con responsable y revisión | T81 |
| T85 | Respuesta básica durante una caída de IA | T4, T40 |
| T86 | Reportar una respuesta problemática | T4, T9 |
| T87 | Banco de casos para evaluar cambios | T81, T82 |
| T88 | Versiones trazables de modelo e instrucciones | T4, T9 |
| T89 | Documentos generados con revisión previa | T9, T81 |
| T90 | Preguntas contextuales de alto valor | T4, T6 |
| T91 | Responsable y reemplazo por expediente | T9 |
| T92 | Casos sin movimiento a la vista | T91 |
| T93 | Permisos por caso y acción | T9 |
| T94 | Protección adicional para acciones sensibles | T9, T93 |
| T95 | Registro de acceso a evidencias | T9, T55, T93 |
| T96 | Traspaso de turno con contexto mínimo | T9, T91 |
| T97 | Bandeja dedicada a moderación | T9, T72 |
| T98 | Formación con expedientes ficticios | T9 |
| T99 | Respuesta ante incidentes definida | T9 |
| T100 | Gestión de carga del equipo | T91, T92 |
| T101 | Pruebas en móviles con interrupciones reales | T5, T32, T37 |
| T102 | Estado público del servicio | T34 |
| T103 | Restauraciones de respaldo ensayadas | T9 |
| T104 | Avisos de capacidad y consumo | T5, T32, T35 |
| T105 | Cambios reversibles en producción | T1, T38 |
| T106 | Pruebas de uso con situaciones representativas | T2, T3, T6 |
| T107 | Presupuesto de rendimiento por pantalla | T2, T101 |
| T108 | Inventario de dependencias y mantenimiento | T1 |
| T109 | Verificaciones de salud con datos sintéticos | T5, T6, T102 |
| T110 | Tablero de utilidad y abandono | T59 |

---

### [x] Tarea 0: Cimentación Estratégica, Guía de Diseño y Pipeline de Automatización
- **Descripción:** Inspección exhaustiva de imágenes en raíz, elaboración de `DESIGN.md` con lineamientos "UX Bajo Estrés", plan de 10 tareas en `TASKS.md`, memoria operativa compacta `MEMORY.md`, workflow del comando `/avanzar` y commit fundacional.
- **Estado:** Completada.

---

### [x] Tarea 1: Setup del Proyecto Next.js, Cloudflare, PWA y Organización de Assets
- **Descripción:** Inicialización de Next.js (App Router), TypeScript estricto (`noImplicitAny`), Tailwind CSS v4 con PostCSS y pnpm. Configuración de Cloudflare (`wrangler.jsonc`). Organización canónica de activos visuales de Alza Bot en `public/assets/` y PWA (`manifest.json`, favicons, iconos). Suite de pruebas de humo E2E con Playwright ejecutada exitosamente.
- **Estado:** Completada.

---

### [x] Tarea 2: Arquitectura del Sistema de Diseño "UX Bajo Estrés" y Avatar Dinámico de Alza Bot
- **Descripción:** Shell de la aplicación Mobile-First con navegación ergonómica inferior fija al alcance del pulgar (`BottomNav` con botones táctiles >= 56px cumpliendo Fitts' Law). Componente `<AlzaBotAvatar />` que reacciona de forma dinámica a los 4 modos visuales (Estándar/Cian, Defensor/Rojo, Violeta/Púrpura y Radar/Esmeralda) con auras de respiración, indicadores en vivo y micro-interacciones. Botones de Salida Rápida de Pánico (Escape) y conmutador de privacidad antiespía ("Zero-Peeping" desenfocando datos sensibles). 6 pruebas E2E en Playwright aprobadas al 100%.
- **Estado:** Completada.

---

### [x] Tarea 3: Bloque 1 (Parte A): Botón SOS Inteligente de Emergencia y Alerta Rápida
- **Objetivo:** Construir el módulo de pánico inteligente con lectura GPS en vivo y geocodificación inversa para Medellín (mostrando barrio y dirección exacta en tipografía gigante para lectura rápida al 123). Implementar marcación directa de emergencia (Policía 123, Ambulancia, Bomberos, Tránsito, Línea Púrpura), gestión de contactos de confianza en `localStorage` y botón de alerta silenciosa por WhatsApp (+57 3234306794) con enlace de localización.
- **Criterios de Éxito:** Detección precisa de ubicación, marcado telefónico sin latencia y despacho de mensaje de auxilio en WhatsApp a contactos guardados.
- **Estado:** Completada. Implementado módulo SOS con lectura de dirección gigante en alta legibilidad, selector offline de las 16 comunas de Medellín, 5 marcadores telefónicos (Fitts' Law >= 56px), gestor de contactos de confianza y alerta silenciosa a WhatsApp. 12 pruebas E2E aprobadas en Playwright.

---

### [x] Tarea 4: Bloque 1 (Parte B): Alza Bot Defensor Legal en Vivo y Choques "Solo Latas"
- **Objetivo:** Implementar la interfaz y lógica del Defensor en Vivo asistido por DeepSeek API especializado en legislación colombiana (Ley 769 de 2002, Ley 1801 de 2016 y Ley 2251 de 2022). Respuestas estructuradas en 3 secciones: 1) Cita de norma exacta, 2) Guion respetuoso y firme para leer al agente, 3) Checklist de pruebas a grabar. Integrar el asistente interactivo de choques simples con captura fotográfica guiada y generación de acta rápida de conciliación.
- **Criterios de Éxito:** Respuestas jurídicas precisas en menos de 3 segundos, estructura de 3 bloques respetada y flujo guiado de choques completable en carretera.
- **Estado:** Completada. Implementado panel del Defensor Legal en Vivo (`/defender` y `#defensor-reten`) con presets rápidos y búsqueda asistida (Ley 769, 1801 y 2251), estructura rígida de 3 bloques (Norma, Guion y Checklist de grabación) y asistente interactivo de choques 'Solo Latas' con captura de 4 fotos y generación instantánea de acta de retiro para aseguradoras. 18 pruebas E2E aprobadas en Playwright al 100%.

---

### [x] Tarea 5: Bloque 1 (Parte C): Caja Negra de Grabación en la Nube y Enlace Cloudflare R2 [Modelo: GPT-6-Astra | Esfuerzo: High]
- **Área:** Emergencias
- **Objetivo:** Desarrollar grabación de video y audio con MediaRecorder, solicitando fragmentos aproximadamente cada 3 segundos y midiendo sus tiempos reales. Enlazar R2 mediante endpoints con autorización adecuada al flujo ciudadano. Conservar y recuperar fragmentos cuya recepción confirme el servidor; comunicar pérdidas, interrupciones y límites del navegador sin prometer captura después de cerrar la pestaña o apagar el dispositivo.
- **Dependencias:** T1, T2
- **Criterios de Éxito:** En los formatos y dispositivos definidos, iniciar y detener produce archivos reproducibles; los fragmentos confirmados se recuperan de R2 con permisos correctos; cierre abrupto, desconexión y permisos denegados no muestran como guardados datos sin recibo.
- **Verificación requerida:** Probar captura, subida, reproducción, fallos simulados y cierre de pestaña; contrastar archivos recibidos y recibos del servidor, sin afirmar continuidad tras el cierre.
- **Plan y evidencia:** docs/planes/T005.md y docs/evidencias/T005/verificacion.md.
- **Estado:** Completada en entorno de prueba. /record captura audio/video WebM en clips independientes (~3 s), registra tiempos y pausas, confirma recibos SHA-256 y recupera mediante clave privada. 35 pruebas aprobadas; MCP móvil/escritorio y R2 remoto privado con hash contrastado por CLI. Pendientes solo en RAM; cierre puede perderlos. Chromium sintético verificado; hardware real e iOS pendientes de T101. No es despliegue final.

---

### [x] Tarea 6: Bloque 2: Denuncia Confidencial y Enlace Cloudflare D1 [Modelo: GPT-6-Astra | Esfuerzo: High]
- **Área:** Denuncias
- **Objetivo:** Construir expedientes en D1 con protección desde el cliente: retirar metadatos identificables definidos para formatos admitidos, transformar opcionalmente la voz y vincular evidencias R2. Ofrecer salida rápida y elección informada entre compartir por WhatsApp o usar el backend. Definir modelo de privacidad, datos observables por cada servicio y límites reales antes de describir el flujo como anónimo o zero-knowledge.
- **Dependencias:** T5
- **Criterios de Éxito:** Los archivos de prueba admitidos pasan la inspección de metadatos acordada y los no soportados se rechazan o explican; la transformación de voz es perceptible sin prometer impedir identificación; los casos reciben códigos únicos; la salida informa qué limpia y qué puede permanecer; cada canal explica qué comparte.
- **Verificación requerida:** Inspeccionar archivos, payloads y almacenamiento; probar radicación, reintento, permisos y salida con servicios simulados, sin enviar denuncias ni mensajes reales.
- **Plan y evidencia:** docs/planes/T006.md y docs/evidencias/T006/verificacion.md.
- **Estado:** Completada. /report en modo Escudo Violeta limpia metadatos identificables (EXIF/GPS/XMP/IPTC/COM/tEXt/LIST-INFO) en cliente y los verifica en el Worker antes de escribir en R2, aplica transformación opcional de voz con Web Audio API advirtiendo sus límites reales, vincula sesiones R2 de /record sin guardar su secreto en D1, radica expedientes con códigos únicos no secuenciales ALZ-YYYY-XXXXXX en Cloudflare D1 (`alzavoz-db-pruebas` y `alzavoz-db`), detalla qué limpia y qué puede permanecer en Salida Rápida y explica qué datos comparte y observa cada canal (D1/R2 vs WhatsApp). 74 pruebas E2E aprobadas en Next y Pages; D1 y R2 remotos verificados con hash SHA-256 contrastado por CLI.

---

### [x] Tarea 7: Bloque 3: Convivencia y Alerta Barrial (Sonómetro Web) [Modelo: GPT-6-Astra | Esfuerzo: Medium]
- **Área:** Comunidad
- **Objetivo:** Implementar observación acústica durante 15 segundos con Web Audio API, mostrando método, limitaciones y datos de captura. Investigar calibración y comparación antes de atribuir decibelios absolutos o certificación. Incorporar fecha y ubicación barrial elegida o confirmada y agrupar reportes por zonas y categorías, sin publicar ubicaciones individuales.
- **Dependencias:** T1, T2
- **Criterios de Éxito:** La captura inicia y termina con permiso y explica qué representa la lectura; ausencia de micrófono o calibración tiene un estado claro; reportes sintéticos se agregan por zona y categoría sin exponer coordenadas individuales; el mapa funciona en móvil.
- **Verificación requerida:** Probar señales conocidas, dispositivos del alcance, permisos y temporización; verificar consultas y agregados con datos sintéticos y documentar límites de medición.
- **Plan y evidencia:** docs/planes/T007.md y docs/evidencias/T007/verificacion.md.
- **Estado:** Completada. /community observa 15 s con AudioWorklet, informa RMS en dBFS sin calibración acústica, descarta audio y libera micrófono ante interrupciones. Envío voluntario de comuna/categoría/día con UUID idempotente a D1; mapa SVG y tabla de agregados de 30 días sin datos individuales. 88/88 pruebas Next y Pages; repetición 14/14 de T7 en ambos modos tras optimizar avatar, MCP móvil/escritorio y señales sintéticas. No certifica presión sonora ni infracciones.

---

### [x] Tarea 8: Bloque 4: Tableros de Búsqueda y Afiches con QR en Canvas [Modelo: GPT-6-Astra | Esfuerzo: Medium]
- **Área:** Comunidad
- **Objetivo:** Desarrollar cuatro tableros de personas y mascotas perdidas o encontradas con publicación limitada a datos autorizados. Incorporar sugerencias de coincidencia de DeepSeek como hipótesis y generar afiches descargables con QR al aviso. Recibir pistas sin exigir publicación de identidad y explicar datos tratados y límites del canal.
- **Dependencias:** T6
- **Criterios de Éxito:** Los cuatro tipos de aviso se crean y consultan con datos de prueba; el afiche descargado contiene un QR al aviso correcto; una pista se asocia al caso sin exponer campos privados en respuestas públicas; las coincidencias se etiquetan como sugerencias, no identificaciones confirmadas.
- **Verificación requerida:** E2E de creación, consulta, descarga, lectura de QR y aportación de pistas; probar casos no coincidentes y aislamiento de campos privados.
- **Plan:** docs/planes/T008.md.
- **Estado:** Completada: cuatro tableros persistentes D1, pistas privadas, sugerencias DeepSeek como hipótesis y afiche Canvas con QR decodificado. Verificación final: lint/tsc/build/build:pages; 100/100 E2E en Next y Pages, MCP móvil/escritorio. Evidencia: docs/evidencias/T008/verificacion.md.

---

### [x] Tarea 9: Bloque 5: Panel Privado de Gestión y Enlace Firebase Auth [Modelo: GPT-6-Astra | Esfuerzo: High]
- **Área:** Administración
- **Objetivo:** Construir el panel del equipo autorizado con Firebase Auth y validación de tokens en servicios. Incluir gestión de casos D1, filtros, acceso controlado a evidencias R2, estados y borradores de documentos con IA. Exigir revisión humana de datos y contenido antes de presentar un documento como final o enviarlo.
- **Dependencias:** T5, T6
- **Criterios de Éxito:** Sin sesión válida se deniega acceso en interfaz y servidor; casos y archivos se limitan al alcance autorizado; filtros y estados conservan consistencia; los borradores señalan pendientes y no se envían automáticamente.
- **Verificación requerida:** Probar tokens ausentes, inválidos o expirados, objetos ajenos, filtros, edición y borradores sintéticos; verificar llamadas directas a endpoints.
- **Plan:** docs/planes/T009.md
- **Estado:** Completada: panel /admin con validación RS256 de Firebase Auth, gestión de expedientes D1 con filtros y actualización de estados, visor y descarga segura de evidencias R2, y generador de Derechos de Petición/Oficios con IA (DeepSeek) y revisión humana obligatoria. Verificación: lint, tsc, build, build:pages exit 0; 5/5 pruebas E2E admin en Next y Pages. Evidencia: docs/evidencias/T009/verificacion.md.

---

### [ ] Tarea 10: Publicación Final en Cloudflare, CI/CD y Validación Integral [Modelo: GPT-6-Astra | Esfuerzo: High]
- **Área:** Publicación
- **Objetivo:** Publicar la versión final tras completar el plan y verificarla en preview. Confirmar una arquitectura compatible con las capacidades usadas sin asumir que exportación estática y endpoints de servidor son intercambiables. Integrar CI/CD, controles de entrada y autorización, límites de uso y protección de IA frente a instrucciones no confiables; documentar riesgos residuales y recuperación.
- **Dependencias:** T5, T6, T7, T8, T9, T11, T12, T13, T14, T15, T16, T17, T18, T19, T20, T21, T22, T23, T24, T25, T26, T27, T28, T29, T30, T31, T32, T33, T34, T35, T36, T37, T38, T39, T40, T41, T42, T43, T44, T45, T46, T47, T48, T49, T50, T51, T52, T53, T54, T55, T56, T57, T58, T59, T60, T61, T62, T63, T64, T65, T66, T67, T68, T69, T70, T71, T72, T73, T74, T75, T76, T77, T78, T79, T80, T81, T82, T83, T84, T85, T86, T87, T88, T89, T90, T91, T92, T93, T94, T95, T96, T97, T98, T99, T100, T101, T102, T103, T104, T105, T106, T107, T108, T109, T110
- **Criterios de Éxito:** Todas las dependencias están completas; el pipeline produce un artefacto reproducible y publica la versión aprobada; los flujos y casos de abuso definidos pasan en el entorno acordado; las comprobaciones autorizadas de producción no crean casos o mensajes reales; no quedan fallos bloqueantes conocidos sin resolver.
- **Verificación requerida:** Ejecutar build, tipado, lint, E2E y pruebas de seguridad del alcance en preview; verificar publicación, configuración efectiva y reversión con datos sintéticos y evidencias registradas.
- **Plan:** docs/planes/T010.md (se redacta y audita al ejecutar; no se da por existente).

---

### [x] Tarea 11: Contacto en condiciones seguras
- **Área:** Seguridad personal y control
- **Idea de origen:** I001
- **Prioridad original:** Esencial
- **Objetivo:** Elegir canal, horario y opción de no recibir mensajes; aplicar estas preferencias también al trabajo del equipo. Beneficio esperado: Evitar mensajes inoportunos cuando contactar a la persona puede exponerla.
- **Dependencias:** T6, T9
- **Criterios de Éxito:** Se elige canal, franja o no contacto; el panel muestra la preferencia vigente y un envío fuera de ella se bloquea con explicación.
- **Verificación requerida:** Probar guardado, cambio y retirada; simular envíos permitidos y no permitidos sin contactar a nadie.
- **Plan:** docs/planes/T011.md.
- **Estado:** Completada y verificada (2026-11-08). El ciudadano elige entre `no_contact` y `safe_contact` (WhatsApp, teléfono, Signal, correo, franja horaria en hora oficial COT, días y notas). El expediente permite consultar, actualizar y retirar preferencias con su clave privada. El panel `/admin` muestra la regla activa, el semáforo en vivo COT y cuenta con herramienta de simulación de despacho que bloquea con explicación de riesgo cualquier intento indebido. 4/4 pruebas E2E aprobadas en Next y Pages; 109/109 pruebas en toda la suite.

---

### [x] Tarea 12: Vista previa de lo que se comparte
- **Área:** Seguridad personal y control
- **Idea de origen:** I002
- **Prioridad original:** Esencial
- **Objetivo:** Reunir destinatarios, archivos y precisión de ubicación en una vista breve que permita retirar elementos. Beneficio esperado: Saber quién recibirá cada dato antes de confirmar un envío.
- **Dependencias:** T3, T6
- **Criterios de Éxito:** La revisión muestra destinatarios, archivos y ubicación; retirar un elemento lo excluye del payload y cancelar no envía nada.
- **Verificación requerida:** E2E de revisión, edición y cancelación; inspeccionar payloads con destinatarios y servicios simulados.
- **Plan:** docs/planes/T012.md.
- **Estado:** Completada y verificada (2026-11-08). En SOS (/sos), modal interactivo que muestra destinatarios, selector de precisión territorial (GPS exacto, solo barrio/comuna, sin ubicación) y texto del payload en vivo; cancelar cierra sin enviar y deseleccionar destinatarios bloquea el envío. En /report (Paso 3), tarjeta de inspección pre-radicación que lista destinatarios, permite retirar evidencias individuales (reduciendo expectedAttachments y excluyendo uploads a R2) y seleccionar precisión territorial (excluyendo la referencia barrial de D1 en 'Solo Comuna'). 8/8 pruebas E2E aprobadas en Next y Pages; 117/117 en suite completa.

---

### [x] Tarea 13: Cámara y micrófono siempre visibles
- **Área:** Seguridad personal y control
- **Idea de origen:** I003
- **Prioridad original:** Esencial
- **Objetivo:** Mantener un indicador y un control de detener accesibles desde las pantallas que acompañan la grabación. Beneficio esperado: Reconocer cuándo el dispositivo está capturando y poder detenerlo.
- **Dependencias:** T5
- **Criterios de Éxito:** El indicador refleja las pistas activas; detener libera cámara y micrófono y sigue accesible al navegar por el flujo.
- **Verificación requerida:** Probar inicio, navegación, detención y revocación de permisos; comprobar tracks y estado visible.
- **Plan:** docs/planes/T013.md.
- **Estado:** Completada y verificada (2026-11-08). Implementado `MediaCaptureContext` y el banner sticky `MediaCaptureIndicator` en `AppShell` fijado bajo el header en todo el espacio de trabajo. Refleja dinámicamente las pistas vivas de `MediaStream` ('Cámara y micrófono activos', 'Micrófono activo', 'Cámara activa' o 'Captura detenida'), proporciona botón ergonómico de detención accesible en scroll/navegación y libera físicamente todos los tracks de hardware apagando los sensores del dispositivo. 6/6 pruebas E2E aprobadas en Next y Cloudflare Pages; 123/123 en la suite completa.

---

### [x] Tarea 14: Modo de práctica sin envíos
- **Área:** Seguridad personal y control
- **Idea de origen:** I004
- **Prioridad original:** Esencial
- **Objetivo:** Ofrecer un recorrido con datos ficticios que no llame, contacte personas ni cree expedientes reales. Beneficio esperado: Aprender los flujos antes de necesitarlos en una situación difícil.
- **Dependencias:** T3, T6
- **Criterios de Éxito:** El recorrido de práctica está identificado; permite ensayar sin llamadas, mensajes ni expedientes reales.
- **Verificación requerida:** E2E con interceptación de red y enlaces externos; comprobar ausencia de efectos reales.
- **Plan:** docs/planes/T014.md
- **Estado:** Completada. Implementado conmutador de práctica con banner sticky en cabecera (`PracticeModeBanner`), diálogo pedagógico (`PracticeSimulationModal`), supresión de llamadas `tel:` y WhatsApp en `/sos` con simulación educativa interactiva, y en `/report` autocompletado de prueba y radicación segura `SIM-YYYY-XXXXXX` con 0 peticiones de red hacia D1/R2. 6/6 pruebas específicas en `e2e/practice-mode.spec.ts` y 129/129 pruebas globales aprobadas. Verificado en build de Pages (`PLAYWRIGHT_PAGES=1`).

---

### [ ] Tarea 15: Sesión en dispositivo compartido
- **Área:** Seguridad personal y control
- **Idea de origen:** I005
- **Prioridad original:** Esencial
- **Objetivo:** Permitir una sesión sin recordar datos y explicar qué registros pueden permanecer fuera de la aplicación. Beneficio esperado: Reducir la información que queda accesible en un teléfono prestado.
- **Dependencias:** T6
- **Criterios de Éxito:** La sesión compartida no recuerda los campos sensibles definidos; salir elimina sus borradores y explica qué registros externos podrían permanecer.
- **Verificación requerida:** Inspeccionar almacenamiento antes y después de salir, recargar y abrir otra pestaña.
- **Plan:** docs/planes/T015.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 16: Límites claros de la salida rápida
- **Área:** Seguridad personal y control
- **Idea de origen:** I006
- **Prioridad original:** Esencial
- **Objetivo:** Explicar en lenguaje breve qué oculta o limpia la salida y qué información podría seguir en servicios o historial. Beneficio esperado: Evitar una falsa sensación de que todo rastro desapareció.
- **Dependencias:** T2, T6
- **Criterios de Éxito:** La explicación distingue ocultar, borrar datos locales y registros externos; se consulta antes de usar la salida y coincide con lo observado.
- **Verificación requerida:** Contrastar cada afirmación con salida, volver atrás y almacenamiento; documentar lo que la aplicación no controla.
- **Plan:** docs/planes/T016.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 17: Ubicación con edad y precisión
- **Área:** Seguridad personal y control
- **Idea de origen:** I007
- **Prioridad original:** Esencial
- **Objetivo:** Mostrar cuándo se obtuvo la ubicación, su precisión aproximada y una alternativa de corrección manual. Beneficio esperado: Distinguir una posición reciente de una estimación antigua o imprecisa.
- **Dependencias:** T3
- **Criterios de Éxito:** La posición muestra hora y precisión disponible; lecturas antiguas o denegadas se distinguen y admiten corrección manual.
- **Verificación requerida:** Simular posiciones recientes, antiguas, imprecisas y permiso denegado; verificar payload de la corrección.
- **Plan:** docs/planes/T017.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 18: Comprobación previa del dispositivo
- **Área:** Seguridad personal y control
- **Idea de origen:** I008
- **Prioridad original:** Después
- **Objetivo:** Probar cámara, micrófono y ubicación con permiso, sin enviar datos, y explicar las alternativas disponibles. Beneficio esperado: Detectar permisos o funciones que fallan antes de depender de ellos.
- **Dependencias:** T3, T5
- **Criterios de Éxito:** La prueba solicita permisos explícitos, informa capacidades y ofrece alternativas sin transmitir capturas ni posiciones.
- **Verificación requerida:** Probar permisos aceptados, denegados y hardware ausente; interceptar red y comprobar liberación de recursos.
- **Plan:** docs/planes/T018.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 19: Revisar acciones difíciles de deshacer
- **Área:** Seguridad personal y control
- **Idea de origen:** I009
- **Prioridad original:** Esencial
- **Objetivo:** Añadir revisión específica antes de eliminar evidencias o publicar información; mantener rápidas las acciones urgentes. Beneficio esperado: Reducir borrados o publicaciones accidentales sin frenar un SOS.
- **Dependencias:** T5, T8
- **Criterios de Éxito:** Eliminar o publicar exige revisar el elemento y la consecuencia; cancelar conserva el estado y SOS no recibe fricción adicional.
- **Verificación requerida:** E2E de cancelar y confirmar; regresión del acceso rápido a SOS y comprobación del objeto afectado.
- **Plan:** docs/planes/T019.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 20: Lectura voluntaria de indicaciones
- **Área:** Seguridad personal y control
- **Idea de origen:** I010
- **Prioridad original:** Explorar
- **Objetivo:** Evaluar lectura en voz alta solo al solicitarla, con control de parar y una alternativa silenciosa equivalente. Beneficio esperado: Escuchar instrucciones breves cuando mirar la pantalla resulta difícil.
- **Dependencias:** T4
- **Criterios de Éxito:** El prototipo solo lee al solicitarlo, permite parar y conserva el texto; no emite audio al cargar.
- **Verificación requerida:** Probar inicio, detención, navegación y falta de síntesis; documentar evaluación de utilidad y decisión de alcance.
- **Plan:** docs/planes/T020.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 21: Recorrido completo con lector de pantalla
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I011
- **Prioridad original:** Esencial
- **Objetivo:** Revisar nombres de controles, orden de foco y anuncios de cambios, incluyendo errores y confirmaciones de envío. Beneficio esperado: Usar las funciones sin depender de lo que se ve.
- **Dependencias:** T2, T3, T6
- **Criterios de Éxito:** Los recorridos críticos se completan con nombres accesibles, foco ordenado y anuncios de error o entrega sin depender del color.
- **Verificación requerida:** E2E con teclado y árbol accesible, más recorrido con lector de pantalla y registro de correcciones.
- **Plan:** docs/planes/T021.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 22: Texto grande sin perder acciones
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I012
- **Prioridad original:** Esencial
- **Objetivo:** Comprobar zoom y ampliación de texto en todas las pantallas, evitando contenido recortado y desplazamiento lateral. Beneficio esperado: Leer cómodamente sin que botones o formularios queden fuera de alcance.
- **Dependencias:** T2
- **Criterios de Éxito:** Al ampliar texto y zoom las acciones críticas permanecen operables y el contenido no se recorta ni exige desplazamiento lateral injustificado.
- **Verificación requerida:** Revisar formularios y pantallas a 200 % y 400 %, además de anchos móviles; documentar excepciones justificadas.
- **Plan:** docs/planes/T022.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 23: Movimiento y vibración a elección
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I013
- **Prioridad original:** Esencial
- **Objetivo:** Ofrecer controles independientes de animación y vibración, conservando siempre una confirmación visual o textual. Beneficio esperado: Reducir estímulos sin perder confirmaciones útiles.
- **Dependencias:** T2
- **Criterios de Éxito:** Movimiento y vibración tienen ajustes independientes; cada combinación conserva una confirmación perceptible alternativa.
- **Verificación requerida:** Probar cuatro combinaciones, prefers-reduced-motion y ausencia de API de vibración.
- **Plan:** docs/planes/T023.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 24: Controles para mano izquierda
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I014
- **Prioridad original:** Después
- **Objetivo:** Evaluar una distribución alternativa de controles sin cambiar el significado ni el orden lógico de la navegación. Beneficio esperado: Acercar las acciones frecuentes a la mano con la que se usa el teléfono.
- **Dependencias:** T2
- **Criterios de Éxito:** La distribución alternativa acerca las acciones definidas a la mano izquierda sin cambiar nombres, orden lógico ni disponibilidad.
- **Verificación requerida:** Comparar ambas distribuciones en móvil y con teclado; evaluar alcance en escenarios representativos.
- **Plan:** docs/planes/T024.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 25: Alternativas cuando no se puede hablar
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I015
- **Prioridad original:** Esencial
- **Objetivo:** Añadir respuestas breves seleccionables y entrada escrita en los pasos que actualmente podrían requerir voz. Beneficio esperado: Permitir expresar necesidades sin dictar ni grabar audio.
- **Dependencias:** T3, T6
- **Criterios de Éxito:** Los pasos seleccionados aceptan frases o texto sin activar micrófono y contienen la información requerida por el flujo.
- **Verificación requerida:** Completar recorridos solo por texto; verificar payloads, errores y permisos solicitados.
- **Plan:** docs/planes/T025.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 26: Teclado y controles de apoyo
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I016
- **Prioridad original:** Esencial
- **Objetivo:** Probar teclado y pulsadores; proporcionar alternativas a arrastrar, mantener pulsado o realizar movimientos precisos. Beneficio esperado: Completar acciones sin gestos exclusivos de una pantalla táctil.
- **Dependencias:** T2, T6
- **Criterios de Éxito:** Todas las acciones del alcance se realizan con teclado y equivalentes; arrastres o pulsaciones prolongadas tienen alternativa.
- **Verificación requerida:** Recorrer foco, activación, cancelación y retorno con teclado; revisar un modo de control de apoyo disponible.
- **Plan:** docs/planes/T026.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 27: Lectura a plena luz
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I017
- **Prioridad original:** Después
- **Objetivo:** Evaluar un modo claro de alto contraste opcional, conservando las jerarquías y significados del diseño actual. Beneficio esperado: Mejorar la legibilidad en exteriores según la necesidad de cada persona.
- **Dependencias:** T2
- **Criterios de Éxito:** El modo claro es opcional, mantiene jerarquía y estados y ofrece contraste medido para textos y controles.
- **Verificación requerida:** Medir contraste, comparar capturas claras y oscuras en móvil y verificar que no se pierden datos ni foco.
- **Plan:** docs/planes/T027.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 28: Traducción a lenguaje sencillo
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I018
- **Prioridad original:** Después
- **Objetivo:** Mostrar explicaciones breves junto a conceptos del formulario o expediente, manteniendo accesible el texto original. Beneficio esperado: Comprender términos difíciles antes de tomar una decisión.
- **Dependencias:** T4, T6
- **Criterios de Éxito:** Los términos seleccionados tienen explicación breve revisada; el original sigue accesible y se conserva el significado.
- **Verificación requerida:** Revisar equivalencia de ejemplos del producto; probar apertura, cierre y lectura accesible.
- **Plan:** docs/planes/T028.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 29: Idiomas con revisión humana
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I019
- **Prioridad original:** Explorar
- **Objetivo:** Investigar idiomas prioritarios con usuarios y revisar los mensajes críticos antes de habilitar cada traducción. Beneficio esperado: Atender a personas que no comprenden bien el español del producto.
- **Dependencias:** T2
- **Criterios de Éxito:** Se documentan idiomas prioritarios con evidencia de usuarios y mensajes críticos revisados por personas competentes; el prototipo indica cobertura y faltantes.
- **Verificación requerida:** Probar traducción, textos largos y retorno al español; registrar revisión humana y decisión antes de ampliar idiomas.
- **Plan:** docs/planes/T029.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 30: Errores que ayudan a continuar
- **Área:** Accesibilidad y comprensión
- **Idea de origen:** I020
- **Prioridad original:** Esencial
- **Objetivo:** Asociar cada error con su campo, conservar la información válida y explicar una acción concreta para resolverlo. Beneficio esperado: Corregir formularios sin adivinar qué salió mal.
- **Dependencias:** T6, T8, T9
- **Criterios de Éxito:** Cada error identifica campo y acción; se conserva información válida y el resumen conduce al primer campo que requiere atención.
- **Verificación requerida:** E2E de validación local y de servidor, reintento y conservación; comprobar asociación accesible de errores.
- **Plan:** docs/planes/T030.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 31: Capturado, pendiente y confirmado
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I021
- **Prioridad original:** Esencial
- **Objetivo:** Mostrar el estado por fragmento o envío a partir de recibos reales y conservar pendientes visibles hasta confirmarlos. Beneficio esperado: Diferenciar una captura local de un archivo recibido por el servidor.
- **Dependencias:** T5, T6
- **Criterios de Éxito:** Cada envío distingue captura local, pendiente y confirmación del servidor; solo un recibo válido permite mostrar recibido.
- **Verificación requerida:** Simular recepción, respuesta tardía, error y respuesta inválida; comprobar que no se anuncia entrega sin recibo.
- **Plan:** docs/planes/T031.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 32: Bandeja de reintentos sin duplicados
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I022
- **Prioridad original:** Esencial
- **Objetivo:** Crear una cola acotada con identificadores de envío, reintentos y cancelación explícita de elementos aún pendientes. Beneficio esperado: Retomar envíos cuando vuelve la conexión sin abrir casos repetidos.
- **Dependencias:** T31
- **Criterios de Éxito:** Reintentar un identificador no duplica resultados; la cola tiene límite explícito, estados y cancelación de elementos pendientes.
- **Verificación requerida:** Probar desconexión, recuperación, concurrencia, duplicados, límite de cola y cancelación con servidor simulado.
- **Plan:** docs/planes/T032.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 33: Borradores guardados por elección
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I023
- **Prioridad original:** Esencial
- **Objetivo:** Pedir una elección clara para guardar borradores, mostrar dónde están y ofrecer una acción para eliminarlos. Beneficio esperado: Recuperar un formulario incompleto con control sobre su persistencia.
- **Dependencias:** T6
- **Criterios de Éxito:** Guardar requiere elección explícita; el borrador se recupera o elimina y se explica dónde queda y qué ocurre al salir.
- **Verificación requerida:** Probar sesión nueva, recarga, guardado desactivado y borrado; inspeccionar persistencia de campos sensibles.
- **Plan:** docs/planes/T033.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 34: Disponibilidad real antes de enviar
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I024
- **Prioridad original:** Esencial
- **Objetivo:** Comprobar la comunicación con los servicios de AlzaVoz y explicar cuáles acciones pueden realizarse mientras fallan. Beneficio esperado: Reconocer una caída del servicio antes de confiar en el botón de envío.
- **Dependencias:** T1, T6
- **Criterios de Éxito:** La comprobación distingue disponible, fallo y desconocido; enviar no se presenta como disponible cuando falla su dependencia.
- **Verificación requerida:** Simular timeout, error HTTP y recuperación; distinguir conexión general de salud del servicio.
- **Plan:** docs/planes/T034.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 35: Espacio disponible para pendientes
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I025
- **Prioridad original:** Esencial
- **Objetivo:** Mostrar capacidad estimada y alertar antes del límite; no borrar automáticamente evidencias aún no transmitidas. Beneficio esperado: Evitar que una cola crezca hasta agotar el almacenamiento.
- **Dependencias:** T32
- **Criterios de Éxito:** La cola informa espacio estimado y avisa antes del límite; agotar cuota no borra archivos pendientes sin decisión del usuario.
- **Verificación requerida:** Forzar cuota y almacenamiento no disponible; verificar conservación de pendientes y recuperación.
- **Plan:** docs/planes/T035.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 36: Captura de bajo consumo de datos
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I026
- **Prioridad original:** Después
- **Objetivo:** Permitir elegir solo audio o calidad reducida, mostrando la diferencia y sin cambiar de modo silenciosamente. Beneficio esperado: Mantener una opción útil cuando la conexión o el plan de datos son limitados.
- **Dependencias:** T5
- **Criterios de Éxito:** Se elige calidad reducida o solo audio con explicación; la captura respeta la elección sin cambios silenciosos.
- **Verificación requerida:** Probar formatos compatibles, cambio antes de capturar y modo no soportado; reproducir muestras.
- **Plan:** docs/planes/T036.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 37: Recuperación al volver a abrir
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I027
- **Prioridad original:** Esencial
- **Objetivo:** Reconstruir los pendientes desde el almacenamiento disponible y distinguir recuperación de archivos de reanudación de captura. Beneficio esperado: Saber qué quedó guardado después de una interrupción.
- **Dependencias:** T32, T33
- **Criterios de Éxito:** Al reabrir se reconstruyen pendientes disponibles sin duplicarlos y se distinguen archivos recuperados de una captura ya terminada.
- **Verificación requerida:** Interrumpir antes y después de confirmar recepción; reabrir y comprobar recuperación y ausencia de duplicados.
- **Plan:** docs/planes/T037.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 38: Actualizar sin cortar una operación
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I028
- **Prioridad original:** Esencial
- **Objetivo:** Posponer la activación de actualizaciones mientras haya trabajo crítico y ofrecer un momento claro para recargar. Beneficio esperado: Evitar que una nueva versión interrumpa grabaciones o envíos activos.
- **Dependencias:** T1, T32
- **Criterios de Éxito:** Una nueva versión no se activa durante captura o envío crítico; luego ofrece recargar conservando esquema y contenido pendientes.
- **Verificación requerida:** Probar actualización con captura, cola activa y vacía; validar migración o rechazo seguro de versiones incompatibles.
- **Plan:** docs/planes/T038.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 39: Alternativa cuando una función no existe
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I029
- **Prioridad original:** Después
- **Objetivo:** Detectar funciones compatibles y ofrecer carga de archivo, entrada manual u otra alternativa antes de iniciar el flujo. Beneficio esperado: Seguir un camino viable en navegadores con capacidades distintas.
- **Dependencias:** T3, T5, T7
- **Criterios de Éxito:** Las capacidades ausentes se detectan antes del inicio y ofrecen alternativa; ningún flujo espera indefinidamente una función inexistente.
- **Verificación requerida:** Simular ausencia de MediaRecorder, geolocalización y audio; completar o cancelar las rutas alternativas.
- **Plan:** docs/planes/T039.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 40: Guías básicas disponibles sin señal
- **Área:** Conectividad y fiabilidad
- **Idea de origen:** I030
- **Prioridad original:** Después
- **Objetivo:** Mantener una selección revisada de guías en el dispositivo con fecha de versión y avisar qué requiere conexión. Beneficio esperado: Consultar indicaciones esenciales aunque no carguen los servicios remotos.
- **Dependencias:** T1, T4
- **Criterios de Éxito:** Las guías seleccionadas se consultan sin red y muestran versión; las acciones remotas se identifican como no disponibles.
- **Verificación requerida:** Cargar, desconectar y reiniciar; verificar contenido, revisión y acciones que requieren red.
- **Plan:** docs/planes/T040.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 41: Paquete de evidencia con manifiesto
- **Área:** Evidencias y archivos
- **Idea de origen:** I031
- **Prioridad original:** Esencial
- **Objetivo:** Exportar archivos elegidos, nombres, tiempos disponibles y hashes; explicar que esto no garantiza validez judicial. Beneficio esperado: Conservar una copia organizada y comprobar si los archivos cambiaron.
- **Dependencias:** T5, T6
- **Criterios de Éxito:** El paquete contiene solo archivos elegidos y un manifiesto con hashes y tiempos disponibles; modificar un archivo altera su comprobación.
- **Verificación requerida:** Exportar y verificar un paquete de prueba; alterar un archivo y detectar el cambio sin afirmar validez judicial.
- **Plan:** docs/planes/T041.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 42: Cronología de grabación y huecos
- **Área:** Evidencias y archivos
- **Idea de origen:** I032
- **Prioridad original:** Esencial
- **Objetivo:** Registrar tiempos reales y mostrar huecos conocidos en lugar de inferirlos desde el intervalo solicitado de captura. Beneficio esperado: Reconocer interrupciones sin presentar una secuencia incompleta como continua.
- **Dependencias:** T5, T31
- **Criterios de Éxito:** La cronología usa tiempos registrados y muestra interrupciones conocidas; no infiere continuidad del intervalo solicitado de tres segundos.
- **Verificación requerida:** Simular retrasos, cambios de estado y fragmentos faltantes; contrastar cronología con eventos.
- **Plan:** docs/planes/T042.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 43: Ocultar rostros y placas en una copia
- **Área:** Evidencias y archivos
- **Idea de origen:** I033
- **Prioridad original:** Después
- **Objetivo:** Permitir revisión manual del difuminado, etiquetar la copia y restringir el acceso al archivo original. Beneficio esperado: Compartir una versión menos identificable sin sobrescribir el original.
- **Dependencias:** T49
- **Criterios de Éxito:** El difuminado produce una copia identificada y revisable; no sobrescribe el original ni lo incluye automáticamente al publicar.
- **Verificación requerida:** Probar ajustes manuales, cancelación y exportación; comparar hashes del original y permisos de ambas versiones.
- **Plan:** docs/planes/T043.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 44: Notas junto a cada archivo
- **Área:** Evidencias y archivos
- **Idea de origen:** I034
- **Prioridad original:** Después
- **Objetivo:** Añadir notas editables del aportante, claramente identificadas como su descripción y separadas del contenido original. Beneficio esperado: Dar contexto a una foto o audio sin mezclarlo con hechos comprobados.
- **Dependencias:** T5, T6
- **Criterios de Éxito:** Cada nota se vincula a archivo, aportante y fecha de edición; se distingue del contenido y metadatos del original.
- **Verificación requerida:** Crear, editar y retirar notas; verificar asociación y autorización con identidades de prueba.
- **Plan:** docs/planes/T044.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 45: Detección de archivos repetidos
- **Área:** Evidencias y archivos
- **Idea de origen:** I035
- **Prioridad original:** Después
- **Objetivo:** Comparar huellas de archivos en el ámbito del caso y preguntar antes de sustituir o descartar una carga. Beneficio esperado: Reducir cargas redundantes dentro de un mismo expediente.
- **Dependencias:** T5, T6
- **Criterios de Éxito:** Una huella repetida en el caso genera advertencia y elección; no revela archivos existentes en otros expedientes.
- **Verificación requerida:** Cargar el mismo archivo con nombres distintos y en casos separados; comprobar privacidad y decisiones.
- **Plan:** docs/planes/T045.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 46: Validación real de archivos recibidos
- **Área:** Evidencias y archivos
- **Idea de origen:** I036
- **Prioridad original:** Esencial
- **Objetivo:** Verificar tamaño, formato real y procesamiento seguro del lado del servidor, sin confiar solo en nombre o extensión. Beneficio esperado: Rechazar contenido inesperado antes de que llegue a los revisores.
- **Dependencias:** T5, T6
- **Criterios de Éxito:** El servidor verifica límites y tipo real antes de procesar; rechaza contenido inválido y evita que llegue al visor.
- **Verificación requerida:** Probar extensiones falsas, tipos no admitidos, archivos truncados y tamaños límite; inspeccionar almacenamiento resultante.
- **Plan:** docs/planes/T046.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 47: Enlaces compartidos que se puedan revocar
- **Área:** Evidencias y archivos
- **Idea de origen:** I037
- **Prioridad original:** Esencial
- **Objetivo:** Diseñar una pasarela de acceso con comprobación de permisos y revocación, diferenciándola de una URL firmada directa. Beneficio esperado: Retirar accesos emitidos sin esperar necesariamente a su vencimiento.
- **Dependencias:** T93
- **Criterios de Éxito:** Una comprobación revocable controla el acceso; revocar impide nuevas solicitudes aunque el enlace siga circulando.
- **Verificación requerida:** Probar enlace autorizado, revocado, vencido y de otro caso; documentar límites sobre copias ya descargadas.
- **Plan:** docs/planes/T047.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 48: Visor que empieza con una vista ligera
- **Área:** Evidencias y archivos
- **Idea de origen:** I038
- **Prioridad original:** Después
- **Objetivo:** Ofrecer miniaturas o vistas previas identificadas como copias y una descarga explícita del archivo elegido. Beneficio esperado: Revisar archivos grandes sin descargarlos completos de inmediato.
- **Dependencias:** T9, T46
- **Criterios de Éxito:** El visor inicia con representación ligera etiquetada; el original se descarga al solicitarlo y los fallos permiten volver a la lista.
- **Verificación requerida:** Medir transferencias al previsualizar y descargar; probar archivos grandes, inválidos y recurso fallido.
- **Plan:** docs/planes/T048.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 49: Conservar el original y sus derivados
- **Área:** Evidencias y archivos
- **Idea de origen:** I039
- **Prioridad original:** Esencial
- **Objetivo:** Identificar origen y transformaciones de cada copia, con permisos separados y sin prometer recuperación si fue eliminada. Beneficio esperado: Evitar confundir una edición con el archivo que se aportó.
- **Dependencias:** T5, T6
- **Criterios de Éxito:** Los derivados conservan relación con original y transformación registrada; permisos separados impiden sobrescritura silenciosa.
- **Verificación requerida:** Crear copias, verificar referencias y hashes, probar accesos y eliminación según política aplicable.
- **Plan:** docs/planes/T049.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 50: Subtítulos revisables para audios
- **Área:** Evidencias y archivos
- **Idea de origen:** I040
- **Prioridad original:** Explorar
- **Objetivo:** Evaluar transcripción opcional, marcarla como automática y permitir correcciones manteniendo referencia al audio. Beneficio esperado: Facilitar la consulta de grabaciones sin escucharlas en público.
- **Dependencias:** T5, T49
- **Criterios de Éxito:** La transcripción es voluntaria, marcada como automática y corregible; mantiene referencia al audio y comunica incertidumbre.
- **Verificación requerida:** Probar muestras sintéticas con ruido, corrección y proveedor caído; evaluar precisión antes de ampliar uso.
- **Plan:** docs/planes/T050.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 51: Separar expediente y ficha pública
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I041
- **Prioridad original:** Esencial
- **Objetivo:** Definir una lista explícita de campos publicables, con vista previa y exclusión predeterminada de adjuntos sensibles. Beneficio esperado: Publicar únicamente los campos que la persona decidió mostrar.
- **Dependencias:** T6, T8
- **Criterios de Éxito:** La ficha pública solo incluye campos permitidos; la revisión previa coincide con publicación y excluye adjuntos privados.
- **Verificación requerida:** Enviar campos extra y archivos privados; verificar respuestas públicas y permisos de edición.
- **Plan:** docs/planes/T051.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 52: Retención explicada por tipo de dato
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I042
- **Prioridad original:** Esencial
- **Objetivo:** Presentar la política real por categoría de archivo y los controles disponibles, sin inventar plazos ni excepciones. Beneficio esperado: Saber cuánto tiempo se conserva la información y por qué.
- **Dependencias:** T5, T6, T9
- **Criterios de Éxito:** Existe una política por tipo de dato con responsable y reglas aplicables; la interfaz explica conservación y controles coherentes.
- **Verificación requerida:** Revisar cada categoría y aplicar reglas acordadas a datos de prueba sin inventar plazos.
- **Plan:** docs/planes/T052.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 53: Seguimiento de solicitudes de eliminación
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I043
- **Prioridad original:** Después
- **Objetivo:** Permitir solicitar eliminación y consultar su estado, alcance y posibles límites antes de confirmar una decisión. Beneficio esperado: Evitar que borrar se convierta en una acción sin respuesta visible.
- **Dependencias:** T52
- **Criterios de Éxito:** La solicitud muestra alcance, estado y resultado; diferencia eliminación inmediata de límites documentados.
- **Verificación requerida:** Solicitar, cancelar si procede y resolver eliminación sintética; comprobar originales, derivados y respuesta al ciudadano.
- **Plan:** docs/planes/T053.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 54: Cachés que excluyen información privada
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I044
- **Prioridad original:** Esencial
- **Objetivo:** Separar recursos públicos de expedientes y revisar cachés de navegador, aplicación y servidor para contenido sensible. Beneficio esperado: Reducir la exposición accidental al reutilizar respuestas guardadas.
- **Dependencias:** T1, T6, T9
- **Criterios de Éxito:** Datos privados no entran en cachés públicas u offline; cambiar identidad o salir no permite recuperar información ajena.
- **Verificación requerida:** Inspeccionar encabezados, service worker y cachés con dos identidades; probar atrás, recarga y desconexión.
- **Plan:** docs/planes/T054.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 55: Registros técnicos sin datos del caso
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I045
- **Prioridad original:** Esencial
- **Objetivo:** Definir campos permitidos, ocultar identificadores sensibles y comprobar ejemplos de errores antes de enviarlos a monitoreo. Beneficio esperado: Investigar fallos sin copiar relatos, archivos o secretos a los logs.
- **Dependencias:** T9
- **Criterios de Éxito:** Los registros solo contienen campos permitidos; relatos, credenciales, enlaces secretos y archivos no aparecen en errores ni telemetría.
- **Verificación requerida:** Provocar fallos y buscar marcadores sensibles sintéticos en todas las salidas de registro del alcance.
- **Plan:** docs/planes/T055.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 56: Decisiones de uso de datos por separado
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I046
- **Prioridad original:** Esencial
- **Objetivo:** Separar las opciones de contacto, publicación y medición; explicar su efecto sin agrupar decisiones distintas. Beneficio esperado: Distinguir atender un caso de utilizar información para mejorar el producto.
- **Dependencias:** T6, T8
- **Criterios de Éxito:** Contacto, publicación y medición tienen elecciones separadas; cambiar una no altera silenciosamente las otras.
- **Verificación requerida:** Probar combinaciones, retirada de cada opción, payloads y persistencia de preferencias.
- **Plan:** docs/planes/T056.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 57: Permisos del dispositivo a la vista
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I047
- **Prioridad original:** Después
- **Objetivo:** Crear una pantalla que explique cámara, micrófono y ubicación, con instrucciones acordes al navegador utilizado. Beneficio esperado: Revisar qué capacidades se han solicitado y cómo cambiarlas.
- **Dependencias:** T3, T5
- **Criterios de Éxito:** La pantalla explica permisos y estado disponible; ofrece instrucciones apropiadas sin afirmar que modifica ajustes externos por sí sola.
- **Verificación requerida:** Probar permitido, denegado y desconocido en navegadores del alcance; verificar retorno al flujo.
- **Plan:** docs/planes/T057.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 58: Mapas con umbrales de publicación
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I048
- **Prioridad original:** Esencial
- **Objetivo:** Evaluar agrupación, retrasos y umbrales antes de mostrar datos, conservando la incertidumbre en la visualización. Beneficio esperado: Reducir la posibilidad de reconocer a una persona por un reporte aislado.
- **Dependencias:** T7
- **Criterios de Éxito:** Las reglas acordadas de agrupación y umbral evitan publicar puntos individuales de prueba; el mapa explica incertidumbre.
- **Verificación requerida:** Probar grupos pequeños, filtros y consultas repetidas; revisar exposición e inferencias de ubicación individual.
- **Plan:** docs/planes/T058.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 59: Medición de uso con datos mínimos
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I049
- **Prioridad original:** Después
- **Objetivo:** Medir pasos y errores agregados, excluyendo textos de casos y ubicación precisa, con una opción comprensible de control. Beneficio esperado: Entender dónde falla la experiencia sin reconstruir historias personales.
- **Dependencias:** T6, T55
- **Criterios de Éxito:** Los eventos siguen esquema mínimo sin relatos ni ubicación precisa; el control de participación se respeta en nuevas emisiones.
- **Verificación requerida:** Inspeccionar eventos con marcadores sensibles; probar desactivación y revisar agregados antes de exponerlos.
- **Plan:** docs/planes/T059.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 60: Controles de retención en copias de respaldo
- **Área:** Privacidad y manejo de datos
- **Idea de origen:** I050
- **Prioridad original:** Esencial
- **Objetivo:** Documentar qué copias contienen información, quién accede y cómo se aplican las políticas durante su ciclo de vida. Beneficio esperado: Alinear las copias de seguridad con las decisiones de conservación de datos.
- **Dependencias:** T52, T103
- **Criterios de Éxito:** El inventario de respaldos identifica datos, accesos y conservación; restaurar aplica restricciones y decisiones de retención.
- **Verificación requerida:** Restaurar datos sintéticos expirados o restringidos y verificar el tratamiento acordado.
- **Plan:** docs/planes/T060.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 61: Buzón privado con código y secreto
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I051
- **Prioridad original:** Esencial
- **Objetivo:** Separar el identificador público del secreto de acceso y explicar cómo conservarlo y qué ocurre si se pierde. Beneficio esperado: Consultar un expediente sin usar su número como única credencial.
- **Dependencias:** T6
- **Criterios de Éxito:** El código público no permite consultar por sí solo; un secreto separado habilita el buzón y se explica qué ocurre si se pierde.
- **Verificación requerida:** Probar código sin secreto, secreto erróneo, caso ajeno y acceso válido; comprobar errores sin filtraciones.
- **Plan:** docs/planes/T061.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 62: Cronología ciudadana del expediente
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I052
- **Prioridad original:** Esencial
- **Objetivo:** Mostrar recepción, revisión, solicitudes y cierre con fechas reales y descripciones que no expongan notas internas. Beneficio esperado: Ver qué ocurrió y qué falta sin depender de llamadas repetidas.
- **Dependencias:** T9, T61
- **Criterios de Éxito:** La cronología presenta eventos y fechas reales; notas internas y datos de otros casos quedan fuera de la vista ciudadana.
- **Verificación requerida:** Crear eventos, comparar vistas ciudadana y administrativa y verificar orden y permisos.
- **Plan:** docs/planes/T062.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 63: Añadir información a un caso existente
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I053
- **Prioridad original:** Esencial
- **Objetivo:** Permitir nuevos datos y archivos como aportes separados, conservando su fecha y relación con el expediente. Beneficio esperado: Ampliar el relato sin empezar otra denuncia desde cero.
- **Dependencias:** T61
- **Criterios de Éxito:** Un aporte se vincula al expediente con fecha propia y recibo; no modifica el original ni crea otro caso por reintento.
- **Verificación requerida:** Añadir texto y archivo, interrumpir y reintentar; verificar identificación, cronología y acceso.
- **Plan:** docs/planes/T063.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 64: Corregir datos con historial
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I054
- **Prioridad original:** Después
- **Objetivo:** Registrar enmiendas del aportante, diferenciar versiones y mostrar al revisor cuál es la información vigente. Beneficio esperado: Rectificar errores sin ocultar qué información cambió.
- **Dependencias:** T61
- **Criterios de Éxito:** La corrección conserva la versión previa y marca la vigente; ciudadano y revisor distinguen qué cambió y cuándo.
- **Verificación requerida:** Corregir campos, intentar modificar un caso ajeno y verificar historial y versión presentada.
- **Plan:** docs/planes/T064.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 65: Pedir revisión de un cierre
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I055
- **Prioridad original:** Después
- **Objetivo:** Ofrecer un motivo y adjuntos opcionales para solicitar revisión, indicando su estado sin prometer un resultado. Beneficio esperado: Abrir un canal claro cuando hay desacuerdo o información nueva.
- **Dependencias:** T70
- **Criterios de Éxito:** La solicitud de revisión admite motivo y anexos opcionales; queda pendiente y no cambia el cierre sin actuación autorizada.
- **Verificación requerida:** Solicitar revisión, repetir envío y resolver con permisos; comprobar estados y comunicaciones simuladas.
- **Plan:** docs/planes/T065.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 66: Lista clara de información pendiente
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I056
- **Prioridad original:** Esencial
- **Objetivo:** Mostrar cada solicitud con explicación, campos necesarios y opción de indicar que la persona no dispone del dato. Beneficio esperado: Saber exactamente qué solicita el equipo y cómo aportarlo.
- **Dependencias:** T9, T61
- **Criterios de Éxito:** Cada solicitud enumera datos necesarios y permite responder o indicar que no están disponibles; el equipo ve su estado.
- **Verificación requerida:** Crear varias solicitudes y responder parcialmente, sin datos y con anexos; verificar asociación y permisos.
- **Plan:** docs/planes/T066.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 67: Preguntas y respuestas dentro del caso
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I057
- **Prioridad original:** Después
- **Objetivo:** Permitir intercambios privados asociados al caso, evitando copiar información sensible entre canales sin necesidad. Beneficio esperado: Conservar la conversación relevante junto al expediente.
- **Dependencias:** T9, T61
- **Criterios de Éxito:** Preguntas y respuestas mantienen autor y fecha dentro del caso; solo participantes autorizados acceden al intercambio.
- **Verificación requerida:** Probar conversación en dos expedientes y con roles diferentes, incluyendo adjuntos y acceso denegado.
- **Plan:** docs/planes/T067.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 68: Preferencias de notificación por evento
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I058
- **Prioridad original:** Después
- **Objetivo:** Elegir qué eventos generan avisos y agrupar actualizaciones, respetando siempre las condiciones de contacto seguro. Beneficio esperado: Recibir cambios útiles sin avisos repetitivos por cada movimiento interno.
- **Dependencias:** T11, T62
- **Criterios de Éxito:** Se eligen eventos que notifican y se pueden pausar; agrupar actualizaciones respeta contacto seguro y evita duplicados.
- **Verificación requerida:** Simular eventos, franjas, pausa y cambio de canal con proveedor de notificaciones de prueba.
- **Plan:** docs/planes/T068.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 69: Acceso delegado y revocable
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I059
- **Prioridad original:** Explorar
- **Objetivo:** Evaluar una invitación de alcance limitado, con acciones permitidas, vencimiento y revocación por quien la concede. Beneficio esperado: Permitir ayuda de una persona elegida sin entregar todas las credenciales.
- **Dependencias:** T61, T93
- **Criterios de Éxito:** La invitación define acciones y vencimiento; el delegado no excede el alcance y revocar bloquea nuevas operaciones.
- **Verificación requerida:** Probar acceso válido, vencido, revocado y fuera de alcance; evaluar comprensión antes de ampliar la función.
- **Plan:** docs/planes/T069.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 70: Cierre explicado con próximos pasos
- **Área:** Seguimiento y control del caso
- **Idea de origen:** I060
- **Prioridad original:** Esencial
- **Objetivo:** Mostrar el motivo registrado, acciones realizadas y opciones disponibles; separar cierre interno de resolución del problema. Beneficio esperado: Comprender qué significa que un caso deje de estar activo.
- **Dependencias:** T9, T62
- **Criterios de Éxito:** El cierre presenta motivo y acciones registradas; distingue cierre interno de solución del problema y solo ofrece opciones existentes.
- **Verificación requerida:** Cerrar casos sintéticos con distintos motivos; verificar vista ciudadana, cronología y decisiones del equipo.
- **Plan:** docs/planes/T070.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 71: Caducidad y cierre de avisos públicos
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I061
- **Prioridad original:** Esencial
- **Objetivo:** Solicitar revisión del estado y hacer que el QR del afiche muestre si el aviso sigue activo o fue cerrado. Beneficio esperado: Reducir la circulación de búsquedas que ya no están vigentes.
- **Dependencias:** T8
- **Criterios de Éxito:** Un aviso se revisa o cierra y el QR refleja su estado vigente; lo expirado no sigue mostrándose como activo.
- **Verificación requerida:** Generar afiche, cerrar o expirar el aviso y abrir el mismo QR; comprobar estado y datos expuestos.
- **Plan:** docs/planes/T071.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 72: Reportar publicaciones dañinas
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I062
- **Prioridad original:** Esencial
- **Objetivo:** Añadir motivos de reporte, revisión humana y seguimiento interno sin revelar quién presentó el aviso de abuso. Beneficio esperado: Dar una vía visible para señalar exposición de datos o suplantación.
- **Dependencias:** T8
- **Criterios de Éxito:** La publicación admite reportes con motivos definidos; quedan disponibles para revisión sin publicar identidad del remitente.
- **Verificación requerida:** Reportar varias publicaciones y reintentar; verificar asociación y campos públicos y administrativos.
- **Plan:** docs/planes/T072.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 73: Estado de verificación visible
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I063
- **Prioridad original:** Esencial
- **Objetivo:** Usar etiquetas comprensibles y motivos de actualización, evitando convertir número de reportes en prueba de veracidad. Beneficio esperado: Distinguir un aporte recibido de información revisada o corregida.
- **Dependencias:** T8, T97
- **Criterios de Éxito:** Las etiquetas recibido, revisado y corregido corresponden a decisiones registradas; acumular reportes no verifica por sí solo un aviso.
- **Verificación requerida:** Cambiar estados con roles autorizados y repetir reportes; comprobar motivos e historial público permitido.
- **Plan:** docs/planes/T073.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 74: Directorio de organizaciones de apoyo
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I064
- **Prioridad original:** Después
- **Objetivo:** Mostrar servicios, cobertura y fecha de revisión de cada ficha, con responsable de mantenerla actualizada. Beneficio esperado: Encontrar acompañamiento según la necesidad y el territorio.
- **Dependencias:** T2
- **Criterios de Éxito:** Cada ficha informa servicios, cobertura, revisión y responsable; los datos no confirmados se identifican y admiten corrección.
- **Verificación requerida:** Probar fichas completas, incompletas y vencidas; verificar búsqueda y enlaces sin enviar contactos reales.
- **Plan:** docs/planes/T074.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 75: Suscripciones por tema y comuna
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I065
- **Prioridad original:** Explorar
- **Objetivo:** Evaluar preferencias territoriales elegidas manualmente, frecuencia y pausa de avisos, evitando alertas demasiado precisas. Beneficio esperado: Seguir novedades relevantes sin rastrear desplazamientos individuales.
- **Dependencias:** T7, T11, T71
- **Criterios de Éxito:** La suscripción usa temas y comunas manuales sin rastrear movimientos; frecuencia y pausa funcionan sobre avisos vigentes.
- **Verificación requerida:** Prototipar preferencias y avisos sintéticos; verificar pausa y ausencia de geolocalización, y documentar utilidad.
- **Plan:** docs/planes/T075.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 76: Revisión especial de publicaciones sensibles
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I066
- **Prioridad original:** Esencial
- **Objetivo:** Definir criterios de revisión humana antes de publicar datos sensibles y una vía de retiro urgente del contenido. Beneficio esperado: Reducir exposición innecesaria de menores y personas en riesgo.
- **Dependencias:** T51, T97
- **Criterios de Éxito:** Los casos sensibles definidos requieren revisión antes de publicar; el retiro urgente autorizado elimina exposición de campos no aprobados.
- **Verificación requerida:** Probar aprobación, rechazo y retiro; inspeccionar respuestas públicas durante cada estado.
- **Plan:** docs/planes/T076.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 77: Revisión humana de posibles coincidencias
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I067
- **Prioridad original:** Esencial
- **Objetivo:** Presentar coincidencias como hipótesis con elementos comparables y requerir revisión antes de comunicar una conclusión. Beneficio esperado: Evitar que una sugerencia automática se confunda con una identificación.
- **Dependencias:** T8, T97
- **Criterios de Éxito:** Las coincidencias aparecen como hipótesis comparables; comunicar una conclusión requiere decisión humana registrada.
- **Verificación requerida:** Usar pares sintéticos, rechazar sugerencias y comprobar ausencia de identificación automática.
- **Plan:** docs/planes/T077.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 78: Unir avisos duplicados sin perder aportes
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I068
- **Prioridad original:** Después
- **Objetivo:** Sugerir agrupaciones a moderadores, conservar procedencia y permitir deshacer una unión incorrecta. Beneficio esperado: Concentrar la información dispersa sobre una misma búsqueda.
- **Dependencias:** T7, T8
- **Criterios de Éxito:** Unir avisos conserva origen y aportes y puede deshacerse; las URL anteriores conducen a un estado comprensible.
- **Verificación requerida:** Unir, aportar información y revertir avisos de prueba; comprobar referencias, permisos e historial.
- **Plan:** docs/planes/T078.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 79: Contacto mediado con quien aporta una pista
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I069
- **Prioridad original:** Después
- **Objetivo:** Evaluar un canal privado dentro del aviso, con límites de uso, bloqueo y revisión ante abuso. Beneficio esperado: Permitir preguntas de seguimiento sin publicar datos personales.
- **Dependencias:** T61, T72
- **Criterios de Éxito:** La conversación de una pista no publica datos de contacto; admite bloqueo y reporte y restringe el intercambio a participantes autorizados.
- **Verificación requerida:** Probar conversación, bloqueo, abuso y acceso desde otra búsqueda; inspeccionar payloads públicos y privados.
- **Plan:** docs/planes/T079.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 80: Correcciones visibles en el mapa comunitario
- **Área:** Comunidad y búsquedas
- **Idea de origen:** I070
- **Prioridad original:** Después
- **Objetivo:** Permitir revisión y corrección de categoría o ubicación agregada, con actualización de las cifras derivadas. Beneficio esperado: Mostrar que un reporte cambió y evitar conservar errores como hechos.
- **Dependencias:** T7, T73
- **Criterios de Éxito:** Corregir categoría o ubicación agregada actualiza mapa y cifras; se conserva explicación de revisión sin publicar posiciones individuales.
- **Verificación requerida:** Corregir reportes y recalcular agregados; verificar consultas, filtros y límites de publicación.
- **Plan:** docs/planes/T080.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 81: Fuentes y fecha junto a las respuestas
- **Área:** IA y contenidos responsables
- **Idea de origen:** I071
- **Prioridad original:** Esencial
- **Objetivo:** Vincular las afirmaciones a fuentes consultadas y su fecha de revisión; indicar cuando no hay respaldo suficiente. Beneficio esperado: Facilitar comprobar de dónde sale una orientación de Alza Bot.
- **Dependencias:** T4
- **Criterios de Éxito:** Las afirmaciones respaldadas enlazan fuentes consultadas y revisión; cuando falta respaldo se indica sin fabricar citas ni fechas.
- **Verificación requerida:** Evaluar fuentes disponibles, caídas y ausentes; verificar enlaces y correspondencia entre afirmación y respaldo.
- **Plan:** docs/planes/T081.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 82: Reconocer incertidumbre y derivar
- **Área:** IA y contenidos responsables
- **Idea de origen:** I072
- **Prioridad original:** Esencial
- **Objetivo:** Definir cuándo pedir contexto, explicar límites o solicitar revisión humana, sin inventar detalles para completar una respuesta. Beneficio esperado: Evitar respuestas concluyentes cuando falta información relevante.
- **Dependencias:** T4, T81
- **Criterios de Éxito:** Ante información insuficiente se pide contexto, se explican límites o se deriva; las respuestas no agregan hechos ausentes.
- **Verificación requerida:** Ejecutar casos sintéticos ambiguos y sensibles; revisar respuestas y derivaciones con criterios acordados.
- **Plan:** docs/planes/T082.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 83: Enviar a la IA solo lo necesario
- **Área:** IA y contenidos responsables
- **Idea de origen:** I073
- **Prioridad original:** Esencial
- **Objetivo:** Seleccionar campos pertinentes, ocultar identificadores cuando no aportan y explicar el tratamiento antes del uso. Beneficio esperado: Reducir la información personal que sale hacia proveedores externos.
- **Dependencias:** T4, T6
- **Criterios de Éxito:** El proveedor recibe solo campos necesarios definidos; se excluyen identificadores prescindibles y se explica el tratamiento antes del uso.
- **Verificación requerida:** Interceptar solicitudes con marcadores sensibles sintéticos; verificar exclusión, opciones aplicables y registros.
- **Plan:** docs/planes/T083.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 84: Contenido con responsable y revisión
- **Área:** IA y contenidos responsables
- **Idea de origen:** I074
- **Prioridad original:** Esencial
- **Objetivo:** Asignar responsable, fecha de revisión y estado de vigencia a cada contenido utilizado por Alza Bot. Beneficio esperado: Detectar guías y directorios que necesitan actualización.
- **Dependencias:** T81
- **Criterios de Éxito:** Cada contenido tiene responsable, versión y revisión; lo vencido se identifica y se actualiza antes de reutilizarlo como vigente.
- **Verificación requerida:** Marcar contenido vigente o vencido, actualizar fuente y comprobar la versión recuperada por Alza Bot.
- **Plan:** docs/planes/T084.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 85: Respuesta básica durante una caída de IA
- **Área:** IA y contenidos responsables
- **Idea de origen:** I075
- **Prioridad original:** Esencial
- **Objetivo:** Ofrecer contenido revisado disponible y explicar qué función está degradada, sin simular una respuesta generada. Beneficio esperado: Mantener orientación limitada y transparente si el proveedor falla.
- **Dependencias:** T4, T40
- **Criterios de Éxito:** Una caída de IA ofrece contenido revisado y avisa de degradación; no simula generación en vivo ni actualización inexistente.
- **Verificación requerida:** Simular timeout, cuota y respuesta inválida; verificar fallback, fecha, recuperación y conservación del texto cuando corresponda.
- **Plan:** docs/planes/T085.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 86: Reportar una respuesta problemática
- **Área:** IA y contenidos responsables
- **Idea de origen:** I076
- **Prioridad original:** Después
- **Objetivo:** Permitir señalar la respuesta concreta con comentario opcional y enviar el caso a revisión del equipo. Beneficio esperado: Hacer sencillo avisar que una explicación fue confusa o inadecuada.
- **Dependencias:** T4, T9
- **Criterios de Éxito:** Se reporta una respuesta concreta con comentario opcional; el equipo recibe referencia suficiente sin exigir repetir el caso.
- **Verificación requerida:** Reportar con y sin comentario y revisar en panel; comprobar asociación y límites de acceso.
- **Plan:** docs/planes/T086.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 87: Banco de casos para evaluar cambios
- **Área:** IA y contenidos responsables
- **Idea de origen:** I077
- **Prioridad original:** Esencial
- **Objetivo:** Mantener ejemplos sintéticos revisados con criterios de claridad, apoyo en fuentes y manejo de incertidumbre. Beneficio esperado: Detectar regresiones antes de cambiar instrucciones o modelos.
- **Dependencias:** T81, T82
- **Criterios de Éxito:** El banco contiene escenarios sintéticos y criterios reproducibles de fuentes, claridad e incertidumbre; distingue una regresión conocida.
- **Verificación requerida:** Ejecutar configuración base y una variación deliberada; revisar fallos útiles y datos incluidos.
- **Plan:** docs/planes/T087.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 88: Versiones trazables de modelo e instrucciones
- **Área:** IA y contenidos responsables
- **Idea de origen:** I078
- **Prioridad original:** Después
- **Objetivo:** Registrar versión técnica y fecha sin guardar innecesariamente el contenido privado de cada interacción. Beneficio esperado: Relacionar cambios de comportamiento con una configuración concreta.
- **Dependencias:** T4, T9
- **Criterios de Éxito:** Las ejecuciones registran versiones técnicas y fecha; se comparan configuraciones sin guardar por defecto el relato privado.
- **Verificación requerida:** Cambiar modelo o instrucciones y provocar fallos; verificar trazabilidad y registros con marcadores sensibles.
- **Plan:** docs/planes/T088.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 89: Documentos generados con revisión previa
- **Área:** IA y contenidos responsables
- **Idea de origen:** I079
- **Prioridad original:** Esencial
- **Objetivo:** Señalar campos por confirmar, procedencia de datos y aprobación humana antes de exportar o enviar el resultado. Beneficio esperado: Evitar presentar un borrador automático como documento listo sin inspección.
- **Dependencias:** T9, T81
- **Criterios de Éxito:** El borrador distingue confirmados y pendientes; revisión humana precede exportación final o envío y conserva procedencia disponible.
- **Verificación requerida:** Generar datos faltantes o contradictorios; probar revisión y bloqueo de salida final sin aprobación.
- **Plan:** docs/planes/T089.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 90: Preguntas contextuales de alto valor
- **Área:** IA y contenidos responsables
- **Idea de origen:** I080
- **Prioridad original:** Explorar
- **Objetivo:** Evaluar qué dato cambia realmente la orientación y permitir omitir preguntas no indispensables. Beneficio esperado: Reducir interrogatorios largos antes de ofrecer ayuda útil.
- **Dependencias:** T4, T6
- **Criterios de Éxito:** El prototipo justifica la utilidad de cada pregunta y permite omitir las no indispensables; documenta qué información cambia la orientación.
- **Verificación requerida:** Comparar recorridos con y sin preguntas y omisiones; evaluar comprensión y decisión de alcance.
- **Plan:** docs/planes/T090.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 91: Responsable y reemplazo por expediente
- **Área:** Operación y atención del equipo
- **Idea de origen:** I081
- **Prioridad original:** Esencial
- **Objetivo:** Asignar una persona y un respaldo, registrar transferencias y mostrar una bandeja de expedientes sin responsable. Beneficio esperado: Reducir casos que quedan sin atención por falta de dueño claro.
- **Dependencias:** T9
- **Criterios de Éxito:** Cada caso tiene responsable y respaldo o aparece en cola sin asignación; las transferencias registran fecha y autor.
- **Verificación requerida:** Asignar, transferir y retirar integrantes; verificar cola sin dueño y acceso de reemplazo.
- **Plan:** docs/planes/T091.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 92: Casos sin movimiento a la vista
- **Área:** Operación y atención del equipo
- **Idea de origen:** I082
- **Prioridad original:** Esencial
- **Objetivo:** Ordenar por antigüedad de la última gestión y permitir priorización humana, sin inventar compromisos de atención. Beneficio esperado: Detectar expedientes que necesitan una nueva acción del equipo.
- **Dependencias:** T91
- **Criterios de Éxito:** La bandeja ordena por última gestión y responsable; priorizar y reasignar son decisiones explícitas sin alterar fechas históricas.
- **Verificación requerida:** Crear casos de diferentes edades y estados, filtrar y reasignar; verificar orden y actuaciones.
- **Plan:** docs/planes/T092.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 93: Permisos por caso y acción
- **Área:** Operación y atención del equipo
- **Idea de origen:** I083
- **Prioridad original:** Esencial
- **Objetivo:** Comprobar autorización en cada petición, separando lectura, descarga, modificación, publicación y administración. Beneficio esperado: Limitar cada acceso a la información y operación necesarias.
- **Dependencias:** T9
- **Criterios de Éxito:** Cada petición verifica identidad, caso y acción; una matriz restringe lectura, descarga, edición, publicación y administración con denegación por defecto.
- **Verificación requerida:** Probar roles con objetos propios y ajenos, IDs modificados y llamadas directas a endpoints sensibles.
- **Plan:** docs/planes/T093.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 94: Protección adicional para acciones sensibles
- **Área:** Operación y atención del equipo
- **Idea de origen:** I084
- **Prioridad original:** Esencial
- **Objetivo:** Evaluar segundo factor y reautenticación para operaciones sensibles, con recuperación y soporte definidos. Beneficio esperado: Reducir el impacto de una sesión administrativa comprometida.
- **Dependencias:** T9, T93
- **Criterios de Éxito:** Las acciones acordadas requieren segundo factor o reautenticación; recuperación y sesión expirada tienen rutas definidas sin bypass.
- **Verificación requerida:** Probar factor válido e inválido, reautenticación vencida y recuperación con cuentas de prueba.
- **Plan:** docs/planes/T094.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 95: Registro de acceso a evidencias
- **Área:** Operación y atención del equipo
- **Idea de origen:** I085
- **Prioridad original:** Esencial
- **Objetivo:** Guardar eventos de acceso con permisos restringidos y límites de conservación, sin copiar archivos sensibles al registro. Beneficio esperado: Poder revisar quién consultó, descargó o compartió información.
- **Dependencias:** T9, T55, T93
- **Criterios de Éxito:** Consultar, descargar y compartir producen eventos de actor, objeto y acción; el registro es restringido y no contiene archivos.
- **Verificación requerida:** Ejecutar acciones permitidas y denegadas con varias cuentas; comprobar eventos, campos excluidos y acceso al registro.
- **Plan:** docs/planes/T095.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 96: Traspaso de turno con contexto mínimo
- **Área:** Operación y atención del equipo
- **Idea de origen:** I086
- **Prioridad original:** Después
- **Objetivo:** Preparar un resumen de acciones pendientes y decisiones relevantes, visible solo para el equipo autorizado. Beneficio esperado: Continuar la atención sin reconstruir toda la historia del expediente.
- **Dependencias:** T9, T91
- **Criterios de Éxito:** El traspaso resume pendientes y decisiones para el nuevo responsable; excluye información innecesaria y registra entrega y recepción.
- **Verificación requerida:** Cambiar turno con casos sintéticos y roles distintos; verificar resumen y continuidad de pendientes.
- **Plan:** docs/planes/T096.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 97: Bandeja dedicada a moderación
- **Área:** Operación y atención del equipo
- **Idea de origen:** I087
- **Prioridad original:** Esencial
- **Objetivo:** Separar prioridades, responsables y decisiones de moderación, con motivos de actuación y posibilidad de revisión. Beneficio esperado: Revisar reportes de abuso sin mezclarlos con la atención ordinaria.
- **Dependencias:** T9, T72
- **Criterios de Éxito:** Los reportes de abuso entran en cola con prioridad, responsable y decisión; revisarlos no publica datos del remitente.
- **Verificación requerida:** Recorrer recepción, asignación, decisión y revisión posterior; comprobar separación de la cola ordinaria.
- **Plan:** docs/planes/T097.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 98: Formación con expedientes ficticios
- **Área:** Operación y atención del equipo
- **Idea de origen:** I088
- **Prioridad original:** Después
- **Objetivo:** Crear ejercicios de recepción, revisión y cierre con datos sintéticos y acceso separado del entorno operativo. Beneficio esperado: Practicar el panel sin exponer información de personas reales.
- **Dependencias:** T9
- **Criterios de Éxito:** Los ejercicios usan expedientes ficticios separados de efectos reales; permiten practicar recepción, revisión y cierre de extremo a extremo.
- **Verificación requerida:** Completar ejercicios y verificar endpoints y entorno; comprobar ausencia de escrituras o mensajes en producción.
- **Plan:** docs/planes/T098.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 99: Respuesta ante incidentes definida
- **Área:** Operación y atención del equipo
- **Idea de origen:** I089
- **Prioridad original:** Esencial
- **Objetivo:** Documentar responsables, canales internos y pasos de contención y recuperación; ensayar escenarios sin datos reales. Beneficio esperado: Saber quién actúa y qué comunicar cuando falla una función sensible.
- **Dependencias:** T9
- **Criterios de Éxito:** El procedimiento define responsables, contención, comunicación y recuperación; un ensayo genera acciones y evidencias sin casos reales.
- **Verificación requerida:** Ejecutar simulacro, registrar tiempos observados y vacíos y corregir el procedimiento.
- **Plan:** docs/planes/T099.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 100: Gestión de carga del equipo
- **Área:** Operación y atención del equipo
- **Idea de origen:** I090
- **Prioridad original:** Después
- **Objetivo:** Mostrar colas agregadas, capacidad declarada y opciones de reasignación, evitando métricas basadas solo en cerrar casos. Beneficio esperado: Distribuir trabajo según disponibilidad sin convertir reportes en una competencia.
- **Dependencias:** T91, T92
- **Criterios de Éxito:** La vista muestra carga agregada y disponibilidad declarada; se reasigna sin usar solo cierres como medida de atención.
- **Verificación requerida:** Probar colas desiguales, ausencias y reasignaciones; revisar métricas y permisos de datos del equipo.
- **Plan:** docs/planes/T100.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 101: Pruebas en móviles con interrupciones reales
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I091
- **Prioridad original:** Esencial
- **Objetivo:** Probar llamadas entrantes, bloqueo de pantalla, poco espacio, cambios de red y reapertura en dispositivos representativos. Beneficio esperado: Descubrir fallos que no aparecen en una simulación de escritorio.
- **Dependencias:** T5, T32, T37
- **Criterios de Éxito:** La matriz registra llamadas, bloqueo, cuota baja, cambios de red y reapertura; pérdidas y límites observados quedan explícitos.
- **Verificación requerida:** Ejecutar escenarios en móviles representativos con archivos sintéticos y contrastar capturas, pendientes y recibos.
- **Plan:** docs/planes/T101.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 102: Estado público del servicio
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I092
- **Prioridad original:** Esencial
- **Objetivo:** Mostrar funciones afectadas y novedades de recuperación con información operativa confirmada. Beneficio esperado: Distinguir una incidencia conocida de una acción completada correctamente.
- **Dependencias:** T34
- **Criterios de Éxito:** El estado público identifica funciones afectadas y novedades confirmadas; un chequeo parcial no presenta como sano un servicio degradado.
- **Verificación requerida:** Simular fallos y recuperación; verificar publicación y retiro de incidentes y contenido sin autenticación.
- **Plan:** docs/planes/T102.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 103: Restauraciones de respaldo ensayadas
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I093
- **Prioridad original:** Esencial
- **Objetivo:** Ensayar restauración en un entorno aislado, verificar integridad y registrar resultados sin usar datos reales innecesariamente. Beneficio esperado: Comprobar que las copias pueden recuperarse cuando se necesitan.
- **Dependencias:** T9
- **Criterios de Éxito:** Se restaura una copia sintética en entorno aislado y se comprueban integridad, relaciones y permisos; se registran resultados y límites.
- **Verificación requerida:** Restaurar de forma completa y parcial, comparar archivos y registros y ensayar una copia inválida.
- **Plan:** docs/planes/T103.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 104: Avisos de capacidad y consumo
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I094
- **Prioridad original:** Esencial
- **Objetivo:** Vigilar almacenamiento, colas y servicios con umbrales definidos por el equipo y acciones de respuesta claras. Beneficio esperado: Detectar límites operativos antes de que afecten nuevos envíos.
- **Dependencias:** T5, T32, T35
- **Criterios de Éxito:** Almacenamiento, cola y servicios tienen umbrales aprobados, responsable y respuesta; las alertas excluyen contenido de casos.
- **Verificación requerida:** Forzar umbrales, verificar deduplicación y recuperación de avisos y revisar sus campos.
- **Plan:** docs/planes/T104.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 105: Cambios reversibles en producción
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I095
- **Prioridad original:** Esencial
- **Objetivo:** Preparar reversión y activación gradual de funciones compatibles con datos existentes, con criterios observables de retirada. Beneficio esperado: Reducir el alcance de una versión que introduce un problema.
- **Dependencias:** T1, T38
- **Criterios de Éxito:** La activación gradual se puede detener y revertir con datos compatibles; los criterios de retirada son observables.
- **Verificación requerida:** Ensayar publicación y reversión en preview con pendientes y una migración compatible; registrar resultados.
- **Plan:** docs/planes/T105.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 106: Pruebas de uso con situaciones representativas
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I096
- **Prioridad original:** Después
- **Objetivo:** Realizar sesiones voluntarias con escenarios ficticios, personas diversas y registro mínimo de observaciones. Beneficio esperado: Encontrar dificultades de comprensión que no detecta una prueba automática.
- **Dependencias:** T2, T3, T6
- **Criterios de Éxito:** Sesiones voluntarias con escenarios ficticios producen hallazgos y decisiones; el registro minimiza datos y distingue observación de interpretación.
- **Verificación requerida:** Ejecutar protocolo con participantes del alcance, documentar hallazgos y verificar cambios o descarte razonado.
- **Plan:** docs/planes/T106.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 107: Presupuesto de rendimiento por pantalla
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I097
- **Prioridad original:** Después
- **Objetivo:** Definir límites medibles de carga, respuesta y peso según pruebas reales, y revisar regresiones antes de publicar. Beneficio esperado: Mantener las acciones principales utilizables en teléfonos modestos.
- **Dependencias:** T2, T101
- **Criterios de Éxito:** Los presupuestos por pantalla derivan de mediciones de dispositivos representativos; una regresión se detecta antes de publicar.
- **Verificación requerida:** Medir carga, respuesta y transferencia en condiciones reproducibles; introducir una regresión controlada y comprobar el aviso.
- **Plan:** docs/planes/T107.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 108: Inventario de dependencias y mantenimiento
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I098
- **Prioridad original:** Esencial
- **Objetivo:** Registrar responsables, versiones y revisión de avisos relevantes, con una rutina de actualización y verificación. Beneficio esperado: Evitar que componentes olvidados acumulen problemas de compatibilidad.
- **Dependencias:** T1
- **Criterios de Éxito:** El inventario identifica dependencias, versiones y responsables; una actualización sigue revisión de compatibilidad y verificación.
- **Verificación requerida:** Comparar manifests y lockfile, revisar avisos aplicables y ejecutar actualización controlada en entorno de prueba.
- **Plan:** docs/planes/T108.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 109: Verificaciones de salud con datos sintéticos
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I099
- **Prioridad original:** Después
- **Objetivo:** Ejecutar comprobaciones identificables en un entorno o circuito separado, incluyendo recepción y lectura de archivos ficticios. Beneficio esperado: Detectar fallos del recorrido completo sin crear denuncias reales.
- **Dependencias:** T5, T6, T102
- **Criterios de Éxito:** Las comprobaciones recorren recepción y lectura con datos sintéticos identificables en circuito separado; un fallo relevante cambia la salud observada.
- **Verificación requerida:** Ejecutar recorrido normal y fallos de almacenamiento o lectura; verificar avisos y ausencia de casos reales.
- **Plan:** docs/planes/T109.md (se redacta y audita al ejecutar; no se da por existente).

---

### [ ] Tarea 110: Tablero de utilidad y abandono
- **Área:** Calidad y sostenibilidad
- **Idea de origen:** I100
- **Prioridad original:** Explorar
- **Objetivo:** Combinar métricas agregadas de flujo y preguntas opcionales de utilidad, excluyendo relatos y datos precisos de los casos. Beneficio esperado: Aprender qué ayuda y dónde se atascan las personas.
- **Dependencias:** T59
- **Criterios de Éxito:** El tablero ofrece pasos, errores y utilidad agregados con definiciones visibles; excluye relatos, ubicación precisa y grupos fuera de límites de privacidad.
- **Verificación requerida:** Alimentar eventos sintéticos, validar cálculos y filtros y comprobar que desactivar medición evita nuevas emisiones.
- **Plan:** docs/planes/T110.md (se redacta y audita al ejecutar; no se da por existente).
