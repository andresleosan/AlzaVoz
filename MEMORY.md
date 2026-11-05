# MEMORY: ALZAVOZ & ALZA BOT (MEDELLÍN)

## Resumen de Arquitectura e Infraestructura Vinculada
- **Frontend & PWA:** Next.js (App Router), TypeScript estricto, Tailwind CSS v4, pnpm.
- **Hosting & CI/CD:** Cloudflare Pages enlazado a `andresleosan/AlzaVoz` (rama `main`, build: `npx next build`, output: `out`).
- **Persistencia Edge:** Cloudflare D1 (`alzavoz-db`) + Cloudflare R2 (`alzavoz-evidencias`).
- **Autenticación Panel Concejal:** Firebase Auth (`alzavoz-3e805`, No. 897775972477). Ciudadanos sin login.
- **Inteligencia Artificial:** DeepSeek API (`deepseek-chat`) para Alza Bot Defensor Legal.
- **Canal WhatsApp:** WhatsApp oficial Concejal (+57 3234306794) + Alza Bot SIM.

## Estado del Proyecto
- **Última Tarea Completada:** Tarea 4 (Bloque 1 - Parte B: Alza Bot Defensor Legal en Vivo y Choques "Solo Latas" con estructura de 3 bloques: Norma, Guion y Checklist; Asistente Ley 2251 con 4 fotos y acta de retiro).
- **Tarea Actual / En Cola:** Tarea 5 (Bloque 1 - Parte C: Caja Negra de Grabación en la Nube y Enlace Cloudflare R2 con segmentación continua de video cada 3 segundos).
- **Próximo Modelo Recomendado:** Argon (High).
