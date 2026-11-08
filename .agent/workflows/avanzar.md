---
description: Retoma el contexto desde MEMORY.md en una sesión fresca, ejecuta la siguiente tarea pendiente de Alzavoz con todo el pipeline de skills y recomienda qué modelo (3.8 Flash o Argon) y esfuerzo (Low, Medium, High) usar para la próxima sesión.
---

# PROTOCOLO DE EJECUCIÓN `/avanzar`

## Control automático del repositorio

Antes de leer contexto o elegir una tarea, ejecuta `node scripts/verificar-repositorio.mjs --sync` desde el checkout de AlzaVoz. Debe confirmar `origin` de lectura y escritura en `andresleosan/AlzaVoz`, rama `main` y el mismo SHA local/remoto tras un fetch nuevo. Actualiza un atraso limpio solo por fast-forward; conserva e informa los cambios sin commit. Si falla, resuelve primero el cierre pendiente, la operación Git, el atraso o la divergencia sin perder trabajo, sin stash/reset/clean automáticos ni push a ciegas. No empieces otra tarea hasta que el control pase. Después del push, ejecuta `node scripts/verificar-repositorio.mjs` y comprueba de nuevo la igualdad; esto no certifica el despliegue Cloudflare.

Cada vez que el usuario ejecute `/avanzar`, cumple estrictamente estos 6 pasos:

1. **Lectura Ligera de Contexto:**
   - Lee únicamente `MEMORY.md`, `TASKS.md` y `DESIGN.md` para ubicarte sin gastar tokens innecesarios.
   - Identifica la siguiente tarea pendiente `[ ]` en `TASKS.md`.

2. **Planificación y Auditoría Previa:**
   - Ejecuta `/brainstorming` enfocado en la tarea actual.
   - Genera el plan de implementación con `/writing-plans` respetando `DESIGN.md`.
   - Cuestiona y blinda el plan con `/grill-me`.

3. **Construcción e Implementación Segura:**
   - Implementa la tarea aplicando `/impeccable`, `/taste-skill` y `/redesign-skill` (integrando las imágenes correspondientes de Alza Bot).
   - Aplica `/security-best-practices` y `/frontend-security-coder` en cada archivo tocado.

4. **Pulido Anti-Slop:**
   - Limpia y refactoriza el código escrito usando `/anti-slop` y `/ponytail` (cero `any`, código limpio y modular).

5. **Verificación y Pruebas E2E:**
   - Usa `/superpowers` para verificar que el build y tipado pasen sin errores.
   - Ejecuta pruebas automatizadas con `/playwright` validando la funcionalidad construida.

6. **Cierre, Git Push y Recomendación en Escala de 6 Niveles (OBLIGATORIO):**
   - Marca la tarea actual como completada `[x]` en `TASKS.md`.
   - Actualiza `MEMORY.md` (manteniéndolo siempre por debajo de 35 líneas).
   - Ejecuta `git add .`, `git commit -m "feat: ..."` y `git push`.
   - Evalúa la complejidad técnica de la **siguiente tarea pendiente** en `TASKS.md` dentro de los 6 niveles disponibles (`3.8 Flash Low/Medium/High` o `Argon Low/Medium/High`) y muestra SIEMPRE este cuadro al final de tu respuesta:

   ---
   ✅ **TAREA COMPLETADA Y ENVIADA AL REPOSITORIO**
   - **Resumen:** [1 o 2 líneas de lo construido y probado con Playwright]
   
   🎯 **RECOMENDACIÓN DE EFICIENCIA PARA EL PRÓXIMO `/avanzar`:**
   - **Próxima Tarea:** [Número y nombre de la siguiente tarea en TASKS.md]
   - **Modelo y Modalidad a seleccionar:** **[Elegir 1 de los 6: 3.8 Flash (Low) | 3.8 Flash (Medium) | 3.8 Flash (High) | Argon (Low) | Argon (Medium) | Argon (High)]**
   - **Motivo:** [Explicación de 1 línea de por qué este nivel exacto es el punto óptimo entre calidad y ahorro de tokens]
   ---

