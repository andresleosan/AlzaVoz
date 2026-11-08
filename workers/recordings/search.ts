import { CANDIDATE_LIMIT, complementaryKind, NOTICE_LIMIT, MAX_SEARCH_BYTES, parseCreateNotice, parseTip, type PublicNotice, type NoticeKind } from '../../src/lib/search/contracts';
import { readLimited, UUID } from '../../src/lib/recording/contracts';

interface Statement { bind(...values: unknown[]): Statement; first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }>; run(): Promise<{ success: boolean }> }
interface SearchEnv { DB?: { prepare(query: string): Statement; batch(statements: Statement[]): Promise<unknown[]> }; SESSION_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> } }
interface Row { id: string; kind: NoticeKind; title: string; description: string; commune: number; event_date: string; created_at: string; payload?: string }
const projection = 'id, kind, title, description, commune, event_date, created_at';
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const publicNotice = (row: Row): PublicNotice => ({ id: row.id, kind: row.kind, title: row.title, description: row.description, commune: row.commune, eventDate: row.event_date, createdAt: row.created_at });
const schemas = new WeakMap<object, Promise<unknown>>();
export async function handleSearch(request: Request, env: SearchEnv): Promise<Response> {
  const url = new URL(request.url);
  if (url.search) return json({ error: 'Consulta no válida.' }, 400);
  const match = /^\/search(?:\/([0-9a-f-]{36})(?:\/(tips|candidates))?)?$/.exec(url.pathname);
  if (!match || (match[1] && !UUID.test(match[1]))) return json({ error: 'Ruta no disponible.' }, 404);
  const [, id, action] = match;
  if (request.method !== (action === 'tips' ? 'POST' : 'GET') && !(request.method === 'POST' && !id)) return json({ error: 'Método no permitido.' }, 405);
  const db = env.DB;
  if (!db) return json({ error: 'Los avisos no están disponibles. Reintenta.' }, 503);
  if (!schemas.has(db)) schemas.set(db, db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS search_notices (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, payload TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, commune INTEGER NOT NULL, event_date TEXT NOT NULL, contact TEXT NOT NULL, created_at TEXT NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS search_kind_created ON search_notices(kind, created_at DESC)'),
    db.prepare('CREATE TABLE IF NOT EXISTS search_tips (request_id TEXT PRIMARY KEY, notice_id TEXT NOT NULL REFERENCES search_notices(id), payload TEXT NOT NULL, text TEXT NOT NULL, contact TEXT NOT NULL, created_at TEXT NOT NULL)'),
  ]).catch(problem => { schemas.delete(db); throw problem; }));
  await schemas.get(db);
  const notice = id ? await db.prepare(`SELECT ${projection} FROM search_notices WHERE id = ?`).bind(id).first<Row>() : null;
  if (id && !notice) return json({ error: 'Aviso no encontrado.' }, 404);
  if (request.method === 'GET') {
    if (notice && action === 'candidates') {
      if (env.SESSION_LIMITER && !(await env.SESSION_LIMITER.limit({ key: 'search-matches' })).success) return json({ error: 'Espera un minuto antes de solicitar más sugerencias.' }, 429);
      const { results } = await db.prepare(`SELECT ${projection} FROM search_notices WHERE kind = ? ORDER BY created_at DESC, id LIMIT ?`).bind(complementaryKind[notice.kind], CANDIDATE_LIMIT).all<Row>();
      return json({ notices: results.map(publicNotice) });
    }
    if (notice) return json({ notice: publicNotice(notice) });
    const { results } = await db.prepare(`SELECT ${projection} FROM search_notices ORDER BY created_at DESC, id LIMIT ?`).bind(NOTICE_LIMIT).all<Row>();
    return json({ notices: results.map(publicNotice) });
  }
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'Usa JSON.' }, 415);
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(await readLimited(request, MAX_SEARCH_BYTES))); } catch { return json({ error: 'Contenido no válido o demasiado grande.' }, 400); }
  const input = action === 'tips' ? parseTip(value) : parseCreateNotice(value);
  if (!input) return json({ error: 'Revisa los campos y autoriza el envío.' }, 400);
  // Private request IDs prevent public notice IDs from becoming contact-guessing oracles.
  const payload = JSON.stringify({ ...input, ...(id ? { noticeId: id } : {}) });
  const existing = await db.prepare(`SELECT ${action === 'tips' ? 'payload' : `${projection}, payload`} FROM ${action === 'tips' ? 'search_tips' : 'search_notices'} WHERE request_id = ?`).bind(input.requestId).first<Row>();
  if (existing) {
    if (existing.payload !== payload) return json({ error: 'Este envío ya se usó con otros datos.' }, 409);
    return json(action === 'tips' ? { accepted: true } : { notice: publicNotice(existing) });
  }
  if (env.SESSION_LIMITER && !(await env.SESSION_LIMITER.limit({ key: 'search-mutations' })).success) return json({ error: 'Espera un minuto antes de reintentar.' }, 429);
  const now = new Date().toISOString();
  if ('text' in input) {
    await db.prepare('INSERT INTO search_tips(request_id, notice_id, payload, text, contact, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(request_id) DO NOTHING').bind(input.requestId, id, payload, input.text, input.contact, now).run();
    const stored = await db.prepare('SELECT payload FROM search_tips WHERE request_id = ?').bind(input.requestId).first<{ payload: string }>();
    if (!stored) return json({ error: 'No se pudo confirmar la pista. Reintenta.' }, 503);
    return stored.payload === payload ? json({ accepted: true }) : json({ error: 'Este envío ya se usó con otros datos.' }, 409);
  }
  await db.prepare('INSERT INTO search_notices(id, request_id, payload, kind, title, description, commune, event_date, contact, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(request_id) DO NOTHING').bind(crypto.randomUUID(), input.requestId, payload, input.kind, input.title, input.description, input.commune, input.eventDate, input.contact, now).run();
  const stored = await db.prepare(`SELECT ${projection}, payload FROM search_notices WHERE request_id = ?`).bind(input.requestId).first<Row>();
  if (!stored) return json({ error: 'No se pudo confirmar el aviso. Reintenta.' }, 503);
  return stored.payload === payload ? json({ notice: publicNotice(stored) }) : json({ error: 'Este envío ya se usó con otros datos.' }, 409);
}
