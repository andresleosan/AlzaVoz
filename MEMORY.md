# MEMORY: ALZAVOZ & ALZA BOT (MEDELLÍN)

## Resumen de Arquitectura
- **Frontend & PWA:** Next.js (App Router), TypeScript estricto, Tailwind CSS v4, pnpm.
- **Edge & Backend:** Cloudflare Pages + Cloudflare Workers (Edge Runtime).
- **Persistencia:** Cloudflare D1 (`alzavoz-db`) + Cloudflare R2 (`alzavoz-evidencias`).
- **Autenticación:** Firebase Auth (Panel Concejal). Ciudadanos sin login.
- **Inteligencia Artificial:** DeepSeek API (`deepseek-chat`) para Alza Bot.
- **Canal WhatsApp:** WhatsApp oficial Concejal (+57 3234306794) + Alza Bot SIM.

## Estado del Proyecto
- **Última Tarea Completada:** Tarea 1 (Setup Next.js, Cloudflare, PWA, Assets y Playwright E2E).
- **Tarea Actual / En Cola:** Tarea 2 (Arquitectura del Sistema de Diseño "UX Bajo Estrés" y Avatar Dinámico de Alza Bot).
- **Próximo Modelo Recomendado:** 3.8 Flash (Medium).
