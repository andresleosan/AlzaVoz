import { test, expect, type Page } from '@playwright/test';

const recording = (page: Page) => page.locator('section[aria-labelledby="recording-title"]');
const player = (page: Page) => page.locator('[data-playback]');
const position = (page: Page) => page.getByTestId('playback-position');

async function captureTwoClips(page: Page, mode: 'audio' | 'video') {
  await page.goto('/record');
  if (mode === 'audio') await page.getByRole('button', { name: 'Solo audio', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByTestId('received-count')).toHaveText(/^[2-9]\d*$/, { timeout: 15000 });
  return page.getByLabel('Clave de recuperación', { exact: true }).inputValue();
}

async function stopCapture(page: Page) {
  await page.getByRole('button', { name: 'Detener grabación', exact: true }).click();
  await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  await expect(page.getByTestId('pending-count')).toHaveText('0');
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
  await captureTwoClips(page, 'audio');
  await stopCapture(page);
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
  const key = await captureTwoClips(page, 'video');
  // Closing after two confirmed clips also proves that playback works without in-memory recording blobs.
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
  await captureTwoClips(page, 'audio');
  await stopCapture(page);
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
  await captureTwoClips(page, 'audio');
  await stopCapture(page);
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
