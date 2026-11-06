import { isCompletion, isMime, isReceipt, MAX_CLIPS, MAX_CLIP_BYTES, MAX_RECORDING_BYTES, readLimited, SECRET, sha256, UUID, type ClipReceipt, type RecordingCompletion, type RecordingFormat } from '../../src/lib/recording/contracts';

// Structural binding types keep Workers globals out of Next's DOM type environment.
interface StoredObject {
  key: string; etag: string; customMetadata?: Record<string, string>;
  body: ReadableStream<Uint8Array>; json<T>(): Promise<T>;
}
interface Bucket {
  get(key: string): Promise<StoredObject | null>;
  put(key: string, body: ArrayBuffer | string, options?: {
    onlyIf?: { etagDoesNotMatch: string }; customMetadata?: Record<string, string>;
    httpMetadata?: { contentType: string };
  }): Promise<StoredObject | null>;
  list(options: { prefix: string; limit: number; include: string[] }): Promise<{ objects: StoredObject[]; truncated: boolean }>;
}
interface Env { EVIDENCIAS: Bucket; GATEWAY_SECRET: string; SESSION_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> } }
interface StoredSession { hash: string; expiresAt: number; uploadUntil: number; format?: RecordingFormat }
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
const error = (status: number, message: string) => json({ error: message }, status);
const prefix = (id: string) => `recordings/${id}/`;
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

async function handle(request: Request, env: Env): Promise<Response> {
  if (!env.GATEWAY_SECRET || env.GATEWAY_SECRET.length < 32) return error(503, 'Almacenamiento no disponible.');
  const supplied = request.headers.get('x-recording-gateway') ?? '';
  if (await sha256(new TextEncoder().encode(supplied).buffer) !== await sha256(new TextEncoder().encode(env.GATEWAY_SECRET).buffer)) {
    return error(401, 'Acceso no autorizado.');
  }
  const path = new URL(request.url).pathname;
  if (path === '/sessions' && request.method === 'POST') {
    const format = request.headers.get('x-recording-format');
    if (format !== null && format !== 'continuous-webm-v1') return error(400, 'Formato de grabación no válido.');
    // A global cap deliberately avoids retaining citizen IP addresses.
    if (env.SESSION_LIMITER && !(await env.SESSION_LIMITER.limit({ key: 'new-recordings' })).success) {
      return error(429, 'Espera un minuto antes de crear otra grabación.');
    }
    const id = crypto.randomUUID();
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
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
  if (!session || session.expiresAt <= Date.now() || session.hash !== await sha256(new TextEncoder().encode(secret).buffer)) {
    return error(401, 'Clave no válida o acceso vencido.');
  }
  if (complete) {
    if (request.method !== 'POST') return error(405, 'Método no permitido.');
    if (session.uploadUntil <= Date.now()) return error(403, 'El plazo de subida terminó. Puedes recuperar lo recibido.');
    if (session.format !== 'continuous-webm-v1') return error(409, 'Esta sesión contiene clips independientes.');
    let bytes: ArrayBuffer;
    try { bytes = await readLimited(request, 1024); } catch { return error(413, 'El contenido supera el límite permitido.'); }
    let value: unknown;
    try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { return error(400, 'Cierre de grabación no válido.'); }
    if (!isCompletion(value)) return error(400, 'Número de fragmentos no válido.');
    const previous = await completion(env, id);
    if (previous) return previous.clipCount === value.clipCount ? json(previous) : error(409, 'La grabación ya se cerró con otro total.');
    const clips = await listClips(env, id);
    if (clips.length !== value.clipCount || clips.some((clip, i) => clip.index !== i || clip.mime !== clips[0].mime || clip.startMs !== (i ? clips[i - 1].endMs : 0))) {
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
    return json({ id, expiresAt: session.expiresAt, uploadUntil: session.uploadUntil, ...(session.format ? { format: session.format } : {}), ...(finished ? { completion: finished } : {}), clips });
  }
  const index = Number(rawIndex);
  if (rawIndex === undefined || !Number.isInteger(index) || index < 0 || index >= MAX_CLIPS || String(index) !== rawIndex) return error(400, 'Número de clip no válido.');
  const key = `${prefix(id)}clips/${String(index).padStart(3, '0')}`;
  if (request.method === 'GET') {
    const object = await env.EVIDENCIAS.get(key);
    if (!object) return error(404, 'Clip no recibido.');
    const r = receipt(object);
    return new Response(object.body, { headers: { ...headers, 'Content-Type': r.mime, 'Content-Length': String(r.bytes), 'Content-Disposition': `attachment; filename="clip-${index + 1}.webm"`, 'X-Content-SHA256': r.sha256 } });
  }
  if (request.method !== 'PUT') return error(405, 'Método no permitido.');
  if (session.uploadUntil <= Date.now()) return error(403, 'El plazo de subida terminó. Puedes recuperar lo recibido.');
  const mime = request.headers.get('content-type');
  const startHeader = request.headers.get('x-clip-start');
  const endHeader = request.headers.get('x-clip-end');
  const startMs = Number(startHeader), endMs = Number(endHeader);
  if (!isMime(mime) || !startHeader || !endHeader || !Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs < startMs || endMs > 3_600_000) return error(400, 'Formato o tiempos no válidos.');
  if (session.format === 'continuous-webm-v1') {
    const finished = await completion(env, id);
    if (finished && index >= finished.clipCount) return error(409, 'La grabación ya está cerrada. No se añadieron fragmentos.');
    if (index === 0 && startMs !== 0) return error(400, 'El primer fragmento debe comenzar en cero.');
    if (index > 0) {
      const previous = await env.EVIDENCIAS.get(`${prefix(id)}clips/${String(index - 1).padStart(3, '0')}`);
      const preceding = previous ? receipt(previous) : null;
      if (!preceding || preceding.endMs !== startMs || preceding.mime !== mime) return error(409, 'Envía los fragmentos en orden, con el mismo formato y sin huecos.');
    }
  }
  let bytes: ArrayBuffer;
  try { bytes = await readLimited(request, MAX_CLIP_BYTES); } catch { return error(413, 'El clip supera 2 MiB.'); }
  const signature = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  if (!bytes.byteLength) return error(415, 'El fragmento está vacío.');
  // Only the first blob of one continuous MediaRecorder contains the WebM header.
  if ((session.format !== 'continuous-webm-v1' || index === 0) && (signature.length !== 4 || signature[0] !== 0x1a || signature[1] !== 0x45 || signature[2] !== 0xdf || signature[3] !== 0xa3)) return error(415, 'Se esperaba un archivo WebM.');
  const hash = await sha256(bytes);
  const metadata = { index, mime, startMs, endMs, bytes: bytes.byteLength, sha256: hash, receivedAt: new Date().toISOString() };
  const saved = await env.EVIDENCIAS.put(key, bytes, { onlyIf: { etagDoesNotMatch: '*' }, httpMetadata: { contentType: mime }, customMetadata: { receipt: JSON.stringify(metadata) } });
  if (saved) return json({ ...metadata, etag: saved.etag }, 201);
  const previous = await env.EVIDENCIAS.get(key);
  if (!previous) throw new Error('missing-after-conflict');
  const r = receipt(previous);
  if (r.sha256 !== hash || r.mime !== mime || r.startMs !== startMs || r.endMs !== endMs) return error(409, 'Ese número ya contiene otro clip. No se reemplazó.');
  return json(r);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    try { return await handle(request, env); }
    catch { return error(503, 'No se pudo confirmar el almacenamiento. Conserva la pestaña y reintenta.'); }
  },
};
export default worker;
