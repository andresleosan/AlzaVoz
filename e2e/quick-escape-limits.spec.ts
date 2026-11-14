import { test, expect } from '@playwright/test';

test.describe('T16 — Límites claros de la salida rápida (Idea I006)', () => {
  test('permite consultar antes de salir la diferencia entre ocultar, borrar locales y registros externos', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // 1. Consulta desde Inicio (/)
    await page.goto('/');
    await expect(page.locator('.guide-section')).toContainText(/solo desenfoca/i);
    await expect(page.locator('.guide-section')).toContainText(/no borra el historial/i);

    const homeBtn = page.getByTestId('open-escape-limits-home');
    await expect(homeBtn).toBeVisible();
    await homeBtn.click();

    const modal = page.getByTestId('quick-escape-limits-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('escape-limits-hide')).toContainText(/solo desenfoca visualmente/i);
    await expect(modal.getByTestId('escape-limits-hide')).toContainText(/No cifra ni borra/i);
    await expect(modal.getByTestId('escape-limits-local')).toContainText(/sessionStorage/i);
    await expect(modal.getByTestId('escape-limits-local')).toContainText(/solo la página actual/i);
    await expect(modal.getByTestId('escape-limits-external')).toContainText(/Botón Atrás e historial/i);
    await expect(modal.getByTestId('escape-limits-external')).toContainText(/alzavoz_trusted_contacts/i);

    // Ningún botón de salida debe prometer "sin dejar rastro en historial"
    const fullEscapeAria = await modal
      .getByRole('button', { name: /Salida Rápida/i })
      .getAttribute('aria-label');
    expect(fullEscapeAria).not.toMatch(/sin dejar rastro/i);

    // Cerrar con Escape devuelve el foco al disparador
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
    await expect(homeBtn).toBeFocused();

    // 2. Consulta desde /sos mediante el pie global antes de usar Salir Rápido
    await page.goto('/sos');
    const shellBtn = page.getByTestId('open-escape-limits-shell');
    await shellBtn.scrollIntoViewIfNeeded();
    await expect(shellBtn).toBeVisible();
    await shellBtn.click();
    await expect(modal).toBeVisible();
    await page.getByTestId('close-escape-limits-modal').click();
    await expect(modal).toHaveCount(0);

    // 3. Consulta desde /report en Paso 1 y explicación integrada en Paso 3
    await page.goto('/report');
    const reportBtn = page.getByTestId('open-escape-limits-report');
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();
    await expect(modal).toBeVisible();
    await page.getByTestId('close-escape-limits-modal').click();
    await expect(modal).toHaveCount(0);

    await page.fill('#report-summary', 'Relato de prueba para verificar los bloques en el Paso 3.');
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();
    await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();

    const explanation = page.getByTestId('quick-escape-explanation');
    await expect(explanation.getByTestId('escape-limits-hide')).toBeVisible();
    await expect(explanation.getByTestId('escape-limits-local')).toBeVisible();
    await expect(explanation.getByTestId('escape-limits-external')).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('contrasta Modo Antiespía: solo desenfoca visualmente sin cifrar ni borrar datos locales', async ({
    page,
  }) => {
    await page.goto('/report');
    await page.fill('#report-neighborhood', 'Parque Bolívar');
    await page.fill('#report-summary', 'Relato que debe seguir en almacenamiento tras activar el ojo.');

    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('alzavoz_report_draft')))
      .toContain('Relato que debe seguir');

    const peepToggle = page.locator('header button[title*="Antiespía"]');
    await peepToggle.click();
    await expect(peepToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#report-neighborhood')).toHaveCSS('filter', 'blur(8px)');

    // El almacenamiento y el texto en RAM siguen intactos
    const draftWithEyeOn = await page.evaluate(() => sessionStorage.getItem('alzavoz_report_draft'));
    expect(draftWithEyeOn).toContain('Parque Bolívar');
    expect(draftWithEyeOn).toContain('Relato que debe seguir');

    // Al recargar la página, Antiespía se desactiva y el texto reaparece sin haberse borrado
    await page.reload();
    await expect(page.locator('#report-neighborhood')).toHaveValue('Parque Bolívar');
    await expect(page.locator('#report-summary')).toHaveValue(
      'Relato que debe seguir en almacenamiento tras activar el ojo.'
    );
  });

  test('contrasta Salir Rápido con almacenamiento, contactos SOS y botón Atrás en visita directa y previa', async ({
    page,
  }) => {
    await page.route('https://www.google.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><head><title>Google Mock</title></head><body><h1>Google Mock</h1></body></html>',
      });
    });

    // Caso A: visita directa a /report -> Salir Rápido -> Atrás no vuelve a /report
    await page.goto('/report');
    await page.evaluate(() => {
      sessionStorage.setItem('alzavoz_report_draft', '{"summary":"directo"}');
      sessionStorage.setItem('alzavoz_recording_key', 'rec-1.secret');
      localStorage.setItem('alzavoz_draft', 'tmp');
    });

    await page.locator('header button[title*="Salida Rápida"]').locator('visible=true').click();
    await page.waitForURL('https://www.google.com/**');

    // La pestaña de prueba partía de about:blank -> /report; replace sustituye /report por Google,
    // por lo que Atrás nunca vuelve a /report.
    await page.goBack();
    expect(page.url()).not.toContain('/report');
    expect(page.url()).toBe('about:blank');

    // Caso B: navegación previa (/) -> (/report) -> Salir Rápido -> Atrás vuelve a (/) y verifica storage
    await page.goto('/');
    await page.locator('main a[href="/report"]').click();
    await page.waitForURL('**/report');

    await page.fill('#report-summary', 'Borrador confidencial escrito tras navegar desde inicio.');
    await page.evaluate(() => {
      sessionStorage.setItem('alzavoz_recording_key', 'rec-2.secret');
      sessionStorage.setItem('alzavoz_practice_mode', 'true');
      localStorage.setItem('alzavoz_report_draft', '{"summary":"legacy"}');
      localStorage.setItem('alzavoz_draft', 'draft-legacy');
      localStorage.setItem('alzavoz_temp_audio', 'audio-legacy');
      localStorage.setItem('alzavoz_sos_active', '1');
      localStorage.setItem(
        'alzavoz_trusted_contacts',
        JSON.stringify([
          {
            id: 'contact-sister',
            name: 'Hermana Prueba',
            phone: '+573001112233',
            relationship: 'Familia',
            createdAt: 1,
          },
        ])
      );
    });

    await page.locator('header button[title*="Salida Rápida"]').locator('visible=true').click();
    await page.waitForURL('https://www.google.com/**');

    // Al pulsar Atrás desde Google, la entrada /report fue reemplazada, pero Inicio (/) sí permanece
    await page.goBack();
    await expect(page).toHaveURL(/http:\/\/127\.0\.0\.1:3000\/?$/);

    const storageAfterEscape = await page.evaluate(() => ({
      sessionLength: sessionStorage.length,
      localReportDraft: localStorage.getItem('alzavoz_report_draft'),
      localDraft: localStorage.getItem('alzavoz_draft'),
      localTempAudio: localStorage.getItem('alzavoz_temp_audio'),
      localSosActive: localStorage.getItem('alzavoz_sos_active'),
      trustedContacts: localStorage.getItem('alzavoz_trusted_contacts'),
    }));

    expect(storageAfterEscape.sessionLength).toBe(0);
    expect(storageAfterEscape.localReportDraft).toBeNull();
    expect(storageAfterEscape.localDraft).toBeNull();
    expect(storageAfterEscape.localTempAudio).toBeNull();
    expect(storageAfterEscape.localSosActive).toBeNull();
    expect(storageAfterEscape.trustedContacts).toContain('Hermana Prueba');

    // Al ir Adelante vuelve a Google Mock, nunca a /report
    await page.goForward();
    await page.waitForURL('https://www.google.com/**');
  });

  test('detiene captura activa en /record al pulsar Salir Rápido', async ({ page }) => {
    await page.route('https://www.google.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><head><title>Google Mock</title></head><body>Google Mock</body></html>',
      });
    });

    await page.goto('/record');
    await page.getByRole('button', { name: 'Iniciar grabación', exact: true }).click();
    await expect(page.getByTestId('media-capture-active-banner')).toBeVisible();
    await expect(page.getByTestId('media-capture-active-banner')).toContainText('Cámara y micrófono activos');
    await expect(page.locator('video[aria-label="Vista de la cámara"]')).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const video = document.querySelector('video') as HTMLVideoElement | null;
          const stream = video?.srcObject as MediaStream | null;
          return stream ? stream.getTracks().filter((t) => t.readyState === 'live').length : 0;
        })
      )
      .toBeGreaterThan(0);

    let tracksEndedOnEscape = false;
    page.on('console', (msg) => {
      if (msg.text() === 'ESCAPE_TRACKS_ENDED:true') {
        tracksEndedOnEscape = true;
      }
    });

    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      const stream = video?.srcObject as MediaStream | null;
      const hadLive = Boolean(stream && stream.getTracks().some((t) => t.readyState === 'live'));
      window.addEventListener('alzavoz:escape', () => {
        const allEnded = Boolean(hadLive && stream && stream.getTracks().every((t) => t.readyState === 'ended'));
        console.info(`ESCAPE_TRACKS_ENDED:${allEnded}`);
      });
    });

    await page.locator('header button[title*="Salida Rápida"]').locator('visible=true').click();
    await page.waitForURL('https://www.google.com/**');
    await expect.poll(() => tracksEndedOnEscape).toBe(true);
  });

  test('cumple Fitts Law (>=56px) y cero desbordamiento en 320px, 390px y 1440px', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 320, height: 851 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);

      await page.goto('/');
      const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(homeOverflow, `desbordamiento en / a ${viewport.width}px`).toBe(false);

      const homeBtn = page.getByTestId('open-escape-limits-home');
      const homeBox = await homeBtn.boundingBox();
      expect(homeBox).not.toBeNull();
      expect(homeBox!.height).toBeGreaterThanOrEqual(56);
      expect(homeBox!.width).toBeGreaterThanOrEqual(56);

      const footerBtn = page.getByTestId('open-escape-limits-shell');
      const footerBox = await footerBtn.boundingBox();
      expect(footerBox).not.toBeNull();
      expect(footerBox!.height).toBeGreaterThanOrEqual(56);
      expect(footerBox!.width).toBeGreaterThanOrEqual(56);

      if (viewport.width >= 1024) {
        const sidebarBtn = page.getByTestId('open-escape-limits-sidebar');
        const sidebarBox = await sidebarBtn.boundingBox();
        expect(sidebarBox).not.toBeNull();
        expect(sidebarBox!.height).toBeGreaterThanOrEqual(56);
      }

      await homeBtn.click();
      const closeModalBtn = page.getByTestId('close-escape-limits-modal');
      await expect(closeModalBtn).toBeVisible();
      const closeBox = await closeModalBtn.boundingBox();
      expect(closeBox).not.toBeNull();
      expect(closeBox!.height).toBeGreaterThanOrEqual(56);

      const modalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(modalOverflow, `desbordamiento con modal abierto a ${viewport.width}px`).toBe(false);
      await closeModalBtn.click();

      await page.goto('/report');
      const reportOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(reportOverflow, `desbordamiento en /report a ${viewport.width}px`).toBe(false);
      const reportBtn = page.getByTestId('open-escape-limits-report');
      const reportBox = await reportBtn.boundingBox();
      expect(reportBox).not.toBeNull();
      expect(reportBox!.height).toBeGreaterThanOrEqual(56);
    }
  });
});
