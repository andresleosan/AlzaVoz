import { MEDELLIN_COMUNAS } from '../../utils/medellinGeo';
import { SECRET, UUID } from '../recording/contracts';

export const MAX_REPORT_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const MAX_REPORT_JSON_BYTES = 16 * 1024;
export const REPORT_CODE_PATTERN = /^ALZ-\d{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

export const REPORT_CATEGORIES = [
  {
    id: 'violencia-genero-intrafamiliar',
    label: 'Violencia intrafamiliar o basada en género (Ley 1257 / Línea 155)',
  },
  {
    id: 'proteccion-ninez',
    label: 'Vulneración de derechos de niñez o adolescencia (Ley 1098)',
  },
  {
    id: 'extorsion-amenaza',
    label: 'Extorsión, amenaza o coacción',
  },
  {
    id: 'abuso-autoridad-reten',
    label: 'Presunto abuso de autoridad o procedimiento irregular (Ley 1801 / 769)',
  },
  {
    id: 'convivencia-seguridad',
    label: 'Riesgo barrial, hurto o convivencia',
  },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]['id'];

export const REPORT_RISK_LEVELS = [
  { id: 'alto', label: 'Riesgo alto · requiere atención prioritaria' },
  { id: 'medio', label: 'Riesgo medio · situación persistente' },
  { id: 'bajo', label: 'Riesgo bajo · registro preventivo o barrial' },
] as const;

export type ReportRiskLevel = (typeof REPORT_RISK_LEVELS)[number]['id'];

export const RESERVED_COMMUNE = 'Sin indicar (reserva de ubicación)';

export const REPORT_COMMUNES: readonly string[] = [
  RESERVED_COMMUNE,
  ...MEDELLIN_COMUNAS.map((zone) => zone.name),
  'Corregimiento 50 - San Sebastián de Palmitas',
  'Corregimiento 60 - San Cristóbal',
  'Corregimiento 70 - Altavista',
  'Corregimiento 80 - San Antonio de Prado',
  'Corregimiento 90 - Santa Elena',
];

export const SANITIZED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const SANITIZED_AUDIO_MIMES = ['audio/wav'] as const;
export const SANITIZED_MIMES = [...SANITIZED_IMAGE_MIMES, ...SANITIZED_AUDIO_MIMES] as const;

export type SanitizedImageMime = (typeof SANITIZED_IMAGE_MIMES)[number];
export type SanitizedAudioMime = (typeof SANITIZED_AUDIO_MIMES)[number];
export type SanitizedMime = (typeof SANITIZED_MIMES)[number];
export type AttachmentKind = 'image' | 'audio';

export interface SanitizationSummary {
  originalMime: string;
  sanitizedMime: SanitizedMime;
  originalBytes: number;
  sanitizedBytes: number;
  removedMarkers: string[];
  voiceTransformed: boolean;
  verifiedClean: boolean;
  acousticDeltaPercent?: number;
}

export interface CreateReportInput {
  requestId: string;
  category: ReportCategory;
  riskLevel: ReportRiskLevel;
  commune: string;
  neighborhoodReference: string;
  summary: string;
  incidentDate: string;
  recordingKey?: string;
  expectedAttachments: number;
  privacyAck: true;
}

export interface ReportAttachmentReceipt {
  index: number;
  kind: AttachmentKind;
  mime: SanitizedMime;
  bytes: number;
  sha256: string;
  sanitizationSummary: SanitizationSummary;
  receivedAt: string;
}

export interface ReportRecord {
  code: string;
  requestId: string;
  category: ReportCategory;
  riskLevel: ReportRiskLevel;
  commune: string;
  neighborhoodReference: string;
  summary: string;
  incidentDate: string;
  recordingSessionId: string | null;
  recordingClipCount: number;
  expectedAttachments: number;
  attachmentCount: number;
  status: string;
  createdAt: string;
  attachments: ReportAttachmentReceipt[];
}

export function isReportCategory(value: unknown): value is ReportCategory {
  return REPORT_CATEGORIES.some((item) => item.id === value);
}

export function isReportRiskLevel(value: unknown): value is ReportRiskLevel {
  return REPORT_RISK_LEVELS.some((item) => item.id === value);
}

export function isReportCommune(value: unknown): value is string {
  return typeof value === 'string' && REPORT_COMMUNES.includes(value);
}

export function isSanitizedMime(value: unknown): value is SanitizedMime {
  return SANITIZED_MIMES.some((mime) => mime === value);
}

export function attachmentKindForMime(mime: SanitizedMime): AttachmentKind {
  return mime === 'audio/wav' ? 'audio' : 'image';
}

function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

export function isSanitizationSummary(value: unknown): value is SanitizationSummary {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.originalMime === 'string' &&
    s.originalMime.length > 0 &&
    s.originalMime.length <= 80 &&
    isSanitizedMime(s.sanitizedMime) &&
    typeof s.originalBytes === 'number' &&
    Number.isInteger(s.originalBytes) &&
    s.originalBytes > 0 &&
    typeof s.sanitizedBytes === 'number' &&
    Number.isInteger(s.sanitizedBytes) &&
    s.sanitizedBytes > 0 &&
    s.sanitizedBytes <= MAX_ATTACHMENT_BYTES &&
    Array.isArray(s.removedMarkers) &&
    s.removedMarkers.length <= 32 &&
    s.removedMarkers.every((m) => typeof m === 'string' && m.length <= 32) &&
    typeof s.voiceTransformed === 'boolean' &&
    s.verifiedClean === true &&
    (s.acousticDeltaPercent === undefined ||
      (typeof s.acousticDeltaPercent === 'number' && Number.isFinite(s.acousticDeltaPercent)))
  );
}

export function parseCreateReportInput(value: unknown): { ok: true; data: CreateReportInput } | { ok: false; error: string } {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'Datos del reporte no válidos.' };
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.requestId !== 'string' || !UUID.test(raw.requestId)) {
    return { ok: false, error: 'Identificador de solicitud no válido.' };
  }
  if (!isReportCategory(raw.category)) {
    return { ok: false, error: 'Selecciona una categoría válida para el reporte.' };
  }
  if (!isReportRiskLevel(raw.riskLevel)) {
    return { ok: false, error: 'Selecciona el nivel de riesgo.' };
  }
  if (!isReportCommune(raw.commune)) {
    return { ok: false, error: 'Selecciona una comuna válida o la opción de reserva de ubicación.' };
  }
  const neighborhoodReference = typeof raw.neighborhoodReference === 'string' ? cleanText(raw.neighborhoodReference) : '';
  if (neighborhoodReference.length > 160) {
    return { ok: false, error: 'La referencia barrial no puede superar 160 caracteres.' };
  }
  const summary = typeof raw.summary === 'string' ? cleanText(raw.summary) : '';
  if (summary.length < 15 || summary.length > 2000) {
    return { ok: false, error: 'Describe los hechos entre 15 y 2000 caracteres.' };
  }
  const incidentDate = typeof raw.incidentDate === 'string' ? cleanText(raw.incidentDate) : '';
  if (incidentDate.length > 40) {
    return { ok: false, error: 'La fecha o momento aproximado no es válido.' };
  }
  let recordingKey: string | undefined;
  if (raw.recordingKey !== undefined && raw.recordingKey !== '') {
    if (typeof raw.recordingKey !== 'string') {
      return { ok: false, error: 'La clave de grabación vinculada no tiene el formato esperado.' };
    }
    const trimmedKey = raw.recordingKey.trim();
    const parts = trimmedKey.split('.');
    if (parts.length !== 2 || !UUID.test(parts[0]) || !SECRET.test(parts[1])) {
      return { ok: false, error: 'La clave de grabación debe tener el formato id.secreto entregado en Grabar evidencia.' };
    }
    recordingKey = trimmedKey;
  }
  const expectedAttachments = typeof raw.expectedAttachments === 'number' ? raw.expectedAttachments : 0;
  if (!Number.isInteger(expectedAttachments) || expectedAttachments < 0 || expectedAttachments > MAX_REPORT_ATTACHMENTS) {
    return { ok: false, error: 'El número de archivos adjuntos debe estar entre 0 y 4.' };
  }
  if (raw.privacyAck !== true) {
    return { ok: false, error: 'Confirma que revisaste el alcance de privacidad antes de radicar.' };
  }
  return {
    ok: true,
    data: {
      requestId: raw.requestId,
      category: raw.category,
      riskLevel: raw.riskLevel,
      commune: raw.commune,
      neighborhoodReference,
      summary,
      incidentDate,
      ...(recordingKey ? { recordingKey } : {}),
      expectedAttachments,
      privacyAck: true,
    },
  };
}

export function generateReportCode(year = new Date().getUTCFullYear()): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `ALZ-${year}-${suffix}`;
}
