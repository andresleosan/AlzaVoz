import { SECRET, sha256 } from '../recording/contracts';
import {
  REPORT_CATEGORIES,
  REPORT_CODE_PATTERN,
  REPORT_RISK_LEVELS,
  type CreateReportInput,
  type ReportAttachmentReceipt,
  type ReportRecord,
  type SafeContactConfig,
  type SanitizationSummary,
  type SanitizedMime,
} from './contracts';

const CLIENT_HEADERS = { 'x-report-client': '1' };

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    // Fallback used when response body is not JSON.
  }
  return fallback;
}

export function createClientSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function parseReportRecoveryKey(raw: string): { code: string; secret: string } {
  const trimmed = raw.trim();
  const [code, secret, extra] = trimmed.split('.');
  if (!code || !secret || extra || !REPORT_CODE_PATTERN.test(code) || !SECRET.test(secret)) {
    throw new Error('La clave del expediente no tiene el formato esperado (ALZ-AAAA-XXXXXX.secreto).');
  }
  return { code, secret };
}

export async function createOrRecoverReport(
  input: CreateReportInput,
  secret: string,
  signal?: AbortSignal
): Promise<ReportRecord> {
  if (!SECRET.test(secret)) {
    throw new Error('Secreto de expediente no válido.');
  }
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: {
      ...CLIENT_HEADERS,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'No se pudo radicar el expediente en Cloudflare D1.'));
  }
  return (await response.json()) as ReportRecord;
}

export async function uploadReportAttachment(
  code: string,
  secret: string,
  index: number,
  bytes: ArrayBuffer,
  mime: SanitizedMime,
  summary: SanitizationSummary,
  signal?: AbortSignal
): Promise<ReportAttachmentReceipt> {
  const expectedHash = await sha256(bytes);
  const response = await fetch(`/api/reports/${code}/attachments/${index}`, {
    method: 'PUT',
    headers: {
      ...CLIENT_HEADERS,
      Authorization: `Bearer ${secret}`,
      'Content-Type': mime,
      'x-sanitization-summary': encodeURIComponent(JSON.stringify(summary)),
    },
    body: bytes,
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'No se pudo subir el archivo limpio a la bóveda.'));
  }
  const receipt = (await response.json()) as ReportAttachmentReceipt;
  if (receipt.sha256 !== expectedHash || receipt.index !== index) {
    throw new Error('El recibo de integridad del adjunto no coincide con el archivo limpio.');
  }
  return receipt;
}

export async function getReportByKey(rawKey: string, signal?: AbortSignal): Promise<{ record: ReportRecord; secret: string }> {
  const { code, secret } = parseReportRecoveryKey(rawKey);
  const response = await fetch(`/api/reports/${code}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'No se pudo consultar el expediente con esa clave.'));
  }
  const record = (await response.json()) as ReportRecord;
  return { record, secret };
}

export function buildReportWhatsAppUrl(params: {
  code?: string;
  category: CreateReportInput['category'];
  riskLevel: CreateReportInput['riskLevel'];
  commune: string;
  neighborhoodReference: string;
  summary: string;
  incidentDate: string;
  cleanAttachmentCount: number;
  hasLinkedRecording: boolean;
  phone?: string;
}): { url: string; previewText: string } {
  const categoryLabel = REPORT_CATEGORIES.find((c) => c.id === params.category)?.label ?? params.category;
  const riskLabel = REPORT_RISK_LEVELS.find((r) => r.id === params.riskLevel)?.label ?? params.riskLevel;
  const lines = [
    params.code ? `🛡️ *REPORTE ALZAVOZ MEDELLÍN · ${params.code}*` : '🛡️ *REPORTE DIRECTO ALZAVOZ MEDELLÍN (SIN RADICADO D1)*',
    `• *Categoría:* ${categoryLabel}`,
    `• *Nivel de riesgo:* ${riskLabel}`,
    `• *Ubicación indicada:* ${params.commune}${params.neighborhoodReference ? ` (${params.neighborhoodReference})` : ''}`,
    ...(params.incidentDate ? [`• *Fecha/hora aproximada:* ${params.incidentDate}`] : []),
    `• *Hechos:* ${params.summary}`,
    ...(params.cleanAttachmentCount > 0
      ? [`• *Evidencias limpias en dispositivo:* ${params.cleanAttachmentCount} archivo(s) sin metadatos EXIF/GPS listos para adjuntar manualmente.`]
      : []),
    ...(params.hasLinkedRecording ? ['• *Grabación Caja Negra R2:* vinculada al expediente.'] : []),
  ];
  const previewText = lines.join('\n');
  const cleanPhone = (params.phone ?? '573234306794').replace(/[^\d]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(previewText)}`;
  return { url, previewText };
}

export async function updateReportSafeContact(
  code: string,
  secret: string,
  safeContact: SafeContactConfig,
  signal?: AbortSignal
): Promise<ReportRecord> {
  if (!SECRET.test(secret)) {
    throw new Error('Secreto de expediente no válido.');
  }
  const response = await fetch(`/api/reports/${code}/safe-contact`, {
    method: 'PATCH',
    headers: {
      ...CLIENT_HEADERS,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(safeContact),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'No se pudieron actualizar las condiciones de contacto seguro.'));
  }
  return (await response.json()) as ReportRecord;
}
