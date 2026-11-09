import { test, expect } from '@playwright/test';
import {
  createSyntheticAdminToken,
  clearTestKeys,
} from '../src/lib/admin/auth';
import {
  isCurrentTimeInSafeWindow,
  parseSafeContactConfig,
  type SafeContactConfig,
} from '../src/lib/report/contracts';

test.describe('T11: Contacto en condiciones seguras (Idea I001)', () => {
  test.afterAll(() => {
    clearTestKeys();
  });

  test('1. Unidad: Validación estricta y cálculo de franjas horarias en Colombia (COT)', () => {
    // A. Parseo de no_contact
    const noContactParsed = parseSafeContactConfig({ preference: 'no_contact' });
    expect(noContactParsed.ok).toBe(true);
    if (noContactParsed.ok) {
      expect(noContactParsed.data.preference).toBe('no_contact');
      const evalNone = isCurrentTimeInSafeWindow(noContactParsed.data);
      expect(evalNone.allowed).toBe(false);
      expect(evalNone.isNoContact).toBe(true);
      expect(evalNone.reason).toContain('NO RECIBIR MENSAJES');
    }

    // B. Parseo de safe_contact con canal y franja mañana (08:00 a 12:00)
    const morningConfig: SafeContactConfig = {
      preference: 'safe_contact',
      channel: 'whatsapp',
      contactValue: '+57 300 9876543',
      timeSlot: 'morning',
      days: 'weekdays',
      safetyNotes: 'Llamar como encuesta vecinal',
    };
    const morningParsed = parseSafeContactConfig(morningConfig);
    expect(morningParsed.ok).toBe(true);

    // C. Evaluación con fecha conocida en hora colombiana (UTC-5)
    // 2026-11-09 es lunes. 15:30 UTC = 10:30 COT (Mañana -> DENTRO de 08:00-12:00)
    const mondayMorningUtc = new Date('2026-11-09T15:30:00Z');
    const evalMondayMorning = isCurrentTimeInSafeWindow(morningConfig, mondayMorningUtc);
    expect(evalMondayMorning.allowed).toBe(true);
    expect(evalMondayMorning.colombiaTime).toContain('10:30');

    // D. 2026-11-09T03:30:00Z = 22:30 COT domingo anterior o lunes noche -> FUERA de franja
    const mondayNightUtc = new Date('2026-11-10T03:30:00Z'); // 22:30 COT lunes
    const evalMondayNight = isCurrentTimeInSafeWindow(morningConfig, mondayNightUtc);
    expect(evalMondayNight.allowed).toBe(false);
    expect(evalMondayNight.reason).toContain('fuera de la franja autorizada');

    // E. 2026-11-15 es domingo -> FUERA si days='weekdays'
    const sundayUtc = new Date('2026-11-15T15:00:00Z'); // 10:00 COT domingo
    const evalSunday = isCurrentTimeInSafeWindow(morningConfig, sundayUtc);
    expect(evalSunday.allowed).toBe(false);
    expect(evalSunday.reason).toContain('fin de semana');
  });

  test('2. UI Ciudadana: Radicación con opción "No recibir mensajes" y consulta en D1', async ({ page }) => {
    await page.goto('/report');
    await page.fill('#report-summary', 'Denuncia confidencial de prueba para verificar opción de no recibir mensajes por seguridad.');
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();
    await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();

    // En paso 3, debe estar seleccionada por defecto la opción "No recibir mensajes"
    const noneBtn = page.locator('#contact-pref-none');
    await expect(noneBtn).toBeVisible();
    await expect(noneBtn).toHaveClass(/border-amber-400/);

    await page.check('#report-privacy-ack');
    await page.getByRole('button', { name: 'Radicar denuncia en bóveda D1' }).click();

    // Verificación de recibo
    await expect(page.getByTestId('report-receipt-card')).toBeVisible();
    const code = (await page.getByTestId('report-code').textContent())?.trim();
    expect(code).toMatch(/^ALZ-\d{4}-/);

    // Debe mostrar la tarjeta de condiciones de contacto como "Sin contacto"
    const safeCard = page.getByTestId('safe-contact-card');
    await expect(safeCard).toBeVisible();
    await expect(page.getByTestId('safe-contact-badge')).toContainText('Sin contacto');
    await expect(safeCard).toContainText('El equipo tiene estrictamente prohibido contactarte');
  });

  test('3. UI Ciudadana: Radicación con "Contacto Seguro", actualización (cambio) y posterior retirada', async ({ page }) => {
    await page.goto('/report');
    await page.fill('#report-summary', 'Denuncia de prueba con autorización de contacto seguro y cambio posterior.');
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();
    await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();

    // Activar opción de contacto seguro
    await page.locator('#contact-pref-safe').click();
    await expect(page.locator('#safe-channel-select')).toBeVisible();

    await page.selectOption('#safe-channel-select', 'whatsapp');
    await page.fill('#safe-contact-value-input', '+57 321 0001122');
    await page.selectOption('#safe-timeslot-select', 'morning');
    await page.selectOption('#safe-days-select', 'weekdays');
    await page.fill('#safe-notes-textarea', 'Decir que es encuesta ciudadana');

    await page.check('#report-privacy-ack');
    await page.getByRole('button', { name: 'Radicar denuncia en bóveda D1' }).click();

    // Confirmar radicación
    await expect(page.getByTestId('report-receipt-card')).toBeVisible();
    const code = (await page.getByTestId('report-code').textContent())?.trim();
    expect(code).toMatch(/^ALZ-\d{4}-/);

    // Debe mostrar la condición configurada
    const badge = page.getByTestId('safe-contact-badge');
    await expect(badge).toContainText('WHATSAPP');
    await expect(page.getByTestId('safe-contact-card')).toContainText('+57 321 0001122');

    // A. Probar CAMBIO de condiciones usando el botón
    await page.locator('#btn-edit-safe-contact').click();
    await expect(page.locator('#edit-safe-channel')).toBeVisible();
    await page.selectOption('#edit-safe-channel', 'signal');
    await page.fill('#edit-safe-value', '+57 310 9998877');
    await page.selectOption('#edit-safe-slot', 'afternoon');
    await page.locator('#btn-save-safe-contact').click();

    await expect(page.getByTestId('safe-contact-card').getByRole('status')).toContainText('actualizadas exitosamente');
    await expect(badge).toContainText('SIGNAL');
    await expect(page.getByTestId('safe-contact-card')).toContainText('+57 310 9998877');

    // B. Probar RETIRADA de contacto
    await page.locator('#btn-withdraw-safe-contact').click();
    await expect(page.getByTestId('safe-contact-card').getByRole('status')).toContainText('Preferencia actualizada a NO CONTACTO');
    await expect(page.getByTestId('safe-contact-badge')).toContainText('Sin contacto');
    await expect(page.locator('#btn-withdraw-safe-contact')).not.toBeVisible();
  });

  test('4. Panel Administrativo (/admin): Visualización de regla, bloqueo por no contacto y simulación de despacho', async ({
    page,
    request,
  }) => {
    // 1. Crear un reporte de prueba con NO CONTACTO mediante API
    const reportSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const createNoContactRes = await request.post('http://127.0.0.1:3000/api/reports', {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-report-client': '1',
        Authorization: `Bearer ${reportSecret}`,
        'Content-Type': 'application/json',
      },
      data: {
        requestId: crypto.randomUUID(),
        category: 'extorsion-amenaza',
        riskLevel: 'alto',
        commune: 'Comuna 10 - La Candelaria',
        neighborhoodReference: 'Parque Berrío',
        summary: 'Caso de extorsión grave donde el ciudadano exige no recibir ningún contacto por riesgo inminente.',
        incidentDate: '2026-11-08',
        expectedAttachments: 0,
        privacyAck: true,
        safeContact: { preference: 'no_contact' },
      },
    });
    expect(createNoContactRes.ok()).toBe(true);
    const { code: noContactCode } = (await createNoContactRes.json()) as { code: string };

    // 2. Crear un segundo reporte con CONTACTO SEGURO (WhatsApp, mañana, lunes a viernes)
    const safeSecret = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    const createSafeRes = await request.post('http://127.0.0.1:3000/api/reports', {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-report-client': '1',
        Authorization: `Bearer ${safeSecret}`,
        'Content-Type': 'application/json',
      },
      data: {
        requestId: crypto.randomUUID(),
        category: 'abuso-autoridad-reten',
        riskLevel: 'medio',
        commune: 'Comuna 11 - Laureles Estadio',
        neighborhoodReference: 'Avenida Nutibara',
        summary: 'Procedimiento irregular con autorización de contacto en las mañanas.',
        incidentDate: '2026-11-08',
        expectedAttachments: 0,
        privacyAck: true,
        safeContact: {
          preference: 'safe_contact',
          channel: 'whatsapp',
          contactValue: '+57 311 5554433',
          timeSlot: 'morning',
          days: 'weekdays',
          safetyNotes: 'Llamar solo en horario diurno',
        },
      },
    });
    expect(createSafeRes.ok()).toBe(true);
    const { code: safeCode } = (await createSafeRes.json()) as { code: string };

    // 3. Autenticación en /admin
    const { token: adminToken } = await createSyntheticAdminToken({
      uid: 'admin-safe-contact-auditor',
      email: 'auditor-seguridad@alzavoz.medellin.gov.co',
    });

    await page.goto('/admin');
    await page.fill('#admin-token-input', adminToken);
    await page.getByRole('button', { name: 'Acceder al Panel Privado' }).click();
    await expect(page.getByRole('heading', { name: 'Panel de Gestión y Acompañamiento' })).toBeVisible();

    // 4. Ver caso con NO CONTACTO
    const viewNoContactBtn = page.getByRole('button', { name: `Ver detalles del expediente ${noContactCode}` });
    await viewNoContactBtn.click();

    // Debe mostrar la advertencia roja de no contacto
    await expect(page.getByTestId('admin-safe-contact-none')).toBeVisible();
    await expect(page.getByTestId('admin-safe-contact-none')).toContainText('REGLA DE SEGURIDAD PERSONAL: NO CONTACTAR');

    // Intentar simular envío en caso con no contacto: DEBE BLOQUEARSE
    await page.locator('#btn-simulate-contact').click();
    await expect(page.getByTestId('simulate-contact-blocked')).toBeVisible();
    await expect(page.getByTestId('simulate-contact-blocked')).toContainText('ENVÍO BLOQUEADO');
    await expect(page.getByTestId('simulate-contact-blocked')).toContainText('NO RECIBIR MENSAJES');

    // 5. Volver al listado y abrir caso con CONTACTO SEGURO
    await page.getByRole('button', { name: 'Volver al listado de expedientes' }).click();
    const viewSafeBtn = page.getByRole('button', { name: `Ver detalles del expediente ${safeCode}` });
    await viewSafeBtn.click();

    // Debe mostrar tarjeta de contacto seguro con canal y datos
    await expect(page.getByTestId('admin-safe-contact-active')).toBeVisible();
    await expect(page.getByTestId('admin-safe-contact-active')).toContainText('WHATSAPP');
    await expect(page.getByTestId('admin-safe-contact-active')).toContainText('+57 311 5554433');

    // A. Simular intento FUERA de franja horaria (ej: 23:30 COT = 2026-11-09T23:30)
    await page.fill('#sim-time-input', '2026-11-09T23:30');
    await page.locator('#btn-simulate-contact').click();

    // Debe mostrar bloqueo con explicación detallada
    await expect(page.getByTestId('simulate-contact-blocked')).toBeVisible();
    await expect(page.getByTestId('simulate-contact-blocked')).toContainText('fuera de la franja autorizada');

    // B. Simular intento con CANAL NO AUTORIZADO (ej: teléfono directo en vez de whatsapp)
    await page.selectOption('#sim-channel-select', 'phone_call');
    await page.fill('#sim-time-input', '2026-11-09T10:00'); // Hora válida pero canal inválido
    await page.locator('#btn-simulate-contact').click();

    await expect(page.getByTestId('simulate-contact-blocked')).toBeVisible();
    await expect(page.getByTestId('simulate-contact-blocked')).toContainText('Canal solicitado (phone_call) no coincide con el canal autorizado');

    // C. Simular intento DENTRO de la franja y canal autorizados (ej: 10:00 COT de un lunes)
    await page.selectOption('#sim-channel-select', 'whatsapp');
    await page.fill('#sim-time-input', '2026-11-09T10:00');
    await page.locator('#btn-simulate-contact').click();

    // Debe resultar en simulación PERMITIDA
    await expect(page.getByTestId('simulate-contact-allowed')).toBeVisible();
    await expect(page.getByTestId('simulate-contact-allowed')).toContainText('ENVÍO SIMULADO PERMITIDO');
    await expect(page.getByTestId('simulate-contact-allowed')).toContainText('Dentro de la franja segura autorizada');
    await expect(page.getByTestId('simulate-contact-allowed')).toContainText('No se envió ningún mensaje real');
  });
});
