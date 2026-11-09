import { test, expect } from '@playwright/test';

test.describe('T13 — Cámara y micrófono siempre visibles (I003)', () => {
  test('el indicador de captura refleja en vivo las pistas activas de cámara y micrófono', async ({ page }) => {
    await page.goto('/record');

    // Inicialmente no debe haber banner activo
    await expect(page.getByTestId('media-capture-active-banner')).toHaveCount(0);

    // Iniciar grabación en modo video y audio
    await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();

    // El banner persistente en AppShell se activa reflejando cámara y micrófono
    const banner = page.getByTestId('media-capture-active-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Cámara y micrófono activos');

    // El texto local del panel también coincide
    await expect(page.getByText('Cámara y micrófono activos', { exact: true })).toBeVisible();

    // Verificar que el control de detener en el banner esté disponible y cumpla tamaño táctil accesible (>= 44px)
    const bannerStopBtn = page.getByTestId('banner-stop-capture-button');
    await expect(bannerStopBtn).toBeVisible();
    const box = await bannerStopBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    // Detener la captura usando el botón del banner persistente
    await bannerStopBtn.click();

    // Se confirma la detención y liberación de los sensores
    await expect(page.getByTestId('media-capture-stopped-banner')).toBeVisible();
    await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  });

  test('el indicador refleja solo audio cuando se graba en modo solo audio', async ({ page }) => {
    await page.goto('/record');

    // Seleccionar solo audio
    await page.getByRole('button', { name: 'Solo audio', exact: true }).click();
    await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();

    // El banner persistente debe indicar únicamente micrófono activo
    const banner = page.getByTestId('media-capture-active-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Micrófono activo');
    await expect(banner).not.toContainText('Cámara');

    // El panel local también muestra micrófono activo
    await expect(page.getByText('Micrófono activo', { exact: true })).toBeVisible();

    // Detener desde el banner
    await page.getByTestId('banner-stop-capture-button').click();
    await expect(page.getByTestId('media-capture-stopped-banner')).toBeVisible();
    await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  });

  test('el control de detener captura en el banner libera efectivamente los tracks de hardware', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();

    await expect(page.getByTestId('media-capture-active-banner')).toBeVisible();
    await expect(page.locator('video[aria-label="Vista de la cámara"]')).toBeVisible();

    // Comprobar que las pistas del stream están en live
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const video = document.querySelector('video') as HTMLVideoElement | null;
        const stream = video?.srcObject as MediaStream | null;
        if (!stream) return 0;
        return stream.getTracks().filter(t => t.readyState === 'live').length;
      });
    }).toBeGreaterThan(0);

    // Detener la captura mediante el botón del banner
    await page.getByTestId('banner-stop-capture-button').click();

    // Verificar que todas las pistas quedaron en 'ended' (hardware liberado)
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const video = document.querySelector('video') as HTMLVideoElement | null;
        const stream = video?.srcObject as MediaStream | null;
        if (!stream) return true;
        return stream.getTracks().every(t => t.readyState === 'ended');
      });
    }).toBe(true);

    await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  });

  test('el indicador y el botón de detener permanecen visibles y accesibles al hacer scroll vertical', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // Mobile viewport (iPhone / Pixel)
    await page.goto('/record');
    await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();

    const banner = page.getByTestId('media-capture-active-banner');
    const stopBtn = page.getByTestId('banner-stop-capture-button');
    await expect(banner).toBeVisible();

    // Hacer scroll pronunciado hacia el final de la pantalla (zona de clave y límites)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // El banner sticky debe seguir dentro del viewport visible
    await expect(banner).toBeInViewport();
    await expect(stopBtn).toBeInViewport();

    // Poder detener la grabación inmediatamente desde la posición de scroll
    await stopBtn.click();
    await expect(page.getByTestId('media-capture-stopped-banner')).toBeInViewport();
    await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  });

  test('la interrupción o finalización de una pista detiene de forma segura la captura y apaga sensores', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();

    const banner = page.getByTestId('media-capture-active-banner');
    await expect(banner).toContainText('Cámara y micrófono activos');

    // Simular que el sistema o usuario interrumpe una pista (por ejemplo, llamada entrante o permiso revocado)
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      const stream = video?.srcObject as MediaStream | null;
      const videoTrack = stream?.getVideoTracks()[0];
      videoTrack?.stop();
      videoTrack?.dispatchEvent(new Event('ended'));
    });

    // La interrupción detiene de forma segura la captura y cambia al banner de sensores apagados
    await expect(page.getByTestId('media-capture-stopped-banner')).toBeVisible();
    await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
  });

  test('la nota de voz en reporte confidencial activa el indicador de micrófono y permite detenerla', async ({ page }) => {
    await page.goto('/report');

    // Completar hechos en Paso 1 (mínimo 15 caracteres)
    await page.fill('#report-summary', 'Detención arbitraria con vehículo particular sin distintivos.');
    await page.getByRole('button', { name: 'Continuar a evidencias y voz', exact: true }).click();

    // En Paso 2, iniciar grabación de nota de voz
    await page.getByRole('button', { name: /Grabar nota de voz/i }).click();

    // El banner global en AppShell debe activarse con "Micrófono activo"
    const banner = page.getByTestId('media-capture-active-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Micrófono activo');

    // Detener la nota de voz desde el banner global
    await page.getByTestId('banner-stop-capture-button').click();

    // El micrófono se libera y el banner indica captura detenida
    await expect(page.getByTestId('media-capture-stopped-banner')).toBeVisible();
  });
});
