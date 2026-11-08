import { REPORT_CODE_PATTERN, type ReportCategory, type ReportRiskLevel, type ReportAttachmentReceipt } from '../report/contracts';

export const ADMIN_REPORT_STATUSES = [
  { id: 'radicado', label: 'Radicado · Pendiente de asignación' },
  { id: 'en_revision', label: 'En revisión legal' },
  { id: 'en_tramite', label: 'En trámite de gestión' },
  { id: 'oficio_tramitado', label: 'Oficio tramitado ante entidad' },
  { id: 'archivado', label: 'Archivado / Cerrado' },
] as const;

export type AdminReportStatus = (typeof ADMIN_REPORT_STATUSES)[number]['id'];

export const AUTHORITY_ENTITIES = [
  {
    id: 'movilidad',
    name: 'Secretaría de Movilidad de Medellín',
    jurisdiction: 'Tránsito, fotodetecciones, comparendos y procedimientos de grúa/patrullas de tránsito.',
    legalBasis: 'Ley 769 de 2002 (Código Nacional de Tránsito), Ley 2251 de 2022 y Sentencia C-038 de 2020.',
  },
  {
    id: 'meval',
    name: 'Policía Metropolitana del Valle de Aburrá (MEVAL)',
    jurisdiction: 'Procedimientos policiales, requisas en vía pública, uso de la fuerza y derecho a filmar.',
    legalBasis: 'Ley 1801 de 2016 (Código Nacional de Policía), especialmente Art. 21 sobre carácter público de procedimientos.',
  },
  {
    id: 'icbf',
    name: 'Instituto Colombiano de Bienestar Familiar (ICBF)',
    jurisdiction: 'Vulneración de derechos, custodia, violencia o negligencia contra niños, niñas y adolescentes.',
    legalBasis: 'Ley 1098 de 2006 (Código de la Infancia y la Adolescencia).',
  },
  {
    id: 'fiscalia',
    name: 'Fiscalía General de la Nación (Seccional Medellín)',
    jurisdiction: 'Delitos penales, extorsión, coacción, agresiones físicas, lesiones y amenazas de muerte.',
    legalBasis: 'Ley 906 de 2004 (Código de Procedimiento Penal) y Ley 599 de 2000 (Código Penal).',
  },
  {
    id: 'personeria',
    name: 'Personería Distrital de Medellín',
    jurisdiction: 'Defensa de los Derechos Humanos, veeduría ciudadana y control disciplinario a servidores públicos.',
    legalBasis: 'Artículos 118 y 313 de la Constitución Política y Ley 136 de 1994.',
  },
] as const;

export type AuthorityEntityId = (typeof AUTHORITY_ENTITIES)[number]['id'];

export const DOCUMENT_KINDS = [
  {
    id: 'derecho_peticion',
    label: 'Derecho de Petición de Interés Particular (Art. 23 C.P.)',
    description: 'Solicitud formal y vinculante con término de respuesta de 15 días hábiles (Ley 1755 de 2015).',
  },
  {
    id: 'oficio_informacion',
    label: 'Oficio de Solicitud de Información y Control Cívico',
    description: 'Oficio institucional del equipo de veeduría y apoyo comunitario requiriendo explicaciones o medidas.',
  },
] as const;

export type DocumentKindId = (typeof DOCUMENT_KINDS)[number]['id'];

export interface AdminReportSummary {
  code: string;
  category: ReportCategory;
  riskLevel: ReportRiskLevel;
  commune: string;
  neighborhoodReference: string;
  summary: string;
  incidentDate: string;
  recordingSessionId: string | null;
  recordingClipCount: number;
  attachmentCount: number;
  status: AdminReportStatus | string;
  createdAt: string;
  adminNotes: string;
  updatedAt?: string;
}

export interface AdminReportDetail extends AdminReportSummary {
  requestId: string;
  attachments: ReportAttachmentReceipt[];
  recordingClips?: {
    index: number;
    mime: string;
    bytes: number;
    sha256: string;
    receivedAt: string;
  }[];
}

export interface AdminFilterOptions {
  commune?: string;
  riskLevel?: string;
  category?: string;
  status?: string;
  search?: string;
}

export interface UpdateReportStatusInput {
  status: AdminReportStatus;
  adminNotes?: string;
}

export interface GenerateDraftInput {
  reportCode: string;
  targetEntity: AuthorityEntityId;
  documentKind: DocumentKindId;
  applicantName?: string;
  applicantId?: string;
  applicantContact?: string;
  customContext?: string;
}

export interface LegalDraftResult {
  documentText: string;
  targetEntity: AuthorityEntityId;
  documentKind: DocumentKindId;
  requiresHumanReview: true;
  mandatoryNotice: string;
  generatedAt: string;
  source: 'deepseek-ai' | 'normative-template';
}

export const MANDATORY_HUMAN_REVIEW_NOTICE =
  'AVISO OBLIGATORIO: ESTE DOCUMENTO ES UN BORRADOR PRELIMINAR GENERADO PARA APOYO JURÍDICO. REQUIERE REVISIÓN, VERIFICACIÓN DE IDENTIDAD Y EDICIÓN POR PARTE DE UN ABOGADO O INTEGRANTE DEL EQUIPO ANTES DE CUALQUIER RADICACIÓN ANTE AUTORIDADES. ALZAVOZ NO ENVÍA DOCUMENTOS DE FORMA AUTOMÁTICA.';

export function isReportCode(value: unknown): value is string {
  return typeof value === 'string' && REPORT_CODE_PATTERN.test(value);
}

export function isAdminReportStatus(value: unknown): value is AdminReportStatus {
  return typeof value === 'string' && ADMIN_REPORT_STATUSES.some((item) => item.id === value);
}

export function isAuthorityEntityId(value: unknown): value is AuthorityEntityId {
  return typeof value === 'string' && AUTHORITY_ENTITIES.some((item) => item.id === value);
}

export function isDocumentKindId(value: unknown): value is DocumentKindId {
  return typeof value === 'string' && DOCUMENT_KINDS.some((item) => item.id === value);
}

export function parseUpdateReportStatusInput(
  value: unknown
): { ok: true; data: UpdateReportStatusInput } | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Cuerpo de solicitud no válido.' };
  }
  const body = value as Record<string, unknown>;
  if (!isAdminReportStatus(body.status)) {
    return { ok: false, error: 'Estado de expediente no válido.' };
  }
  let adminNotes: string | undefined;
  if (body.adminNotes !== undefined) {
    if (typeof body.adminNotes !== 'string') {
      return { ok: false, error: 'Las notas administrativas deben ser texto.' };
    }
    if (body.adminNotes.length > 4000) {
      return { ok: false, error: 'Las notas no pueden superar 4000 caracteres.' };
    }
    adminNotes = body.adminNotes.trim();
  }
  return { ok: true, data: { status: body.status, adminNotes } };
}

export function parseGenerateDraftInput(
  value: unknown
): { ok: true; data: GenerateDraftInput } | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Cuerpo de solicitud no válido.' };
  }
  const body = value as Record<string, unknown>;
  if (!isReportCode(body.reportCode)) {
    return { ok: false, error: 'Código de expediente no válido (formato ALZ-YYYY-XXXXXX).' };
  }
  if (!isAuthorityEntityId(body.targetEntity)) {
    return { ok: false, error: 'Entidad destinataria no válida.' };
  }
  if (!isDocumentKindId(body.documentKind)) {
    return { ok: false, error: 'Tipo de documento no válido.' };
  }
  return {
    ok: true,
    data: {
      reportCode: body.reportCode,
      targetEntity: body.targetEntity,
      documentKind: body.documentKind,
      applicantName: typeof body.applicantName === 'string' ? body.applicantName.slice(0, 150).trim() : undefined,
      applicantId: typeof body.applicantId === 'string' ? body.applicantId.slice(0, 50).trim() : undefined,
      applicantContact: typeof body.applicantContact === 'string' ? body.applicantContact.slice(0, 200).trim() : undefined,
      customContext: typeof body.customContext === 'string' ? body.customContext.slice(0, 1000).trim() : undefined,
    },
  };
}
