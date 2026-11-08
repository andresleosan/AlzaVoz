import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { readFile } from 'node:fs/promises';

const headers = { origin: 'http://127.0.0.1:3000', 'x-search-client': '1' };
const input = (kind = 'pet-lost') => ({ requestId: crypto.randomUUID(), kind, title: 'Aviso sintético de prueba', description: 'Descripción ficticia de prueba, con prenda verde.', commune: 10, eventDate: '2026-01-01', contact: 'PRIVADO_CONTACTO_CENTINELA', consent: true });

test('rechazo de validación permite corregir pista sin perder texto ni consentimiento', async ({ page, request }) => {
  const created = (await (await request.post('/api/search', { headers, data: input() })).json()).notice as { id: string };
  await page.goto(`/search?id=${created.id}`);
  const posts: string[] = [];
  await page.route('**/tips', async route => {
    posts.push(route.request().postData() ?? '');
    if (posts.length === 1) await route.fulfill({ status: 400, json: { error: 'Validación de servidor rechazada' } });
    else await route.continue();
  });
  await page.getByLabel('Tu pista privada').fill('  a');
  await page.getByLabel('Autorizo almacenar esta pista').check();
  await page.getByRole('button', { name: 'Enviar pista privada' }).click();
  await expect(page.locator('#contenido').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Tu pista privada')).toBeEnabled();
  await expect(page.getByLabel('Tu pista privada')).toHaveValue('  a');
  expect(posts).toHaveLength(0);
  await page.getByLabel('Tu pista privada').fill('Pista ficticia corregida localmente');
  await page.getByRole('button', { name: 'Enviar pista privada' }).click();
  await expect(page.locator('#contenido').getByRole('alert')).toContainText('Validación de servidor');
  await expect(page.getByLabel('Tu pista privada')).toBeEnabled();
  await expect(page.getByLabel('Tu pista privada')).toHaveValue('Pista ficticia corregida localmente');
  await expect(page.getByLabel('Autorizo almacenar esta pista')).toBeChecked();
  await page.getByLabel('Tu pista privada').fill('Pista corregida después de rechazo definitivo');
  await page.getByRole('button', { name: 'Enviar pista privada' }).click();
  await expect(page.getByRole('status')).toContainText('Pista recibida');
  expect(JSON.parse(posts[0]).requestId).not.toBe(JSON.parse(posts[1]).requestId);
});

test('aviso inválido y rechazo400 conservan revisión editable y fecha corregida', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('button', { name: 'Crear aviso' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Título breve').fill('  a');
  await page.getByLabel('Descripción pública').fill('Descripción sintética válida para prueba.');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Comuna del suceso').selectOption('10');
  await page.getByLabel('Fecha del suceso').fill('2026-01-01');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Revisar aviso' }).click();
  await expect(page.getByRole('button', { name: 'Publicar aviso' })).toBeDisabled();
  await page.getByLabel('Autorizo publicar estos datos').check();
  const posts: string[] = [];
  await page.route('**/api/search', async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    posts.push(route.request().postData() ?? '');
    if (posts.length === 1) await route.fulfill({ status: 400, json: { error: 'Revisa fecha del suceso' } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Publicar aviso' }).click();
  await expect(page.locator('#contenido').getByRole('alert')).toBeVisible();
  expect(posts).toHaveLength(0);
  await expect(page.getByLabel('Autorizo publicar estos datos')).toBeEnabled();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Atrás', exact: true }).click();
  await expect(page.getByLabel('Título breve')).toHaveValue('  a');
  await page.getByLabel('Título breve').fill('Aviso sintético corregido');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Revisar aviso' }).click();
  await page.getByRole('button', { name: 'Publicar aviso' }).click();
  await expect(page.locator('#contenido').getByRole('alert')).toContainText('Revisa fecha');
  await expect(page.getByLabel('Autorizo publicar estos datos')).toBeEnabled();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Atrás', exact: true }).click();
  await page.getByLabel('Fecha del suceso').fill('2026-01-02');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Revisar aviso' }).click();
  await page.getByLabel('Autorizo publicar estos datos').uncheck();
  await expect(page.getByRole('button', { name: 'Publicar aviso' })).toBeDisabled();
  await page.getByLabel('Autorizo publicar estos datos').check();
  await page.getByRole('button', { name: 'Publicar aviso' }).click();
  await expect(page.getByRole('heading', { name: 'Aviso sintético corregido', exact: true })).toBeVisible();
  expect(JSON.parse(posts[0]).requestId).not.toBe(JSON.parse(posts[1]).requestId);
  expect(JSON.parse(posts[1]).eventDate).toBe('2026-01-02');
});

test('búsqueda persiste cuatro categorías, deduplica y aísla contactos y pistas', async ({ request }) => {
  for (const kind of ['person-lost', 'person-found', 'pet-lost', 'pet-found']) {
    const payload = input(kind);
    const responses = await Promise.all([request.post('/api/search', { headers, data: payload }), request.post('/api/search', { headers, data: payload })]);
    for (const response of responses) expect(response.ok()).toBe(true);
    const created = await responses[0].json() as { notice: { id: string; kind: string } };
    expect(created.notice.kind).toBe(kind);
    expect(created.notice.id).not.toBe(payload.requestId);
    expect(await responses[1].json()).toEqual(created);
    expect((await request.post('/api/search', { headers, data: { ...payload, contact: 'diferente' } })).status()).toBe(409);
    const tip = { requestId: crypto.randomUUID(), text: 'PISTA_PRIVADA_CENTINELA', contact: 'CONTACTO_PISTA_CENTINELA', consent: true };
    for (let i = 0; i < 2; i++) expect(await (await request.post(`/api/search/${created.notice.id}/tips`, { headers, data: tip })).json()).toEqual({ accepted: true });
    expect((await request.post(`/api/search/${created.notice.id}/tips`, { headers, data: { ...tip, text: 'otra pista' } })).status()).toBe(409);
    const detail = await request.get(`/api/search/${created.notice.id}`);
    expect(Object.keys((await detail.json()).notice).sort()).toEqual(['commune', 'createdAt', 'description', 'eventDate', 'id', 'kind', 'title']);
    const text = await detail.text();
    expect(text).not.toMatch(/CENTINELA|requestId|contact|tips/);
    expect((await request.get(`/api/search/${created.notice.id}/tips`)).status()).toBe(405);
    expect((await request.post(`/api/search/${created.notice.id}/matches`, { headers, data: { consent: false } })).status()).toBe(400);
  }
  const list = await request.get('/api/search');
  expect(await list.text()).not.toMatch(/CENTINELA|requestId|contact|tips/);
  expect((await list.json()).notices.length).toBeLessThanOrEqual(60);
  expect(list.headers()['cache-control']).toBe('no-store');
  const one = (await (await request.post('/api/search', { headers, data: input() })).json()).notice as { id: string };
  const two = (await (await request.post('/api/search', { headers, data: input() })).json()).notice as { id: string };
  const privateTip = { requestId: crypto.randomUUID(), text: 'Pista ficticia de otro caso', contact: '', consent: true };
  expect((await request.post(`/api/search/${one.id}/tips`, { headers, data: privateTip })).status()).toBe(200);
  expect((await request.post(`/api/search/${two.id}/tips`, { headers, data: privateTip })).status()).toBe(409);
});

test('reintenta pista idéntica tras perder respuesta, distingue IA caída y permite recuperar listado', async ({ page, request }) => {
  const created = (await (await request.post('/api/search', { headers, data: input() })).json()).notice as { id: string };
  await page.goto(`/search?id=${created.id}`);
  const bodies: string[] = [];
  await page.route('**/tips', async route => {
    bodies.push(route.request().postData() ?? '');
    const response = await route.fetch();
    await route.fulfill(bodies.length === 1 ? { status: 503, json: { error: 'Confirmación perdida de prueba' } } : { response });
  });
  await page.getByLabel('Tu pista privada').fill('Texto sintético de reintento.');
  await page.getByLabel('Autorizo almacenar esta pista').check();
  await page.getByRole('button', { name: 'Enviar pista privada' }).click();
  await expect(page.locator('#contenido').getByRole('alert')).toContainText('Confirmación perdida');
  await expect(page.getByLabel('Tu pista privada')).toBeDisabled();
  await page.getByRole('button', { name: 'Reintentar pista' }).click();
  await expect(page.getByRole('status')).toContainText('Pista recibida');
  expect(bodies).toHaveLength(2); expect(bodies[0]).toBe(bodies[1]);
  await expect(page.getByRole('button', { name: 'Buscar sugerencias con IA' })).toBeDisabled();
  await page.route('**/matches', route => route.fulfill({ status: 503, json: { error: 'IA no disponible de prueba' } }));
  await page.getByLabel('Autorizo enviar a DeepSeek', { exact: false }).check();
  await page.getByRole('button', { name: 'Buscar sugerencias con IA' }).click();
  await expect(page.locator('#contenido').getByRole('alert')).toContainText('IA no disponible');
  await page.route('**/api/search', route => route.fulfill({ status: 503, json: { error: 'Listado caído de prueba' } }));
  await page.goto('/search');
  await expect(page.locator('#contenido').getByRole('alert')).toContainText('Listado caído');
  await page.unroute('**/api/search');
  await page.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(page.getByRole('heading', { name: 'Consulta un tablero' })).toBeVisible();
});

test('afiche con texto máximo conserva QR decodificable', async ({ page, request }) => {
  const response = await request.post('/api/search', { headers, data: { ...input(), title: 'W'.repeat(80), description: 'W'.repeat(1200) } });
  expect(response.status(), await response.text()).toBe(200);
  const created = (await response.json()).notice as { id: string };
  await page.goto(`/search?id=${created.id}`);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar afiche PNG' }).click();
  const path = await (await downloaded).path();
  const png = PNG.sync.read(await readFile(path!));
  expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(page.url());
});

test('gateway rechaza origen, campos, cuerpo excesivo y avisos inexistentes', async ({ request }) => {
  expect((await request.post('/api/search', { headers: { ...headers, origin: 'https://evil.example' }, data: input() })).status()).toBe(403);
  expect((await request.post('/api/search', { headers: { origin: headers.origin }, data: input() })).status()).toBe(403);
  for (const extra of [{ consent: false }, { kind: 'invalid' }, { eventDate: '2026-02-30' }, { commune: 0 }, { latitude: 6 }, { title: '' }]) expect((await request.post('/api/search', { headers, data: { ...input(), ...extra } })).status()).toBe(400);
  expect((await request.post('/api/search', { headers, data: { ...input(), description: 'x'.repeat(20000) } })).status()).toBe(413);
  const missing = crypto.randomUUID();
  expect((await request.get(`/api/search/${missing}`)).status()).toBe(404);
  expect((await request.post(`/api/search/${missing}/tips`, { headers, data: { requestId: crypto.randomUUID(), text: 'Prueba', contact: '', consent: true } })).status()).toBe(404);
  expect((await request.get('/api/search?contact=yes')).status()).toBe(400);
});

test('wizard revisa, publica, aporta pista y descarga QR que abre el aviso', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/search');
  await page.getByRole('button', { name: 'Crear aviso' }).click();
  await page.getByLabel('Tipo de aviso').selectOption('pet-lost');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Título breve').fill('Mascota ficticia para QR');
  await page.getByLabel('Descripción pública').fill('Mascota ficticia de pelaje café y collar verde. Datos sintéticos.');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Comuna del suceso').selectOption('10');
  await page.getByLabel('Fecha del suceso').fill('2026-01-01');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Contacto privado (opcional)').fill('CONTACTO_NO_PUBLICO_UI');
  await page.getByRole('button', { name: 'Revisar aviso' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa antes de publicar' })).toBeVisible();
  await page.getByLabel('Autorizo publicar estos datos').check();
  const publicationBodies: string[] = [];
  await page.route('**/api/search', async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    publicationBodies.push(route.request().postData() ?? '');
    const response = await route.fetch();
    await route.fulfill(publicationBodies.length === 1 ? { status: 503, json: { error: 'Confirmación perdida de publicación' } } : { response });
  });
  await page.getByRole('button', { name: 'Publicar aviso' }).click();
  await expect(page.locator('#contenido').getByRole('alert')).toContainText('Confirmación perdida');
  await page.getByRole('button', { name: 'Reintentar publicación' }).click();
  expect(publicationBodies).toHaveLength(2); expect(publicationBodies[0]).toBe(publicationBodies[1]);
  await expect(page.getByRole('heading', { name: 'Mascota ficticia para QR', exact: true })).toBeVisible();
  expect(page.url()).toMatch(/\/search\?id=/);
  await page.getByLabel('Tu pista privada').fill('Pista ficticia, sin información real.');
  await page.getByLabel('Autorizo almacenar esta pista').check();
  await page.getByRole('button', { name: 'Enviar pista privada' }).click();
  await expect(page.getByRole('status')).toContainText('Pista recibida');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar afiche PNG' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const png = PNG.sync.read(await readFile(path!));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded?.data).toBe(page.url());
  await page.goto(decoded!.data);
  await expect(page.getByRole('heading', { name: 'Mascota ficticia para QR', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
