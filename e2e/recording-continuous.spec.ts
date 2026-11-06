import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const player = (page: Page) => page.locator('[data-playback][data-recording-kind="continuous"]');

async function capture(page: Page, mode: 'audio' | 'video') {
  await page.addInitScript(() => {
    const stats = { constructed: 0, started: 0, stopped: 0, timeslices: [] as (number | undefined)[] };
    Object.defineProperty(window, 'testRecorderStats', { value: stats });
    const Original = window.MediaRecorder;
    window.MediaRecorder = class extends Original {
      constructor(stream: MediaStream, options?: MediaRecorderOptions) { super(stream, options); stats.constructed++; }
      start(timeslice?: number) { stats.started++; stats.timeslices.push(timeslice); super.start(timeslice); }
      stop() { stats.stopped++; super.stop(); }
    };
  });
  await page.goto('/record');
  if (mode === 'audio') await page.getByRole('button', { name: 'Solo audio', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByTestId('received-count')).toHaveText(/^[2-9]\d*$/, { timeout: 15000 });
  const stats = await page.evaluate(() => (window as unknown as { testRecorderStats: unknown }).testRecorderStats);
  expect(stats).toEqual({ constructed: 1, started: 1, stopped: 0, timeslices: [3000] });
  const key = await page.getByLabel('Clave de recuperación', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Detener grabación', exact: true }).click();
  await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { testRecorderStats: unknown }).testRecorderStats))
    .toEqual({ constructed: 1, started: 1, stopped: 1, timeslices: [3000] });
  await expect(page.getByTestId('pending-count')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Reproducir toda la grabación', exact: true })).toBeEnabled();
  return key;
}

for (const mode of ['audio', 'video'] as const) {
  test(`la captura continua de ${mode} se recupera y descarga completa sin reinicios`, async ({ page, context }) => {
    test.setTimeout(60000);
    const key = await capture(page, mode);
    const [id, secret] = key.split('.');
    await expect.poll(async () => {
      const response = await page.request.get(`/api/recordings/sessions/${id}/clips`, { headers: { authorization: `Bearer ${secret}` } });
      const result = await response.json();
      return { format: result.format, complete: result.completion?.clipCount === result.clips.length };
    }).toEqual({ format: 'continuous-webm-v1', complete: true });
    await page.close();
    const recovered = await context.newPage();
    await recovered.goto('/record');
    await recovered.getByText('Recuperar una grabación anterior', { exact: true }).click();
    await recovered.getByLabel('Pega la clave privada').fill(key);
    await recovered.getByRole('button', { name: 'Recuperar clips recibidos' }).click();
    if (mode === 'video') {
      // Export is available directly, without making the person play the recording first.
      await recovered.getByRole('button', { name: 'Descargar grabación completa', exact: true }).click();
      await expect(recovered.getByRole('link', { name: 'Descargar grabación completa', exact: true })).toBeVisible();
    }
    await recovered.getByRole('button', { name: 'Reproducir toda la grabación', exact: true }).click();
    await expect(player(recovered)).toBeVisible();
    await expect(recovered.getByRole('button', { name: /^Reproducir clip \d+$/ })).toHaveCount(0);
    await expect.poll(() => player(recovered).evaluate((media: HTMLMediaElement) => media.currentTime)).toBeGreaterThan(0);
    const pausedAt = await player(recovered).evaluate((media: HTMLMediaElement) => { media.pause(); return media.currentTime; });
    await recovered.waitForTimeout(3300);
    expect(await player(recovered).evaluate((media: HTMLMediaElement) => media.currentTime)).toBeCloseTo(pausedAt, 1);
    await player(recovered).evaluate((media: HTMLMediaElement) => media.play());
    await expect.poll(() => player(recovered).evaluate((media: HTMLMediaElement) => media.currentTime), { timeout: 10000 }).toBeGreaterThan(4);
    if (mode === 'video') await expect.poll(() => player(recovered).evaluate((media: HTMLVideoElement) => media.videoWidth)).toBeGreaterThan(0);
    const bounds = await player(recovered).boundingBox();
    const dock = await recovered.locator('.recording-controls').boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(88);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(dock!.y);
    expect(await recovered.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await recovered.screenshot({ path: `output/playwright/continuous-${mode}.png` });

    const downloadPromise = recovered.waitForEvent('download');
    await recovered.getByRole('link', { name: 'Descargar grabación completa', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.webm$/);
    const path = `output/playwright/continuous-${mode}.webm`;
    await download.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    expect(bytes.indexOf(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), 4)).toBe(-1);
    // Load the actual downloaded file independently: a successful click does not prove a usable export.
    await recovered.evaluate(({ base64, mode }) => {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const media = document.createElement(mode);
      media.setAttribute('data-export-probe', '');
      media.src = URL.createObjectURL(new Blob([bytes], { type: `${mode}/webm` }));
      media.playbackRate = 4;
      media.muted = true;
      document.body.append(media);
      void media.play();
    }, { base64: bytes.toString('base64'), mode });
    const exported = recovered.locator('[data-export-probe]');
    await expect.poll(() => exported.evaluate((media: HTMLMediaElement) => media.ended), { timeout: 10000 }).toBe(true);
    expect(await exported.evaluate((media: HTMLMediaElement) => media.currentTime)).toBeGreaterThanOrEqual(6);
    await recovered.evaluate(() => {
      const media = document.querySelector<HTMLMediaElement>('[data-export-probe]')!;
      URL.revokeObjectURL(media.src); media.remove();
    });
  });
}

test('un fragmento alterado impide entregar una grabación completa falsa', async ({ page }) => {
  test.setTimeout(40000);
  await capture(page, 'audio');
  await page.route('**/api/recordings/sessions/*/clips/1', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const bytes = await response.body();
    bytes[bytes.length - 1] ^= 1;
    await route.fulfill({ response, body: bytes });
  });
  await page.getByRole('button', { name: 'Reproducir toda la grabación', exact: true }).click();
  await expect(page.locator('section[aria-label="Reproducción de la grabación"]').getByRole('alert')).toContainText(/no coincide|integridad/);
  await expect(player(page)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Descargar grabación completa', exact: true })).toHaveCount(0);
});

test('el cierre pendiente no se anuncia completo y puede reintentarse sin volver a grabar', async ({ page }) => {
  await page.route('**/api/recordings/sessions/*/complete', route => route.fulfill({ status: 503, json: { error: 'Cierre temporalmente no disponible.' } }));
  await page.goto('/record');
  await page.getByRole('button', { name: 'Solo audio', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
  await expect(page.getByTestId('received-count')).toHaveText('1', { timeout: 15000 });
  const key = await page.getByLabel('Clave de recuperación', { exact: true }).inputValue();
  const [id, secret] = key.split('.');
  await page.getByRole('button', { name: 'Detener grabación', exact: true }).click();
  await expect(page.getByTestId('pending-count')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Reintentar cierre de grabación', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reproducir toda la grabación', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Descargar grabación completa', exact: true })).toHaveCount(0);
  const home = page.getByRole('navigation', { name: 'Navegación móvil', exact: true }).getByRole('link', { name: 'Inicio', exact: true });
  await expect(home).toHaveAttribute('aria-disabled', 'true');
  const listed = await page.request.get(`/api/recordings/sessions/${id}/clips`, { headers: { authorization: `Bearer ${secret}` } });
  const before = await listed.json();
  expect(before.completion).toBeUndefined();
  expect(before.clips.length).toBeGreaterThan(0);
  await page.unroute('**/api/recordings/sessions/*/complete');
  await page.getByRole('button', { name: 'Reintentar cierre de grabación', exact: true }).click();
  await expect(home).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', { name: 'Reproducir toda la grabación', exact: true })).toBeEnabled();
  const confirmed = await page.request.get(`/api/recordings/sessions/${id}/clips`, { headers: { authorization: `Bearer ${secret}` } });
  const after = await confirmed.json();
  expect(after.completion).toEqual({ clipCount: before.clips.length });
  expect(after.clips).toEqual(before.clips);
});
