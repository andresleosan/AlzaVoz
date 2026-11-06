# DeepSeek en producción

Solicitud: configurar la clave de DeepSeek para que el Defensor use IA en producción; trabajar y publicar en main.

## Diagnóstico y correcciones

- Inspección de Cloudflare: AlzaVoz no tenía DEEPSEEK_API_KEY en producción ni preview; Worker de grabaciones solo tenía su secreto de pasarela. Secrets Store de la cuenta vacío. La consulta libre devolvía local-instant en 102 ms.
- DeepSeek tenía una clave denominada Alza Bot DeepSeek, visible solo parcialmente. Se preparó en Chrome el campo cifrado DEEPSEEK_API_KEY de AlzaVoz/Production; el usuario introdujo y guardó el valor. Se confirmó su tipo secret_text sin leer ni registrar el valor.
- El código usaba deepseek-chat, retirado según la [documentación oficial](https://api-docs.deepseek.com/updates/). Se actualizó a deepseek-flash y thinking disabled, conservando el modo de respuesta directa previo. Referencia: [modo de razonamiento](https://api-docs.deepseek.com/guides/thinking_mode/).
- Tras el primer despliegue con secreto, una consulta real devolvió fallback a los 4638 ms: el timeout de 4500 ms interrumpía al proveedor. Se amplió a 15000 ms y se mantiene activo también durante la lectura del cuerpo; se libera siempre en finally.
- Los presets continúan locales e inmediatos. Sin clave, con fallo de proveedor/cuota o timeout, permanece la respuesta local existente. Ninguna clave se añadió al código, archivos de pruebas, Git ni mensajes.

## Verificación

- TDD: reproducción del modelo retirado y del corte a los 4.5 s antes de corregir. Pruebas con proveedor simulado para éxito, fallo de cuota y respuesta a los cinco segundos; no consumen credenciales reales.
- pnpm lint, pnpm build:pages y pnpm exec tsc --noEmit aprobados.
- PLAYWRIGHT_PAGES=1 pnpm test: 38/38 aprobadas, 51.4 s, contra Pages Functions + Worker/R2 locales.
- Commits de código: daf6d78 (modelo actual) y acf81a6 (timeout), publicados en main.
- Cloudflare Pages: despliegue automático `aa35f97a-14c3-449d-8dbf-ffdbc6049559` de acf81a6, success. El despliegue incluye DEEPSEEK_API_KEY cifrada; no se inspeccionó su valor.
- Consulta real por HTTPS: HTTP 200, source deepseek-ai, tres bloques presentes, 4837 ms. La duración confirma que el límite anterior de 4500 ms cortaba una respuesta válida.
- MCP Playwright en https://alzavoz.pages.dev/defender: envío desde formulario móvil 390×844, HTTP 200/source deepseek-ai en 4811 ms, etiqueta IA DeepSeek Jurídica visible, sin desbordamiento ni errores/advertencias de consola. Evidencia: docs/evidencias/deepseek-produccion.png.
- Estas pruebas verifican integración, formato y renderizado; no constituyen auditoría jurídica de cada respuesta generada ni garantía de latencia del proveedor.
