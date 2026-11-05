# PLAN MAESTRO DE TAREAS: ALZAVOZ & ALZA BOT (MEDELLÍN)
## Plan de Desarrollo Secuencial Atómico (10 Tareas)

---

### [x] Tarea 0: Cimentación Estratégica, Guía de Diseño y Pipeline de Automatización
- **Descripción:** Inspección exhaustiva de imágenes en raíz, elaboración de `DESIGN.md` con lineamientos "UX Bajo Estrés", plan de 10 tareas en `TASKS.md`, memoria operativa compacta `MEMORY.md`, workflow del comando `/avanzar` y commit fundacional.
- **Estado:** Completada.

---

### [x] Tarea 1: Setup del Proyecto Next.js, Cloudflare, PWA y Organización de Assets [Modelo: 3.8 Flash | Esfuerzo: Low]
- **Descripción:** Inicialización de Next.js (App Router), TypeScript estricto (`noImplicitAny`), Tailwind CSS v4 con PostCSS y pnpm. Configuración de Cloudflare (`wrangler.jsonc`). Organización canónica de activos visuales de Alza Bot en `public/assets/` y PWA (`manifest.json`, favicons, iconos). Suite de pruebas de humo E2E con Playwright ejecutada exitosamente.
- **Estado:** Completada.

---

### [x] Tarea 2: Arquitectura del Sistema de Diseño "UX Bajo Estrés" y Avatar Dinámico de Alza Bot [Modelo: 3.8 Flash | Esfuerzo: Medium]
- **Descripción:** Shell de la aplicación Mobile-First con navegación ergonómica inferior fija al alcance del pulgar (`BottomNav` con botones táctiles >= 56px cumpliendo Fitts' Law). Componente `<AlzaBotAvatar />` que reacciona de forma dinámica a los 4 modos visuales (Estándar/Cian, Defensor/Rojo, Violeta/Púrpura y Radar/Esmeralda) con auras de respiración, indicadores en vivo y micro-interacciones. Botones de Salida Rápida de Pánico (Escape) y conmutador de privacidad antiespía ("Zero-Peeping" desenfocando datos sensibles). 6 pruebas E2E en Playwright aprobadas al 100%.
- **Estado:** Completada.

---

### [ ] Tarea 3: Bloque 1 (Parte A): Botón SOS Inteligente de Emergencia y Alerta Rápida [Modelo: 3.8 Flash | Esfuerzo: High]
- **Objetivo:** Construir el módulo de pánico inteligente con lectura GPS en vivo y geocodificación inversa para Medellín (mostrando barrio y dirección exacta en tipografía gigante para lectura rápida al 123). Implementar marcación directa de emergencia (Policía 123, Ambulancia, Bomberos, Tránsito, Línea Púrpura), gestión de contactos de confianza en `localStorage` y botón de alerta silenciosa por WhatsApp (+57 3234306794) con enlace de localización.
- **Criterios de Éxito:** Detección precisa de ubicación, marcado telefónico sin latencia y despacho de mensaje de auxilio en WhatsApp a contactos guardados.

---

### [ ] Tarea 4: Bloque 1 (Parte B): Alza Bot Defensor Legal en Vivo y Choques "Solo Latas" [Modelo: 3.8 Flash | Esfuerzo: High]
- **Objetivo:** Implementar la interfaz y lógica del Defensor en Vivo asistido por DeepSeek API especializado en legislación colombiana (Ley 769 de 2002, Ley 1801 de 2016 y Ley 2251 de 2022). Respuestas estructuradas en 3 secciones: 1) Cita de norma exacta, 2) Guion respetuoso y firme para leer al agente, 3) Checklist de pruebas a grabar. Integrar el asistente interactivo de choques simples con captura fotográfica guiada y generación de acta rápida de conciliación.
- **Criterios de Éxito:** Respuestas jurídicas precisas en menos de 3 segundos, estructura de 3 bloques respetada y flujo guiado de choques completable en carretera.

---

### [ ] Tarea 5: Bloque 1 (Parte C): Caja Negra de Grabación en la Nube y Enlace Cloudflare R2 [Modelo: Argon | Esfuerzo: High]
- **Objetivo:** Desarrollar la grabadora de video y audio en el navegador (MediaRecorder API) con segmentación continua de video cada 3 segundos. Configurar y enlazar el bucket de almacenamiento en la nube Cloudflare R2 (`alzavoz-evidencias`) vinculado al proyecto `andresleosan/AlzaVoz`. Diseñar la arquitectura resiliente ante incautación, bloqueo o apagado forzoso del dispositivo móvil, con endpoints de subida segura en Cloudflare Workers y retención garantizada de los fragmentos ya transmitidos.
- **Criterios de Éxito:** Grabación ininterrumpida que persiste fragmentos en R2 en tiempo real aunque la pestaña se cierre abruptamente.

---

### [ ] Tarea 6: Bloque 2: Denuncia Confidencial Zero-Knowledge y Enlace Cloudflare D1 [Modelo: Argon | Esfuerzo: High]
- **Objetivo:** Construir el sistema de denuncias anónimas con pipeline criptográfico en el cliente: eliminación automática de metadatos EXIF/GPS de fotos y videos en el navegador antes de subir a R2, filtro de modulación y distorsión de voz con Web Audio API para notas de voz. Configurar y enlazar la base de datos SQL relacional Cloudflare D1 (`alzavoz-db`) para persistir expedientes ALZ-XXXX. Integrar el *Botón de Salida Rápida* (camuflaje instantáneo limpiando historial) y el flujo dual de despacho: 1) WhatsApp web directo a +57 3234306794 con expediente ALZ-XXXX si el usuario lo desea, o 2) Despacho anónimo desde backend/Workers sin revelar jamás la IP ni el teléfono del ciudadano.
- **Criterios de Éxito:** Metadatos 100% purgados antes de subida, audios distorsionados correctamente, salida rápida infalible y casos radicados con código único ALZ-XXXX en D1.

---

### [ ] Tarea 7: Bloque 3: Módulo de Convivencia y Alerta Barrial (Sonómetro Web) [Modelo: Argon | Esfuerzo: Medium]
- **Objetivo:** Implementar el *Sonómetro Web* usando Web Audio API para medición certificada de decibelios ambientales durante 15 segundos en casos de ruido excesivo nocturno (+12:00 AM, Art. 33 Ley 1801). Estampar fecha, hora exacta y georreferencia barrial. Agrupar reportes de una misma cuadra y alimentar el Mapa de Calor Comunitario de Medellín (por comunas y barrios) con categorías de hurtos, fleteo y riñas, preservando privacidad sin geolocalizaciones individuales expuestas.
- **Criterios de Éxito:** Medición acústica calibrada en navegador, agregación barrial de quejas y mapa de calor interactivo optimizado para móviles.

---

### [ ] Tarea 8: Bloque 4: Tableros de Desaparecidos y Afiches con QR en Canvas [Modelo: Argon | Esfuerzo: Medium]
- **Objetivo:** Desarrollar los 4 tableros comunitarios: Personas desaparecidas, Personas encontradas/desorientadas, Mascotas perdidas y Mascotas encontradas. Implementar el motor de cruce inteligente con DeepSeek API analizando rasgos físicos y ubicación barrial para alertar coincidencias. Crear el generador dinámico de afiches de búsqueda descargables en formato imagen optimizada con código QR directo al expediente para WhatsApp e Instagram, con formulario de avistamientos 100% anónimo.
- **Criterios de Éxito:** Generación de afiche en `<canvas>` con descarga instantánea, cruces semánticos precisos y recepción de pistas seguras.

---

### [ ] Tarea 9: Bloque 5: Panel Privado del Concejal & Enlace Firebase Auth [Modelo: Argon | Esfuerzo: Low]
- **Objetivo:** Construir el panel administrativo protegido vinculando la autenticación oficial de **Firebase Auth** del proyecto `alzavoz-3e805` (Proyecto ID: `alzavoz-3e805`, Número: `897775972477`) exclusivo para el equipo legal y político del Concejal. Tabla de gestión de casos en Cloudflare D1 con filtros por comuna, nivel de riesgo y categoría. Visor multimedia de evidencias con URLs firmadas temporales de Cloudflare R2, actualización de estados de radicado y generador con IA (DeepSeek) de *Derechos de Petición y Oficios Oficiales* dirigidos a la Secretaría de Movilidad, MEVAL, ICBF, Fiscalía o Personería.
- **Criterios de Éxito:** Autenticación estricta con rutas protegidas vía Firebase SDK / Tokens, descarga segura de pruebas desde R2 y generación de documentos jurídicos listos para radicar.

---

### [ ] Tarea 10: Despliegue en Cloudflare Pages, Pipeline CI/CD y Seguridad Integral [Modelo: Argon | Esfuerzo: Low]
- **Objetivo:** Configurar el pipeline definitivo de despliegue continuo en **Cloudflare Pages** conectado al repositorio GitHub `andresleosan/AlzaVoz` en rama `main` (Build command: `npx next build`, Build output: `out` con static export / Edge runtime). Aplicar directivas de blindaje contra Prompt Injection y manipulación de rol en Alza Bot. Configurar reglas de Rate Limiting en Cloudflare WAF para endpoints `/api/denuncias/*`. Ejecutar suite completa de pruebas E2E con Playwright (flujos de SOS, denuncia anónima, sonómetro y panel privado) validando el despliegue funcional en producción (`alzavoz.pages.dev`).
- **Criterios de Éxito:** Cero vulnerabilidades en pruebas de inyección, tests Playwright en verde al 100% y despliegue automatizado activo en Cloudflare Pages ante cada `git push`.

