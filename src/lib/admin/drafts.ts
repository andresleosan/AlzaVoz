import {
  AUTHORITY_ENTITIES,
  DOCUMENT_KINDS,
  MANDATORY_HUMAN_REVIEW_NOTICE,
  type AdminReportDetail,
  type GenerateDraftInput,
  type LegalDraftResult,
} from './contracts';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

function buildDeterministicLegalDraft(
  report: AdminReportDetail,
  input: GenerateDraftInput
): string {
  const entityMeta = AUTHORITY_ENTITIES.find((e) => e.id === input.targetEntity);
  const kindMeta = DOCUMENT_KINDS.find((k) => k.id === input.documentKind);
  const entityName = entityMeta ? entityMeta.name : 'Autoridad Competente de Medellín';
  const docTitle = kindMeta ? kindMeta.label : 'Derecho de Petición (Art. 23 C.P.)';

  const applicant = input.applicantName || '[NOMBRE Y APELLIDOS DEL SOLICITANTE / CIUDADANO]';
  const idDoc = input.applicantId || '[NÚMERO DE CÉDULA DE CIUDADANÍA O IDENTIFICACIÓN]';
  const contact =
    input.applicantContact ||
    '[CORREO ELECTRÓNICO PARA NOTIFICACIONES JUDICIALES Y TELÉFONO DE CONTACTO]';

  const banner = `================================================================================
${MANDATORY_HUMAN_REVIEW_NOTICE}
================================================================================\n\n`;

  const todayStr = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const attachmentsList =
    report.attachments.length > 0
      ? report.attachments
          .map(
            (att, i) =>
              `   - Anexo ${i + 1}: Archivo tipo ${att.kind.toUpperCase()} (${att.mime}), tamaño ${Math.round(
                att.bytes / 1024
              )} KiB, huella digital SHA-256: ${att.sha256.slice(0, 16)}...`
          )
          .join('\n')
      : '   - Sin archivos multimedia adjuntos radicados en la bóveda digital.';

  const recordingNote = report.recordingSessionId
    ? `   - Registro de video/audio en caliente: Sesión de caja negra con ${report.recordingClipCount} clip(s) confirmados bajo hash criptográfico.`
    : '';

  return (
    banner +
    `Medellín, ${todayStr}\n\n` +
    `Señores:\n` +
    `${entityName.toUpperCase()}\n` +
    `Distrito de Ciencia, Tecnología e Innovación de Medellín\n` +
    `E. S. D.\n\n` +
    `ASUNTO: ${docTitle.toUpperCase()} — Caso de Veeduría Ciudadana AlzaVoz Ref: ${report.code}\n\n` +
    `Yo, ${applicant}, identificado(a) con C.C. No. ${idDoc}, en ejercicio del Derecho Fundamental de Petición consagrado en el Artículo 23 de la Constitución Política de Colombia, y regulado por la Ley Estatutaria 1755 de 2015 (así como la Ley 1801 de 2016 y demás normas concordantes), formulo respetuosamente ante su Despacho la siguiente solicitud con base en los hechos que paso a exponer:\n\n` +
    `I. HECHOS Y ANTECEDENTES\n\n` +
    `1. En fecha ${report.incidentDate || '[FECHA EXACTA DE LOS HECHOS]'}, en la Comuna: ${report.commune}, sector/referencia: ${report.neighborhoodReference || '[PUNTO O VÍA PÚBLICA DE MEDELLÍN]'}, ocurrieron los siguientes hechos:\n` +
    `   "${report.summary.replace(/"/g, "'")}"\n\n` +
    `2. La situación fue tipificada con nivel de riesgo ${report.riskLevel.toUpperCase()} bajo la categoría "${report.category}".\n\n` +
    `3. Los hechos fueron registrados y preservados en la plataforma ciudadana AlzaVoz bajo el código único de expediente radicado ${report.code}, aplicando protocolos de higienización de metadatos y preservación de evidencia.\n\n` +
    (input.customContext ? `4. Observaciones adicionales de contexto: ${input.customContext}\n\n` : '') +
    `II. FUNDAMENTOS DE DERECHO\n\n` +
    `Fundamento la presente solicitud en:\n` +
    `1. Artículo 23 de la Constitución Política de Colombia: Derecho fundamental de toda persona a presentar peticiones respetuosas a las autoridades por motivos de interés general o particular y a obtener pronta resolución.\n` +
    `2. Ley Estatutaria 1755 de 2015: Término perentorio para resolver peticiones de información y documentos (10 a 15 días hábiles).\n` +
    `3. Marco legal específico de la entidad:\n` +
    `   ${entityMeta?.legalBasis ?? 'Normas y resoluciones aplicables al debido proceso administrativo.'}\n\n` +
    `III. PETICIONES\n\n` +
    `Con fundamento en los hechos y normas expuestas, solicito muy respetuosamente:\n\n` +
    `PRIMERA: Se inicie la respectiva investigación y actuación administrativa o disciplinaria para verificar la regularidad de los hechos informados.\n\n` +
    `SEGUNDA: Se expida informe escrito detallando las actuaciones adelantadas, las medidas correctivas adoptadas y el estado de la situación informada en la Comuna ${report.commune}.\n\n` +
    `TERCERA: Se incorporen al expediente administrativo las evidencias digitales que se aportan como anexo a esta comunicación.\n\n` +
    `IV. ANEXOS Y PRUEBAS DIGITALES\n\n` +
    `Aporto como pruebas de los hechos descritos:\n` +
    `${attachmentsList}\n` +
    (recordingNote ? `${recordingNote}\n` : '') +
    `   - Certificado digital de radicado AlzaVoz: Expediente ${report.code}.\n\n` +
    `V. NOTIFICACIONES\n\n` +
    `Recibiré notificaciones y respuestas oficiales en:\n` +
    `Dirección electrónica: ${contact}\n` +
    `Dirección física: [DIRECCIÓN FÍSICA PARA NOTIFICACIONES EN MEDELLÍN]\n\n` +
    `Atentamente,\n\n` +
    `_________________________________________\n` +
    `FIRMA: [FIRMA DEL SOLICITANTE O APODERADO]\n` +
    `NOMBRE: ${applicant}\n` +
    `C.C. No.: ${idDoc}\n` +
    `Equipo de Acompañamiento Ciudadano / Veeduría AlzaVoz Medellín\n`
  );
}

export async function generateLegalDraft(
  report: AdminReportDetail,
  input: GenerateDraftInput,
  apiKey?: string,
  fetcher: typeof fetch = fetch
): Promise<LegalDraftResult> {
  const generatedAt = new Date().toISOString();
  const entityMeta = AUTHORITY_ENTITIES.find((e) => e.id === input.targetEntity);
  const kindMeta = DOCUMENT_KINDS.find((k) => k.id === input.documentKind);

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      documentText: buildDeterministicLegalDraft(report, input),
      targetEntity: input.targetEntity,
      documentKind: input.documentKind,
      requiresHumanReview: true,
      mandatoryNotice: MANDATORY_HUMAN_REVIEW_NOTICE,
      generatedAt,
      source: 'normative-template',
    };
  }

  const prompt = [
    `Genera un borrador formal de documento legal colombiano (${kindMeta?.label ?? 'Derecho de Petición'}) dirigido a: ${entityMeta?.name ?? 'Autoridad Competente de Medellín'}.`,
    `Marco legal específico de la entidad: ${entityMeta?.legalBasis ?? 'Leyes colombianas aplicables'}.`,
    `DATOS DEL CASO RADICADO:`,
    `- Código de radicado AlzaVoz: ${report.code}`,
    `- Categoría: ${report.category}`,
    `- Nivel de riesgo: ${report.riskLevel}`,
    `- Comuna: ${report.commune}`,
    `- Punto o barrio de referencia: ${report.neighborhoodReference || 'Medellín'}`,
    `- Fecha del suceso: ${report.incidentDate || 'Reciente'}`,
    `- Resumen de los hechos: "${report.summary}"`,
    `- Número de archivos probatorios adjuntos: ${report.attachmentCount}`,
    `- Grabación continua de video/audio vinculada: ${report.recordingSessionId ? 'Sí' : 'No'}`,
    input.applicantName ? `- Peticionario: ${input.applicantName}` : '- Peticionario: [NOMBRE NO SUMINISTRADO]',
    input.applicantId ? `- C.C.: ${input.applicantId}` : '- C.C.: [CÉDULA NO SUMINISTRADA]',
    input.customContext ? `- Contexto adicional: ${input.customContext}` : '',
    ``,
    `REGLAS INQUEBRANTABLES:`,
    `1. Todo dato faltante DEBE indicarse claramente con corchetes en mayúsculas como [PENDIENTE: ...].`,
    `2. No inventes nombres, números de cédula ni testimonios que no estén en los datos.`,
    `3. Debes incluir hechos, fundamento de derecho colombiano y peticiones formales numeradas.`,
    `4. Encabeza el documento con el aviso en mayúsculas:`,
    `   ========================================================================`,
    `   ${MANDATORY_HUMAN_REVIEW_NOTICE}`,
    `   ========================================================================`,
  ].join('\n');

  try {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content:
          'Eres un redactor jurídico oficial en Colombia para el equipo cívico de AlzaVoz. Redactas Derechos de Petición y Oficios impecables, con lenguaje formal, citas de leyes colombianas exactas y placeholders [PENDIENTE: ...] para revisión humana obligatoria. Nunca inventas hechos y siempre antepones el aviso de revisión obligatoria.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await fetcher('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: 'deepseek-flash',
        thinking: { type: 'disabled' },
        temperature: 0.2,
        max_tokens: 2000,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 100) {
      throw new Error('Respuesta de DeepSeek vacía o insuficiente.');
    }

    // Ensure the mandatory review notice is guaranteed at the top
    const textWithNotice = text.includes(MANDATORY_HUMAN_REVIEW_NOTICE)
      ? text
      : `================================================================================\n${MANDATORY_HUMAN_REVIEW_NOTICE}\n================================================================================\n\n${text}`;

    return {
      documentText: textWithNotice,
      targetEntity: input.targetEntity,
      documentKind: input.documentKind,
      requiresHumanReview: true,
      mandatoryNotice: MANDATORY_HUMAN_REVIEW_NOTICE,
      generatedAt,
      source: 'deepseek-ai',
    };
  } catch {
    // Graceful fallback to normative template
    return {
      documentText: buildDeterministicLegalDraft(report, input),
      targetEntity: input.targetEntity,
      documentKind: input.documentKind,
      requiresHumanReview: true,
      mandatoryNotice: MANDATORY_HUMAN_REVIEW_NOTICE,
      generatedAt,
      source: 'normative-template',
    };
  }
}
