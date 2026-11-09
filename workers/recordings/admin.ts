import {
  isReportCode,
  isAdminReportStatus,
  parseSimulateContactInput,
  type AdminReportSummary,
  type AdminReportDetail,
  type AdminReportStatus,
  type SimulateContactResult,
} from '../../src/lib/admin/contracts';
import {
  isCurrentTimeInSafeWindow,
  parseSafeContactConfig,
  type AttachmentKind,
  type ReportCategory,
  type ReportRiskLevel,
  type SafeContactConfig,
  type SanitizationSummary,
  type SanitizedMime,
} from '../../src/lib/report/contracts';
import { isReceipt, type ClipReceipt, MAX_CLIPS } from '../../src/lib/recording/contracts';

interface StoredObject {
  key: string;
  etag: string;
  customMetadata?: Record<string, string>;
  body: ReadableStream<Uint8Array>;
  json<T>(): Promise<T>;
}

interface Bucket {
  get(key: string): Promise<StoredObject | null>;
  put(
    key: string,
    body: ArrayBuffer | string,
    options?: {
      onlyIf?: { etagDoesNotMatch: string };
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType: string };
    }
  ): Promise<StoredObject | null>;
  list(options: { prefix: string; limit: number; include: string[] }): Promise<{
    objects: StoredObject[];
    truncated: boolean;
  }>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

export interface AdminWorkerEnv {
  EVIDENCIAS: Bucket;
  DB?: D1Database;
  GATEWAY_SECRET: string;
  SESSION_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

interface StoredReportRow {
  code: string;
  request_id: string;
  access_hash: string;
  category: ReportCategory;
  risk_level: ReportRiskLevel;
  commune: string;
  neighborhood_reference: string;
  summary: string;
  incident_date: string;
  recording_session_id: string | null;
  recording_clip_count: number;
  expected_attachments: number;
  attachment_count: number;
  status: string;
  created_at: string;
  admin_notes?: string;
  updated_at?: string;
  safe_contact_json?: string;
}

interface StoredAttachmentRow {
  id: string;
  report_code: string;
  slot_index: number;
  kind: AttachmentKind;
  mime: SanitizedMime;
  bytes: number;
  sha256: string;
  r2_key: string;
  sanitization_summary: string;
  created_at: string;
}

interface StoredNoticeRow {
  id: string;
  request_id: string;
  kind: string;
  title: string;
  description: string;
  commune: number;
  event_date: string;
  contact: string;
  created_at: string;
}

interface StoredTipRow {
  request_id: string;
  notice_id: string;
  text: string;
  contact: string;
  created_at: string;
}

const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
const error = (status: number, message: string) => json({ error: message }, status);

let adminSchemaChecked = false;
async function ensureAdminColumns(db: D1Database): Promise<void> {
  if (adminSchemaChecked) return;
  try {
    const info = await db.prepare('PRAGMA table_info(confidential_reports)').all<{ name: string }>();
    const names = new Set(info.results.map((r) => r.name));
    if (!names.has('admin_notes')) {
      await db
        .prepare("ALTER TABLE confidential_reports ADD COLUMN admin_notes TEXT NOT NULL DEFAULT ''")
        .run();
    }
    if (!names.has('updated_at')) {
      await db.prepare('ALTER TABLE confidential_reports ADD COLUMN updated_at TEXT').run();
    }
    if (!names.has('safe_contact_json')) {
      await db
        .prepare(
          `ALTER TABLE confidential_reports ADD COLUMN safe_contact_json TEXT NOT NULL DEFAULT '{"preference":"no_contact"}'`
        )
        .run();
    }
    adminSchemaChecked = true;
  } catch {
    // If PRAGMA or alter fails, continue gracefully
    adminSchemaChecked = true;
  }
}

function mapSummaryRow(row: StoredReportRow): AdminReportSummary {
  let safeContact: SafeContactConfig = { preference: 'no_contact' };
  if (row.safe_contact_json) {
    try {
      const parsed = JSON.parse(row.safe_contact_json);
      const validated = parseSafeContactConfig(parsed);
      if (validated.ok) safeContact = validated.data;
    } catch {
      // fallback
    }
  }
  return {
    code: row.code,
    category: row.category,
    riskLevel: row.risk_level,
    commune: row.commune,
    neighborhoodReference: row.neighborhood_reference,
    summary: row.summary,
    incidentDate: row.incident_date,
    recordingSessionId: row.recording_session_id,
    recordingClipCount: Number(row.recording_clip_count || 0),
    attachmentCount: Number(row.attachment_count || 0),
    status: row.status,
    createdAt: row.created_at,
    adminNotes: row.admin_notes || '',
    updatedAt: row.updated_at || undefined,
    safeContact,
  };
}

function receipt(object: StoredObject): ClipReceipt {
  const metadata = object.customMetadata;
  if (!metadata?.receipt) throw new Error('missing-metadata');
  const value: unknown = { ...JSON.parse(metadata.receipt), etag: object.etag };
  if (!isReceipt(value)) throw new Error('invalid-metadata');
  return value;
}

async function listSessionClips(env: AdminWorkerEnv, sessionId: string): Promise<ClipReceipt[]> {
  const listed = await env.EVIDENCIAS.list({
    prefix: `recordings/${sessionId}/clips/`,
    limit: MAX_CLIPS + 1,
    include: ['customMetadata'],
  });
  if (listed.truncated || listed.objects.length > MAX_CLIPS) throw new Error('invalid-list');
  return listed.objects.map(receipt).sort((a, b) => a.index - b.index);
}

export async function handleAdmin(request: Request, env: AdminWorkerEnv): Promise<Response> {
  const db = env.DB;
  if (!db) return error(503, 'Base de datos D1 no disponible.');
  await ensureAdminColumns(db);

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/admin/, '');

  // 1. GET /admin/reports - list reports with filters
  if ((path === '' || path === '/reports') && request.method === 'GET') {
    const commune = url.searchParams.get('commune');
    const riskLevel = url.searchParams.get('riskLevel');
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search')?.trim().toLowerCase();

    const whereClauses: string[] = [];
    const bindValues: unknown[] = [];

    if (commune && commune !== 'todas') {
      whereClauses.push('commune = ?');
      bindValues.push(commune);
    }
    if (riskLevel && riskLevel !== 'todos') {
      whereClauses.push('risk_level = ?');
      bindValues.push(riskLevel);
    }
    if (category && category !== 'todas') {
      whereClauses.push('category = ?');
      bindValues.push(category);
    }
    if (status && status !== 'todos') {
      whereClauses.push('status = ?');
      bindValues.push(status);
    }
    if (search) {
      whereClauses.push('(LOWER(code) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(neighborhood_reference) LIKE ?)');
      const pattern = `%${search}%`;
      bindValues.push(pattern, pattern, pattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM confidential_reports ${whereSql}`;
    const countStmt = db.prepare(countQuery);
    const countResult = await (bindValues.length > 0 ? countStmt.bind(...bindValues) : countStmt).first<{
      total: number;
    }>();
    const total = Number(countResult?.total || 0);

    const selectQuery = `SELECT * FROM confidential_reports ${whereSql} ORDER BY created_at DESC LIMIT 100`;
    const selectStmt = db.prepare(selectQuery);
    const { results } = await (bindValues.length > 0 ? selectStmt.bind(...bindValues) : selectStmt).all<StoredReportRow>();

    const reports: AdminReportSummary[] = results.map(mapSummaryRow);
    return json({ reports, total });
  }

  // 2. GET /admin/notices - list search notices and tip count for administration
  if (path === '/notices' && request.method === 'GET') {
    try {
      const { results: notices } = await db
        .prepare('SELECT id, request_id, kind, title, description, commune, event_date, contact, created_at FROM search_notices ORDER BY created_at DESC LIMIT 50')
        .all<StoredNoticeRow>();

      const { results: tips } = await db
        .prepare('SELECT notice_id, COUNT(*) as tip_count FROM search_tips GROUP BY notice_id')
        .all<{ notice_id: string; tip_count: number }>();

      const tipCountMap = new Map(tips.map((t) => [t.notice_id, Number(t.tip_count)]));

      const enriched = notices.map((n) => ({
        ...n,
        tipCount: tipCountMap.get(n.id) || 0,
      }));

      return json({ notices: enriched });
    } catch {
      return json({ notices: [] });
    }
  }

  // 3. GET /admin/notices/:id/tips - get tips for a specific notice
  const noticeTipsMatch = /^\/notices\/([0-9a-f-]{36})\/tips$/.exec(path);
  if (noticeTipsMatch) {
    const [, noticeId] = noticeTipsMatch;
    if (request.method !== 'GET') return error(405, 'Método no permitido.');
    try {
      const { results } = await db
        .prepare('SELECT request_id, notice_id, text, contact, created_at FROM search_tips WHERE notice_id = ? ORDER BY created_at DESC')
        .bind(noticeId)
        .all<StoredTipRow>();
      return json({ tips: results });
    } catch {
      return json({ tips: [] });
    }
  }

  // 4. Match /admin/reports/:code ...
  const reportMatch = /^\/reports\/(ALZ-\d{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6})(?:\/(attachments\/(\d+)|recording\/(\d+)|simulate-contact))?$/.exec(
    path
  );
  if (!reportMatch) {
    return error(404, 'Ruta de administración no disponible.');
  }

  const [, code, subAction, rawAttachmentSlot, rawClipIndex] = reportMatch;
  if (!isReportCode(code)) return error(400, 'Código de expediente no válido.');

  const reportRow = await db
    .prepare('SELECT * FROM confidential_reports WHERE code = ?')
    .bind(code)
    .first<StoredReportRow>();

  if (!reportRow) {
    return error(404, 'Expediente no encontrado en la base de datos.');
  }

  // POST /admin/reports/:code/simulate-contact
  if (subAction === 'simulate-contact') {
    if (request.method !== 'POST') return error(405, 'Método no permitido.');
    const rawBody = await request.json().catch(() => ({}));
    const parsed = parseSimulateContactInput(rawBody);
    if (!parsed.ok) return error(400, parsed.error);

    let safeContact: SafeContactConfig = { preference: 'no_contact' };
    if (reportRow.safe_contact_json) {
      try {
        const p = JSON.parse(reportRow.safe_contact_json);
        const v = parseSafeContactConfig(p);
        if (v.ok) safeContact = v.data;
      } catch {
        // fallback
      }
    }

    const simulatedDate = parsed.data.simulatedAt ? new Date(parsed.data.simulatedAt) : new Date();
    const evalResult = isCurrentTimeInSafeWindow(safeContact, simulatedDate);

    if (safeContact.preference === 'safe_contact' && parsed.data.channel && parsed.data.channel !== safeContact.channel) {
      const res: SimulateContactResult = {
        allowed: false,
        reason: `Canal solicitado (${parsed.data.channel}) no coincide con el canal autorizado por el ciudadano (${safeContact.channel}).`,
        colombiaTime: evalResult.colombiaTime,
        channel: safeContact.channel ?? 'ninguno',
        isNoContact: false,
        simulatedAt: simulatedDate.toISOString(),
        simulatedNotice: 'ENVÍO BLOQUEADO: Canal no autorizado por el ciudadano. No se envió ningún mensaje real.',
      };
      return json(res, 200);
    }

    if (!evalResult.allowed) {
      const res: SimulateContactResult = {
        allowed: false,
        reason: evalResult.reason,
        colombiaTime: evalResult.colombiaTime,
        channel: safeContact.channel ?? 'ninguno',
        isNoContact: evalResult.isNoContact,
        simulatedAt: simulatedDate.toISOString(),
        simulatedNotice: 'ENVÍO BLOQUEADO POR REGLA DE SEGURIDAD PERSONAL: Contactar en estas condiciones expone al ciudadano. No se envió ningún mensaje real.',
      };
      return json(res, 200);
    }

    const res: SimulateContactResult = {
      allowed: true,
      reason: evalResult.reason,
      colombiaTime: evalResult.colombiaTime,
      channel: safeContact.channel ?? 'ninguno',
      isNoContact: false,
      simulatedAt: simulatedDate.toISOString(),
      simulatedNotice: 'SIMULACIÓN PERMITIDA: Dentro de las condiciones seguras y franja horaria autorizadas. No se envió ningún mensaje real.',
    };
    return json(res, 200);
  }

  // GET /admin/reports/:code - full detail
  if (!subAction && request.method === 'GET') {
    const { results: attRows } = await db
      .prepare('SELECT * FROM report_attachments WHERE report_code = ? ORDER BY slot_index ASC')
      .bind(code)
      .all<StoredAttachmentRow>();

    const attachments = attRows.map((r) => {
      const summary = JSON.parse(r.sanitization_summary) as SanitizationSummary;
      return {
        index: Number(r.slot_index),
        kind: r.kind,
        mime: r.mime,
        bytes: Number(r.bytes),
        sha256: r.sha256,
        sanitizationSummary: summary,
        receivedAt: r.created_at,
      };
    });

    let recordingClips: { index: number; mime: string; bytes: number; sha256: string; receivedAt: string }[] | undefined;
    if (reportRow.recording_session_id) {
      try {
        const clips = await listSessionClips(env, reportRow.recording_session_id);
        recordingClips = clips.map((c) => ({
          index: c.index,
          mime: c.mime,
          bytes: c.bytes,
          sha256: c.sha256,
          receivedAt: c.receivedAt,
        }));
      } catch {
        recordingClips = [];
      }
    }

    const detail: AdminReportDetail = {
      ...mapSummaryRow(reportRow),
      requestId: reportRow.request_id,
      attachments,
      recordingClips,
    };
    return json({ report: detail });
  }

  // PATCH /admin/reports/:code - update status / admin_notes
  if (!subAction && request.method === 'PATCH') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error(400, 'Cuerpo de solicitud JSON no válido.');
    }
    const updateInput = body as { status?: string; adminNotes?: string };
    if (!updateInput.status || !isAdminReportStatus(updateInput.status)) {
      return error(400, 'Estado de expediente no válido.');
    }
    const newStatus: AdminReportStatus = updateInput.status;
    const newNotes = typeof updateInput.adminNotes === 'string' ? updateInput.adminNotes.slice(0, 4000) : reportRow.admin_notes || '';
    const nowIso = new Date().toISOString();

    await db
      .prepare('UPDATE confidential_reports SET status = ?, admin_notes = ?, updated_at = ? WHERE code = ?')
      .bind(newStatus, newNotes, nowIso, code)
      .run();

    const updatedRow = await db
      .prepare('SELECT * FROM confidential_reports WHERE code = ?')
      .bind(code)
      .first<StoredReportRow>();

    if (!updatedRow) return error(500, 'No se pudo recuperar el expediente actualizado.');
    return json({ report: mapSummaryRow(updatedRow) });
  }

  // GET /admin/reports/:code/attachments/:slot
  if (rawAttachmentSlot !== undefined) {
    if (request.method !== 'GET') return error(405, 'Método no permitido.');
    const slotIndex = Number(rawAttachmentSlot);
    const attRow = await db
      .prepare('SELECT * FROM report_attachments WHERE report_code = ? AND slot_index = ?')
      .bind(code, slotIndex)
      .first<StoredAttachmentRow>();

    if (!attRow) return error(404, 'Archivo adjunto no encontrado en el expediente.');
    const r2Object = await env.EVIDENCIAS.get(attRow.r2_key);
    if (!r2Object) return error(404, 'Bytes del archivo no encontrados en R2.');

    const ext =
      attRow.mime === 'audio/wav'
        ? 'wav'
        : attRow.mime === 'image/png'
        ? 'png'
        : attRow.mime === 'image/webp'
        ? 'webp'
        : 'jpg';

    return new Response(r2Object.body, {
      headers: {
        ...headers,
        'Content-Type': attRow.mime,
        'Content-Length': String(attRow.bytes),
        'Content-Disposition': `attachment; filename="admin-evidencia-${code}-${slotIndex + 1}.${ext}"`,
        'X-Content-SHA256': attRow.sha256,
      },
    });
  }

  // GET /admin/reports/:code/recording/:clipIndex
  if (rawClipIndex !== undefined) {
    if (request.method !== 'GET') return error(405, 'Método no permitido.');
    if (!reportRow.recording_session_id) {
      return error(404, 'Este expediente no tiene una sesión de grabación vinculada.');
    }
    const clipIndex = Number(rawClipIndex);
    const padded = String(clipIndex).padStart(3, '0');
    const clipKey = `recordings/${reportRow.recording_session_id}/clips/${padded}`;
    const clipObj = await env.EVIDENCIAS.get(clipKey);
    if (!clipObj) return error(404, 'Clip de grabación no encontrado en R2.');

    const meta = clipObj.customMetadata?.receipt ? JSON.parse(clipObj.customMetadata.receipt) : null;
    const mime = meta?.mime || 'video/webm';
    const sha = meta?.sha256 || '';

    return new Response(clipObj.body, {
      headers: {
        ...headers,
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="admin-clip-${code}-${clipIndex + 1}.webm"`,
        ...(sha ? { 'X-Content-SHA256': sha } : {}),
      },
    });
  }

  return error(404, 'Ruta de administración no encontrada.');
}
