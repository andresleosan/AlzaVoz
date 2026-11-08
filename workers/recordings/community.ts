import { bogotaDay, firstCommunityDay, parseCommunityInput, type CommunityAggregate, type CommunityInput } from '../../src/lib/community/contracts';
import { readLimited } from '../../src/lib/recording/contracts';

interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}
interface CommunityEnv {
  DB?: { prepare(query: string): Statement; batch(statements: Statement[]): Promise<unknown[]> };
  SESSION_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
let schemaReady: Promise<unknown> | undefined;

export async function handleCommunity(request: Request, env: CommunityEnv): Promise<Response> {
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Método no permitido.' }, 405);
  if (new URL(request.url).search) return json({ error: 'Consulta no válida.' }, 400);
  const db = env.DB;
  if (!db) return json({ error: 'El mapa no está disponible. Reintenta más tarde.' }, 503);
  // Same idempotent bootstrap used by reports: a fresh local/remote database works before the first insert.
  schemaReady ??= db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS community_observations (request_id TEXT PRIMARY KEY, commune INTEGER NOT NULL, category TEXT NOT NULL, day TEXT NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS community_day_zone ON community_observations(day, commune, category)'),
  ]).catch(error => { schemaReady = undefined; throw error; });
  await schemaReady;
  const now = new Date();
  if (request.method === 'GET') {
    const { results } = await db.prepare('SELECT commune, category, COUNT(*) AS count FROM community_observations WHERE day >= ? AND day <= ? GROUP BY commune, category ORDER BY commune, category')
      .bind(firstCommunityDay(now), bogotaDay(now)).all<CommunityAggregate>();
    return json({ groups: results, days: 30 });
  }
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'Usa JSON.' }, 415);
  let input: CommunityInput | null;
  try { input = parseCommunityInput(JSON.parse(new TextDecoder().decode(await readLimited(request, 512))), now); }
  catch { return json({ error: 'Contenido no válido o demasiado grande.' }, 400); }
  if (!input) return json({ error: 'Revisa comuna, categoría y día. No incluyas datos personales.' }, 400);
  if (env.SESSION_LIMITER && !(await env.SESSION_LIMITER.limit({ key: 'community-observations' })).success) {
    return json({ error: 'Hay muchos envíos. Espera un minuto y reintenta.' }, 429);
  }
  await db.batch([
    db.prepare('DELETE FROM community_observations WHERE day < ?').bind(firstCommunityDay(now)),
    db.prepare('INSERT INTO community_observations(request_id, commune, category, day) VALUES (?, ?, ?, ?) ON CONFLICT(request_id) DO NOTHING')
      .bind(input.requestId, input.commune, input.category, input.day),
  ]);
  const stored = await db.prepare('SELECT commune, category, day FROM community_observations WHERE request_id = ?').bind(input.requestId)
    .first<{ commune: number; category: string; day: string }>();
  if (!stored) return json({ error: 'No se pudo confirmar. Reintenta.' }, 503);
  if (stored.commune !== input.commune || stored.category !== input.category || stored.day !== input.day) {
    return json({ error: 'Este envío ya fue usado con otros datos.' }, 409);
  }
  return json({ accepted: true });
}
