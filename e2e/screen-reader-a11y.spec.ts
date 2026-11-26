import { test, expect, type Page } from '@playwright/test';
import {
  createSyntheticAdminToken,
  clearTestKeys,
} from '../src/lib/admin/auth';

interface StructuralAuditResult {
  title: string;
  mainCount: number;
  h1Count: number;
  headings: Array<{ level: number; text: string }>;
  headingSkips: string[];
  asideIssues: string[];
  unnamedControls: string[];
}

async function auditPageStructure(page: Page): Promise<StructuralAuditResult> {
  return page.evaluate(() => {
    const isVisible = (el: Element): boolean => {
      if (!(el instanceof HTMLElement || el instanceof SVGElement)) return false;
      if (el.closest('[aria-hidden="true"]')) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (el instanceof HTMLElement && el.classList.contains('sr-only')) return true;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    };

    const mainElements = Array.from(document.querySelectorAll('main')).filter(isVisible);

    const headingElements = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ).filter(isVisible);
    const headings = headingElements.map((el) => ({
      level: Number(el.tagName.slice(1)),
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
    }));

    const headingSkips: string[] = [];
    let prevLevel = 0;
    for (const h of headings) {
      if (prevLevel === 0 && h.level !== 1) {
        headingSkips.push(`Primer encabezado h${h.level} (${h.text})`);
      } else if (prevLevel > 0 && h.level > prevLevel + 1) {
        headingSkips.push(`Salto h${prevLevel} -> h${h.level} (${h.text})`);
      }
      prevLevel = h.level;
    }

    const asides = Array.from(document.querySelectorAll('aside')).filter(isVisible);
    const asideLabels: string[] = [];
    const asideIssues: string[] = [];
    for (const aside of asides) {
      const ariaLabel = aside.getAttribute('aria-label')?.trim() ?? '';
      const labelledBy = aside.getAttribute('aria-labelledby')?.trim() ?? '';
      const resolved =
        ariaLabel ||
        (labelledBy ? document.getElementById(labelledBy)?.textContent?.trim() ?? '' : '');
      if (asides.length > 1 && !resolved) {
        asideIssues.push('Landmark <aside> sin nombre único cuando hay múltiples asides');
      }
      if (resolved) {
        if (asideLabels.includes(resolved)) {
          asideIssues.push(`Landmark <aside> duplicado: "${resolved}"`);
        }
        asideLabels.push(resolved);
      }
    }

    const getControlLabel = (el: HTMLElement): string => {
      const ariaLabel = el.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;
      const labelledBy = el.getAttribute('aria-labelledby')?.trim();
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .join(' ')
          .trim();
        if (text) return text;
      }
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement
      ) {
        const id = el.getAttribute('id');
        if (id) {
          const explicitLabel = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          const labelText = explicitLabel?.textContent?.replace(/\s+/g, ' ').trim();
          if (labelText) return labelText;
        }
        const wrappingLabel = el.closest('label')?.textContent?.replace(/\s+/g, ' ').trim();
        if (wrappingLabel) return wrappingLabel;
      }
      const imgAlt = Array.from(el.querySelectorAll('img[alt]'))
        .map((img) => img.getAttribute('alt')?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
      const text = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const combined = [text, imgAlt].filter(Boolean).join(' ').trim();
      if (combined) return combined;
      return el.getAttribute('title')?.trim() ?? '';
    };

    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a[href], input:not([type="hidden"]), select, textarea, summary'
      )
    ).filter((el) => {
      if (el.closest('[aria-hidden="true"]')) return false;
      if (el instanceof HTMLInputElement && el.type === 'file' && el.classList.contains('sr-only')) {
        return true;
      }
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    const unnamedControls: string[] = [];
    for (const ctrl of interactive) {
      if (!getControlLabel(ctrl)) {
        unnamedControls.push(
          `${ctrl.tagName.toLowerCase()}#${ctrl.id || ctrl.getAttribute('data-testid') || 'sin-id'}`
        );
      }
    }

    return {
      title: document.title.trim(),
      mainCount: mainElements.length,
      h1Count: headings.filter((h) => h.level === 1).length,
      headings,
      headingSkips,
      asideIssues,
      unnamedControls,
    };
  });
}

test.describe('T21 — Recorrido completo con lector de pantalla y teclado (Idea I011)', () => {
  test.afterAll(() => {
    clearTestKeys();
  });

  test('1. Auditoría estructural: títulos únicos, 1 main, 1 h1, jerarquía continua, nombres accesibles y skip link', async ({
    page,
  }) => {
    const routes = [
      '/',
      '/sos',
      '/report',
      '/defender',
      '/record',
      '/community',
      '/search',
      '/device-check',
      '/admin',
    ];
    const titles: string[] = [];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
      const audit = await auditPageStructure(page);
      titles.push(audit.title);

      expect(audit.title, `título vacío en ${route}`).not.toBe('');
      expect(audit.mainCount, `cantidad de <main> en ${route}`).toBe(1);
      expect(audit.h1Count, `cantidad de <h1> en ${route}`).toBe(1);
      expect(audit.headingSkips, `saltos de encabezados en ${route}`).toEqual([]);
      expect(audit.asideIssues, `landmarks <aside> en ${route}`).toEqual([]);
      expect(audit.unnamedControls, `controles sin nombre en ${route}`).toEqual([]);
    }

    expect(new Set(titles).size, `títulos repetidos entre rutas: ${titles.join(' | ')}`).toBe(
      routes.length
    );

    // Verificar árbol accesible en Inicio y skip link funcional con teclado
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('complementary', { name: 'Navegación lateral' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Orientación y contacto' })).toBeVisible();

    const navSnapshot = await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .ariaSnapshot();
    expect(navSnapshot).toContain('link "Inicio"');
    expect(navSnapshot).toContain('link "SOS"');
    expect(navSnapshot).toContain('link "Retén"');
    expect(navSnapshot).toContain('link "Grabar"');

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Ir al contenido' });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#contenido')).toBeFocused();
  });

  test('2. Recorrido completo /sos con teclado, validaciones, estados sin color, live regions y SosSharePreviewModal', async ({
    context,
    page,
  }) => {
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    } catch {
      // Clipboard permissions may vary by runtime.
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/sos');

    // Toggle Modo Antiespía mantiene nombre con texto visible, alterna aria-pressed y anuncia en vivo
    const antiespia = page.getByRole('button', { name: /modo antiespía/i });
    await expect(antiespia).toHaveAttribute('aria-pressed', 'false');
    await antiespia.click();
    await expect(antiespia).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('app-live-announcer')).toContainText(
      'Modo antiespía activado'
    );
    await antiespia.click();
    await expect(antiespia).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('app-live-announcer')).toContainText(
      'Modo antiespía desactivado'
    );

    // Selector manual de comunas anuncia cambio y marca aria-pressed
    const zoneBtn = page.getByRole('button', { name: 'Cambiar comuna manualmente' });
    await zoneBtn.click();
    const pobladoBtn = page.getByRole('button', { name: /Comuna 14 - El Poblado/i });
    await pobladoBtn.click();
    await expect(page.getByTestId('sos-location-live-status')).toContainText(
      'Ubicación actualizada a Comuna 14 - El Poblado.'
    );
    await zoneBtn.click();
    await expect(page.getByRole('button', { name: /Comuna 14 - El Poblado/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await zoneBtn.click();

    // Editor manual de ubicación: foco inicial, error accesible con foco en campo y retorno de foco al guardar
    const manualToggle = page.getByTestId('sos-manual-correction-toggle');
    await manualToggle.click();
    await expect(page.locator('#sos-manual-commune')).toBeFocused();

    await page.selectOption('#sos-manual-commune', '');
    await page.fill('#sos-manual-neighborhood', '');
    await page.fill('#sos-manual-address', '');
    await page.getByTestId('sos-manual-correction-save').click();
    const manualAlert = page.locator('#sos-manual-error');
    await expect(manualAlert).toHaveAttribute('role', 'alert');
    await expect(page.locator('#sos-manual-address')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#sos-manual-address')).toHaveAttribute(
      'aria-describedby',
      'sos-manual-error'
    );
    await expect(page.locator('#sos-manual-address')).toBeFocused();

    await page.fill('#sos-manual-address', 'Calle 10 con Carrera 43A');
    await page.getByTestId('sos-manual-correction-save').click();
    await expect(page.getByTestId('sos-location-live-status')).toContainText(
      'Ubicación corregida manualmente.'
    );
    await expect(manualToggle).toBeFocused();

    // Contactos de confianza: error en nombre y celular con foco, luego alta y eliminación anunciadas
    const addContactToggle = page.getByRole('button', {
      name: 'Agregar nuevo contacto de confianza',
    });
    await addContactToggle.click();
    await expect(page.locator('#contact-name')).toBeFocused();

    await page.getByRole('button', { name: 'Guardar Contacto de Confianza' }).click();
    const contactError = page.locator('#trusted-contact-form-error');
    await expect(contactError).toHaveAttribute('role', 'alert');
    await expect(page.locator('#contact-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#contact-name')).toBeFocused();

    await page.fill('#contact-name', 'Red Familiar Prueba');
    await page.fill('#contact-phone', '123');
    await page.getByRole('button', { name: 'Guardar Contacto de Confianza' }).click();
    await expect(page.locator('#contact-phone')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#contact-phone')).toBeFocused();

    await page.fill('#contact-phone', '3105556677');
    await page.getByRole('button', { name: 'Guardar Contacto de Confianza' }).click();
    await expect(page.getByTestId('trusted-contacts-live-status')).toContainText(
      'Contacto guardado en tu red de confianza.'
    );
    await expect(addContactToggle).toBeFocused();

    await page.getByRole('button', { name: 'Eliminar contacto Red Familiar Prueba' }).click();
    await expect(page.getByTestId('trusted-contacts-live-status')).toContainText(
      'Contacto eliminado de tu red de confianza.'
    );

    // SosSharePreviewModal: trampa de Tab/Shift+Tab, ariaSnapshot, aria-pressed, alerta sin destinatarios y Escape
    const previewOpenBtn = page.getByTestId('btn-open-sos-preview');
    await previewOpenBtn.focus();
    await previewOpenBtn.click();

    const dialog = page.getByTestId('sos-share-preview-dialog');
    await expect(dialog).toBeVisible();
    const dialogSnapshot = await dialog.ariaSnapshot();
    expect(dialogSnapshot).toContain('heading "Vista previa de lo que se comparte"');
    expect(dialogSnapshot).toContain('group "Precisión de ubicación a compartir"');

    const closeBtn = dialog.getByRole('button', { name: 'Cerrar vista previa sin enviar' });
    await expect(closeBtn).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByTestId('sos-preview-confirm-btn')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeBtn).toBeFocused();

    const approxBtn = dialog.getByTestId('precision-approximate-btn');
    await approxBtn.click();
    await expect(approxBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByTestId('sos-preview-live-status')).toContainText('Solo Barrio');

    const recipientButtons = dialog.locator('[data-testid^="recipient-toggle-"]');
    const recipientCount = await recipientButtons.count();
    expect(recipientCount).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < recipientCount; i++) {
      const btn = recipientButtons.nth(i);
      if ((await btn.getAttribute('aria-pressed')) === 'true') {
        await btn.click();
      }
      await expect(btn).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(dialog.locator('#sos-preview-no-recipients-error')).toHaveAttribute(
      'role',
      'alert'
    );
    await expect(dialog.getByTestId('sos-preview-confirm-btn')).toBeDisabled();
    await expect(dialog.getByTestId('sos-preview-confirm-btn')).toHaveAttribute(
      'aria-describedby',
      'sos-preview-no-recipients-error'
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(previewOpenBtn).toBeFocused();
  });

  test('3. Recorrido completo /report: pasos con foco/anuncio, validación, evidencias, vista previa y modal de práctica', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/report');

    // Paso 1: relato insuficiente enfoca #report-summary y marca aria-invalid + aria-describedby
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();
    const formError = page.locator('#report-form-error');
    await expect(formError).toHaveAttribute('role', 'alert');
    await expect(page.locator('#report-summary')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#report-summary')).toHaveAttribute(
      'aria-describedby',
      /report-form-error/
    );
    await expect(page.locator('#report-summary')).toBeFocused();

    await page.fill(
      '#report-summary',
      'Relato de prueba accesible para validar pasos, evidencias y envío en práctica.'
    );
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();

    // Paso 2: encabezado enfocado, aria-current="step" y nombres únicos por archivo
    await expect(page.getByRole('button', { name: /2\. Evidencias/ })).toHaveAttribute(
      'aria-current',
      'step'
    );
    const step2Heading = page.getByRole('heading', {
      name: 'Paso 2: Evidencias limpias y protección de voz',
    });
    await expect(step2Heading).toBeFocused();
    await expect(page.getByTestId('report-step-live-status')).toContainText('Paso 2 de 3');

    await page.getByRole('button', { name: /Generar audio de prueba/i }).click();
    await expect(
      page.getByRole('link', { name: /Descargar copia limpia de nota-voz-modulada-1\.wav/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Retirar archivo nota-voz-modulada-1\.wav/i })
    ).toBeVisible();

    // Paso 3: transición, aria-pressed, exclusión reversible sin perder foco y validaciones
    await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();
    await expect(page.getByRole('button', { name: '3. Privacidad y envío' })).toHaveAttribute(
      'aria-current',
      'step'
    );
    await expect(
      page.getByRole('heading', { name: 'Paso 3: Contacto seguro, vista previa y envío' })
    ).toBeFocused();
    await expect(page.getByTestId('report-step-live-status')).toContainText('Paso 3 de 3');

    await expect(page.locator('#contact-pref-none')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('report-precision-full-btn')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.getByRole('button', { name: /Retirar evidencia .* de este envío/i }).click();
    await expect(page.getByTestId('report-step-live-status')).toContainText(
      'apartada de este envío'
    );
    const restoreBtn = page.getByRole('button', { name: /Volver a incluir nota-voz-modulada-1\.wav/i });
    await expect(restoreBtn).toBeFocused();
    await restoreBtn.click();
    await expect(page.getByTestId('report-step-live-status')).toContainText(
      'incluida nuevamente'
    );
    await expect(
      page.getByRole('button', { name: /Retirar evidencia .* de este envío/i })
    ).toBeFocused();

    // Validación de contacto seguro vacío y luego casilla de privacidad sin marcar
    await page.locator('#contact-pref-safe').click();
    await expect(page.locator('#contact-pref-safe')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Radicar denuncia en bóveda D1' }).click();
    await expect(page.locator('#safe-contact-value-input')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#safe-contact-value-input')).toBeFocused();

    await page.locator('#contact-pref-none').click();
    await page.getByRole('button', { name: 'Radicar denuncia en bóveda D1' }).click();
    await expect(page.locator('#report-privacy-ack')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#report-privacy-ack')).toBeFocused();

    // Modo práctica: trampa de teclado en PracticeSimulationModal y foco en el recibo al cerrar
    await page.getByTestId('toggle-practice-mode-button').click();
    await expect(page.getByTestId('app-live-announcer')).toContainText(
      'Modo de práctica activado'
    );
    await page.locator('#report-privacy-ack').check();
    await page.getByRole('button', { name: 'Radicar en modo práctica (Sin envíos)' }).click();

    const simModal = page.getByTestId('practice-simulation-modal');
    await expect(simModal).toBeVisible();
    const simClose = simModal.getByTestId('close-simulation-modal-button');
    await expect(simClose).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(simModal.getByRole('button', { name: 'Cerrar ventana de simulación' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(simClose).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(simModal).toHaveCount(0);
    await expect(page.getByTestId('report-receipt-heading')).toBeFocused();
  });

  test('4. Modales globales (QuickEscapeLimits y SharedDeviceExit) atrapan Tab/Shift+Tab y restauran foco', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    const limitsTrigger = page.getByTestId('open-escape-limits-home');
    await limitsTrigger.focus();
    await limitsTrigger.click();

    const limitsModal = page.getByTestId('quick-escape-limits-modal');
    await expect(limitsModal).toBeVisible();
    await expect(limitsModal).toHaveAttribute('aria-describedby', 'escape-limits-modal-intro');
    const closeLimitsBtn = limitsModal.getByTestId('close-escape-limits-modal');
    await expect(closeLimitsBtn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      limitsModal.getByRole('button', { name: /Salida Rápida de Pánico/i })
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      limitsModal.getByRole('button', { name: 'Cerrar guía de límites de Antiespía y Salir Rápido' })
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(limitsModal).toHaveCount(0);
    await expect(limitsTrigger).toBeFocused();

    // SharedDeviceExitModal en /report
    await page.goto('/report');
    await page.getByTestId('toggle-shared-device-button').click();
    const infoBtn = page.getByTestId('open-shared-device-info-button');
    await infoBtn.focus();
    await infoBtn.click();

    const sharedModal = page.getByTestId('shared-device-exit-modal');
    await expect(sharedModal).toBeVisible();
    await expect(sharedModal).toHaveAttribute('aria-describedby', 'shared-device-modal-summary');
    const closeSharedBtn = sharedModal.getByTestId('close-shared-exit-modal-button');
    await expect(closeSharedBtn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      sharedModal.getByRole('button', { name: /Salida Rápida de Pánico/i })
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      sharedModal.getByRole('button', { name: 'Cerrar aviso de sesión compartida' })
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeSharedBtn).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      sharedModal.getByRole('button', { name: 'Cerrar aviso de sesión compartida' })
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(sharedModal).toHaveCount(0);
    await expect(infoBtn).toBeFocused();
  });

  test('5. Rutas complementarias (/defender, /device-check, /admin) cumplen landmarks, estados y nombres únicos', async ({
    page,
    request,
  }) => {
    // /defender
    await page.goto('/defender');
    await page.getByRole('button', { name: /Retén: Amenaza de Grúa/i }).click();
    await expect(page.getByTestId('defender-live-status')).toContainText('Grúa');

    await page.getByRole('button', { name: /Choques "Solo Latas"/i }).click();
    const stepsList = page.getByRole('list', { name: 'Pasos del asistente Choques Solo Latas' });
    await expect(stepsList.locator('li').first()).toHaveAttribute('aria-current', 'step');

    // /device-check: sin enlaces repetidos "Abrir"
    await page.goto('/device-check');
    const readinessLinks = await page
      .getByTestId('tool-readiness-summary')
      .getByRole('link')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
    expect(readinessLinks.length).toBeGreaterThanOrEqual(4);
    expect(new Set(readinessLinks).size).toBe(readinessLinks.length);
    for (const label of readinessLinks) {
      expect(label).toMatch(/^Abrir /);
    }

    // /admin autenticado: crear un reporte sintético para verificar tabla con scope="col" y vista detalle
    const reportSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const createRes = await request.post('http://127.0.0.1:3000/api/reports', {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-report-client': '1',
        Authorization: `Bearer ${reportSecret}`,
        'Content-Type': 'application/json',
      },
      data: {
        requestId: crypto.randomUUID(),
        category: 'abuso-autoridad-reten',
        riskLevel: 'medio',
        commune: 'Comuna 11 - Laureles Estadio',
        neighborhoodReference: 'Sector Estadio',
        summary: 'Expediente sintético de prueba T21 para auditar encabezados y tabla en /admin.',
        incidentDate: '2026-11-24',
        expectedAttachments: 0,
        privacyAck: true,
        safeContact: { preference: 'no_contact' },
      },
    });
    expect(createRes.ok()).toBe(true);
    const { code } = (await createRes.json()) as { code: string };

    const { token } = await createSyntheticAdminToken({
      uid: 'a11y-admin-auditor',
      email: 'a11y@alzavoz.medellin.gov.co',
    });
    await page.goto('/admin');
    await page.fill('#admin-token-input', token);
    await page.getByRole('button', { name: 'Acceder al Panel Privado' }).click();
    await expect(page.getByRole('heading', { name: 'Panel de Gestión y Acompañamiento' })).toBeVisible();

    const adminAudit = await auditPageStructure(page);
    expect(adminAudit.mainCount).toBe(1);
    expect(adminAudit.h1Count).toBe(1);
    expect(adminAudit.headingSkips).toEqual([]);
    expect(adminAudit.unnamedControls).toEqual([]);

    const reportsTab = page.getByRole('button', { name: /Expedientes de Denuncia/i });
    const noticesTab = page.getByRole('button', { name: /Avisos Comunitarios/i });
    await expect(reportsTab).toHaveAttribute('aria-pressed', 'true');
    await expect(noticesTab).toHaveAttribute('aria-pressed', 'false');

    const headersScope = await page
      .locator('table th')
      .evaluateAll((ths) => ths.map((th) => th.getAttribute('scope')));
    expect(headersScope.length).toBe(7);
    expect(headersScope.every((s) => s === 'col')).toBe(true);

    await page.getByRole('button', { name: `Ver detalles del expediente ${code}` }).click();
    await expect(page.getByRole('heading', { name: `Expediente ${code}` })).toBeVisible();
    const detailAudit = await auditPageStructure(page);
    expect(detailAudit.mainCount).toBe(1);
    expect(detailAudit.h1Count).toBe(1);
    expect(detailAudit.headingSkips).toEqual([]);
    expect(detailAudit.unnamedControls).toEqual([]);
  });
});
