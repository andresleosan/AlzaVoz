import { test, expect } from '@playwright/test';
import { isSession, isReceipt, type RecordingSession } from '../src/lib/recording/contracts';

const originHeaders = { origin: 'http://127.0.0.1:3000', 'x-recording-client': '1' };
const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02]);
const uploadHeaders = (session: RecordingSession) => ({ ...originHeaders, authorization: `Bearer ${session.secret}`, 'content-type': 'video/webm;codecs=vp8,opus', 'x-clip-start': '0', 'x-clip-end': '3012' });

test('la caja negra crea una sesión privada sin cuenta', async ({ request }) => {
  const response = await request.post('/api/recordings/sessions', {
    headers: { origin: 'http://127.0.0.1:3000', 'x-recording-client': '1' },
  });
  expect(response.status()).toBe(201);
  const session: unknown = await response.json();
  expect(session).toMatchObject({ id: expect.any(String), secret: expect.any(String) });
});

test('R2 autoriza, confirma bytes, deduplica y rechaza conflictos concurrentes', async ({ request }) => {
  const created = await request.post('/api/recordings/sessions', { headers: originHeaders });
  const session: unknown = await created.json();
  if (!isSession(session)) throw new Error('Sesión inválida');
  const url = `/api/recordings/sessions/${session.id}/clips/0`;
  expect((await request.get(url)).status()).toBe(401);
  const headers = uploadHeaders(session);
  const uploads = await Promise.all([request.put(url, { headers, data: webm }), request.put(url, { headers, data: webm })]);
  expect(uploads.map(r => r.status()).sort()).toEqual([200, 201]);
  const receipt: unknown = await uploads[0].json();
  expect(isReceipt(receipt)).toBe(true);
  expect(await uploads[1].json()).toEqual(receipt);
  const downloaded = await request.get(url, { headers });
  expect(await downloaded.body()).toEqual(webm);
  expect(downloaded.headers()['cache-control']).toBe('no-store');
  const conflict = await request.put(url, { headers, data: Buffer.concat([webm, Buffer.from([3])]) });
  expect(conflict.status()).toBe(409);
  const denied = await request.get(url, { headers: { authorization: `Bearer ${'0'.repeat(64)}` } });
  expect(denied.status()).toBe(401);
  const listed = await request.get(`/api/recordings/sessions/${session.id}/clips`, { headers });
  expect((await listed.json()).clips).toEqual([receipt]);
  expect((await request.put(url.replace('/0', '/1'), { headers, data: '<html>bad</html>' })).status()).toBe(415);
  expect((await request.put(url.replace('/0', '/1'), { headers: { ...headers, 'x-clip-start': 'NaN' }, data: webm })).status()).toBe(400);
  expect((await request.put(url.replace('/0', '/1'), { headers, data: Buffer.alloc(2 * 1024 * 1024 + 1) })).status()).toBe(413);
  expect((await request.get(url.replace('/0', '/100'), { headers })).status()).toBe(404);
  expect((await request.post('/api/recordings/sessions', { headers: { ...originHeaders, origin: 'https://untrusted.example' } })).status()).toBe(403);
});

test('grabación de video confirma y reproduce un clip independiente', async ({ page }) => {
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByText('Cámara y micrófono activos', { exact: true })).toBeVisible();
  await expect(page.getByTestId('received-count')).toHaveText('1', { timeout: 15000 });
  await page.getByRole('button', { name: 'Detener grabación', exact: true }).click();
  await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reproducir clip 1', exact: true }).click();
  await expect(page.locator('video[data-playback]')).toBeVisible();
  await expect.poll(() => page.locator('video[data-playback]').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0);
  await expect.poll(() => page.locator('video[data-playback]').evaluate((video: HTMLVideoElement) => video.ended), { timeout: 10000 }).toBe(true);
});

test('audio real se recupera después de cerrar abruptamente la pestaña', async ({ page, context }) => {
  await page.goto('/record');
  await page.getByRole('button', { name: 'Solo audio', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByText('Micrófono activo', { exact: true })).toBeVisible();
  await expect(page.getByTestId('received-count')).toHaveText('1', { timeout: 15000 });
  const key = await page.getByLabel('Clave de recuperación', { exact: true }).inputValue();
  await page.close();
  const recovery = await context.newPage();
  await recovery.goto('/record');
  await recovery.getByText('Recuperar una grabación anterior', { exact: true }).click();
  await recovery.getByLabel('Pega la clave privada').fill(key);
  await recovery.getByRole('button', { name: 'Recuperar clips recibidos' }).click();
  await expect(recovery.getByTestId('received-count')).toHaveText('1');
  await expect(recovery.getByTestId('pending-count')).toHaveText('0');
  await expect(recovery.getByText(/No podemos recuperar los pendientes/)).toBeVisible();
  await recovery.getByRole('button', { name: 'Reproducir clip 1', exact: true }).click();
  await expect.poll(() => recovery.locator('audio[data-playback]').evaluate((audio: HTMLAudioElement) => audio.ended), { timeout: 10000 }).toBe(true);
});

test('sin conexión conserva pendientes y el reintento confirma sin duplicados', async ({ page }) => {
  await page.route('**/api/recordings/sessions/*/clips/*', route => route.request().method() === 'PUT' ? route.abort('internetdisconnected') : route.continue());
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByTestId('pending-count')).toHaveText('1', { timeout: 15000 });
  await expect(page.getByTestId('received-count')).toHaveText('0');
  await page.getByRole('button', { name: 'Detener grabación', exact: true }).click();
  await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  await page.unroute('**/api/recordings/sessions/*/clips/*');
  await page.getByRole('button', { name: /Reintentar .* pendientes/ }).click();
  await expect(page.getByTestId('pending-count')).toHaveText('0');
  await expect(page.getByTestId('received-count')).toHaveText('2');
});

test('un recibo perdido se reconcilia al reintentar el mismo clip', async ({ page }) => {
  let first = true;
  await page.route('**/api/recordings/sessions/*/clips/*', async route => {
    if (route.request().method() === 'PUT' && first) { first = false; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByTestId('pending-count')).toHaveText('1', { timeout: 15000 });
  await page.getByRole('button', { name: 'Detener grabación', exact: true }).click();
  await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Reintentar .* pendientes/ }).click();
  await expect(page.getByTestId('received-count')).toHaveText('2');
  await expect(page.getByTestId('pending-count')).toHaveText('0');
  await page.reload();
  await expect(page.getByTestId('received-count')).toHaveText('2');
});

test('permiso denegado y navegador incompatible no muestran captura ni recibos', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.locator('section[aria-labelledby="recording-title"] [role="alert"]')).toContainText('No se autorizó');
  await expect(page.getByTestId('received-count')).toHaveText('0');
  await page.getByRole('button', { name: /Nueva grabación/ }).click();
  await page.evaluate(() => { MediaRecorder.isTypeSupported = () => false; });
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.locator('section[aria-labelledby="recording-title"] [role="alert"]')).toContainText('no admite esta grabación');
});

test('cancelar un permiso tardío apaga el dispositivo sin grabar', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await original(constraints);
      Object.defineProperty(window, 'testCaptureStream', { value: stream, configurable: true });
      await new Promise(resolve => setTimeout(resolve, 1500));
      return stream;
    };
  });
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar solicitud de permiso' }).click();
  await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const w = window as unknown as { testCaptureStream?: MediaStream };
    return w.testCaptureStream?.getTracks().every(track => track.readyState === 'ended');
  })).toBe(true);
  await expect(page.getByTestId('received-count')).toHaveText('0');
});

test('error del servicio y clave inválida permiten recuperarse sin éxito falso', async ({ page }) => {
  await page.route('**/api/recordings/sessions', route => route.fulfill({ status: 503, json: { error: 'Almacenamiento de prueba no disponible.' } }));
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.locator('section[aria-labelledby="recording-title"] [role="alert"]')).toContainText('no disponible');
  await expect(page.getByText('Cámara y micrófono apagados')).toBeVisible();
  await page.getByText('Recuperar una grabación anterior', { exact: true }).click();
  await page.getByLabel('Pega la clave privada').fill('clave-invalida');
  await page.getByRole('button', { name: 'Recuperar clips recibidos' }).click();
  await expect(page.locator('section[aria-labelledby="recording-title"] [role="alert"]')).toContainText('Revisa la clave');
});

test('controles accesibles en móvil y escritorio sin desbordamiento', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/record');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(56);
    expect(bounds?.width).toBeGreaterThanOrEqual(56);
    expect(bounds?.y).toBeGreaterThan(viewport.height * 0.66);
  }
});

test('la salida rápida no pide confirmación mientras graba', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', async dialog => { dialogs.push(dialog.type()); await dialog.accept(); });
  await page.route('https://www.google.com/**', route => route.fulfill({ body: '<h1>Salida de prueba</h1>', contentType: 'text/html' }));
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByText('Cámara y micrófono activos', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salida Rápida de Pánico (Abre Google)', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Salida de prueba' })).toBeVisible();
  expect(dialogs).toEqual([]);
});

test('cancelar permiso pendiente permite preparar otra grabación', async ({ page }) => {
  await page.addInitScript(() => {
    let first = true;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = constraints => {
      if (first) { first = false; return new Promise<MediaStream>(() => {}); }
      return original(constraints);
    };
  });
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar solicitud de permiso' }).click();
  await page.getByRole('button', { name: /Nueva grabación/ }).click();
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByText('Cámara y micrófono activos', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Detener grabación', exact: true }).click();
});

test('error automático del grabador conserva un tiempo final observado', async ({ page }) => {
  await page.addInitScript(() => {
    const start = MediaRecorder.prototype.start;
    MediaRecorder.prototype.start = function (timeslice?: number) {
      start.call(this, timeslice);
      setTimeout(() => { this.stop(); this.dispatchEvent(new Event('error')); }, 900);
    };
  });
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  await expect(page.getByText(/La captura tuvo un error/)).toBeVisible();
  await expect(page.getByTestId('received-count')).toHaveText('1');
  const key = await page.getByLabel('Clave de recuperación', { exact: true }).inputValue();
  const [id, secret] = key.split('.');
  const result = await page.request.get(`/api/recordings/sessions/${id}/clips`, { headers: { authorization: `Bearer ${secret}` } });
  const data = await result.json();
  expect(data.clips[0].endMs - data.clips[0].startMs).toBeGreaterThanOrEqual(800);
});

test('clip demasiado grande detiene captura sin presentarlo como guardado', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(BlobEvent.prototype, 'data', {
      get: () => new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: 'video/webm;codecs=vp8,opus' }),
    });
  });
  await page.goto('/record');
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('No conservado', { exact: true })).toBeVisible();
  await expect(page.getByTestId('received-count')).toHaveText('0');
  await expect(page.getByTestId('pending-count')).toHaveText('0');
});
