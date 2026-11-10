import { test, expect } from '@playwright/test';

test.describe('T14 — Modo de práctica sin envíos (Idea I004)', () => {
  test('activar y desactivar modo de práctica muestra banner persistente y sincroniza estado', async ({ page }) => {
    await page.goto('/sos');

    // Inicialmente no debe haber banner de práctica
    await expect(page.getByTestId('practice-mode-banner')).toHaveCount(0);

    // Activar modo de práctica desde el botón conmutador
    const toggleBtn = page.getByTestId('toggle-practice-mode-button').first();
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Debe mostrarse el banner persistente de práctica
    const banner = page.getByTestId('practice-mode-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Modo de práctica activo');
    await expect(banner).toContainText('sin llamadas ni despachos reales');

    // Comprobar persistencia tras recarga
    await page.reload();
    await expect(page.getByTestId('practice-mode-banner')).toBeVisible();

    // Desactivar usando el botón "Salir de práctica" del banner
    const exitBtn = page.getByTestId('exit-practice-mode-button');
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    // El banner desaparece
    await expect(page.getByTestId('practice-mode-banner')).toHaveCount(0);
  });

  test('en /sos el botón principal SOS 123 suprime tel:123 y abre modal pedagógico en modo práctica', async ({ page }) => {
    await page.goto('/sos');

    // En modo normal es un enlace con aria-label hacia el 123
    const normalSosLink = page.getByRole('link', { name: 'Llamar a Emergencias Policía 123 ahora' });
    await expect(normalSosLink).toBeVisible();

    // Activar modo de práctica
    await page.getByTestId('toggle-practice-mode-button').first().click();
    await expect(page.getByTestId('practice-mode-banner')).toBeVisible();

    // El enlace principal tel:123 ya no debe existir
    await expect(page.getByRole('link', { name: 'Llamar a Emergencias Policía 123 ahora' })).toHaveCount(0);

    // Debe existir un botón interactivo de simulación
    const practiceSosBtn = page.getByRole('button', { name: /Simulación: Llamar a Emergencias Policía 123/i });
    await expect(practiceSosBtn).toBeVisible();

    // Pulsar el botón simulado
    await practiceSosBtn.click();

    // Debe abrirse el modal pedagógico de simulación
    const modal = page.getByTestId('practice-simulation-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Simulación: Llamada de emergencia SOS 123');
    await expect(modal).toContainText('123');
    await expect(modal).toContainText('Dirección lista para dictar');

    // Cerrar el modal mediante su botón de confirmación
    const closeModalBtn = page.getByTestId('close-simulation-modal-button');
    await expect(closeModalBtn).toBeVisible();
    await closeModalBtn.click();

    // El modal se cierra
    await expect(modal).toHaveCount(0);
  });

  test('en /sos los marcadores de la cuadrícula suprimen enlaces tel: y abren modales de simulación', async ({ page }) => {
    await page.goto('/sos');

    // Activar modo de práctica
    await page.getByTestId('toggle-practice-mode-button').first().click();
    await expect(page.getByTestId('practice-mode-banner')).toBeVisible();

    // En modo práctica no debe existir ningún enlace tel: en los servicios
    await expect(page.locator('section[aria-label="Marcación Telefónica Directa de Emergencia"] a[href^="tel:"]')).toHaveCount(0);

    // Seleccionar y pulsar el marcador de Bomberos 119
    const bomberosBtn = page.getByRole('button', { name: /Simulación: Llamar a Cuerpo Oficial de Bomberos al 119/i });
    await expect(bomberosBtn).toBeVisible();
    await bomberosBtn.click();

    // Modal de simulación para Bomberos
    const modal = page.getByTestId('practice-simulation-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Simulación: Llamada a Cuerpo Oficial de Bomberos');
    await expect(modal).toContainText('119');

    // Cerrar modal
    await page.getByTestId('close-simulation-modal-button').click();
    await expect(modal).toHaveCount(0);
  });

  test('en /sos la alerta silenciosa WhatsApp y la confirmación de difusión no abren enlaces externos', async ({ page }) => {
    await page.goto('/sos');

    // Activar modo de práctica
    await page.getByTestId('toggle-practice-mode-button').first().click();

    // No debe existir el enlace regular a WhatsApp en la sección de alerta silenciosa
    await expect(page.locator('a:has-text("Alerta Silenciosa WhatsApp")')).toHaveCount(0);

    // Pulsar el botón de Alerta Silenciosa WhatsApp en simulación
    const waPracticeBtn = page.getByRole('button', { name: /Alerta Silenciosa WhatsApp \(Simulación\)/i });
    await expect(waPracticeBtn).toBeVisible();
    await waPracticeBtn.click();

    // Modal de simulación para WhatsApp
    const modal = page.getByTestId('practice-simulation-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Simulación: Alerta Silenciosa WhatsApp');
    await expect(modal).toContainText('+57 323 430 6794');

    // Cerrar modal
    await page.getByTestId('close-simulation-modal-button').click();
    await expect(modal).toHaveCount(0);

    // Probar vista previa y confirmación de auxilio
    await page.getByTestId('btn-open-sos-preview').click();
    const previewModal = page.getByTestId('sos-share-preview-dialog');
    await expect(previewModal).toBeVisible();

    // Confirmar en vista previa
    await page.getByTestId('sos-preview-confirm-btn').click();

    // Se intercepta y muestra modal de simulación de despacho sin abrir ventanas
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Simulación: Despacho de Auxilio');
    await expect(modal).toContainText('Ningún dato salió de tu dispositivo');

    await page.getByTestId('close-simulation-modal-button').click();
    await expect(modal).toHaveCount(0);
  });

  test('en /report permite precargar datos y radicar con código SIM-YYYY-XXXXXX con 0 peticiones HTTP', async ({ page }) => {
    // Interceptar y registrar cualquier petición HTTP saliente hacia las APIs de reportes
    const reportRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/reports')) {
        reportRequests.push(`${req.method()} ${req.url()}`);
      }
    });

    await page.goto('/report');

    // Activar modo de práctica
    await page.getByTestId('toggle-practice-mode-button').first().click();
    await expect(page.getByTestId('practice-mode-banner')).toBeVisible();

    // Cargar relato de práctica con el botón asistente
    const loadPracticeBtn = page.getByTestId('load-practice-report-button');
    await expect(loadPracticeBtn).toBeVisible();
    await loadPracticeBtn.click();

    // Verificar que el relato se autocompletó con más de 15 caracteres
    const summaryInput = page.locator('#report-summary');
    await expect(summaryInput).toHaveValue(/Simulación de práctica/);

    // Avanzar a paso 2 (Evidencias)
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();

    // Avanzar a paso 3 (Privacidad y envío)
    await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();

    // Aceptar confirmación de privacidad
    await page.locator('#report-privacy-ack').check();

    // Verificar texto del botón de radicación en modo de práctica
    const submitBtn = page.getByRole('button', { name: 'Radicar en modo práctica (Sin envíos)' });
    await expect(submitBtn).toBeVisible();

    // Radicar la denuncia en práctica
    await submitBtn.click();

    // Debe abrirse el modal pedagógico con el código SIM
    const modal = page.getByTestId('practice-simulation-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/Simulación: Radicado SIM-\d{4}-\d{6}/);

    // Cerrar modal
    await page.getByTestId('close-simulation-modal-button').click();
    await expect(modal).toHaveCount(0);

    // Verificar tarjeta de recibo seguro
    const receiptCard = page.getByTestId('report-receipt-card');
    await expect(receiptCard).toBeVisible();
    await expect(receiptCard).toContainText('Simulación Educativa · Sin efecto legal');

    const reportCode = await page.getByTestId('report-code').innerText();
    expect(reportCode).toMatch(/^SIM-\d{4}-\d{6}$/);

    // Verificar que el botón de WhatsApp en el recibo no sea un enlace externo en modo de práctica
    const waReceiptBtn = page.getByTestId('whatsapp-channel-link');
    await expect(waReceiptBtn).toBeVisible();
    await waReceiptBtn.click();

    // Muestra modal de simulación de WhatsApp
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Simulación: Resumen de Denuncia en WhatsApp');
    await page.getByTestId('close-simulation-modal-button').click();

    // Verificación fundamental: 0 peticiones HTTP a la API de reportes
    expect(reportRequests).toEqual([]);
  });

  test('los controles táctiles de modo de práctica cumplen con tamaño táctil accesible (>= 44px)', async ({ page }) => {
    await page.goto('/sos');

    // Botón de activación
    const toggleBtn = page.getByTestId('toggle-practice-mode-button').first();
    const toggleBox = await toggleBtn.boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);

    await toggleBtn.click();

    // Botón de salir en el banner
    const exitBtn = page.getByTestId('exit-practice-mode-button');
    const exitBox = await exitBtn.boundingBox();
    expect(exitBox).not.toBeNull();
    expect(exitBox!.height).toBeGreaterThanOrEqual(44);

    // Botón SOS circular en práctica
    const sosBtn = page.getByRole('button', { name: /Simulación: Llamar a Emergencias Policía 123/i });
    const sosBox = await sosBtn.boundingBox();
    expect(sosBox).not.toBeNull();
    expect(sosBox!.height).toBeGreaterThanOrEqual(56);
    expect(sosBox!.width).toBeGreaterThanOrEqual(56);

    // Abrir modal y comprobar botón de acción principal (>= 56px de altura)
    await sosBtn.click();
    const modalCloseBtn = page.getByTestId('close-simulation-modal-button');
    const modalCloseBox = await modalCloseBtn.boundingBox();
    expect(modalCloseBox).not.toBeNull();
    expect(modalCloseBox!.height).toBeGreaterThanOrEqual(56);
  });
});
