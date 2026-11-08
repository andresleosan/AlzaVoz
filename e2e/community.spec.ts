import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { bogotaDay, parseCommunityInput } from '../src/lib/community/contracts';

test('procesador mide seno conocido, silencio y saturación durante 15 s exactos', () => {
  for (const rate of [44100, 48000]) for (const amplitude of [0, 0.5, 1]) {
    const messages: { count: number; rms: number; peak: number; done: boolean }[] = [];
    let Processor: (new () => { process(inputs: Float32Array[][]): boolean }) | undefined;
    runInNewContext(readFileSync('public/audio/noise-meter.js', 'utf8'), {
      AudioWorkletProcessor: class { port = { postMessage: (value: typeof messages[number]) => messages.push(value) }; },
      sampleRate: rate, registerProcessor: (_name: string, value: typeof Processor) => { Processor = value; },
    });
    if (!Processor) throw new Error('Processor not registered');
    const processor = new Processor();
    let frame = 0;
    let running = true;
    while (running && frame < rate * 16) {
      const input = Float32Array.from({ length: 128 }, (_, i) => amplitude * Math.sin(2 * Math.PI * 1000 * (frame + i) / rate));
      running = processor.process([[input]]);
      frame += 128;
    }
    const last = messages.at(-1)!;
    expect(last.done).toBe(true);
    expect(last.count).toBe(rate * 15);
    expect(messages.length).toBe(60);
    expect(last.rms).toBeCloseTo(amplitude / Math.sqrt(2), 6);
    if (amplitude === 0.5) expect(20 * Math.log10(last.rms)).toBeCloseTo(-9.0309, 3);
    if (amplitude === 1) expect(last.peak).toBeGreaterThan(0.99);
  }
});

test('contrato rechaza fechas irreales, futuras, antiguas y campos personales', () => {
  const now = new Date('2026-03-01T04:59:00Z');
  expect(bogotaDay(now)).toBe('2026-02-28');
  const input = { requestId: crypto.randomUUID(), commune: 10, category: 'music', day: '2026-02-28' };
  expect(parseCommunityInput(input, now)).toEqual(input);
  for (const day of ['2026-02-30', '2026-03-01', '2026-01-29']) expect(parseCommunityInput({ ...input, day }, now)).toBeNull();
  expect(parseCommunityInput({ ...input, latitude: 6.2 }, now)).toBeNull();
});

test('radar ofrece captura voluntaria y mapa por comunas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/community');
  await expect(page.getByRole('heading', { name: 'Convivencia barrial', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Observar 15 segundos' })).toBeVisible();
  await expect(page.getByText('Sin calibración', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Mapa esquemático/ })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  expect(errors).toEqual([]);
});

test('resultado local respeta el camuflaje', async ({ page }) => {
  test.setTimeout(35000);
  await page.goto('/community');
  await page.getByRole('button', { name: 'Observar 15 segundos' }).click();
  await expect(page.getByText('Observación completa · Micrófono apagado')).toBeVisible({ timeout: 22000 });
  await page.getByRole('button', { name: /Activar modo antiespía/ }).click();
  await expect(page.locator('.community-result')).toHaveCSS('filter', 'blur(8px)');
  await expect(page.locator('.community-reading strong')).toHaveCSS('filter', 'blur(8px)');
  await expect(page.getByLabel('Comuna elegida')).toHaveCSS('filter', 'blur(8px)');
});

test('API comunitaria expone solo agregados', async ({ request }) => {
  const response = await request.get('/api/community');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ groups: expect.any(Array), days: 30 });
});

test('D1 agrega y deduplica envíos concurrentes sin publicar datos individuales', async ({ request }) => {
  const headers = { origin: 'http://127.0.0.1:3000', 'x-community-client': '1' };
  const input = { requestId: crypto.randomUUID(), commune: 14, category: 'construction', day: bogotaDay() };
  const before = await (await request.get('/api/community')).json() as { groups: { commune: number; category: string; count: number }[] };
  const initial = before.groups.find(group => group.commune === 14 && group.category === 'construction')?.count ?? 0;
  const results = await Promise.all([request.post('/api/community', { headers, data: input }), request.post('/api/community', { headers, data: input })]);
  for (const response of results) { expect(response.status()).toBe(200); expect(await response.json()).toEqual({ accepted: true }); }
  expect((await request.post('/api/community', { headers, data: { ...input, commune: 15 } })).status()).toBe(409);
  const response = await request.get('/api/community');
  const data = await response.json() as { groups: { commune: number; category: string; count: number }[] };
  expect(data.groups.find(group => group.commune === 14 && group.category === 'construction')?.count).toBe(initial + 1);
  for (const group of data.groups) expect(Object.keys(group).sort()).toEqual(['category', 'commune', 'count']);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect((await request.get('/api/community?latitude=6')).status()).toBe(400);
  expect((await request.post('/api/community', { headers: { ...headers, origin: 'https://evil.example' }, data: input })).status()).toBe(403);
  expect((await request.post('/api/community', { headers, data: { ...input, coordinates: [6, -75] } })).status()).toBe(400);
  expect((await request.post('/api/community', { headers, data: { ...input, category: '<script>' } })).status()).toBe(400);
  expect((await request.post('/api/community', { headers, data: 'x'.repeat(600) })).status()).toBe(415);
});

test('captura real del navegador finaliza, libera micrófono y comparte solo datos permitidos', async ({ page }) => {
  test.setTimeout(45000);
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await original(constraints);
      Object.defineProperty(window, '__noiseStream', { value: stream, configurable: true });
      return stream;
    };
  });
  await page.goto('/community');
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.postData() ?? ''); });
  await page.getByRole('button', { name: 'Observar 15 segundos' }).click();
  await expect(page.getByText('Observación completa · Micrófono apagado')).toBeVisible({ timeout: 22000 });
  expect(posts).toHaveLength(0);
  expect(await page.evaluate(() => (window as unknown as { __noiseStream: MediaStream }).__noiseStream.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  await expect(page.getByText(/15.00 s/)).toBeVisible();
  await page.getByLabel('Comuna elegida').selectOption('10');
  await page.getByLabel('Categoría del ruido').selectOption('traffic');
  await page.getByRole('button', { name: 'Compartir observación' }).click();
  await expect(page.getByText('Observación recibida.', { exact: false })).toBeVisible();
  expect(Object.keys(JSON.parse(posts[0])).sort()).toEqual(['category', 'commune', 'day', 'requestId']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('permiso denegado permite reintentar sin resultado ficticio', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
  await page.goto('/community');
  await page.getByRole('button', { name: 'Observar 15 segundos' }).click();
  await expect(page.getByRole('region', { name: 'Observación de sonido' }).getByRole('alert')).toContainText('Permiso de micrófono denegado');
  await expect(page.getByRole('button', { name: 'Compartir observación' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Observar 15 segundos' })).toBeEnabled();
});

test('cancelar un permiso tardío detiene sus pistas', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await original(constraints);
      Object.defineProperty(window, '__noiseStream', { value: stream });
      await new Promise(resolve => setTimeout(resolve, 1200));
      return stream;
    };
  });
  await page.goto('/community');
  await page.getByRole('button', { name: 'Observar 15 segundos' }).click();
  await page.getByRole('button', { name: 'Cancelar observación' }).click();
  await expect(page.getByRole('region', { name: 'Observación de sonido' }).getByRole('alert')).toContainText('interrumpida');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __noiseStream?: MediaStream }).__noiseStream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
});

test('ocultar la pestaña descarta la captura parcial', async ({ page }) => {
  await page.goto('/community');
  await page.getByRole('button', { name: 'Observar 15 segundos' }).click();
  await expect(page.getByText('Micrófono activo. Mantén esta pestaña visible.')).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('region', { name: 'Observación de sonido' }).getByRole('alert')).toContainText('interrumpida');
  await expect(page.getByText('Observación completa · Micrófono apagado')).toHaveCount(0);
});

test('mapa fallido muestra error recuperable y filtro sin observaciones', async ({ page }) => {
  await page.route('**/api/community', route => route.fulfill({ status: 503, json: { error: 'Synthetic outage' } }));
  await page.goto('/community');
  await expect(page.getByRole('region', { name: 'Observaciones por comuna' }).getByRole('alert')).toContainText('No se pudo consultar el mapa');
  await page.unroute('**/api/community');
  await page.getByRole('button', { name: 'Reintentar mapa' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByLabel('Filtrar categoría').selectOption('other');
  await expect(page.getByText('Sin observaciones para esta categoría', { exact: false })).toBeVisible();
});

for (const kind of ['missing', 'unsupported'] as const) test(`micrófono ${kind}: estado claro sin captura`, async ({ page }) => {
  await page.addInitScript(kind => {
    if (kind === 'missing') navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Missing', 'NotFoundError'); };
    else Object.defineProperty(window, 'AudioWorkletNode', { value: undefined });
  }, kind);
  await page.goto('/community');
  await page.getByRole('button', { name: 'Observar 15 segundos' }).click();
  await expect(page.locator('.community-error')).toContainText(kind === 'missing' ? 'No se encontró un micrófono' : 'Este navegador no permite');
});

test('reintento después de perder confirmación mantiene payload y no duplica', async ({ page }) => {
  test.setTimeout(40000);
  await page.goto('/community');
  await page.getByRole('button', { name: 'Observar 15 segundos' }).click();
  await expect(page.getByText('Observación completa · Micrófono apagado')).toBeVisible({ timeout: 22000 });
  await page.getByLabel('Comuna elegida').selectOption('11');
  const bodies: string[] = [];
  await page.route('**/api/community', async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    bodies.push(route.request().postData()!);
    const response = await route.fetch();
    if (bodies.length === 1) await route.fulfill({ status: 503, json: { error: 'Confirmación perdida (prueba)' } });
    else await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Compartir observación' }).click();
  await expect(page.locator('.community-error')).toContainText('Confirmación perdida');
  await page.clock.setFixedTime(new Date(Date.now() + 86400000));
  await expect(page.getByLabel('Comuna elegida')).toBeDisabled();
  await page.getByRole('button', { name: 'Reintentar envío' }).click();
  await expect(page.getByText('Observación recibida.', { exact: false })).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toBe(bodies[1]);
});
