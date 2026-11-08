# Evidencia de Verificación: Tarea 9 (Bloque 5)

**Tarea:** T9 — Bloque 5: Panel Privado de Gestión y Enlace Firebase Auth  
**Fecha:** 2026-11-08  
**Estado:** Verificado con éxito (lint, tsc, build, build:pages, E2E Next y E2E Cloudflare Pages).

---

## 1. Resumen de Implementación

- **Autenticación y Autorización Criptográfica:**
  - Capa de validación de Firebase Auth ID Tokens con firma criptográfica RS256 mediante Web Crypto estándar (`crypto.subtle.verify`).
  - Validación de claims `iss`, `aud`, `sub`, `exp`, `iat` y proyecto oficial `alzavoz-3e805`.
  - Soporte para claves oficiales de Google en producción y claves de prueba sintéticas deterministas para pruebas locales aisladas offline.
  - Zero-Trust: denegación estricta (HTTP 401) en interfaz y en endpoints de servidor ante tokens ausentes, expirados, manipulados o con emisor incorrecto.
  - Control de procedencia contra peticiones cross-site (HTTP 403).

- **Gestión de Expedientes y Persistencia Cloudflare D1:**
  - Modelo administrativo sobre `confidential_reports` y `report_attachments`.
  - Migración `0004_admin_columns.sql` incorporando `admin_notes` y `updated_at`.
  - Filtros multicriterio: comuna, nivel de riesgo (`alto`, `medio`, `bajo`), categoría legal, estado y búsqueda textual por código o palabra clave.
  - Métricas en tiempo real: total de expedientes, radicados nuevos, en revisión, en trámite, oficios tramitados.
  - Actualización de estados (`radicado` -> `en_revision` -> `en_tramite` -> `oficio_tramitado` -> `archivado`) y notas de gestión interna vía `PATCH /api/admin/reports/:code`.

- **Bóveda de Evidencias Segura (Cloudflare R2):**
  - Descarga y visualización controlada de adjuntos multimedia higienizados (`GET /api/admin/reports/:code/attachments/:slot`).
  - Validación estricta de pertenencia al expediente (evita acceso cruzado entre casos).
  - Acceso seguro a grabaciones continuas en caliente (`GET /api/admin/reports/:code/recording/:clipIndex`).
  - Cabeceras de protección: `X-Content-Type-Options: nosniff`, `Content-Disposition`, `X-Content-SHA256`.

- **Generador de Documentos Jurídicos con IA (DeepSeek) y Revisión Humana Obligatoria:**
  - Generación formal de Derechos de Petición (Art. 23 C.P., Ley 1755 de 2015) y Oficios Oficiales.
  - Entidades destinatarias configuradas: Secretaría de Movilidad de Medellín, MEVAL / Policía Metropolitana, ICBF, Fiscalía General de la Nación, Personería Distrital de Medellín.
  - Prompt blindado contra inyecciones y alucinaciones.
  - Fallback determinista con plantilla normativa colombiana ante indisponibilidad de API key o red.
  - Inclusión obligatoria del aviso:
    `AVISO OBLIGATORIO: ESTE DOCUMENTO ES UN BORRADOR PRELIMINAR GENERADO PARA APOYO JURÍDICO. REQUIERE REVISIÓN, VERIFICACIÓN DE IDENTIDAD Y EDICIÓN POR PARTE DE UN ABOGADO O INTEGRANTE DEL EQUIPO ANTES DE CUALQUIER RADICACIÓN ANTE AUTORIDADES. ALZAVOZ NO ENVÍA DOCUMENTOS DE FORMA AUTOMÁTICA.`
  - Inclusión obligatoria de campos pendientes `[PENDIENTE: ...]`.
  - Ausencia deliberada de mecanismos de envío automático a entidades; el documento se descarga o copia para radicación humana por canales oficiales.

- **Diseño y Accesibilidad UX Bajo Estrés:**
  - Integración en `AppShell` bajo modo Defensor (rojo/ámbar) con avatar de Alza Bot Defensor.
  - Controles táctiles críticos con altura mínima de 56px (`min-height: 56px`).
  - Tokens oficiales `#0B0F19` y `#111827`, contraste superior a 7:1 en datos cruciales.
  - Soporte de privacidad antiespía con `ZeroPeepToggle` y clases `data-sensitive`.

---

## 2. Comandos y Resultados

| Comando | Resultado | Observaciones |
| :--- | :--- | :--- |
| `pnpm lint` | **Exit 0** | 0 advertencias, 0 errores en todo el proyecto. |
| `pnpm exec tsc --noEmit` | **Exit 0** | Tipado estricto completado sin `any`. |
| `pnpm build` | **Exit 0** | 13 rutas compiladas con static prerender de `/admin`. |
| `pnpm build:pages` | **Exit 0** | Salida estática exportada a `out/admin.html` validada. |
| `pnpm test e2e/admin.spec.ts` | **5/5 passed** | Tests unitarios, de servidor, D1/R2, IA y UI en Next.js. |
| `PLAYWRIGHT_PAGES=1 pnpm test e2e/admin.spec.ts` | **5/5 passed** | Tests verificados en el entorno de Cloudflare Pages Functions. |
