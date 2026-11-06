# Interfaz web y móvil de AlzaVoz

## Objetivo y alcance

Hacer que el inicio permita elegir una herramienta con claridad y que escritorio
aproveche su ancho. Conservar el tema oscuro, identidad, privacidad, salida rápida,
grabación y consultas existentes. Sin dependencias nuevas ni cambios de backend.

Problemas confirmados: límite global de 448 px, navegación que solo cambiaba el
tema, selector de modos duplicado, paneles completos acumulados en inicio, anclas
sin destino y datos de ubicación/expediente fijos presentados como reales.

## Referencias inspeccionadas con el MCP de Mobbin

- [Plane, web](https://mobbin.com/screens/282de969-4022-4f62-b135-931aa270b1b8):
  navegación lateral separada del espacio de trabajo y accesos con menor peso.
- [Snowflake, web](https://mobbin.com/screens/2377eb92-83f6-4428-bc1b-6332d2aaa00c):
  navegación persistente y contenido que utiliza el ancho de escritorio.
- [Hinge, iOS](https://mobbin.com/screens/24b9743f-e76d-4e2d-be60-4a30fe42155f):
  recursos de seguridad agrupados, acceso telefónico y navegación inferior.

Se tomó estructura, sin copiar marca, imágenes, tipografía ni contenido de esas
aplicaciones. Plane/Snowflake son referencias de otro dominio. Las búsquedas
adicionales no devolvieron una pantalla de Citizen y no se atribuyen patrones a ella.

## Decisiones

1. Escritorio: barra lateral desde 1024 px y contenido ancho. Móvil/tablet:
   navegación inferior. Las cuatro opciones enlazan a rutas reales y señalan la actual.
2. Inicio: entrada SOS y lista de herramientas. SOS, consultas y grabación tienen
   pantallas independientes. Se eliminan selector duplicado y paneles embebidos.
3. SOS: acciones y ubicación junto a líneas/contactos en escritorio; una columna
   en móvil. Defensor: selección junto a respuesta. Menos halos, badges y fondos.
4. Controles críticos de al menos 56 px, foco visible, zoom habilitado y adaptación
   de la barra de grabación al área de contenido. Sin texto esencial truncado.
   La navegación normal se bloquea durante captura, operaciones y clips pendientes;
   la salida rápida conserva su funcionamiento inmediato. Dos pruebas cubren
   captura activa y pendientes tras un fallo de subida.
5. Correcciones de veracidad, por criterio propio a partir del código: ubicación
   dentro de SOS; sin expediente ficticio; Línea 155 como enlace telefónico;
   Radar identificado como pendiente porque no tiene implementación.

Se descartó ampliar únicamente el contenedor: habría mantenido las funciones
duplicadas. Tampoco se implementaron los módulos futuros de Radar/Violeta.

## Ejecución y verificación

- [x] Congelar capturas de escritorio y móvil antes de editar.
- [x] Añadir prueba que falla con el ancho/navegación anteriores.
- [x] Adaptar shell, navegación, inicio y paneles conservando sus flujos.
- [x] Revisar capturas a 320/393/768/1024/1440 px: cuatro rutas sin desbordamiento.
- [x] Ejecutar lint, TypeScript, build Next y build Pages.
- [x] Ejecutar suite completa sobre Pages Functions + Worker local: 47/47 aprobadas.
- [x] Revisión independiente: riesgo de pérdida al navegar corregido y verificado.

Publicación: commit y push directo a main, preparando solo los archivos de esta
interfaz y sus pruebas. Tras el push se comprueban Pages, Workers Builds y las
rutas públicas; sus resultados se informan en la respuesta de entrega.

Límite: las capturas y pruebas en Chromium emulan tamaños; no sustituyen pruebas
de cámara, llamadas, Safari o uso táctil en dispositivos físicos.
