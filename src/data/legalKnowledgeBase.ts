import { type LegalResponse, type LegalPreset } from "@/types/defender";

export const LEGAL_PRESETS: LegalPreset[] = [
  {
    id: "preset-grabar-policia",
    label: "Derecho a Grabar al Policía",
    shortDescription: "¿Me pueden quitar el celular o prohibir filmar?",
    category: "policia",
    iconName: "Camera",
    query: "derecho a grabar procedimiento policial celular requisa",
  },
  {
    id: "preset-inmovilizacion-grua",
    label: "Retén: Amenaza de Grúa",
    shortDescription: "Causales de inmovilización y 60 minutos de subsanación",
    category: "transito",
    iconName: "Car",
    query: "reten transito grua inmovilizacion moto carro subsanar",
  },
  {
    id: "preset-choque-solo-latas",
    label: "Choque 'Solo Latas' (Ley 2251)",
    shortDescription: "Fotos obligatorias y retiro inmediato sin esperar tránsito",
    category: "choque",
    iconName: "FileText",
    query: "choque solo latas ley 2251 mover carro dano material",
  },
  {
    id: "preset-alcoholemia",
    label: "Prueba de Alcoholemia",
    shortDescription: "Derechos, calibración de alcohosensor y boquilla",
    category: "alcoholemia",
    iconName: "Wine",
    query: "alcoholemia alcohosensor boquilla calibracion prueba",
  },
  {
    id: "preset-requisa-personal",
    label: "Requisa y Registro Personal",
    shortDescription: "Límites del registro superficial en vía pública",
    category: "derechos",
    iconName: "UserCheck",
    query: "requisa registro personal policia limites",
  },
  {
    id: "preset-traslado-proteccion",
    label: "Traslado por Protección",
    shortDescription: "¿Cuándo es legal llevar a una persona a la UPJ/CTI?",
    category: "policia",
    iconName: "ShieldAlert",
    query: "traslado por proteccion estacion policia upj derechos",
  },
];

export const LEGAL_RESPONSES_REPOSITORY: Record<string, LegalResponse> = {
  "preset-grabar-policia": {
    id: "preset-grabar-policia",
    category: "policia",
    title: "Derecho a Grabar Procedimientos de Policía",
    query: "derecho a grabar policía celular",
    lawCitation: {
      lawNumber: "Ley 1801 de 2016 (Código Nacional de Seguridad y Convivencia)",
      article: "Artículo 21 (Carácter público de las actividades de policía)",
      summary:
        "Todo procedimiento de policía es de carácter público. Todo ciudadano está facultado para grabar en video, audio o fotografía las actuaciones de las autoridades de policía sin que estas puedan impedirlo, despojarlo de su equipo o exigirle borrar el material.",
      officialTextExcerpt:
        "«Todo procedimiento policivo podrá ser grabado mediante cualquier medio de las tecnologías de la información y las comunicaciones, por lo que le está prohibido a cualquier persona, salvo las restricciones expresas de ley, impedir que sean grabadas o incautar los medios utilizados para tal fin.»",
    },
    agentScript: {
      scriptText:
        "«Oficial, con el debido respeto le recuerdo que según el Artículo 21 de la Ley 1801 de 2016, todo procedimiento policial es público y tengo el derecho constitucional y legal de documentar esta diligencia en video para garantía de ambas partes. No estoy obstruyendo su labor ni me niego a colaborar; únicamente ejerzo mi derecho ciudadano.»",
      toneAdvice:
        "Mantén voz firme, calmada y tono respetuoso. Sostén el teléfono a la altura del pecho sin acercarlo bruscamente a la cara del uniformado.",
    },
    evidenceChecklist: [
      {
        id: "ev-1",
        instruction: "Filma en plano general visible el rostro del uniformado y la placa de identificación bordada en su chaleco o camisa.",
        isMandatory: true,
      },
      {
        id: "ev-2",
        instruction: "Registra el número de sigla de la patrulla o motocicleta oficial (visible en los costados o baúl).",
        isMandatory: true,
      },
      {
        id: "ev-3",
        instruction: "Di en voz alta la fecha, hora exacta y dirección o referencia del lugar en Medellín donde te encuentras.",
        isMandatory: true,
      },
      {
        id: "ev-4",
        instruction: "Si el oficial intenta arrebatar el celular, no forcejees físicamente: mantén el audio grabando y advierte la violación flagrante del Art. 21.",
        isMandatory: true,
      },
    ],
    keyWarning:
      "Ningún policía tiene la facultad legal de desbloquear tu teléfono, revisar tu galería o exigirte borrar ningún archivo. Eso constituye abuso de autoridad y extralimitación de funciones.",
    source: "local-instant",
  },

  "preset-inmovilizacion-grua": {
    id: "preset-inmovilizacion-grua",
    category: "transito",
    title: "Inmovilización de Vehículo y Orden de Grúa",
    query: "inmovilización grúa retén tránsito",
    lawCitation: {
      lawNumber: "Ley 769 de 2002 (Código Nacional de Tránsito Terrestre)",
      article: "Artículos 125, 131 y 135 (y Circular MinTransporte 20223040045295)",
      summary:
        "La inmovilización es una medida preventiva, no punitiva. Para infracciones subsanables en el sitio (ej. luces averiadas, placas ilegibles o falta de acompañante), el agente debe conceder hasta 60 minutos para subsanar la falla antes de ordenar el enganche de la grúa. Si el vehículo no ha iniciado el traslado en grúa, no pueden cobrarte el servicio completo de acarreo.",
      officialTextExcerpt:
        "«La orden de comparendo no es una sanción, es una notificación para comparecer ante la autoridad. En casos subsanables se dará un término de hasta 60 minutos para subsanar la causa que dio origen a la inmovilización.»",
    },
    agentScript: {
      scriptText:
        "«Señor Agente de Tránsito, de acuerdo con el Artículo 125 de la Ley 769 y la reglamentación del Ministerio de Transporte, solicito respetuosamente que se me conceda el plazo legal de hasta 60 minutos para subsanar en el sitio la causal invocada antes de enganchar la grúa. Asimismo, exijo que se elabore el inventario detallado del vehículo con copia firmada antes de cualquier movimiento.»",
      toneAdvice:
        "Exprésate con serenidad técnica. No te interpongas físicamente frente a la grúa; documenta todo en video.",
    },
    evidenceChecklist: [
      {
        id: "ev-grua-1",
        instruction: "Graba el estado exterior e interior del vehículo antes de ser tocado por los operarios de la grúa (rayones, accesorios, tablero encendido).",
        isMandatory: true,
      },
      {
        id: "ev-grua-2",
        instruction: "Exige y fotografía la planilla de inventario del vehículo debidamente diligenciada y firmada por el agente y el conductor de la grúa.",
        isMandatory: true,
      },
      {
        id: "ev-grua-3",
        instruction: "Verifica que el agente porte su carnet visible y el número de agente de tránsito de la Secretaría de Movilidad de Medellín.",
        isMandatory: true,
      },
      {
        id: "ev-grua-4",
        instruction: "Ten presente: firmar el comparendo NO significa aceptar culpabilidad; significa recibir la citación para pedir audiencia de descargos dentro de los 5 días hábiles siguientes.",
        isMandatory: false,
      },
    ],
    keyWarning:
      "Si firmas el comparendo en observación, puedes escribir: «Firmo en calidad de notificación, no acepto los cargos y solicito audiencia pública».",
    source: "local-instant",
  },

  "preset-choque-solo-latas": {
    id: "preset-choque-solo-latas",
    category: "choque",
    title: "Choques Simples 'Solo Latas' (Ley Julián Esteban)",
    query: "choque simple solo latas ley 2251",
    lawCitation: {
      lawNumber: "Ley 2251 de 2022 (Ley Julián Esteban)",
      article: "Artículo 16 (Modificatorio del Art. 143 de la Ley 769 de 2002)",
      summary:
        "En choques donde solo se produzcan daños materiales («solo latas») y NO haya personas lesionadas ni fallecidas, es OBLIGATORIO para los conductores tomar evidencias fotográficas/fílmicas y RETIRAR INMEDIATAMENTE los vehículos de la vía para no obstruir el tráfico. NO se debe esperar a los agentes de tránsito.",
      officialTextExcerpt:
        "«En los eventos de colisión entre vehículos asegurados o no asegurados donde solo se causen daños materiales, los conductores deberán retirar inmediatamente los vehículos colisionados y todo elemento que pueda interrumpir el tránsito... Para ello, deberán tomar fotografías o videos que sirvan de prueba a las compañías aseguradoras.»",
    },
    agentScript: {
      scriptText:
        "«Compañero conductor, de conformidad con el Artículo 16 de la Ley 2251 de 2022, dado que este choque solo causó daños materiales y afortunadamente ninguno está lesionado, procedamos a tomar las 4 fotografías técnicas reglamentarias y movamos de inmediato los vehículos al costado de la vía. Si permanecemos bloqueando el carril esperando a tránsito, ambos seremos multados por obstaculizar el flujo vehicular con comparendo C.03.»",
      toneAdvice:
        "Tono cordial, cooperativo y enfocado en evitar una sanción de tránsito innecesaria para ambas partes.",
    },
    evidenceChecklist: [
      {
        id: "ev-sl-1",
        instruction: "Foto 1 (Panorámica): Vista amplia que demuestre la vía, el carril, señalización y entorno del siniestro.",
        isMandatory: true,
      },
      {
        id: "ev-sl-2",
        instruction: "Foto 2 (Posición relativa): Vista donde se aprecie claramente cómo quedaron ubicados ambos vehículos respecto a la calzada.",
        isMandatory: true,
      },
      {
        id: "ev-sl-3",
        instruction: "Foto 3 (Puntos de contacto): Fotos de cerca que demuestren las raspaduras, golpes o partes rotas de cada automotor.",
        isMandatory: true,
      },
      {
        id: "ev-sl-4",
        instruction: "Foto 4 (Placas y Documentos): Placas legibles de ambos vehículos y fotos de cédulas, licencia de conducción y SOAT vigente.",
        isMandatory: true,
      },
      {
        id: "ev-sl-5",
        instruction: "Mover de inmediato los carros a la orilla o bahía más cercana y diligenciar el acta de conciliación amistosa.",
        isMandatory: true,
      },
    ],
    keyWarning:
      "Las compañías de seguros en Colombia están OBLIGADAS por la Ley 2251 a recibir las fotografías y videos digitales como prueba válida para el trámite del siniestro, sin requerir croquis oficial de tránsito.",
    source: "local-instant",
  },

  "preset-alcoholemia": {
    id: "preset-alcoholemia",
    category: "alcoholemia",
    title: "Prueba de Alcoholemia en Puesto de Control",
    query: "prueba alcoholemia alcohosensor derechos",
    lawCitation: {
      lawNumber: "Ley 769 de 2002 y Resolución 1844 de 2015 (Instituto Nacional de Medicina Legal)",
      article: "Artículo 150 (Examen y pruebas de embriaguez)",
      summary:
        "El conductor tiene derecho a que la prueba se realice con una boquilla desechable nueva y sellada abierta frente a él. Tiene derecho a exigir la verificación del certificado de calibración vigente del alcohosensor (emitido por laboratorio acreditado ante la ONAC) y a solicitar una segunda prueba de confirmación tras 10 minutos de reposo.",
      officialTextExcerpt:
        "«El operador del equipo deberá garantizar que el alcohosensor cuenta con calibración vigente, utilizar boquilla estéril de un solo uso y permitir la realización de una prueba de contraste si el usuario lo manifiesta.»",
    },
    agentScript: {
      scriptText:
        "«Señor Agente, estoy en total disposición de realizar la prueba de alcoholemia. Previamente, de acuerdo con la Resolución 1844 de Medicina Legal, le solicito me enseñe el certificado de calibración técnica vigente del equipo alcohosensor y que abra frente a mí la boquilla estéril y sellada. Asimismo, solicito que este procedimiento quede documentado en video.»",
      toneAdvice:
        "Nunca te niegues a la prueba, pues la negativa acarrea la sanción más gravosa (Grado 3 - multa millonaria e inmovilización por 20 años). Colabora exigiendo las garantías técnicas.",
    },
    evidenceChecklist: [
      {
        id: "ev-alc-1",
        instruction: "Fotografía o graba la etiqueta de calibración pegada en el dispositivo y el certificado emitido por el laboratorio metrológico.",
        isMandatory: true,
      },
      {
        id: "ev-alc-2",
        instruction: "Verifica que la boquilla sea destapada de su empaque plástico sellado justo antes de soplar.",
        isMandatory: true,
      },
      {
        id: "ev-alc-3",
        instruction: "Solicita la prueba de aire en blanco (el equipo debe marcar 0.0 mg/L en aire ambiente antes de tu soplo).",
        isMandatory: true,
      },
      {
        id: "ev-alc-4",
        instruction: "Exige la tirilla impresa del resultado que emite directamente el alcohosensor con fecha y hora exacta.",
        isMandatory: true,
      },
    ],
    keyWarning:
      "¡NUNCA TE NIEGUES A REALIZAR LA PRUEBA! La ley colombiana presume grado 3 ante la negativa injustificada, lo que acarrea cancelación de licencia e inmovilización prolongada. Realízala pero exige el protocolo completo.",
    source: "local-instant",
  },

  "preset-requisa-personal": {
    id: "preset-requisa-personal",
    category: "derechos",
    title: "Requisa y Registro Personal en Vía Pública",
    query: "requisa policial registro personal límites",
    lawCitation: {
      lawNumber: "Ley 1801 de 2016 (Código Nacional de Policía y Convivencia)",
      article: "Artículos 158 y 159 (Registro a personas y medios de policía)",
      summary:
        "El registro personal en vía pública es superficial y exterior sobre las prendas de vestir para verificar que la persona no porte armas o sustancias prohibidas. No autoriza desnudamiento, tocamientos en zonas íntimas ni revisión de billeteras o bolsos sin justificación. Debe ser realizado preferentemente por personal del mismo sexo biológico.",
      officialTextExcerpt:
        "«El registro de personas no podrá vulnerar la intimidad ni la dignidad humana. En ningún caso implicará el despojo de prendas de vestir en el espacio público.»",
    },
    agentScript: {
      scriptText:
        "«Oficial, con gusto permito el registro preventivo sobre mis prendas conforme a los Artículos 158 y 159 de la Ley 1801. Le recuerdo con respeto que el registro es superficial y no autoriza tocar indebidamente mis partes íntimas, ni despojarme de prendas ni registrar correspondencia o datos privados de mi celular en vía pública.»",
      toneAdvice:
        "Postura abierta, manos visibles, sin movimientos bruscos y con tono de respeto.",
    },
    evidenceChecklist: [
      {
        id: "ev-req-1",
        instruction: "Si viajas acompañado, pide a tu acompañante que filme el procedimiento a distancia prudente (2 a 3 metros).",
        isMandatory: true,
      },
      {
        id: "ev-req-2",
        instruction: "Verifica que el agente sea del mismo sexo biológico para el registro físico.",
        isMandatory: true,
      },
      {
        id: "ev-req-3",
        instruction: "Si te piden mostrar el contenido del morral o bolso, ábrelo tú mismo mostrando el interior, no permitas que introduzcan manos sin tu supervisión directa.",
        isMandatory: true,
      },
    ],
    keyWarning:
      "La policía no puede obligarte a desnudar una parte de tu cuerpo en la calle ni en la patrulla. Eso constituye un abuso grave denunciable ante la Procuraduría y Personería de Medellín.",
    source: "local-instant",
  },

  "preset-traslado-proteccion": {
    id: "preset-traslado-proteccion",
    category: "policia",
    title: "Traslado por Protección a Centro Policial o UPJ",
    query: "traslado por proteccion derechos ley 1801",
    lawCitation: {
      lawNumber: "Ley 1801 de 2016 y Sentencia C-281 de 2017 de la Corte Constitucional",
      article: "Artículo 155 (Traslado por Protección)",
      summary:
        "El traslado por protección NO es una detención penal ni una sanción. Solo procede cuando la vida o integridad de la persona o de terceros esté en riesgo inminente (ej. deambular en estado de grave alteración o inconsciencia). Si la persona cuenta con un familiar o allegado que se haga cargo de ella en el lugar, el traslado queda PROHIBIDO.",
      officialTextExcerpt:
        "«No se aplicará el traslado por protección si la persona está acompañada por un familiar o allegado que asuma su protección en el lugar. Las autoridades deberán comunicar de inmediato el traslado al Ministerio Público (Personería).»",
    },
    agentScript: {
      scriptText:
        "«Señor Agente, de acuerdo con el Artículo 155 de la Ley 1801 y la Sentencia C-281 de la Corte Constitucional, el traslado por protección no es una medida punitiva ni una captura. Estoy en pleno uso de mis facultades y solicito que me permita comunicarme de inmediato con un familiar o persona de confianza para que me acompañe, lo cual extingue la causal de traslado. Asimismo, exijo que se informe de inmediato a la Personería de Medellín.»",
      toneAdvice:
        "Mantén la calma absoluta. No opongas resistencia física pero insiste verbalmente en tu llamada de protección.",
    },
    evidenceChecklist: [
      {
        id: "ev-tp-1",
        instruction: "Exige el derecho a realizar una llamada telefónica inmediata a un familiar o abogado de confianza.",
        isMandatory: true,
      },
      {
        id: "ev-tp-2",
        instruction: "Anota el nombre y número de placa del comandante de patrulla que ordena el traslado.",
        isMandatory: true,
      },
      {
        id: "ev-tp-3",
        instruction: "Verifica que el tiempo máximo de permanencia en el centro asistencial no supere las 12 horas reglamentarias.",
        isMandatory: true,
      },
    ],
    keyWarning:
      "El traslado por protección no puede usarse como castigo por desacato o discusión verbal con el policía. Usarlo de esa forma es privación ilegal de la libertad.",
    source: "local-instant",
  },
};

/**
 * Busca respuestas locales instantáneas basadas en palabras clave
 */
export function findLocalLegalResponse(userQuery: string): LegalResponse {
  const normalized = userQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Si coincide con alguna preset key directa
  if (LEGAL_RESPONSES_REPOSITORY[userQuery]) {
    return LEGAL_RESPONSES_REPOSITORY[userQuery];
  }

  // Búsqueda inteligente por tokens
  if (normalized.includes("grabar") || normalized.includes("celular") || normalized.includes("filmar") || normalized.includes("foto")) {
    return LEGAL_RESPONSES_REPOSITORY["preset-grabar-policia"];
  }

  if (normalized.includes("choque") || normalized.includes("lata") || normalized.includes("estrell") || normalized.includes("accidente") || normalized.includes("2251")) {
    return LEGAL_RESPONSES_REPOSITORY["preset-choque-solo-latas"];
  }

  if (normalized.includes("alcoho") || normalized.includes("embriaguez") || normalized.includes("soplar") || normalized.includes("boquilla")) {
    return LEGAL_RESPONSES_REPOSITORY["preset-alcoholemia"];
  }

  if (normalized.includes("grua") || normalized.includes("inmovil") || normalized.includes("patio") || normalized.includes("subsanar") || normalized.includes("transito")) {
    return LEGAL_RESPONSES_REPOSITORY["preset-inmovilizacion-grua"];
  }

  if (normalized.includes("requisa") || normalized.includes("registro") || normalized.includes("bolso") || normalized.includes("morral")) {
    return LEGAL_RESPONSES_REPOSITORY["preset-requisa-personal"];
  }

  if (normalized.includes("traslado") || normalized.includes("upj") || normalized.includes("estacion") || normalized.includes("deten")) {
    return LEGAL_RESPONSES_REPOSITORY["preset-traslado-proteccion"];
  }

  // Respuesta adaptada general con los 3 bloques obligatorios
  return {
    id: `custom-${Date.now()}`,
    category: "derechos",
    title: "Orientación Legal Inmediata (Medellín)",
    query: userQuery,
    lawCitation: {
      lawNumber: "Constitución Política de Colombia y Ley 1801 de 2016",
      article: "Artículos 21, 23 y 29 (Debido Proceso y Transparencia Pública)",
      summary:
        "Toda actuación de las autoridades debe sujetarse estrictamente a la ley, con respeto irrestricto a la dignidad humana, presunción de inocencia y publicidad de los actos administrativos.",
      officialTextExcerpt:
        "«El debido proceso se aplicará a toda clase de actuaciones judiciales y administrativas. Toda persona se presume inocente mientras no se la haya declarado judicialmente culpable.»",
    },
    agentScript: {
      scriptText:
        "«Señor Agente / Funcionario, estoy actuando de buena fe y colaborando con la diligencia. Solicito respetuosamente que me indique la norma exacta y causal jurídica en la que fundamenta este requerimiento, garantizando mi derecho constitucional al debido proceso.»",
      toneAdvice:
        "Conserva la compostura, habla pausadamente y mantén una distancia prudente de seguridad.",
    },
    evidenceChecklist: [
      {
        id: "ev-gen-1",
        instruction: "Registra en video o nota de voz la fecha, hora exacta y nombres completos de los intervinientes.",
        isMandatory: true,
      },
      {
        id: "ev-gen-2",
        instruction: "Fotografía cualquier documento, comparendo o notificación entregada.",
        isMandatory: true,
      },
      {
        id: "ev-gen-3",
        instruction: "Recuerda que tienes derecho a no autoincriminarte ni firmar declaraciones bajo coacción.",
        isMandatory: false,
      },
    ],
    keyWarning:
      "Guarda copia de todo número de radicado o identificación del funcionario para tramitar tu solicitud o queja.",
    source: "local-instant",
  };
}

