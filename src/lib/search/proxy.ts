import type { RecordingGatewayEnv } from '../recording/proxy';
import { readLimited, UUID } from '../recording/contracts';
import { isPublicNotice, MAX_SEARCH_BYTES, object, type PublicNotice } from './contracts';
import { findMatches } from './matches';

export interface SearchGatewayEnv extends RecordingGatewayEnv { DEEPSEEK_API_KEY?: string }
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
export async function searchProxy(request: Request, env: SearchGatewayEnv): Promise<Response> {
  const url = new URL(request.url);
  if (url.search) return json({ error: 'Consulta no válida.' }, 400);
  const path = url.pathname.replace(/^\/api/, '');
  const route = /^\/search(?:\/([0-9a-f-]{36})(?:\/(tips|matches))?)?$/.exec(path);
  if (!route || (route[1] && !UUID.test(route[1]))) return json({ error: 'Ruta no disponible.' }, 404);
  const [, id, action] = route;
  if ((action && request.method !== 'POST') || (!action && !['GET', ...(id ? [] : ['POST'])].includes(request.method))) return json({ error: 'Método no permitido.' }, 405);
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.method === 'POST' && (request.headers.get('origin') !== env.RECORDING_APP_ORIGIN || request.headers.get('x-search-client') !== '1'))) return json({ error: 'Origen no permitido.' }, 403);
  const endpoint = env.RECORDING_API_URL ?? (env.RECORDINGS ? 'https://recordings.internal' : undefined);
  if (!endpoint || !env.RECORDING_GATEWAY_SECRET || !env.RECORDING_APP_ORIGIN) return json({ error: 'Los avisos no están disponibles. Reintenta.' }, 503);
  let body: ArrayBuffer | undefined;
  if (request.method === 'POST') {
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'Usa JSON.' }, 415);
    try { body = await readLimited(request, MAX_SEARCH_BYTES); } catch { return json({ error: 'El envío es demasiado grande.' }, 413); }
  }
  try {
    const upstream = new URL(endpoint);
    if (upstream.protocol !== 'https:' && !(upstream.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(upstream.hostname))) throw new Error('Invalid endpoint');
    const send = async (target: string, method = 'GET', content?: ArrayBuffer) => {
      const outgoing = new Request(new URL(target, upstream), { method, body: content, headers: { 'x-recording-gateway': env.RECORDING_GATEWAY_SECRET!, 'content-type': 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
      const response = env.RECORDINGS && !env.RECORDING_API_URL ? await env.RECORDINGS.fetch(outgoing) : await fetch(outgoing);
      if (response.status >= 300 && response.status < 400) throw new Error('Redirect');
      return response;
    };
    if (action === 'matches') {
      let consent: unknown;
      try { consent = JSON.parse(new TextDecoder().decode(body)); } catch { return json({ error: 'Consentimiento no válido.' }, 400); }
      if (!object(consent) || Object.keys(consent).length !== 1 || consent.consent !== true) return json({ error: 'Autoriza enviar los datos públicos a DeepSeek.' }, 400);
      const detail = await send(`/search/${id}`);
      if (!detail.ok) return new Response(detail.body, { status: detail.status, headers: { ...headers, 'Content-Type': 'application/json' } });
      const data: unknown = await detail.json();
      const candidateResponse = await send(`/search/${id}/candidates`);
      if (candidateResponse.status === 429) return new Response(candidateResponse.body, { status: 429, headers: { ...headers, 'Content-Type': 'application/json' } });
      if (!candidateResponse.ok) throw new Error('Candidates unavailable');
      const candidateData: unknown = await candidateResponse.json();
      if (!object(data) || !isPublicNotice(data.notice) || !object(candidateData) || !Array.isArray(candidateData.notices) || !candidateData.notices.every(isPublicNotice)) throw new Error('Invalid public data');
      const candidates: PublicNotice[] = candidateData.notices;
      if (candidates.length === 0) return json({ suggestions: [], source: 'no-candidates' });
      return json({ suggestions: await findMatches(data.notice, candidates, env.DEEPSEEK_API_KEY), source: 'deepseek-ai' });
    }
    const response = await send(path, request.method, body);
    return new Response(response.body, { status: response.status, headers: { ...headers, 'Content-Type': 'application/json' } });
  } catch { return json({ error: action === 'matches' ? 'Las sugerencias con IA no están disponibles. Reintenta más tarde.' : 'No se pudo confirmar con el servidor. Conserva esta pestaña y reintenta con los mismos datos.' }, 503); }
}
