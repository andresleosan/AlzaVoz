import { MAX_CLIP_BYTES, readLimited } from './contracts';

const responseHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const error = (status: number, message: string) => Response.json({ error: message }, { status, headers: responseHeaders });
export interface RecordingGatewayEnv {
  RECORDING_API_URL?: string;
  RECORDING_GATEWAY_SECRET?: string;
  RECORDING_APP_ORIGIN?: string;
  RECORDINGS?: { fetch(request: Request): Promise<Response> };
}
export async function recordingProxy(request: Request, env: RecordingGatewayEnv): Promise<Response> {
  if (!['GET', 'POST', 'PUT'].includes(request.method)) return error(405, 'Método no permitido.');
  const endpoint = env.RECORDING_API_URL ?? (env.RECORDINGS ? 'https://recordings.internal' : undefined);
  const gateway = env.RECORDING_GATEWAY_SECRET;
  const appOrigin = env.RECORDING_APP_ORIGIN;
  if (!endpoint || !gateway || !appOrigin) return error(503, 'El almacenamiento aún no está disponible. No se inició la grabación.');
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/recordings/, '');
  if (!/^\/sessions(?:\/[0-9a-f-]{36}(?:\/clips(?:\/(?:0|[1-9]\d?))?|\/complete)?)?$/.test(path) || url.search) return error(404, 'Ruta no disponible.');
  if (request.headers.get('sec-fetch-site') === 'cross-site') return error(403, 'Origen no permitido.');
  if (request.method !== 'GET') {
    if (request.headers.get('origin') !== appOrigin || request.headers.get('x-recording-client') !== '1') return error(403, 'Origen no permitido.');
  }
  const upstream = new URL(endpoint);
  if (upstream.protocol !== 'https:' && !(upstream.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(upstream.hostname))) return error(503, 'Configuración de almacenamiento no válida.');
  const headers = new Headers({ 'x-recording-gateway': gateway });
  for (const name of ['authorization', 'content-type', 'x-clip-start', 'x-clip-end', 'x-recording-format']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET') {
    try { body = await readLimited(request, request.method === 'PUT' ? MAX_CLIP_BYTES : path.endsWith('/complete') ? 1024 : 0); }
    catch { return error(413, 'El contenido supera el límite permitido.'); }
  }
  try {
    const outgoing = new Request(new URL(path, upstream), { method: request.method, headers, body, cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    const response = env.RECORDINGS && !env.RECORDING_API_URL ? await env.RECORDINGS.fetch(outgoing) : await fetch(outgoing);
    if (response.status >= 300 && response.status < 400) throw new Error('Unexpected gateway redirect');
    const output = new Headers(responseHeaders);
    for (const name of ['content-type', 'content-length', 'content-disposition', 'x-content-sha256']) {
      const value = response.headers.get(name);
      if (value) output.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: output });
  } catch { return error(503, 'No se pudo confirmar el envío. Conserva la pestaña y reintenta.'); }
}
