import {
  isCompletion,
  isMime,
  isReceipt,
  MAX_CLIPS,
  MAX_CLIP_BYTES,
  MAX_RECORDING_BYTES,
  readLimited,
  SECRET,
  sha256,
  UUID,
  type ClipReceipt,
  type RecordingCompletion,
  type RecordingFormat,
} from '../../src/lib/recording/contracts';
import {
  attachmentKindForMime,
  generateReportCode,
  isSanitizationSummary,
  isSanitizedMime,
  MAX_ATTACHMENT_BYTES,
  MAX_REPORT_ATTACHMENTS,
  MAX_REPORT_JSON_BYTES,
  parseCreateReportInput,
  REPORT_CODE_PATTERN,
  type AttachmentKind,
  type ReportAttachmentReceipt,
  type ReportCategory,
  type ReportRecord,
  type ReportRiskLevel,
  type SanitizationSummary,
  type SanitizedMime,
} from '../../src/lib/report/contracts';
import { inspectMediaMetadata } from '../../src/lib/report/sanitizer';

// Structural binding types keep Workers globals out of Next's DOM type environment.
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
  list(options: { prefix: string; limit: number; include: string[] }): Promise<{ objects: StoredObject[]; truncated: boolean }>;
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
interface Env {
  EVIDENCIAS: Bucket;
  DB?: D1Database;
  GATEWAY_SECRET: string;
  SESSION_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
interface StoredSession {
  hash: string;
  expiresAt: number;
  uploadUntil: number;
  format?: RecordingFormat;
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

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
const error = (status: number, message: string) => json({ error: message }, status);
const prefix = (id: string) => `recordings/${id}/`;

let reportSchemaReady: Promise<void> | null = null;
async function ensureReportSchema(db: D1Database): Promise<void> {
  if (!reportSchemaReady) {
    reportSchemaReady = db
      .batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS confidential_reports (
          code TEXT PRIMARY KEY,
          request_id TEXT NOT NULL UNIQUE,
          access_hash TEXT NOT NULL,
          category TEXT NOT NULL,
          risk_level TEXT NOT NULL,
          commune TEXT NOT NULL,
          neighborhood_reference TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL,
          incident_date TEXT NOT NULL DEFAULT '',
          recording_session_id TEXT,
          recording_clip_count INTEGER NOT NULL DEFAULT 0,
          expected_attachments INTEGER NOT NULL DEFAULT 0,
          attachment_count INTEGER NOT NULL DEFAULT 0,
          privacy_ack INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'radicado',
          created_at TEXT NOT NULL
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS report_attachments (
          id TEXT PRIMARY KEY,
          report_code TEXT NOT NULL,
          slot_index INTEGER NOT NULL,
          kind TEXT NOT NULL,
          mime TEXT NOT NULL,
          bytes INTEGER NOT NULL,
          sha256 TEXT NOT NULL,
          r2_key TEXT NOT NULL,
          sanitization_summary TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(report_code, slot_index)
        )`),
      ])
      .then(() => undefined)
      .catch((err) => {
        reportSchemaReady = null;
        throw err;
      });
  }
  await reportSchemaReady;
}

function receipt(object: StoredObject): ClipReceipt {
  const metadata = object.customMetadata;
  if (!metadata?.receipt) throw new Error('missing-metadata');
  const value: unknown = { ...JSON.parse(metadata.receipt), etag: object.etag };
  if (!isReceipt(value)) throw new Error('invalid-metadata');
  return value;
}
async function listClips(env: Env, id: string): Promise<ClipReceipt[]> {
  const listed = await env.EVIDENCIAS.list({ prefix: `${prefix(id)}clips/`, limit: MAX_CLIPS + 1, include: ['customMetadata'] });
  if (listed.truncated || listed.objects.length > MAX_CLIPS) throw new Error('invalid-list');
  return listed.objects.map(receipt).sort((a, b) => a.index - b.index);
}
async function completion(env: Env, id: string): Promise<RecordingCompletion | undefined> {
  const object = await env.EVIDENCIAS.get(`${prefix(id)}completion`);
  if (!object) return undefined;
  const value: unknown = await object.json();
  if (!isCompletion(value)) throw new Error('invalid-completion');
  return value;
}

function mapAttachmentRow(row: StoredAttachmentRow): ReportAttachmentReceipt {
  const summary = JSON.parse(row.sanitization_summary) as SanitizationSummary;
  return {
    index: Number(row.slot_index),
    kind: row.kind,
    mime: row.mime,
    bytes: Number(row.bytes),
    sha256: row.sha256,
    sanitizationSummary: summary,
    receivedAt: row.created_at,
  };
}

async function buildReportRecord(db: D1Database, row: StoredReportRow): Promise<ReportRecord> {
  const { results } = await db
    .prepare('SELECT * FROM report_attachments WHERE report_code = ? ORDER BY slot_index ASC')
    .bind(row.code)
    .all<StoredAttachmentRow>();
  const attachments = results.map(mapAttachmentRow);
  return {
    code: row.code,
    requestId: row.request_id,
    category: row.category,
    riskLevel: row.risk_level,
    commune: row.commune,
    neighborhoodReference: row.neighborhood_reference,
    summary: row.summary,
    incidentDate: row.incident_date,
    recordingSessionId: row.recording_session_id,
    recordingClipCount: Number(row.recording_clip_count),
    expectedAttachments: Number(row.expected_attachments),
    attachmentCount: attachments.length,
    status: row.status,
    createdAt: row.created_at,
    attachments,
  };
}

async function handleReports(request: Request, env: Env, path: string): Promise<Response> {
  if (!env.DB) return error(503, 'Base de datos D1 no disponible.');
  await ensureReportSchema(env.DB);
  const db = env.DB;

  const secret = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!SECRET.test(secret)) return error(401, 'Clave privada de expediente no válida.');
  const accessHash = await sha256(new TextEncoder().encode(secret).buffer);

  if (path === '/reports' && request.method === 'POST') {
    let rawBytes: ArrayBuffer;
    try {
      rawBytes = await readLimited(request, MAX_REPORT_JSON_BYTES);
    } catch {
      return error(413, 'El formulario supera el tamaño permitido.');
    }
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(rawBytes));
    } catch {
      return error(400, 'Formato de solicitud no válido.');
    }
    const parsed = parseCreateReportInput(payload);
    if (!parsed.ok) return error(400, parsed.error);
    const input = parsed.data;

    const existing = await db
      .prepare('SELECT * FROM confidential_reports WHERE request_id = ?')
      .bind(input.requestId)
      .first<StoredReportRow>();
    if (existing) {
      if (existing.access_hash !== accessHash) {
        return error(409, 'Ese identificador de solicitud ya fue registrado con otra clave.');
      }
      return json(await buildReportRecord(db, existing), 200);
    }

    if (env.SESSION_LIMITER && !(await env.SESSION_LIMITER.limit({ key: 'new-reports' })).success) {
      return error(429, 'Espera un minuto antes de radicar otro expediente.');
    }

    let recordingSessionId: string | null = null;
    let recordingClipCount = 0;
    if (input.recordingKey) {
      const [recId, recSecret] = input.recordingKey.split('.');
      const sessionObject = await env.EVIDENCIAS.get(`${prefix(recId)}session`);
      const recSession = await sessionObject?.json<StoredSession>();
      const recSecretHash = await sha256(new TextEncoder().encode(recSecret).buffer);
      if (!recSession || recSession.expiresAt <= Date.now() || recSession.hash !== recSecretHash) {
        return error(400, 'La clave de grabación vinculada no es válida o ya venció.');
      }
      const clips = await listClips(env, recId);
      if (clips.length === 0) {
        return error(400, 'La sesión de grabación indicada aún no tiene clips confirmados en R2.');
      }
      recordingSessionId = recId;
      recordingClipCount = clips.length;
    }

    const createdAt = new Date().toISOString();
    let insertedCode = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      const candidate = generateReportCode();
      const collision = await db.prepare('SELECT code FROM confidential_reports WHERE code = ?').bind(candidate).first();
      if (collision) continue;
      await db
        .prepare(
          `INSERT INTO confidential_reports (
            code, request_id, access_hash, category, risk_level, commune,
            neighborhood_reference, summary, incident_date, recording_session_id,
            recording_clip_count, expected_attachments, attachment_count, privacy_ack, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 'radicado', ?)`
        )
        .bind(
          candidate,
          input.requestId,
          accessHash,
          input.category,
          input.riskLevel,
          input.commune,
          input.neighborhoodReference,
          input.summary,
          input.incidentDate,
          recordingSessionId,
          recordingClipCount,
          input.expectedAttachments,
          createdAt
        )
        .run();
      insertedCode = candidate;
      break;
    }
    if (!insertedCode) return error(503, 'No se pudo asignar un código único. Reintenta.');
    const createdRow = await db
      .prepare('SELECT * FROM confidential_reports WHERE code = ?')
      .bind(insertedCode)
      .first<StoredReportRow>();
    if (!createdRow) return error(503, 'No se pudo confirmar la persistencia en D1.');
    return json(await buildReportRecord(db, createdRow), 201);
  }

  const match = /^\/reports\/(ALZ-\d{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6})(?:\/attachments\/(\d+))?$/.exec(path);
  if (!match || !REPORT_CODE_PATTERN.test(match[1])) {
    return error(404, 'Ruta de denuncia no disponible.');
  }
  const [, code, rawSlot] = match;
  const reportRow = await db
    .prepare('SELECT * FROM confidential_reports WHERE code = ?')
    .bind(code)
    .first<StoredReportRow>();
  if (!reportRow || reportRow.access_hash !== accessHash) {
    return error(401, 'Código de expediente o clave privada no válidos.');
  }

  if (rawSlot === undefined) {
    if (request.method !== 'GET') return error(405, 'Método no permitido.');
    return json(await buildReportRecord(db, reportRow), 200);
  }

  const slotIndex = Number(rawSlot);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= MAX_REPORT_ATTACHMENTS || String(slotIndex) !== rawSlot) {
    return error(400, 'Índice de archivo adjunto no válido.');
  }

  if (request.method === 'GET') {
    const attRow = await db
      .prepare('SELECT * FROM report_attachments WHERE report_code = ? AND slot_index = ?')
      .bind(code, slotIndex)
      .first<StoredAttachmentRow>();
    if (!attRow) return error(404, 'Archivo adjunto no encontrado.');
    const r2Object = await env.EVIDENCIAS.get(attRow.r2_key);
    if (!r2Object) return error(404, 'Bytes del archivo no encontrados en R2.');
    const ext = attRow.mime === 'audio/wav' ? 'wav' : attRow.mime === 'image/png' ? 'png' : attRow.mime === 'image/webp' ? 'webp' : 'jpg';
    return new Response(r2Object.body, {
      headers: {
        ...headers,
        'Content-Type': attRow.mime,
        'Content-Length': String(attRow.bytes),
        'Content-Disposition': `attachment; filename="evidencia-${code}-${slotIndex + 1}.${ext}"`,
        'X-Content-SHA256': attRow.sha256,
      },
    });
  }

  if (request.method !== 'PUT') return error(405, 'Método no permitido.');
  const mime = request.headers.get('content-type');
  if (!isSanitizedMime(mime)) {
    return error(415, 'Tipo de archivo no admitido. Solo se aceptan imágenes JPEG/PNG/WebP y audio WAV limpio.');
  }
  const rawSummaryHeader = request.headers.get('x-sanitization-summary') ?? '';
  let summaryValue: unknown;
  try {
    summaryValue = JSON.parse(decodeURIComponent(rawSummaryHeader));
  } catch {
    return error(400, 'Resumen de inspección de metadatos no válido.');
  }
  if (!isSanitizationSummary(summaryValue) || summaryValue.sanitizedMime !== mime) {
    return error(400, 'El manifiesto de limpieza de metadatos no coincide con el archivo enviado.');
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await readLimited(request, MAX_ATTACHMENT_BYTES);
  } catch {
    return error(413, 'El archivo supera el límite de 2 MiB.');
  }
  const inspection = inspectMediaMetadata(bytes, mime);
  if (!inspection.validFormat) {
    return error(415, inspection.reason ?? 'Formato binario no admitido o archivo corrupto.');
  }
  if (inspection.hasIdentifiableMetadata) {
    return error(
      422,
      `El archivo conserva metadatos identificables (${inspection.detectedMarkers.join(', ')}) y fue rechazado.`
    );
  }

  const hash = await sha256(bytes);
  const existingAtt = await db
    .prepare('SELECT * FROM report_attachments WHERE report_code = ? AND slot_index = ?')
    .bind(code, slotIndex)
    .first<StoredAttachmentRow>();
  if (existingAtt) {
    if (existingAtt.sha256 !== hash || existingAtt.mime !== mime) {
      return error(409, 'Ese espacio de evidencia ya contiene un archivo diferente.');
    }
    return json(mapAttachmentRow(existingAtt), 200);
  }

  const r2Key = `reports/${code}/attachments/${String(slotIndex).padStart(2, '0')}`;
  const kind = attachmentKindForMime(mime);
  const createdAt = new Date().toISOString();
  await env.EVIDENCIAS.put(r2Key, bytes, {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: mime },
    customMetadata: { reportCode: code, sha256: hash, kind },
  }).catch(async () => {
    // Idempotent fallback if R2 object already existed from an interrupted attempt.
    const existingObj = await env.EVIDENCIAS.get(r2Key);
    if (!existingObj) throw new Error('r2-write-failed');
  });

  const attId = crypto.randomUUID();
  await db.batch([
    db
      .prepare(
        `INSERT INTO report_attachments (
          id, report_code, slot_index, kind, mime, bytes, sha256, r2_key, sanitization_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(attId, code, slotIndex, kind, mime, bytes.byteLength, hash, r2Key, JSON.stringify(summaryValue), createdAt),
    db
      .prepare(
        `UPDATE confidential_reports
         SET attachment_count = (SELECT COUNT(*) FROM report_attachments WHERE report_code = ?)
         WHERE code = ?`
      )
      .bind(code, code),
  ]);

  return json(
    {
      index: slotIndex,
      kind,
      mime,
      bytes: bytes.byteLength,
      sha256: hash,
      sanitizationSummary: summaryValue,
      receivedAt: createdAt,
    } satisfies ReportAttachmentReceipt,
    201
  );
}

async function handle(request: Request, env: Env): Promise<Response> {
  if (!env.GATEWAY_SECRET || env.GATEWAY_SECRET.length < 32) return error(503, 'Almacenamiento no disponible.');
  const supplied = request.headers.get('x-recording-gateway') ?? '';
  if (
    (await sha256(new TextEncoder().encode(supplied).buffer)) !==
    (await sha256(new TextEncoder().encode(env.GATEWAY_SECRET).buffer))
  ) {
    return error(401, 'Acceso no autorizado.');
  }
  const path = new URL(request.url).pathname;
  if (path === '/reports' || path.startsWith('/reports/')) {
    return handleReports(request, env, path);
  }
  if (path === '/sessions' && request.method === 'POST') {
    const format = request.headers.get('x-recording-format');
    if (format !== null && format !== 'continuous-webm-v1') return error(400, 'Formato de grabación no válido.');
    // A global cap deliberately avoids retaining citizen IP addresses.
    if (env.SESSION_LIMITER && !(await env.SESSION_LIMITER.limit({ key: 'new-recordings' })).success) {
      return error(429, 'Espera un minuto antes de crear otra grabación.');
    }
    const id = crypto.randomUUID();
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const uploadUntil = Date.now() + 60 * 60 * 1000;
    const hash = await sha256(new TextEncoder().encode(secret).buffer);
    const version = format ? { format } : {};
    await env.EVIDENCIAS.put(`${prefix(id)}session`, JSON.stringify({ hash, expiresAt, uploadUntil, ...version }));
    return json({ id, secret, expiresAt, uploadUntil, ...version }, 201);
  }
  const match = /^\/sessions\/([^/]+)(?:\/clips(?:\/(\d+))?|\/(complete))?$/.exec(path);
  if (!match || !UUID.test(match[1])) return error(404, 'Ruta no disponible.');
  const [, id, rawIndex, complete] = match;
  const secret = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!SECRET.test(secret)) return error(401, 'Clave de recuperación no válida.');
  const sessionObject = await env.EVIDENCIAS.get(`${prefix(id)}session`);
  const session = await sessionObject?.json<StoredSession>();
  if (!session || session.expiresAt <= Date.now() || session.hash !== (await sha256(new TextEncoder().encode(secret).buffer))) {
    return error(401, 'Clave no válida o acceso vencido.');
  }
  if (complete) {
    if (request.method !== 'POST') return error(405, 'Método no permitido.');
    if (session.uploadUntil <= Date.now()) return error(403, 'El plazo de subida terminó. Puedes recuperar lo recibido.');
    if (session.format !== 'continuous-webm-v1') return error(409, 'Esta sesión contiene clips independientes.');
    let bytes: ArrayBuffer;
    try {
      bytes = await readLimited(request, 1024);
    } catch {
      return error(413, 'El contenido supera el límite permitido.');
    }
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return error(400, 'Cierre de grabación no válido.');
    }
    if (!isCompletion(value)) return error(400, 'Número de fragmentos no válido.');
    const previous = await completion(env, id);
    if (previous) return previous.clipCount === value.clipCount ? json(previous) : error(409, 'La grabación ya se cerró con otro total.');
    const clips = await listClips(env, id);
    if (
      clips.length !== value.clipCount ||
      clips.some((clip, i) => clip.index !== i || clip.mime !== clips[0].mime || clip.startMs !== (i ? clips[i - 1].endMs : 0))
    ) {
      return error(409, 'Faltan fragmentos o la grabación no es continua. Reintenta después de enviar los pendientes.');
    }
    if (clips.reduce((sum, clip) => sum + clip.bytes, 0) > MAX_RECORDING_BYTES) return error(413, 'La grabación supera 64 MiB.');
    const result: RecordingCompletion = { clipCount: value.clipCount };
    const saved = await env.EVIDENCIAS.put(`${prefix(id)}completion`, JSON.stringify(result), { onlyIf: { etagDoesNotMatch: '*' } });
    if (saved) return json(result, 201);
    const existing = await completion(env, id);
    return existing?.clipCount === result.clipCount ? json(existing) : error(409, 'La grabación ya se cerró con otro total.');
  }
  if (rawIndex === undefined && request.method === 'GET') {
    const clips = await listClips(env, id);
    const finished = session.format === 'continuous-webm-v1' ? await completion(env, id) : undefined;
    return json({
      id,
      expiresAt: session.expiresAt,
      uploadUntil: session.uploadUntil,
      ...(session.format ? { format: session.format } : {}),
      ...(finished ? { completion: finished } : {}),
      clips,
    });
  }
  const index = Number(rawIndex);
  if (rawIndex === undefined || !Number.isInteger(index) || index < 0 || index >= MAX_CLIPS || String(index) !== rawIndex) {
    return error(400, 'Número de clip no válido.');
  }
  const key = `${prefix(id)}clips/${String(index).padStart(3, '0')}`;
  if (request.method === 'GET') {
    const object = await env.EVIDENCIAS.get(key);
    if (!object) return error(404, 'Clip no recibido.');
    const r = receipt(object);
    return new Response(object.body, {
      headers: {
        ...headers,
        'Content-Type': r.mime,
        'Content-Length': String(r.bytes),
        'Content-Disposition': `attachment; filename="clip-${index + 1}.webm"`,
        'X-Content-SHA256': r.sha256,
      },
    });
  }
  if (request.method !== 'PUT') return error(405, 'Método no permitido.');
  if (session.uploadUntil <= Date.now()) return error(403, 'El plazo de subida terminó. Puedes recuperar lo recibido.');
  const mime = request.headers.get('content-type');
  const startHeader = request.headers.get('x-clip-start');
  const endHeader = request.headers.get('x-clip-end');
  const startMs = Number(startHeader),
    endMs = Number(endHeader);
  if (
    !isMime(mime) ||
    !startHeader ||
    !endHeader ||
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    startMs < 0 ||
    endMs < startMs ||
    endMs > 3_600_000
  ) {
    return error(400, 'Formato o tiempos no válidos.');
  }
  if (session.format === 'continuous-webm-v1') {
    const finished = await completion(env, id);
    if (finished && index >= finished.clipCount) return error(409, 'La grabación ya está cerrada. No se añadieron fragmentos.');
    if (index === 0 && startMs !== 0) return error(400, 'El primer fragmento debe comenzar en cero.');
    if (index > 0) {
      const previous = await env.EVIDENCIAS.get(`${prefix(id)}clips/${String(index - 1).padStart(3, '0')}`);
      const preceding = previous ? receipt(previous) : null;
      if (!preceding || preceding.endMs !== startMs || preceding.mime !== mime) {
        return error(409, 'Envía los fragmentos en orden, con el mismo formato y sin huecos.');
      }
    }
  }
  let bytes: ArrayBuffer;
  try {
    bytes = await readLimited(request, MAX_CLIP_BYTES);
  } catch {
    return error(413, 'El clip supera 2 MiB.');
  }
  const signature = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  if (!bytes.byteLength) return error(415, 'El fragmento está vacío.');
  // Only the first blob of one continuous MediaRecorder contains the WebM header.
  if (
    (session.format !== 'continuous-webm-v1' || index === 0) &&
    (signature.length !== 4 || signature[0] !== 0x1a || signature[1] !== 0x45 || signature[2] !== 0xdf || signature[3] !== 0xa3)
  ) {
    return error(415, 'Se esperaba un archivo WebM.');
  }
  const hash = await sha256(bytes);
  const metadata = { index, mime, startMs, endMs, bytes: bytes.byteLength, sha256: hash, receivedAt: new Date().toISOString() };
  const saved = await env.EVIDENCIAS.put(key, bytes, {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: mime },
    customMetadata: { receipt: JSON.stringify(metadata) },
  });
  if (saved) return json({ ...metadata, etag: saved.etag }, 201);
  const previous = await env.EVIDENCIAS.get(key);
  if (!previous) throw new Error('missing-after-conflict');
  const r = receipt(previous);
  if (r.sha256 !== hash || r.mime !== mime || r.startMs !== startMs || r.endMs !== endMs) {
    return error(409, 'Ese número ya contiene otro clip. No se reemplazó.');
  }
  return json(r);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch {
      return error(503, 'No se pudo confirmar el almacenamiento. Conserva la pestaña y reintenta.');
    }
  },
};
export default worker;
