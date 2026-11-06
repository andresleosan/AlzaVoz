import { test, expect, type Page } from '@playwright/test';

const recording = (page: Page) => page.locator('section[aria-labelledby="recording-title"]');
const player = (page: Page) => page.locator('[data-playback]');
const position = (page: Page) => page.getByTestId('playback-position');

async function recoverLegacyClips(page: Page, mode: 'audio' | 'video') {
  await page.goto('/record');
  // Old sessions contain complete WebM files, each from a different recorder instance.
  const clips = await page.evaluate(async mode => {
    const mime = mode === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' });
    const clips: string[] = [];
    try {
      for (let index = 0; index < 2; index++) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          const parts: Blob[] = [];
          const recorder = new MediaRecorder(stream, { mimeType: mime });
          recorder.ondataavailable = event => { if (event.data.size) parts.push(event.data); };
          recorder.onerror = () => reject(new Error('Synthetic legacy capture failed'));
          recorder.onstop = () => resolve(new Blob(parts, { type: mime }));
          recorder.start();
          setTimeout(() => recorder.stop(), 1600);
        });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (const byte of bytes) binary += String.fromCharCode(byte);
        clips.push(btoa(binary));
      }
      return { clips, mime };
    } finally { stream.getTracks().forEach(track => track.stop()); }
  }, mode);
  const originHeaders = { origin: 'http://127.0.0.1:3000', 'x-recording-client': '1' };
  // No format header intentionally creates the backwards-compatible legacy session.
  const created = await page.request.post('/api/recordings/sessions', { headers: originHeaders });
  expect(created.status()).toBe(201);
  const session = await created.json();
  for (let index = 0; index < clips.clips.length; index++) {
    const uploaded = await page.request.put(`/api/recordings/sessions/${session.id}/clips/${index}`, {
      headers: { ...originHeaders, authorization: `Bearer ${session.secret}`, 'content-type': clips.mime, 'x-clip-start': String(index * 1700), 'x-clip-end': String(index * 1700 + 1600) },
      data: Buffer.from(clips.clips[index], 'base64'),
    });
    expect(uploaded.status()).toBe(201);
  }
  const key = `${session.id}.${session.secret}`;
  await page.evaluate(key => sessionStorage.setItem('alzavoz_recording_key', key), key);
  await page.reload();
  await expect(page.getByTestId('received-count')).toHaveText('2');
  return key;
}

async function startSequence(page: Page) {
  const playAll = page.getByRole('button', { name: 'Reproducir toda la grabación', exact: true });
  await expect(playAll).toBeVisible({ timeout: 3000 });
  await playAll.click();
  await expect(position(page)).toHaveText(/^Clip 1 de \d+$/);
  await expect.poll(() => player(page).evaluate((media: HTMLMediaElement) => media.currentTime)).toBeGreaterThan(0);
  const bounds = await player(page).boundingBox();
  const dock = await page.locator('.recording-controls').boundingBox();
  expect(bounds).not.toBeNull();
  expect(dock).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(88);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(dock!.y);
}

test('la secuencia de audio respeta la pausa y avanza al siguiente clip sin otro clic', async ({ page }) => {
  await recoverLegacyClips(page, 'audio');
  await startSequence(page);
  await expect(page.locator('audio[data-playback]')).toBeVisible();

  // Pause through the native media API: a queue must not use a wall-clock timer to advance.
  const pausedAt = await player(page).evaluate((media: HTMLMediaElement) => { media.pause(); return media.currentTime; });
  await page.waitForTimeout(3300);
  await expect(position(page)).toHaveText(/^Clip 1 de \d+$/);
  expect(await player(page).evaluate((media: HTMLMediaElement) => media.currentTime)).toBeCloseTo(pausedAt, 1);
  await player(page).evaluate((media: HTMLMediaElement) => media.play());
  await expect(position(page)).toHaveText(/^Clip 2 de \d+$/, { timeout: 8000 });
  await expect.poll(() => player(page).evaluate((media: HTMLMediaElement) => media.currentTime)).toBeGreaterThan(0);
  await player(page).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/playback-audio.png' });
});

test('el video recuperado reproduce todos sus clips y conserva la reproducción individual', async ({ page, context }) => {
  const key = await recoverLegacyClips(page, 'video');
  // Recover the old format in a fresh tab, without any in-memory recording blobs.
  await page.close();
  const recovered = await context.newPage();
  await recovered.goto('/record');
  await recovered.getByText('Recuperar una grabación anterior', { exact: true }).click();
  await recovered.getByLabel('Pega la clave privada').fill(key);
  await recovered.getByRole('button', { name: 'Recuperar clips recibidos' }).click();
  await expect(recovered.getByTestId('received-count')).toHaveText('2');
  await startSequence(recovered);
  await expect.poll(() => recovered.locator('video[data-playback]').evaluate((media: HTMLVideoElement) => media.videoWidth)).toBeGreaterThan(0);
  await expect(position(recovered)).toHaveText('Clip 2 de 2', { timeout: 8000 });
  await expect.poll(() => player(recovered).evaluate((media: HTMLMediaElement) => media.currentTime)).toBeGreaterThan(0);
  await player(recovered).scrollIntoViewIfNeeded();
  await recovered.screenshot({ path: 'output/playwright/playback-video.png' });
  await expect.poll(() => player(recovered).evaluate((media: HTMLMediaElement) => media.ended), { timeout: 8000 }).toBe(true);

  await recovered.getByRole('button', { name: 'Reproducir clip 1', exact: true }).click();
  await expect(recovered.getByRole('heading', { name: 'Clip 1 recuperado y verificado', exact: true })).toBeVisible();
  await expect.poll(() => player(recovered).evaluate((media: HTMLMediaElement) => media.currentTime)).toBeGreaterThan(0);
  await expect.poll(() => player(recovered).evaluate((media: HTMLMediaElement) => media.ended), { timeout: 8000 }).toBe(true);
  await expect(recovered.getByRole('heading', { name: 'Clip 1 recuperado y verificado', exact: true })).toBeVisible();
});

test('un error al cargar el siguiente clip detiene la secuencia sin saltarse el fallo', async ({ page }) => {
  await recoverLegacyClips(page, 'audio');
  await page.route('**/api/recordings/sessions/*/clips/1', route => route.request().method() === 'GET'
    ? route.fulfill({ status: 503, json: { error: 'Clip de prueba temporalmente no disponible.' } })
    : route.continue());
  await startSequence(page);
  await expect(recording(page).getByRole('alert')).toContainText('Clip de prueba temporalmente no disponible', { timeout: 10000 });
  await expect(position(page)).not.toHaveText(/^Clip 3 de /);
  await page.getByRole('button', { name: 'Reproducir clip 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clip 1 recuperado y verificado', exact: true })).toBeVisible();
  await expect.poll(() => player(page).evaluate((media: HTMLMediaElement) => media.currentTime)).toBeGreaterThan(0);
});

test('detener la secuencia durante una descarga impide que una respuesta tardía empiece a reproducir', async ({ page }) => {
  await recoverLegacyClips(page, 'audio');
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('**/api/recordings/sessions/*/clips/0', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    requested = true;
    await held;
    await route.continue().catch(() => { /* Aborted requests may be gone after cancellation. */ });
  });
  const playAll = page.getByRole('button', { name: 'Reproducir toda la grabación', exact: true });
  await expect(playAll).toBeVisible({ timeout: 3000 });
  await playAll.click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole('button', { name: 'Detener reproducción', exact: true }).click();
  release();
  await page.unroute('**/api/recordings/sessions/*/clips/0');
  await page.getByRole('button', { name: 'Reproducir clip 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clip 2 recuperado y verificado', exact: true })).toBeVisible();
  await expect.poll(() => player(page).evaluate((media: HTMLMediaElement) => media.ended), { timeout: 8000 }).toBe(true);
  await expect(page.getByRole('heading', { name: 'Clip 2 recuperado y verificado', exact: true })).toBeVisible();
});
