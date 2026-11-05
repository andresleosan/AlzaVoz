# MEMORY: ALZAVOZ & ALZA BOT (MEDELLÍN)

## Resumen de Arquitectura e Infraestructura Vinculada
- **Frontend & PWA:** Next.js (App Router), TypeScript estricto, Tailwind CSS v4, pnpm.
- **Hosting & CI/CD:** Cloudflare Pages enlazado a `andresleosan/AlzaVoz` (rama `main`, build: `npx next build`, output: `out`).
- **Persistencia Edge:** Cloudflare D1 (`alzavoz-db`) + Cloudflare R2 (`alzavoz-evidencias`).
- **Autenticación Panel Concejal:** Firebase Auth (`alzavoz-3e805`, No. 897775972477). Ciudadanos sin login.
- **Inteligencia Artificial:** DeepSeek API (`deepseek-chat`) para Alza Bot.
- **Canal WhatsApp:** WhatsApp oficial Concejal (+57 3234306794) + Alza Bot SIM.

## Estado del Proyecto
- **Última Tarea Completada:** Tarea 3 (Bloque 1 - Parte A: Botón SOS Inteligente de Emergencia y Alerta Rápida, Lectura GPS gigante para el 123, Contactos de Confianza y Tests E2E Playwright).
- **Tarea Actual / En Cola:** Tarea 4 (Bloque 1 - Parte B: Alza Bot Defensor Legal en Vivo y Choques "Solo Latas").
- **Próximo Modelo Recomendado:** 3.8 Flash (High).
