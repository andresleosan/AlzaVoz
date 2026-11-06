import { test, expect } from '@playwright/test';
import worker from '../workers/recordings/index';
import { MAX_CLIP_BYTES, sha256 } from '../src/lib/recording/contracts';

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

test('una grabación continua no puede marcarse completa con más de 64 MiB', async () => {
  const session = { hash: await sha256(new TextEncoder().encode(secret).buffer), expiresAt: Date.now() + 10000, uploadUntil: Date.now() + 10000, format: 'continuous-webm-v1' };
  const objects = Array.from({ length: 33 }, (_, index) => ({
    key: `recordings/${id}/clips/${String(index).padStart(3, '0')}`, etag: `clip-${index}`,
    body: new ReadableStream<Uint8Array>(), json: async <T>() => null as T,
    customMetadata: { receipt: JSON.stringify({ index, mime: 'video/webm;codecs=vp8,opus', startMs: index * 3000, endMs: (index + 1) * 3000, bytes: MAX_CLIP_BYTES, sha256: '0'.repeat(64), receivedAt: new Date().toISOString() }) },
  }));
  const env = {
    GATEWAY_SECRET: gateway,
    EVIDENCIAS: {
      get: async (key: string) => key.endsWith('/session') ? { key, etag: 'session-etag', body: new ReadableStream<Uint8Array>(), json: async <T>() => session as T } : null,
      list: async () => ({ objects, truncated: false }),
      put: async () => { throw new Error('Una grabación demasiado grande no debe cerrarse.'); },
    },
  };
  const response = await worker.fetch(new Request(`https://worker.test/sessions/${id}/complete`, {
    method: 'POST', headers: { 'x-recording-gateway': gateway, authorization: `Bearer ${secret}` }, body: JSON.stringify({ clipCount: 33 }),
  }), env);
  expect(response.status).toBe(413);
});

test('el cierre de una grabación no extiende el plazo de subida', async () => {
  const env = await fixture(Date.now() + 10000, Date.now() - 1);
  const response = await worker.fetch(new Request(`https://worker.test/sessions/${id}/complete`, {
    method: 'POST', headers: { 'x-recording-gateway': gateway, authorization: `Bearer ${secret}` }, body: JSON.stringify({ clipCount: 1 }),
  }), env);
  expect(response.status).toBe(403);
});
