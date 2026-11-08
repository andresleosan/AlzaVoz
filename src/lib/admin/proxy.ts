import type { RecordingGatewayEnv } from '../recording/proxy';
import { readLimited } from '../recording/contracts';
import { verifyAdminToken } from './auth';
import { parseGenerateDraftInput, type AdminReportDetail } from './contracts';
import { generateLegalDraft } from './drafts';

export interface AdminGatewayEnv extends RecordingGatewayEnv {
  DEEPSEEK_API_KEY?: string;
}

const responseHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: responseHeaders });

const error = (status: number, message: string) =>
  json({ error: message }, status);

export async function adminProxy(request: Request, env: AdminGatewayEnv): Promise<Response> {
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) {
    return error(405, 'Método no permitido.');
  }

  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return error(403, 'Origen no permitido.');
  }

  // Mandatory Authentication Check
  const authHeader = request.headers.get('authorization') ?? '';
  const authResult = await verifyAdminToken(authHeader);
  if (!authResult.ok) {
    return error(authResult.code, authResult.error);
  }

  const endpoint = env.RECORDING_API_URL ?? (env.RECORDINGS ? 'https://recordings.internal' : undefined);
  const gateway = env.RECORDING_GATEWAY_SECRET;
  if (!endpoint || !gateway) {
    return error(503, 'El servicio de administración no está disponible.');
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/admin/, '');
  const search = url.search;

  const upstream = new URL(endpoint);
  if (
    upstream.protocol !== 'https:' &&
    !(upstream.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(upstream.hostname))
  ) {
    return error(503, 'Configuración de servidor no válida.');
  }

  const sendToWorker = async (targetPath: string, method = 'GET', bodyBytes?: ArrayBuffer, contentType = 'application/json') => {
    const outgoing = new Request(new URL(`/admin${targetPath}${search}`, upstream), {
      method,
      headers: {
        'x-recording-gateway': gateway,
        'content-type': contentType,
        'x-admin-user': authResult.user.uid,
        'x-admin-email': authResult.user.email ?? '',
      },
      body: bodyBytes,
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });

    const response =
      env.RECORDINGS && !env.RECORDING_API_URL
        ? await env.RECORDINGS.fetch(outgoing)
        : await fetch(outgoing);

    if (response.status >= 300 && response.status < 400) {
      throw new Error('Unexpected gateway redirect');
    }
    return response;
  };

  // Dedicated Route: AI Legal Draft Generation
  if (path === '/drafts') {
    if (request.method !== 'POST') return error(405, 'Método no permitido.');
    let bodyBytes: ArrayBuffer;
    try {
      bodyBytes = await readLimited(request, 16 * 1024);
    } catch {
      return error(413, 'El contenido supera el límite permitido.');
    }
    let bodyJson: unknown;
    try {
      bodyJson = JSON.parse(new TextDecoder().decode(bodyBytes));
    } catch {
      return error(400, 'Formato JSON no válido.');
    }

    const parsed = parseGenerateDraftInput(bodyJson);
    if (!parsed.ok) return error(400, parsed.error);

    // Fetch the report detail from the worker
    const reportRes = await sendToWorker(`/reports/${parsed.data.reportCode}`, 'GET');
    if (!reportRes.ok) {
      return new Response(reportRes.body, { status: reportRes.status, headers: responseHeaders });
    }
    const reportData = (await reportRes.json()) as { report?: AdminReportDetail };
    if (!reportData.report) {
      return error(404, 'Expediente no encontrado para redactar el borrador.');
    }

    const draft = await generateLegalDraft(
      reportData.report,
      parsed.data,
      env.DEEPSEEK_API_KEY
    );
    return json(draft);
  }

  // Other routes proxy directly to the Worker backend
  let bodyBytes: ArrayBuffer | undefined;
  if (request.method === 'POST' || request.method === 'PATCH') {
    try {
      bodyBytes = await readLimited(request, 32 * 1024);
    } catch {
      return error(413, 'El cuerpo de la solicitud supera el límite permitido.');
    }
  }

  try {
    const workerRes = await sendToWorker(path, request.method, bodyBytes);
    const outHeaders = new Headers(responseHeaders);
    for (const name of [
      'content-type',
      'content-length',
      'content-disposition',
      'x-content-sha256',
    ]) {
      const val = workerRes.headers.get(name);
      if (val) outHeaders.set(name, val);
    }
    return new Response(workerRes.body, {
      status: workerRes.status,
      headers: outHeaders,
    });
  } catch {
    return error(503, 'No se pudo comunicar con el servidor de administración.');
  }
}
