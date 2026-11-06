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
