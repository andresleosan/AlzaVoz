import type { RecordingGatewayEnv } from '../recording/proxy';
import { readLimited } from '../recording/contracts';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const error = (status: number, message: string) => Response.json({ error: message }, { status, headers });
export async function communityProxy(request: Request, env: RecordingGatewayEnv): Promise<Response> {
  if (!['GET', 'POST'].includes(request.method)) return error(405, 'Método no permitido.');
  if (new URL(request.url).search) return error(400, 'Consulta no válida.');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.method === 'POST' &&
    (request.headers.get('origin') !== env.RECORDING_APP_ORIGIN || request.headers.get('x-community-client') !== '1'))) return error(403, 'Origen no permitido.');
  const endpoint = env.RECORDING_API_URL ?? (env.RECORDINGS ? 'https://recordings.internal' : undefined);
  if (!endpoint || !env.RECORDING_GATEWAY_SECRET || !env.RECORDING_APP_ORIGIN) return error(503, 'El mapa no está disponible. Reintenta más tarde.');
  let body: ArrayBuffer | undefined;
  if (request.method === 'POST') {
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return error(415, 'Usa JSON.');
    try { body = await readLimited(request, 512); } catch { return error(413, 'El envío es demasiado grande.'); }
  }
  try {
    const url = new URL('/community', endpoint);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return error(503, 'Servicio no disponible.');
    const outgoing = new Request(url, { method: request.method, body, headers: { 'x-recording-gateway': env.RECORDING_GATEWAY_SECRET, 'content-type': 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const response = env.RECORDINGS && !env.RECORDING_API_URL ? await env.RECORDINGS.fetch(outgoing) : await fetch(outgoing);
    if (response.status >= 300 && response.status < 400) throw new Error('Redirect');
    return new Response(response.body, { status: response.status, headers: { ...headers, 'Content-Type': 'application/json' } });
  } catch { return error(503, 'No se pudo confirmar con el servidor. Reintenta sin cambiar los datos.'); }
}
