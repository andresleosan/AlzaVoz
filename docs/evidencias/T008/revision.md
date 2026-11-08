# T008 · Revisión independiente de conformidad y calidad

Fecha: 2026-11-07. Base declarada: `52152296afa3388d749b009fa5afb229cf2b90b5`.

Revisión estática del paquete `review-package.txt` y los archivos vigentes, plan T008, requisitos T8 de TASKS/DESIGN, informe del implementador, integración Worker/Pages/Next y pruebas dirigidas. Revisión posterior acotada de `fix-package.txt`, SearchPanel vigente, dos nuevas regresiones E2E y sección de corrección del informe. No ejecuté pruebas ni modifiqué implementación. El único archivo escrito por esta revisión es este informe. Los cambios locales previos permanecen fuera del alcance.

**Estado final: sin hallazgos abiertos. P2 corregido y revisado; spec y quality aprobados.** El cierre sigue condicionado por root al resultado final de 100/100 pruebas en Next y Pages, además de las verificaciones de publicación independientes.

## Hallazgos

### P2 resuelto · Un rechazo de validación dejaba publicación y pista atrapadas en reintentos inválidos

Los puntos siguientes describen la versión inicial, antes de la corrección; las ubicaciones originales se conservan para trazabilidad.

- Ubicación principal: `src/components/search/SearchPanel.tsx:31-34`.
- Mismo defecto en pistas: `src/components/search/SearchPanel.tsx:67-70`; campos deshabilitados en líneas 41 y 85, botón Atrás oculto en línea 50.
- `attempted` pasa a true antes de enviar y el catch solo muestra el mensaje. El payload queda congelado incluso después de un 400 definitivo del servidor. Por ejemplo, un título o pista `"  a"` supera el `minLength={3}` de HTML, pero los parsers exigen al menos tres caracteres tras `trim()`. Una descripción con diez espacios también supera la validación nativa y falla en servidor.
- Resultado: la API pide revisar los campos mientras todos están deshabilitados; cada reintento envía exactamente el contenido rechazado. Publicar exige cerrar y perder el formulario completo; en pistas ni siquiera existe un control para volver a editar y se debe recargar. La advertencia de que el envío puede estar guardado también es incorrecta para este rechazo confirmado.
- Corrección acotada: validar con los contratos compartidos antes de congelar el primer envío, mostrando un error corregible y conservando los campos; o distinguir rechazos definitivos para permitir corregir y renovar el requestId. Mantener el payload y requestId actuales cuando el resultado sea ambiguo (timeout/red/503), como ya cubren las pruebas de idempotencia.
- Cobertura que falta: entrada con longitud HTML válida pero longitud recortada inválida, corrección sin perder campos y posterior envío exitoso para aviso y pista. No requiere cambiar contratos ni añadir funcionalidades fuera de T8.

**Revisión de corrección: addressed.** En la versión final `SearchPanel.tsx:34-43` y `77-86`, ambos formularios validan con los parsers compartidos antes de guardar pending o deshabilitar campos. Un rechazo local no envía petición y conserva valores/consentimiento. `ApiError` conserva el status incluso si el cuerpo de error no es JSON; un 400 libera pending/attempted, permite corregir y genera un nuevo requestId al próximo envío. El rechazo 400 del contrato existente sucede antes de persistir, por lo que es correcto liberarlo. Timeout/red/503 y respuestas exitosas sin confirmación válida mantienen payload/requestId para reintento idempotente; 429 conserva también ese estado. No se cambiaron backend, validadores ni proyecciones privadas.

Las dos nuevas pruebas en `e2e/search.spec.ts:9` y `:37` cubren el caso con espacios sin POST, rechazo remoto 400, conservación de datos y consentimiento, edición posterior, nuevo requestId y éxito. El caso de aviso también comprueba fecha corregida y revocación del consentimiento. Siguen presentes las pruebas anteriores que exigen cuerpo idéntico después de perder una respuesta 503. No detecté regresiones adicionales en este cambio acotado. Root informa además comprobación MCP de pista editable tras espacios y 400, seguida de guardado 200.

## Conformidad

**Veredicto spec: aprobado tras la corrección.** Los criterios funcionales principales T8 están implementados: cuatro categorías, creación/consulta persistentes, consentimiento y revisión, QR al aviso, pistas privadas y sugerencias etiquetadas como hipótesis. La recuperación de validación conserva la edición y resuelve el único incumplimiento hallado. La revisión de conformidad no reemplaza la suite final exigida para el cierre.

- Campos privados separados del UUID público y excluidos de respuestas públicas mediante proyección explícita. El requestId no aparece en los avisos.
- Idempotencia mantiene payload canónico, compara también contacto y noticeId de pistas, usa conflicto de unicidad y relee después del INSERT. Las pruebas cubren concurrencia de creación y cambio de datos/destino.
- Límite de lista 60 y candidatos 20 comunicado en UI; razonable para el alcance acordado. No se exige paginación ni búsqueda histórica adicional.
- Consentimiento IA antes de lectura de candidatos; límite aplicado antes de consultar colección candidata; datos proyectados públicos; IDs y motivos validados; sin candidatos no se invoca modelo. Error 429 preservado.
- Canvas y QR diferidos, texto autorizado y zona del QR separada. Decoder independiente en E2E, incluida entrada máxima. No se exige foto para T8.
- Campos privados marcados data-sensitive; no almacenamiento del navegador introducido. Salida rápida heredada y advertencia explícita sobre historial/copias. No se cambia el funcionamiento global del camuflaje.
- Entrada Pages presente y compartida con Next. Export comprueba search.html; Worker enruta después de autenticar gateway. No hay secretos nuevos en cliente ni any añadido en código de T8.

## Calidad

**Veredicto quality: aprobado; sin hallazgos abiertos.** La arquitectura reutiliza infraestructura existente, mantiene SQL parametrizado y datos React/Canvas sin HTML, limita entradas y rechaza rutas/campos inesperados. No encontré una exposición privada, bypass de gateway o defecto de idempotencia en la versión examinada. Las correcciones anteriores de requestId independiente, limitación de candidatos, fechas imposibles y título/QR están presentes. El arreglo P2 reutiliza validadores existentes y distingue rechazo definitivo de resultado incierto sin ampliar el alcance.

## Declined-to-judge y verificación pendiente

- No ejecuté ni certifico personalmente suites completas, build Pages, comprobación visual MCP ni despliegues. Root informa builds finales Next/Pages y lint/tsc con exit 0, MCP final correcto y suites de 100 pruebas en curso; la suite inicial de 98 pasó. El cierre debe esperar 100/100 en ambos entornos y verificar después cada despliegue. La ejecución en curso no constituye otro hallazgo.
- Las 10 pruebas dirigidas y tsc/lint son evidencia reportada por el implementador, no ejecución propia de esta revisión.
- No certifico respuesta real de DeepSeek ni calidad semántica del matching en producción; revisé contrato, validación y pruebas con respuestas controladas. Modelo/endpoint coinciden con integración existente.
- No certifico entrega de pistas a operadores, moderación, caducidad ni cuotas distribuidas globales: corresponden a tareas posteriores y la UI declara los límites. No solicito ampliar ese alcance.
- No evalúo cambios previos de workflows, planificación, seguimiento o demos ajenos a T8.
