import { test, expect } from '@playwright/test';

const cardSelector = 'section[aria-label="Ubicación GPS de Emergencia para el 123"]';

test('GPS denegado no inventa ubicación ni enlace de mapa', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    };
  });
  await page.goto('/sos');
  const card = page.locator(cardSelector);
  await expect(card).toContainText('Permiso de ubicación denegado');
  await expect(card).not.toContainText('Parque Berrío');
  await expect(card).not.toContainText('6.2486');
  await expect(card).not.toContainText('±15');
  const message = new URL((await page.locator('main a[href*="wa.me"]').first().getAttribute('href'))!).searchParams.get('text')!;
  expect(message).toContain('Ubicación sin confirmar');
  expect(message).not.toContain('maps.google.com');
});

test('elegir comuna comparte una referencia manual sin fingir GPS', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/sos');
  await page.getByRole('button', { name: 'Cambiar comuna manualmente' }).click();
  await page.getByRole('button', { name: /Comuna 14 - El Poblado/ }).click();
  const card = page.locator(cardSelector);
  await expect(card).toContainText('Zona elegida manualmente');
  await expect(card).toContainText('El Poblado / Provenza');
  await expect(card).not.toContainText('Tiempo Real');
  await expect(card).not.toContainText('Cra 43A');
  await expect(card).not.toContainText('6.208');
  const message = new URL((await page.locator('main a[href*="wa.me"]').first().getAttribute('href'))!).searchParams.get('text')!;
  expect(message).toContain('Zona elegida manualmente');
  expect(message).not.toContain('maps.google.com');
  await page.getByRole('button', { name: 'Copiar dirección para dictar o enviar' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Dirección exacta sin confirmar');
  expect(copied).not.toContain('Estoy en');
});

test('una respuesta GPS tardía no reemplaza la comuna elegida', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = success => {
      Object.defineProperty(window, 'completeGps', { configurable: true, value: () => success({
        coords: { latitude: 6.2486, longitude: -75.567, accuracy: 12, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON: () => ({}) },
        timestamp: Date.now(), toJSON: () => ({}),
      }) });
    };
  });
  await page.goto('/sos');
  await expect(page.locator(cardSelector)).toContainText('Sincronizando GPS');
  await page.getByRole('button', { name: 'Cambiar comuna manualmente' }).click();
  await page.getByRole('button', { name: /Comuna 14 - El Poblado/ }).click();
  await page.evaluate(() => (window as unknown as { completeGps: () => void }).completeGps());
  await expect(page.locator(cardSelector)).toContainText('El Poblado / Provenza');
  await expect(page.locator(cardSelector)).toContainText('Zona elegida manualmente');
});

test('GPS conserva la precisión medida y no inventa dirección si falla el mapa', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 6.217, longitude: -75.574, accuracy: 38 });
  await page.route('https://nominatim.openstreetmap.org/**', route => route.abort());
  await page.goto('/sos');
  const card = page.locator(cardSelector);
  await expect(card).toContainText('6.2170, -75.5740');
  await expect(card).toContainText('±38m');
  await expect(card).toContainText('Dirección exacta sin confirmar');
  await expect(card).not.toContainText('Parque');
});

test('SOS distingue posición reciente con hora exacta y precisión buena', async ({ page }) => {
  await page.addInitScript(() => {
    const fixedNow = Date.now();
    navigator.geolocation.getCurrentPosition = (success) => {
      success({
        coords: {
          latitude: 6.2088,
          longitude: -75.5656,
          accuracy: 18,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: fixedNow - 8_000,
        toJSON: () => ({}),
      });
    };
  });
  await page.route('https://nominatim.openstreetmap.org/**', route => route.abort());
  await page.goto('/sos');

  const card = page.locator(cardSelector);
  await expect(card.getByTestId('sos-location-freshness-badge')).toContainText('Lectura reciente');
  await expect(card.getByTestId('sos-location-obtained-time')).toContainText(/\d{1,2}:\d{2}:\d{2}/);
  await expect(card.getByTestId('sos-location-obtained-time')).toContainText(/hace \d+ s/);
  await expect(card.getByTestId('sos-location-precision-label')).toContainText('±18m (buena)');
  await expect(card.getByTestId('sos-location-warnings')).toHaveCount(0);
});

test('SOS distingue lectura antigua (>= 2 min) y la corrección manual gobierna portapapeles, WhatsApp y vista previa sin GPS falso', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    const staleTimestamp = Date.now() - 12 * 60 * 1000;
    navigator.geolocation.getCurrentPosition = (success) => {
      success({
        coords: {
          latitude: 6.2486,
          longitude: -75.567,
          accuracy: 25,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: staleTimestamp,
        toJSON: () => ({}),
      });
    };
  });
  await page.route('https://nominatim.openstreetmap.org/**', route => route.abort());
  await page.goto('/sos');

  const card = page.locator(cardSelector);
  await expect(card.getByTestId('sos-location-freshness-badge')).toContainText('Lectura antigua');
  await expect(card.getByTestId('sos-location-obtained-time')).toContainText(/hace 1[23] min/);
  await expect(card.getByTestId('sos-location-warnings')).toContainText('más de 2 minutos');

  // Corregir manualmente desde el acceso directo de la alerta
  await card.getByTestId('sos-location-shortcut-manual-btn').click();
  await expect(card.getByTestId('sos-manual-correction-form')).toBeVisible();
  await card.locator('#sos-manual-commune').selectOption('Comuna 14 - El Poblado');
  await card.locator('#sos-manual-neighborhood').fill('Provenza');
  await card.locator('#sos-manual-address').fill('Calle 10 con Cra 38, esquina café');
  await card.getByTestId('sos-manual-correction-save').click();

  await expect(card).toContainText('Ubicación corregida manualmente');
  await expect(card.getByTestId('sos-location-freshness-badge')).toContainText('Corregida manualmente');
  await expect(card.getByTestId('sos-location-precision-label')).toContainText('Corregida manualmente (sin GPS)');
  await expect(card).toContainText('Provenza');
  await expect(card).toContainText('Calle 10 con Cra 38, esquina café');
  await expect(card).not.toContainText('6.2486');

  // Verificar portapapeles
  await page.getByRole('button', { name: 'Copiar dirección para dictar o enviar' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Ubicación corregida manualmente');
  expect(copied).toContain('Calle 10 con Cra 38, esquina café');
  expect(copied).toContain('Provenza');
  expect(copied).not.toContain('6.2486');

  // Verificar enlace directo de WhatsApp
  const waHref = await page.locator('main a[href*="wa.me"]').first().getAttribute('href');
  const waMessage = new URL(waHref!).searchParams.get('text')!;
  expect(waMessage).toContain('Calle 10 con Cra 38, esquina café');
  expect(waMessage).toContain('Ubicación corregida manualmente');
  expect(waMessage).not.toContain('maps.google.com');

  // Verificar modal de vista previa
  await page.getByTestId('btn-open-sos-preview').click();
  const dialog = page.getByTestId('sos-share-preview-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('sos-preview-location-assessment')).toContainText('Corregida manualmente');
  const payloadText = await dialog.getByTestId('sos-preview-payload-text').textContent();
  expect(payloadText).toContain('Calle 10 con Cra 38, esquina café');
  expect(payloadText).not.toContain('maps.google.com');
  await page.getByTestId('sos-preview-cancel-btn').click();
});

test('SOS distingue lectura imprecisa (> 150m) y permiso denegado con corrección manual', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (success) => {
      success({
        coords: {
          latitude: 6.235,
          longitude: -75.545,
          accuracy: 680,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now() - 6_000,
        toJSON: () => ({}),
      });
    };
  });
  await page.route('https://nominatim.openstreetmap.org/**', route => route.abort());
  await page.goto('/sos');

  const card = page.locator(cardSelector);
  await expect(card.getByTestId('sos-location-precision-label')).toContainText('±680m (baja / imprecisa)');
  await expect(card.getByTestId('sos-location-warnings')).toContainText('Margen de error amplio (±680m)');

  await page.getByTestId('btn-open-sos-preview').click();
  const dialog = page.getByTestId('sos-share-preview-dialog');
  await expect(dialog.getByTestId('sos-preview-location-assessment')).toContainText('±680m');
  await expect(dialog.getByTestId('sos-preview-payload-text')).toContainText('±680m');
  await page.getByTestId('sos-preview-cancel-btn').click();

  // Simular ahora permiso denegado tras reintentar GPS y corregir manualmente
  await page.evaluate(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    };
  });
  await page.getByRole('button', { name: 'Actualizar señal GPS' }).click();
  await expect(card).toContainText('Permiso de ubicación denegado');
  await card.getByTestId('sos-location-shortcut-manual-btn').click();
  await card.locator('#sos-manual-address').fill('Parque de Belén, costado sur');
  await card.getByTestId('sos-manual-correction-save').click();

  await expect(card).toContainText('Parque de Belén, costado sur');
  const waHref = await page.locator('main a[href*="wa.me"]').first().getAttribute('href');
  const waMessage = new URL(waHref!).searchParams.get('text')!;
  expect(waMessage).toContain('Parque de Belén, costado sur');
  expect(waMessage).not.toContain('maps.google.com');
});

test('SOS distingue precisión no reportada por el dispositivo (accuracy null)', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (success) => {
      success({
        coords: {
          latitude: 6.212,
          longitude: -75.571,
          accuracy: null as unknown as number,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now() - 5_000,
        toJSON: () => ({}),
      });
    };
  });
  await page.route('https://nominatim.openstreetmap.org/**', route => route.abort());
  await page.goto('/sos');

  const card = page.locator(cardSelector);
  await expect(card.getByTestId('sos-location-precision-label')).toContainText('Precisión no reportada por el dispositivo');
  await expect(card.getByTestId('sos-location-warnings')).toContainText('no reportó precisión aproximada');
});

test('/report no consulta GPS automáticamente, distingue antigua/imprecisa/denegada y refleja corrección en D1 y WhatsApp', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { __geoCalls: number }).__geoCalls = 0;
    navigator.geolocation.getCurrentPosition = (success) => {
      (window as unknown as { __geoCalls: number }).__geoCalls += 1;
      success({
        coords: {
          latitude: 6.208,
          longitude: -75.57,
          accuracy: 540,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now() - 15 * 60 * 1000,
        toJSON: () => ({}),
      });
    };
  });
  await page.route('https://nominatim.openstreetmap.org/**', route => route.abort());
  await page.goto('/report');

  // Nunca consulta GPS al abrir /report
  expect(await page.evaluate(() => (window as unknown as { __geoCalls: number }).__geoCalls)).toBe(0);

  // Consultar bajo demanda y observar lectura antigua + imprecisa
  await page.getByTestId('report-query-location-btn').click();
  expect(await page.evaluate(() => (window as unknown as { __geoCalls: number }).__geoCalls)).toBe(1);
  await expect(page.locator('#report-commune')).toHaveValue('Comuna 14 - El Poblado');
  await expect(page.getByTestId('report-location-freshness-badge')).toContainText('Lectura antigua');
  await expect(page.getByTestId('report-location-obtained-time')).toContainText(/hace 1[56] min/);
  await expect(page.getByTestId('report-location-precision-label')).toContainText('±540m (baja / imprecisa)');

  // Corregir manualmente comuna y referencia
  await page.selectOption('#report-commune', 'Comuna 11 - Laureles Estadio');
  await page.fill('#report-neighborhood', 'Primer Parque de Laureles (corregido)');
  await expect(page.getByTestId('report-location-freshness-badge')).toContainText('Corregida manualmente');

  await page.fill(
    '#report-summary',
    'Reporte de prueba T17 tras corregir manualmente una lectura GPS antigua e imprecisa.'
  );
  await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();
  await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();

  await expect(page.getByTestId('report-preview-location-meta')).toContainText('Ubicación corregida manualmente');
  await expect(page.getByTestId('report-preview-location-meta')).toContainText('Sin coordenadas GPS');

  const waHref = await page.getByTestId('whatsapp-channel-link').getAttribute('href');
  const waText = new URL(waHref!).searchParams.get('text')!;
  expect(waText).toContain('Comuna 11 - Laureles Estadio');
  expect(waText).toContain('Primer Parque de Laureles (corregido)');

  // Capturar el payload JSON enviado a POST /api/reports
  let sentBody: Record<string, unknown> | null = null;
  page.on('request', (req) => {
    if (req.url().endsWith('/api/reports') && req.method() === 'POST') {
      sentBody = req.postDataJSON() as Record<string, unknown>;
    }
  });

  await page.check('#report-privacy-ack');
  await page.getByRole('button', { name: 'Radicar denuncia en bóveda D1' }).click();
  await expect(page.getByTestId('report-receipt-card')).toBeVisible({ timeout: 15000 });

  expect(sentBody).not.toBeNull();
  expect(sentBody!.commune).toBe('Comuna 11 - Laureles Estadio');
  expect(sentBody!.neighborhoodReference).toBe('Primer Parque de Laureles (corregido)');
  expect(sentBody!.latitude).toBeUndefined();
  expect(sentBody!.longitude).toBeUndefined();
  expect(sentBody!.accuracy).toBeUndefined();

  // También verificar permiso denegado en /report
  await page.getByRole('button', { name: 'Preparar otro reporte nuevo' }).click();
  await page.evaluate(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    };
  });
  await page.getByTestId('report-query-location-btn').click();
  await expect(page.getByTestId('report-location-freshness-badge')).toContainText('Permiso denegado');
  await page.selectOption('#report-commune', 'Comuna 10 - La Candelaria');
  await expect(page.getByTestId('report-location-freshness-badge')).toContainText('Corregida manualmente');
});

test('controles de ubicación y corrección manual cumplen >= 56px y cero desbordamiento en móvil y escritorio', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    };
  });

  for (const viewport of [
    { width: 320, height: 851 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/sos');
    await page.getByTestId('sos-manual-correction-toggle').click();
    await expect(page.getByTestId('sos-manual-correction-form')).toBeVisible();

    const sosOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(sosOverflow, `desbordamiento en /sos a ${viewport.width}px`).toBe(false);

    for (const testId of ['sos-manual-correction-toggle', 'sos-manual-correction-save', 'sos-manual-correction-cancel']) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(56);
    }

    await page.goto('/report');
    await page.getByTestId('report-query-location-btn').click();
    const reportOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(reportOverflow, `desbordamiento en /report a ${viewport.width}px`).toBe(false);

    const queryBox = await page.getByTestId('report-query-location-btn').boundingBox();
    expect(queryBox).not.toBeNull();
    expect(queryBox!.height).toBeGreaterThanOrEqual(56);
  }
});
