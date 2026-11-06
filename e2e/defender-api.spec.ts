import { test, expect } from '@playwright/test';
import { legalResponse } from '../src/lib/defender/response';
import { findLocalLegalResponse } from '../src/data/legalKnowledgeBase';

const query = 'Consulta sintética de integración';
const request = () => new Request('https://alzavoz.pages.dev/api/defender/chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }),
});

test.describe('Contrato de DeepSeek del Defensor', () => {
  test.describe.configure({ mode: 'serial' });

  test('una consulta libre usa el modelo vigente y devuelve la respuesta IA', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const body = JSON.parse(String(init?.body)) as { model?: string; thinking?: { type?: string }; response_format?: { type?: string } };
      // El proveedor retiró deepseek-chat; reproduce su rechazo sin credenciales reales.
      if (String(input) !== 'https://api.deepseek.com/chat/completions' || body.model !== 'deepseek-flash'
        || body.thinking?.type !== 'disabled' || body.response_format?.type !== 'json_object') {
        return Response.json({ error: 'Unsupported request' }, { status: 400 });
      }
      return Response.json({ choices: [{ message: { content: JSON.stringify({ ...findLocalLegalResponse('derechos'), title: 'Respuesta sintética del proveedor' }) } }] });
    };
    try {
      const response = await legalResponse(request(), 'test-only-key');
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ source: 'deepseek-ai', title: 'Respuesta sintética del proveedor', query });
    } finally { globalThis.fetch = original; }
  });

  test('un fallo de cuota conserva la respuesta local sin exponer la clave', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ error: 'Insufficient balance' }, { status: 402 });
    try {
      const response = await legalResponse(request(), 'test-only-key');
      const body = await response.text();
      expect(response.status).toBe(200);
      expect(JSON.parse(body)).toMatchObject({ source: 'local-instant' });
      expect(body).not.toContain('test-only-key');
    } finally { globalThis.fetch = original; }
  });

  test('una respuesta del proveedor que tarda cinco segundos no se descarta', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async (_input, init) => new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve(Response.json({ choices: [{ message: { content: JSON.stringify(findLocalLegalResponse('derechos')) } }] }));
      }, 5000);
      signal?.addEventListener('abort', abort, { once: true });
    });
    try {
      const response = await legalResponse(request(), 'test-only-key');
      expect(await response.json()).toMatchObject({ source: 'deepseek-ai' });
    } finally { globalThis.fetch = original; }
  });
});
