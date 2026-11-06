import { test, expect, type APIRequestContext } from '@playwright/test';
import { isSession, type RecordingSession } from '../src/lib/recording/contracts';

const origin = { origin: 'http://127.0.0.1:3000', 'x-recording-client': '1' };
const mime = 'video/webm;codecs=vp8,opus';
const first = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02]);
const continuation = Buffer.from([0x1f, 0x43, 0xb6, 0x75, 0x03, 0x04]);

async function session(request: APIRequestContext, continuous = true) {
  const response = await request.post('/api/recordings/sessions', {
    headers: { ...origin, ...(continuous ? { 'x-recording-format': 'continuous-webm-v1' } : {}) },
  });
  expect(response.status()).toBe(201);
  const data: unknown = await response.json();
  if (!isSession(data)) throw new Error('Sesión de prueba inválida');
  return data;
}

const base = (value: RecordingSession) => `/api/recordings/sessions/${value.id}`;
const auth = (value: RecordingSession) => ({ ...origin, authorization: `Bearer ${value.secret}` });
const upload = (value: RecordingSession, start = 0, end = 3000, contentType = mime) => ({
  ...auth(value), 'content-type': contentType, 'x-clip-start': String(start), 'x-clip-end': String(end),
});

test('la sesión continua conserva formato, fragmentos y cierre idempotente tras recuperar', async ({ request }) => {
  const created = await session(request);
  expect(created.format).toBe('continuous-webm-v1');
  expect((await request.put(`${base(created)}/clips/0`, { headers: upload(created), data: first })).status()).toBe(201);
  expect((await request.put(`${base(created)}/clips/1`, { headers: upload(created, 3000, 6000), data: continuation })).status()).toBe(201);
  const before = await request.get(`${base(created)}/clips`, { headers: auth(created) });
  expect(await before.json()).toMatchObject({ format: 'continuous-webm-v1', clips: [{ index: 0 }, { index: 1 }] });
  expect(await before.json()).not.toHaveProperty('completion');
  const finish = () => request.post(`${base(created)}/complete`, { headers: auth(created), data: { clipCount: 2 } });
  expect((await finish()).status()).toBe(201);
  expect((await finish()).status()).toBe(200);
  const recovered = await request.get(`${base(created)}/clips`, { headers: auth(created) });
  expect(await recovered.json()).toMatchObject({ format: 'continuous-webm-v1', completion: { clipCount: 2 } });
  const last = await request.get(`${base(created)}/clips/1`, { headers: auth(created) });
  expect(await last.body()).toEqual(continuation);
  expect(last.headers()['cache-control']).toBe('no-store');
  expect((await request.put(`${base(created)}/clips/1`, { headers: upload(created, 3000, 6000), data: continuation })).status()).toBe(200);
  expect((await request.put(`${base(created)}/clips/2`, { headers: upload(created, 6000, 7000), data: continuation })).status()).toBe(409);
  expect((await request.post(`${base(created)}/complete`, { headers: auth(created), data: { clipCount: 1 } })).status()).toBe(409);
});

test('la sesión continua rechaza fragmentos fuera de orden, MIME distinto y cierre incompleto', async ({ request }) => {
  const created = await session(request);
  expect((await request.put(`${base(created)}/clips/0`, { headers: upload(created), data: continuation })).status()).toBe(415);
  expect((await request.put(`${base(created)}/clips/0`, { headers: upload(created, 1, 3000), data: first })).status()).toBe(400);
  expect((await request.put(`${base(created)}/clips/0`, { headers: upload(created), data: first })).status()).toBe(201);
  expect((await request.put(`${base(created)}/clips/2`, { headers: upload(created, 6000, 9000), data: continuation })).status()).toBe(409);
  expect((await request.put(`${base(created)}/clips/1`, { headers: upload(created, 3001, 6000), data: continuation })).status()).toBe(409);
  expect((await request.put(`${base(created)}/clips/1`, { headers: upload(created, 3000, 6000, 'audio/webm;codecs=opus'), data: continuation })).status()).toBe(409);
  expect((await request.put(`${base(created)}/clips/1`, { headers: upload(created, 3000, 6000), data: Buffer.alloc(0) })).status()).toBe(415);
  expect((await request.post(`${base(created)}/complete`, { headers: auth(created), data: { clipCount: 2 } })).status()).toBe(409);
  expect(await (await request.get(`${base(created)}/clips`, { headers: auth(created) })).json()).not.toHaveProperty('completion');
});

test('las sesiones anteriores mantienen WebM independientes y no aceptan cierre continuo', async ({ request }) => {
  const created = await session(request, false);
  expect('format' in created).toBe(false);
  expect((await request.put(`${base(created)}/clips/0`, { headers: upload(created), data: first })).status()).toBe(201);
  expect((await request.put(`${base(created)}/clips/1`, { headers: upload(created, 3010, 6010), data: continuation })).status()).toBe(415);
  expect((await request.put(`${base(created)}/clips/1`, { headers: upload(created, 3010, 6010), data: first })).status()).toBe(201);
  expect((await request.post(`${base(created)}/complete`, { headers: auth(created), data: { clipCount: 2 } })).status()).toBe(409);
});

test('el cierre continuo exige clave, origen y cuerpo acotado y válido', async ({ request }) => {
  const created = await session(request);
  const url = `${base(created)}/complete`;
  expect((await request.post(url, { headers: origin, data: { clipCount: 1 } })).status()).toBe(401);
  expect((await request.post(url, { headers: { ...auth(created), origin: 'https://untrusted.example' }, data: { clipCount: 1 } })).status()).toBe(403);
  expect((await request.post(url, { headers: auth(created), data: 'x'.repeat(1025) })).status()).toBe(413);
  for (const clipCount of [0, -1, 101, 1.5, '1']) {
    expect((await request.post(url, { headers: auth(created), data: { clipCount } })).status()).toBe(400);
  }
  expect((await request.post(url, { headers: auth(created), data: '{bad-json' })).status()).toBe(400);
  expect((await request.post('/api/recordings/sessions', { headers: { ...origin, 'x-recording-format': 'unknown' } })).status()).toBe(400);
});
