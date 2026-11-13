import { test, expect } from '@playwright/test';

test.describe('T15 — Sesión en dispositivo compartido (Idea I005)', () => {
  test('limpia borradores previos y evita recordar campos sensibles en almacenamiento al escribir y recargar', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/report');

    // Escribir un borrador previo en modo normal (confirma hidratación y crea borrador en sessionStorage)
    await page.fill('#report-summary', 'Borrador anterior sensible en modo normal');
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('alzavoz_report_draft')))
      .not.toBeNull();

    // Simular también otras claves previas almacenadas antes de activar la sesión compartida
    await page.evaluate(() => {
      sessionStorage.setItem('alzavoz_recording_key', 'rec-previa.secreto');
      localStorage.setItem('alzavoz_draft', 'borrador-previo');
      localStorage.setItem('alzavoz_temp_audio', 'audio-previo');
    });

    const toggleBtn = page.getByTestId('toggle-shared-device-button');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Banner sticky y aviso contextual visibles
    await expect(page.getByTestId('shared-device-banner')).toBeVisible();
    await expect(page.getByTestId('shared-device-report-notice')).toBeVisible();

    // El almacenamiento previo sensible fue purgado de inmediato
    const storageAfterEnable = await page.evaluate(() => ({
      reportDraft: sessionStorage.getItem('alzavoz_report_draft'),
      recordingKey: sessionStorage.getItem('alzavoz_recording_key'),
      localDraft: localStorage.getItem('alzavoz_draft'),
      localAudio: localStorage.getItem('alzavoz_temp_audio'),
      sharedFlag: sessionStorage.getItem('alzavoz_shared_device'),
    }));
    expect(storageAfterEnable.reportDraft).toBeNull();
    expect(storageAfterEnable.recordingKey).toBeNull();
    expect(storageAfterEnable.localDraft).toBeNull();
    expect(storageAfterEnable.localAudio).toBeNull();
    expect(storageAfterEnable.sharedFlag).toBe('true');

    // Escribir datos sensibles en Paso 1
    await expect(page.locator('#report-neighborhood')).toHaveAttribute('autocomplete', 'off');
    await expect(page.locator('#report-date')).toHaveAttribute('autocomplete', 'off');
    await expect(page.locator('#report-summary')).toHaveAttribute('autocomplete', 'off');

    await page.fill('#report-neighborhood', 'Parque Lleras (teléfono prestado)');
    await page.fill('#report-date', 'Hoy 8:15 p. m.');
    await page.fill(
      '#report-summary',
      'Relato confidencial escrito desde el celular prestado de una vecina para no dejar rastro.'
    );

    // Avanzar al Paso 3 y escribir datos de contacto seguro
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();
    await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();
    await page.locator('#contact-pref-safe').click();
    await expect(page.locator('#safe-contact-value-input')).toHaveAttribute('autocomplete', 'off');
    await expect(page.locator('#safe-notes-textarea')).toHaveAttribute('autocomplete', 'off');
    await page.fill('#safe-contact-value-input', '+57 300 9998877');
    await page.fill('#safe-notes-textarea', 'Preguntar solo por alias Luisa');

    // Verificar que ningún borrador se guardó en sessionStorage ni localStorage
    const storageWhileTyping = await page.evaluate(() => ({
      reportDraft: sessionStorage.getItem('alzavoz_report_draft'),
      localReportDraft: localStorage.getItem('alzavoz_report_draft'),
      localDraft: localStorage.getItem('alzavoz_draft'),
    }));
    expect(storageWhileTyping.reportDraft).toBeNull();
    expect(storageWhileTyping.localReportDraft).toBeNull();
    expect(storageWhileTyping.localDraft).toBeNull();

    // Recargar la página y comprobar que no recuerda ningún campo sensible
    await page.reload();
    await expect(page.getByTestId('shared-device-banner')).toBeVisible();
    await expect(page.locator('#report-neighborhood')).toHaveValue('');
    await expect(page.locator('#report-date')).toHaveValue('');
    await expect(page.locator('#report-summary')).toHaveValue('');

    expect(consoleErrors).toEqual([]);
  });

  test('abrir otra pestaña mantiene el formulario y el almacenamiento libres de borradores', async ({
    context,
    page,
  }) => {
    await page.goto('/report');
    await page.getByTestId('toggle-shared-device-button').click();
    await page.fill('#report-neighborhood', 'Estación Acevedo');
    await page.fill('#report-summary', 'Contenido temporal en RAM que no debe aparecer en otra pestaña.');

    const secondTab = await context.newPage();
    await secondTab.goto('/report');

    await expect(secondTab.locator('#report-neighborhood')).toHaveValue('');
    await expect(secondTab.locator('#report-date')).toHaveValue('');
    await expect(secondTab.locator('#report-summary')).toHaveValue('');

    const secondTabStorage = await secondTab.evaluate(() => ({
      sessionDraft: sessionStorage.getItem('alzavoz_report_draft'),
      localDraft: localStorage.getItem('alzavoz_report_draft'),
      localLegacyDraft: localStorage.getItem('alzavoz_draft'),
    }));
    expect(secondTabStorage.sessionDraft).toBeNull();
    expect(secondTabStorage.localDraft).toBeNull();
    expect(secondTabStorage.localLegacyDraft).toBeNull();

    await secondTab.close();
  });

  test('salir y limpiar sesión borra los datos en pantalla, purga almacenamiento y explica qué registros externos permanecen', async ({
    page,
  }) => {
    await page.goto('/report');
    await page.getByTestId('toggle-shared-device-button').click();

    await page.fill('#report-neighborhood', 'Sector Estadio');
    await page.fill('#report-date', 'Ayer tarde');
    await page.fill(
      '#report-summary',
      'Descripción sensible en pantalla que debe eliminarse por completo al pulsar Salir y limpiar sesión.'
    );

    // Abrir guía informativa antes de salir
    await page.getByTestId('open-shared-device-info-button').click();
    const infoModal = page.getByTestId('shared-device-exit-modal');
    await expect(infoModal).toBeVisible();
    await expect(infoModal).toContainText('Qué no se guarda y qué puede quedar fuera');
    await page.getByTestId('close-shared-exit-modal-button').click();
    await expect(infoModal).toHaveCount(0);

    // Pulsar salir y limpiar sesión en el banner
    await page.getByTestId('exit-shared-session-button').click();

    // Debe abrir el modal de cierre con explicación de qué se borró y qué registros externos podrían permanecer
    const exitModal = page.getByTestId('shared-device-exit-modal');
    await expect(exitModal).toBeVisible();
    await expect(exitModal).toContainText('Borradores eliminados de esta aplicación');

    const clearedList = page.getByTestId('shared-exit-cleared-list');
    await expect(clearedList).toContainText('Relato de los hechos');
    await expect(clearedList).toContainText('sessionStorage');

    const externalList = page.getByTestId('shared-exit-external-records-list');
    await expect(externalList).toContainText('Historial y pestañas del navegador');
    await expect(externalList).toContainText('Descargas y galería');
    await expect(externalList).toContainText('Portapapeles y teclado');
    await expect(externalList).toContainText('WhatsApp y llamadas telefónicas');
    await expect(externalList).toContainText('bóveda (D1/R2)');

    // Cerrar el modal y confirmar que los campos y el storage quedaron vacíos y el banner se ocultó
    await page.getByTestId('close-shared-exit-modal-button').click();
    await expect(exitModal).toHaveCount(0);
    await expect(page.getByTestId('shared-device-banner')).toHaveCount(0);

    await expect(page.locator('#report-neighborhood')).toHaveValue('');
    await expect(page.locator('#report-date')).toHaveValue('');
    await expect(page.locator('#report-summary')).toHaveValue('');

    const storageAfterExit = await page.evaluate(() => ({
      sharedFlag: sessionStorage.getItem('alzavoz_shared_device'),
      reportDraft: sessionStorage.getItem('alzavoz_report_draft'),
      recordingKey: sessionStorage.getItem('alzavoz_recording_key'),
      localDraft: localStorage.getItem('alzavoz_draft'),
    }));
    expect(storageAfterExit.sharedFlag).toBeNull();
    expect(storageAfterExit.reportDraft).toBeNull();
    expect(storageAfterExit.recordingKey).toBeNull();
    expect(storageAfterExit.localDraft).toBeNull();
  });

  test('cumple Fitts Law (>=56px) y ausencia de desbordamiento horizontal en móvil y escritorio', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 320, height: 851 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/report');

      const toggleBtn = page.getByTestId('toggle-shared-device-button');
      const toggleBox = await toggleBtn.boundingBox();
      expect(toggleBox).not.toBeNull();
      expect(toggleBox!.height).toBeGreaterThanOrEqual(56);
      expect(toggleBox!.width).toBeGreaterThanOrEqual(56);

      await toggleBtn.click();
      await expect(page.getByTestId('shared-device-banner')).toBeVisible();

      const infoBtn = page.getByTestId('open-shared-device-info-button');
      const infoBox = await infoBtn.boundingBox();
      expect(infoBox).not.toBeNull();
      expect(infoBox!.height).toBeGreaterThanOrEqual(56);

      const exitBtn = page.getByTestId('exit-shared-session-button');
      const exitBox = await exitBtn.boundingBox();
      expect(exitBox).not.toBeNull();
      expect(exitBox!.height).toBeGreaterThanOrEqual(56);
      expect(exitBox!.width).toBeGreaterThanOrEqual(56);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `desbordamiento en /report con sesión compartida a ${viewport.width}px`).toBe(false);

      await exitBtn.click();
      const closeModalBtn = page.getByTestId('close-shared-exit-modal-button');
      await expect(closeModalBtn).toBeVisible();
      const closeModalBox = await closeModalBtn.boundingBox();
      expect(closeModalBox).not.toBeNull();
      expect(closeModalBox!.height).toBeGreaterThanOrEqual(56);
      await closeModalBtn.click();
    }
  });
});
