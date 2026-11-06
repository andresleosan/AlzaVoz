import { isMime, isReceipt, MAX_CLIPS, MAX_CLIP_BYTES, readLimited, SECRET, sha256, UUID, type ClipReceipt } from '../../src/lib/recording/contracts';

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
interface StoredSession { hash: string; expiresAt: number; uploadUntil: number }
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

async function handle(request: Request, env: Env): Promise<Response> {
  if (!env.GATEWAY_SECRET || env.GATEWAY_SECRET.length < 32) return error(503, 'Almacenamiento no disponible.');
  const supplied = request.headers.get('x-recording-gateway') ?? '';
  if (await sha256(new TextEncoder().encode(supplied).buffer) !== await sha256(new TextEncoder().encode(env.GATEWAY_SECRET).buffer)) {
    return error(401, 'Acceso no autorizado.');
  }
  const path = new URL(request.url).pathname;
  if (path === '/sessions' && request.method === 'POST') {
    // A global cap deliberately avoids retaining citizen IP addresses.
    if (env.SESSION_LIMITER && !(await env.SESSION_LIMITER.limit({ key: 'new-recordings' })).success) {
      return error(429, 'Espera un minuto antes de crear otra grabación.');
    }
    const id = crypto.randomUUID();
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const uploadUntil = Date.now() + 60 * 60 * 1000;
    const hash = await sha256(new TextEncoder().encode(secret).buffer);
    await env.EVIDENCIAS.put(`${prefix(id)}session`, JSON.stringify({ hash, expiresAt, uploadUntil }));
    return json({ id, secret, expiresAt, uploadUntil }, 201);
  }
  const match = /^\/sessions\/([^/]+)(?:\/clips(?:\/(\d+))?)?$/.exec(path);
  if (!match || !UUID.test(match[1])) return error(404, 'Ruta no disponible.');
  const [, id, rawIndex] = match;
  const secret = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!SECRET.test(secret)) return error(401, 'Clave de recuperación no válida.');
  const sessionObject = await env.EVIDENCIAS.get(`${prefix(id)}session`);
  const session = await sessionObject?.json<StoredSession>();
  if (!session || session.expiresAt <= Date.now() || session.hash !== await sha256(new TextEncoder().encode(secret).buffer)) {
    return error(401, 'Clave no válida o acceso vencido.');
  }
  if (rawIndex === undefined && request.method === 'GET') {
    const listed = await env.EVIDENCIAS.list({ prefix: `${prefix(id)}clips/`, limit: MAX_CLIPS + 1, include: ['customMetadata'] });
    if (listed.truncated || listed.objects.length > MAX_CLIPS) throw new Error('invalid-list');
    return json({ id, expiresAt: session.expiresAt, uploadUntil: session.uploadUntil, clips: listed.objects.map(receipt).sort((a, b) => a.index - b.index) });
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
  let bytes: ArrayBuffer;
  try { bytes = await readLimited(request, MAX_CLIP_BYTES); } catch { return error(413, 'El clip supera 2 MiB.'); }
  const signature = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  if (signature.length !== 4 || signature[0] !== 0x1a || signature[1] !== 0x45 || signature[2] !== 0xdf || signature[3] !== 0xa3) return error(415, 'Se esperaba un archivo WebM.');
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
