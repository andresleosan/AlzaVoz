import { readLimited } from '../recording/contracts';
import type { RecordingGatewayEnv } from '../recording/proxy';
import { MAX_ATTACHMENT_BYTES, MAX_REPORT_JSON_BYTES } from './contracts';

const responseHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const error = (status: number, message: string) =>
  Response.json({ error: message }, { status, headers: responseHeaders });

const REPORT_PATH_REGEX =
  /^\/reports(?:\/ALZ-\d{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}(?:\/attachments\/[0-3]|\/safe-contact)?)?$/;

export async function reportProxy(request: Request, env: RecordingGatewayEnv): Promise<Response> {
  if (!['GET', 'POST', 'PUT', 'PATCH'].includes(request.method)) {
    return error(405, 'Método no permitido.');
  }
  const endpoint = env.RECORDING_API_URL ?? (env.RECORDINGS ? 'https://recordings.internal' : undefined);
  const gateway = env.RECORDING_GATEWAY_SECRET;
  const appOrigin = env.RECORDING_APP_ORIGIN;
  if (!endpoint || !gateway || !appOrigin) {
    return error(503, 'La bóveda de denuncias aún no está disponible. Puedes reintentar o usar otro canal.');
  }
  const url = new URL(request.url);
  const suffix = url.pathname.replace(/^\/api\/reports/, '');
  const path = `/reports${suffix}`;
  if (!REPORT_PATH_REGEX.test(path) || url.search) {
    return error(404, 'Ruta de denuncia no disponible.');
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return error(403, 'Origen no permitido.');
  }
  if (request.method !== 'GET') {
    if (request.headers.get('origin') !== appOrigin || request.headers.get('x-report-client') !== '1') {
      return error(403, 'Origen no permitido.');
    }
  }
  const upstream = new URL(endpoint);
  if (
    upstream.protocol !== 'https:' &&
    !(upstream.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(upstream.hostname))
  ) {
    return error(503, 'Configuración de servidor de denuncias no válida.');
  }
  const headers = new Headers({ 'x-recording-gateway': gateway });
  for (const name of ['authorization', 'content-type', 'x-sanitization-summary']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET') {
    const maxBytes = request.method === 'PUT' ? MAX_ATTACHMENT_BYTES : MAX_REPORT_JSON_BYTES;
    try {
      body = await readLimited(request, maxBytes);
    } catch {
      return error(413, 'El contenido supera el límite permitido (máx. 2 MiB por archivo).');
    }
  }
  try {
    const outgoing = new Request(new URL(path, upstream), {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    const response =
      env.RECORDINGS && !env.RECORDING_API_URL ? await env.RECORDINGS.fetch(outgoing) : await fetch(outgoing);
    if (response.status >= 300 && response.status < 400) {
      throw new Error('Unexpected gateway redirect');
    }
    const output = new Headers(responseHeaders);
    for (const name of ['content-type', 'content-length', 'content-disposition', 'x-content-sha256']) {
      const value = response.headers.get(name);
      if (value) output.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: output });
  } catch {
    return error(503, 'No se pudo confirmar la radicación con el servidor. Tu borrador sigue en esta pestaña para reintentar.');
  }
}
