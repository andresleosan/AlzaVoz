import { test, expect } from '@playwright/test';

const validPngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

test.describe('T19 — Revisar acciones difíciles de deshacer (Idea I009)', () => {
  test('en /record exige revisar sesión y consecuencias antes de descartar grabación; cancelar conserva clave y clips', async ({
    context,
    page,
  }) => {
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    } catch {
      // Clipboard permissions may vary by runtime.
    }

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/record');
    // Iniciar y detener grabación sigue siendo de un solo toque sin modal previo
    await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
    await expect(page.getByTestId('confirm-action-dialog')).toHaveCount(0);
    await expect(page.getByText('Cámara y micrófono activos', { exact: true })).toBeVisible();
    await expect(page.getByTestId('received-count')).toHaveText('1', { timeout: 15000 });

    await page.getByRole('button', { name: 'Detener grabación', exact: true }).click();
    await expect(page.getByText('Captura detenida', { exact: true })).toBeVisible();
    const resetBtn = page.getByRole('button', { name: /Nueva grabación/ });
    await expect(resetBtn).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('pending-count')).toHaveText('0');
    const receivedBeforeDialog = await page.getByTestId('received-count').innerText();

    const keyInput = page.getByLabel('Clave de recuperación', { exact: true });
    const recoveryKey = await keyInput.inputValue();
    expect(recoveryKey).toContain('.');
    const storedKeyBefore = await page.evaluate(() => sessionStorage.getItem('alzavoz_recording_key'));
    expect(storedKeyBefore).toBe(recoveryKey);

    await resetBtn.click();

    // Debe abrir revisión específica con foco inicial en Cancelar, elemento y consecuencia
    const dialog = page.getByTestId('confirm-action-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-tone', 'danger');
    await expect(dialog.getByRole('heading', { name: /Revisar antes de descartar/ })).toBeVisible();
    await expect(dialog.getByTestId('confirm-action-details')).toContainText(recoveryKey.split('.')[0].slice(0, 12));
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('confirmadas en R2');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('Aún no pulsaste');
    await expect(dialog.getByTestId('confirm-action-consequence')).toContainText('sessionStorage');
    await expect(dialog.getByTestId('confirm-action-consequence')).toContainText('no podrás volver a abrirlo');

    const cancelBtn = dialog.getByTestId('confirm-action-cancel');
    await expect(cancelBtn).toBeFocused();

    // Copiar clave directamente desde la revisión actualiza estado dentro del modal
    await dialog.getByTestId('copy-key-before-reset-btn').click();
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('Copiada en esta sesión');

    // Cancelar con Escape conserva intactos clave, clips y almacenamiento
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(resetBtn).toBeFocused();
    await expect(keyInput).toHaveValue(recoveryKey);
    await expect(page.getByTestId('received-count')).toHaveText(receivedBeforeDialog);
    expect(await page.evaluate(() => sessionStorage.getItem('alzavoz_recording_key'))).toBe(recoveryKey);

    // Cancelar con clic en el botón también conserva el estado
    await resetBtn.click();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('confirm-action-cancel').click();
    await expect(dialog).toHaveCount(0);
    await expect(keyInput).toHaveValue(recoveryKey);
    expect(await page.evaluate(() => sessionStorage.getItem('alzavoz_recording_key'))).toBe(recoveryKey);

    // Confirmar limpia la sesión local y la clave en sessionStorage
    await resetBtn.click();
    await dialog.getByTestId('confirm-action-submit').click();
    await expect(dialog).toHaveCount(0);
    await expect(keyInput).toHaveCount(0);
    await expect(page.getByTestId('received-count')).toHaveText('0');
    await expect(page.getByRole('button', { name: 'Iniciar grabación', exact: true })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('alzavoz_recording_key'))).toBeNull();

    expect(consoleErrors).toEqual([]);
  });

  test('en /report Paso 2 exige revisar archivo y consecuencia antes de eliminar evidencia, y Paso 3 permite exclusión reversible', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/report');
    await page.fill('#report-summary', 'Relato sintético de prueba para verificar confirmación de borrado de evidencia.');
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();

    await page.setInputFiles('#report-file-input', {
      name: 'foto-evidencia.png',
      mimeType: 'image/png',
      buffer: validPngBytes,
    });
    await expect(page.getByTestId('sanitized-attachment-item')).toHaveCount(1);

    await page.getByRole('button', { name: /Generar audio de prueba/i }).click();
    await expect(page.getByTestId('sanitized-attachment-item')).toHaveCount(2);

    const firstItem = page.getByTestId('sanitized-attachment-item').first();
    const secondItem = page.getByTestId('sanitized-attachment-item').nth(1);
    await expect(firstItem).toContainText('evidencia-limpia-1.png');
    await expect(secondItem).toContainText('nota-voz-modulada-2.wav');

    // En Paso 3, retirar de la vista previa no destruye la evidencia del Paso 2 y es reversible
    await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();
    const previewCard = page.getByTestId('report-share-preview-card');
    await previewCard.locator('button[data-testid^="remove-attachment-preview-"]').first().click();
    await expect(previewCard).toContainText('Archivos y evidencias a transmitir (1)');
    await expect(previewCard.getByTestId('excluded-preview-attachments')).toBeVisible();
    await previewCard.locator('button[data-testid^="restore-attachment-preview-"]').first().click();
    await expect(previewCard).toContainText('Archivos y evidencias a transmitir (2)');

    // Volver al Paso 2 para probar eliminación definitiva con confirmación
    await page.getByRole('button', { name: /2\. Evidencias/ }).click();
    await expect(page.getByTestId('sanitized-attachment-item')).toHaveCount(2);

    const removeAudioBtn = secondItem.locator('button[data-testid^="remove-evidence-file-"]');
    await removeAudioBtn.click();

    const dialog = page.getByTestId('confirm-action-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-tone', 'danger');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('nota-voz-modulada-2.wav');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('audio/wav');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('SHA-256');
    await expect(dialog.getByTestId('confirm-action-consequence')).toContainText('no se podrá recuperar');

    // Cancelar conserva ambas evidencias intactas
    await dialog.getByTestId('confirm-action-cancel').click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('sanitized-attachment-item')).toHaveCount(2);

    // Confirmar elimina únicamente la evidencia elegida
    await removeAudioBtn.click();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('confirm-action-submit').click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('sanitized-attachment-item')).toHaveCount(1);
    await expect(page.getByTestId('sanitized-attachment-item').first()).toContainText('evidencia-limpia-1.png');

    expect(consoleErrors).toEqual([]);
  });

  test('en /search exige revisar aviso y consecuencias públicas antes de publicar; cancelar conserva formulario y 0 POSTs', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const postBodies: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/search') && req.method() === 'POST') {
        postBodies.push(req.postData() ?? '');
      }
    });

    await page.goto('/search');
    await page.getByRole('button', { name: 'Crear aviso' }).click();
    await page.getByLabel('Tipo de aviso').selectOption('pet-lost');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.getByLabel('Título breve').fill('Gato gris ficticio T19');
    await page.getByLabel('Descripción pública').fill('Dato de prueba sintético para validar confirmación antes de publicar.');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.getByLabel('Comuna del suceso').selectOption('11');
    await page.getByLabel('Fecha del suceso').fill('2026-02-15');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.getByLabel('Contacto privado (opcional)').fill('CONTACTO_PRIVADO_T19');
    await page.getByRole('button', { name: 'Revisar aviso' }).click();
    await page.getByLabel('Autorizo publicar estos datos').check();

    await page.getByRole('button', { name: 'Publicar aviso' }).click();

    const dialog = page.getByTestId('confirm-action-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-tone', 'publish');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('Gato gris ficticio T19');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('Comuna 11');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('no aparece en el tablero');
    await expect(dialog.getByTestId('confirm-action-consequence')).toContainText('cualquier persona podrá ver este aviso');
    await expect(dialog.getByTestId('confirm-action-consequence')).toContainText('no podrás editarlo ni eliminarlo');
    // El valor del contacto privado no se expone en el diálogo público
    await expect(dialog).not.toContainText('CONTACTO_PRIVADO_T19');

    // Cancelar conserva formulario, consentimiento y produce 0 POSTs
    await dialog.getByTestId('confirm-action-cancel').click();
    await expect(dialog).toHaveCount(0);
    expect(postBodies).toHaveLength(0);
    await expect(page.getByRole('heading', { name: 'Revisa antes de publicar' })).toBeVisible();
    await expect(page.getByLabel('Autorizo publicar estos datos')).toBeChecked();

    // Confirmar publica el aviso en D1 y lo muestra en su URL pública
    await page.getByRole('button', { name: 'Publicar aviso' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('confirm-action-submit').click();
    await expect(dialog).toHaveCount(0);
    expect(postBodies).toHaveLength(1);
    await expect(page.getByRole('heading', { name: 'Gato gris ficticio T19', exact: true })).toBeVisible();
    expect(page.url()).toMatch(/\/search\?id=/);

    expect(consoleErrors).toEqual([]);
  });

  test('en /community exige revisar comuna, categoría y consecuencia pública antes de compartir; cancelar conserva medición', async ({
    page,
    request,
  }) => {
    test.setTimeout(45000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const beforeRes = await request.get('/api/community');
    const beforeData = (await beforeRes.json()) as { groups: Array<{ commune: number; category: string; count: number }> };
    const initialCount =
      beforeData.groups.find((g) => g.commune === 12 && g.category === 'traffic')?.count ?? 0;

    const posts: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/community') && req.method() === 'POST') {
        posts.push(req.postData() ?? '');
      }
    });

    await page.goto('/community');
    await page.getByRole('button', { name: 'Observar 15 segundos' }).click();
    await expect(page.getByText('Observación completa · Micrófono apagado')).toBeVisible({ timeout: 22000 });

    await page.getByLabel('Comuna elegida').selectOption('12');
    await page.getByLabel('Categoría del ruido').selectOption('traffic');
    await page.getByRole('button', { name: 'Compartir observación' }).click();

    const dialog = page.getByTestId('confirm-action-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-tone', 'publish');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('Comuna 12 - La América');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('Tránsito');
    await expect(dialog.getByTestId('confirm-action-details')).toContainText('No se envía audio');
    await expect(dialog.getByTestId('confirm-action-consequence')).toContainText('conteo público');
    await expect(dialog.getByTestId('confirm-action-consequence')).toContainText('No podrás retirarlo');

    // Cancelar conserva la observación local, la selección y emite 0 POSTs
    await dialog.getByTestId('confirm-action-cancel').click();
    await expect(dialog).toHaveCount(0);
    expect(posts).toHaveLength(0);
    await expect(page.getByLabel('Comuna elegida')).toHaveValue('12');
    await expect(page.getByLabel('Categoría del ruido')).toHaveValue('traffic');
    await expect(page.getByRole('button', { name: 'Compartir observación' })).toBeVisible();

    // Confirmar publica y actualiza el agregado en D1
    await page.getByRole('button', { name: 'Compartir observación' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('confirm-action-submit').click();
    await expect(page.getByText('Observación recibida.', { exact: false })).toBeVisible();
    expect(posts).toHaveLength(1);

    const afterRes = await request.get('/api/community');
    const afterData = (await afterRes.json()) as { groups: Array<{ commune: number; category: string; count: number }> };
    const nextCount =
      afterData.groups.find((g) => g.commune === 12 && g.category === 'traffic')?.count ?? 0;
    expect(nextCount).toBe(initialCount + 1);

    expect(consoleErrors).toEqual([]);
  });

  test('regresión SOS y acciones urgentes: acceso rápido sin fricción adicional', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.type());
      await d.accept();
    });

    await page.goto('/sos');
    const heroSos = page.locator('a[aria-label="Llamar a Emergencias Policía 123 ahora"]');
    await expect(heroSos).toBeVisible();
    await expect(heroSos).toHaveAttribute('href', 'tel:123');

    const silentWa = page.locator('a:has-text("Alerta Silenciosa WhatsApp")');
    await expect(silentWa).toBeVisible();
    await expect(silentWa).toHaveAttribute('href', /https:\/\/wa\.me\/573234306794\?text=/);

    const dialerSection = page.locator('section[aria-label="Marcación Telefónica Directa de Emergencia"]');
    await expect(dialerSection.locator('a[href="tel:155"]')).toBeVisible();
    await expect(dialerSection.locator('a[href="tel:125"]')).toBeVisible();
    await expect(dialerSection.locator('a[href="tel:119"]')).toBeVisible();

    // Salir Rápido sigue siendo inmediato con 1 toque sin diálogo de confirmación
    await page.route('https://www.google.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body><h1>Salida Inmediata OK</h1></body></html>',
      });
    });

    await page.locator('header button[title*="Salida Rápida"]').locator('visible=true').click();
    await expect(page.getByTestId('confirm-action-dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Salida Inmediata OK' })).toBeVisible();
    expect(dialogs).toEqual([]);
  });

  test('cumple Fitts Law (>=56px), Antiespía y cero desbordamiento en 320px, 390px y 1440px', async ({ page }) => {
    await page.goto('/report');
    await page.fill('#report-summary', 'Relato de prueba para verificar tamaño táctil y desenfoque del modal.');
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();
    await page.setInputFiles('#report-file-input', {
      name: 'prueba-ui.png',
      mimeType: 'image/png',
      buffer: validPngBytes,
    });
    await expect(page.getByTestId('sanitized-attachment-item')).toHaveCount(1);

    // Activar Antiespía antes de abrir el modal de confirmación
    const peepToggle = page.locator('header button[title*="Antiespía"]');
    await peepToggle.click();
    await expect(peepToggle).toHaveAttribute('aria-pressed', 'true');

    for (const viewport of [
      { width: 320, height: 851 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.locator('button[data-testid^="remove-evidence-file-"]').first().click();

      const dialog = page.getByTestId('confirm-action-dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('[data-sensitive="true"]').first()).toHaveCSS('filter', 'blur(8px)');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `desbordamiento con modal abierto a ${viewport.width}px`).toBe(false);

      for (const testId of ['confirm-action-cancel', 'confirm-action-submit', 'confirm-action-close']) {
        const box = await dialog.getByTestId(testId).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(56);
        expect(box!.width).toBeGreaterThanOrEqual(56);
      }

      await dialog.getByTestId('confirm-action-cancel').click();
      await expect(dialog).toHaveCount(0);
    }
  });
});
