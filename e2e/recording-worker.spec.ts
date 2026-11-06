import { test, expect } from '@playwright/test';
import worker from '../workers/recordings/index';
import { sha256 } from '../src/lib/recording/contracts';

const gateway = 'test-only-gateway-secret-not-used-remotely';
const secret = '1'.repeat(64);
const id = '00000000-0000-4000-8000-000000000005';
async function fixture(expiresAt: number, uploadUntil: number) {
  const session = { expiresAt, uploadUntil, hash: await sha256(new TextEncoder().encode(secret).buffer) };
  return {
    GATEWAY_SECRET: gateway,
    EVIDENCIAS: {
      get: async () => ({ key: 'session', etag: 'session-etag', body: new ReadableStream<Uint8Array>(), json: async <T>() => session as T }),
      put: async () => { throw new Error('La prueba no debe escribir'); },
      list: async () => ({ objects: [], truncated: false }),
    },
  };
}
function request(method = 'GET', supplied = secret) {
  return new Request(`https://worker.test/sessions/${id}/clips${method === 'PUT' ? '/0' : ''}`, { method, headers: { 'x-recording-gateway': gateway, authorization: `Bearer ${supplied}` } });
}
test('el Worker rechaza acceso vencido y capacidades ajenas', async () => {
  expect((await worker.fetch(request(), await fixture(Date.now() - 1, Date.now() - 1))).status).toBe(401);
  expect((await worker.fetch(request('GET', '2'.repeat(64)), await fixture(Date.now() + 10000, Date.now() + 10000))).status).toBe(401);
});
test('el plazo de subida vencido permite lectura pero no escritura', async () => {
  const env = await fixture(Date.now() + 10000, Date.now() - 1);
  expect((await worker.fetch(request('PUT'), env)).status).toBe(403);
  expect((await worker.fetch(request(), env)).status).toBe(200);
});
test('el límite de creación y el secreto de pasarela se verifican antes de almacenar', async () => {
  const env = { ...await fixture(0, 0), SESSION_LIMITER: { limit: async () => ({ success: false }) } };
  expect((await worker.fetch(new Request('https://worker.test/sessions', { method: 'POST' }), env)).status).toBe(401);
  expect((await worker.fetch(new Request('https://worker.test/sessions', { method: 'POST', headers: { 'x-recording-gateway': gateway } }), env)).status).toBe(429);
});
