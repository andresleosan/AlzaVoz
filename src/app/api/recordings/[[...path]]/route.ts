import { MAX_CLIP_BYTES, readLimited } from '@/lib/recording/contracts';

const responseHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const error = (status: number, message: string) => Response.json({ error: message }, { status, headers: responseHeaders });
async function proxy(request: Request): Promise<Response> {
  const endpoint = process.env.RECORDING_API_URL;
  const gateway = process.env.RECORDING_GATEWAY_SECRET;
  const appOrigin = process.env.RECORDING_APP_ORIGIN;
  if (!endpoint || !gateway || !appOrigin) return error(503, 'El almacenamiento aún no está disponible. No se inició la grabación.');
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/recordings/, '');
  if (!/^\/sessions(?:\/[0-9a-f-]{36}(?:\/clips(?:\/(?:0|[1-9]\d?))?)?)?$/.test(path) || url.search) return error(404, 'Ruta no disponible.');
  if (request.headers.get('sec-fetch-site') === 'cross-site') return error(403, 'Origen no permitido.');
  if (request.method !== 'GET') {
    if (request.headers.get('origin') !== appOrigin || request.headers.get('x-recording-client') !== '1') return error(403, 'Origen no permitido.');
  }
  const upstream = new URL(endpoint);
  if (upstream.protocol !== 'https:' && !(upstream.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(upstream.hostname))) return error(503, 'Configuración de almacenamiento no válida.');
  const headers = new Headers({ 'x-recording-gateway': gateway });
  for (const name of ['authorization', 'content-type', 'x-clip-start', 'x-clip-end']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET') {
    try { body = await readLimited(request, request.method === 'PUT' ? MAX_CLIP_BYTES : 0); }
    catch { return error(413, 'El contenido supera el límite permitido.'); }
  }
  try {
    const response = await fetch(new URL(path, upstream), { method: request.method, headers, body, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
    const output = new Headers(responseHeaders);
    for (const name of ['content-type', 'content-length', 'content-disposition', 'x-content-sha256']) {
      const value = response.headers.get(name);
      if (value) output.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: output });
  } catch { return error(503, 'No se pudo confirmar el envío. Conserva la pestaña y reintenta.'); }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
