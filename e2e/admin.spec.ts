import { test, expect } from '@playwright/test';
import {
  createSyntheticAdminToken,
  verifyAdminToken,
  clearTestKeys,
} from '../src/lib/admin/auth';
import {
  MANDATORY_HUMAN_REVIEW_NOTICE,
} from '../src/lib/admin/contracts';
import { sha256 } from '../src/lib/recording/contracts';
import { encodeCleanWav } from '../src/lib/report/voice';

const VALID_WEBM_HEADER = [0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01];

test.describe('T9: Panel Privado de Gestión y Enlace Firebase Auth', () => {
  test.afterAll(() => {
    clearTestKeys();
  });

  test('1. Verificación criptográfica RS256 de Firebase ID Tokens (unitario/contrato)', async () => {
    // A. Token válido con firma RS256
    const { token: validToken } = await createSyntheticAdminToken({
      uid: 'admin-test-uid-1',
      email: 'defensor@alzavoz.medellin.gov.co',
      expiresInSeconds: 3600,
    });
    const validRes = await verifyAdminToken(validToken);
    expect(validRes.ok).toBe(true);
    if (validRes.ok) {
      expect(validRes.user.uid).toBe('admin-test-uid-1');
      expect(validRes.user.email).toBe('defensor@alzavoz.medellin.gov.co');
      expect(validRes.user.role).toBe('authorized_team');
    }

    // B. Token ausente
    const emptyRes = await verifyAdminToken('');
    expect(emptyRes.ok).toBe(false);
    if (!emptyRes.ok) expect(emptyRes.code).toBe(401);

    // C. Token corrupto / formato inválido
    const malformedRes = await verifyAdminToken('esto.no-es.un-jwt-valido');
    expect(malformedRes.ok).toBe(false);
    if (!malformedRes.ok) expect(malformedRes.code).toBe(401);

    // D. Token expirado (exp en el pasado)
    const { token: expiredToken } = await createSyntheticAdminToken({
      uid: 'admin-expired-uid',
      expiresInSeconds: -300, // expiró hace 5 minutos
    });
    const expiredRes = await verifyAdminToken(expiredToken);
    expect(expiredRes.ok).toBe(false);
    if (!expiredRes.ok) {
      expect(expiredRes.code).toBe(401);
      expect(expiredRes.error).toContain('ha expirado');
    }

    // E. Token con firma criptográfica manipulada
    const { token: tamperedToken } = await createSyntheticAdminToken({
      uid: 'admin-tampered-uid',
      tamperSignature: true,
    });
    const tamperedRes = await verifyAdminToken(tamperedToken);
    expect(tamperedRes.ok).toBe(false);
    if (!tamperedRes.ok) {
      expect(tamperedRes.code).toBe(401);
      expect(tamperedRes.error).toContain('Firma criptográfica');
    }

    // F. Token con emisor / proyecto erróneo
    const { token: wrongProjectToken } = await createSyntheticAdminToken({
      uid: 'admin-other-project-uid',
      projectId: 'otro-proyecto-ajeno',
    });
    const wrongProjectRes = await verifyAdminToken(wrongProjectToken);
    expect(wrongProjectRes.ok).toBe(false);
    if (!wrongProjectRes.ok) {
      expect(wrongProjectRes.code).toBe(401);
    }
  });

  test('2. Sin sesión válida se deniega acceso estricto en el servidor (/api/admin/*)', async ({
    request,
  }) => {
    // A. Solicitud sin cabecera de autorización
    const noAuthRes = await request.get('/api/admin/reports');
    expect(noAuthRes.status()).toBe(401);
    const noAuthJson = (await noAuthRes.json()) as { error?: string };
    expect(noAuthJson.error).toContain('ausente');

    // B. Solicitud con token expirado
    const { token: expiredToken } = await createSyntheticAdminToken({
      uid: 'attacker-expired',
      expiresInSeconds: -100,
    });
    const expiredRes = await request.get('/api/admin/reports', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(expiredRes.status()).toBe(401);

    // C. Solicitud con firma manipulada
    const { token: tamperedToken } = await createSyntheticAdminToken({
      uid: 'attacker-tampered',
      tamperSignature: true,
    });
    const tamperedRes = await request.get('/api/admin/reports', {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    expect(tamperedRes.status()).toBe(401);

    // D. Solicitud a generación de borradores sin token
    const noAuthDraft = await request.post('/api/admin/drafts', {
      data: {
        reportCode: 'ALZ-2026-ABCDEF',
        targetEntity: 'personeria',
        documentKind: 'derecho_peticion',
      },
    });
    expect(noAuthDraft.status()).toBe(401);

    // E. Petición cross-site rechazada con 403
    const { token: validToken } = await createSyntheticAdminToken({
      uid: 'valid-admin-uid',
    });
    const crossSiteRes = await request.get('/api/admin/reports', {
      headers: {
        Authorization: `Bearer ${validToken}`,
        'sec-fetch-site': 'cross-site',
      },
    });
    expect(crossSiteRes.status()).toBe(403);
  });

  test('3. Gestión de casos D1, filtros, acceso a evidencias R2 y actualización de estados', async ({
    request,
  }) => {
    // 1. Preparar un expediente de prueba con adjunto y sesión de grabación
    // A. Crear sesión de grabación en R2
    const recRes = await request.post('/api/recordings/sessions', {
      headers: { Origin: 'http://127.0.0.1:3000', 'x-recording-client': '1' },
    });
    expect(recRes.status()).toBe(201);
    const recSession = (await recRes.json()) as { id: string; secret: string };

    // Subir 1 clip
    await request.put(`/api/recordings/sessions/${recSession.id}/clips/0`, {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-recording-client': '1',
        Authorization: `Bearer ${recSession.secret}`,
        'Content-Type': 'video/webm;codecs=vp8,opus',
        'x-clip-start': '0',
        'x-clip-end': '3000',
      },
      data: Buffer.from(VALID_WEBM_HEADER),
    });

    // B. Radicar denuncia confidencial en D1
    const reportSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const reportInput = {
      requestId: crypto.randomUUID(),
      category: 'abuso-autoridad-reten',
      riskLevel: 'alto',
      commune: 'Comuna 10 - La Candelaria',
      neighborhoodReference: 'Parque Berrío (procedimiento irregular)',
      summary: 'Agente de policía exige apagar el celular e intenta incautarlo durante una requisa de rutina.',
      incidentDate: '2026-11-05',
      recordingKey: `${recSession.id}.${recSession.secret}`,
      expectedAttachments: 1,
      privacyAck: true,
    };

    const createReportRes = await request.post('/api/reports', {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-report-client': '1',
        Authorization: `Bearer ${reportSecret}`,
        'Content-Type': 'application/json',
      },
      data: reportInput,
    });
    expect(createReportRes.status()).toBe(201);
    const createdReport = (await createReportRes.json()) as { code: string };
    const reportCode = createdReport.code;

    // C. Subir adjunto higienizado (audio WAV limpio codificado)
    const sampleWav = encodeCleanWav(new Float32Array(800));
    const summaryHeader = encodeURIComponent(
      JSON.stringify({
        originalMime: 'audio/wav',
        sanitizedMime: 'audio/wav',
        originalBytes: sampleWav.byteLength,
        sanitizedBytes: sampleWav.byteLength,
        removedMarkers: [],
        voiceTransformed: true,
        verifiedClean: true,
      })
    );
    const putAttRes = await request.put(`/api/reports/${reportCode}/attachments/0`, {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-report-client': '1',
        Authorization: `Bearer ${reportSecret}`,
        'Content-Type': 'audio/wav',
        'x-sanitization-summary': summaryHeader,
      },
      data: Buffer.from(sampleWav),
    });
    expect(putAttRes.status()).toBe(201);

    // 2. Administrador autorizado consulta el expediente
    const { token: adminToken } = await createSyntheticAdminToken({
      uid: 'defensor-autorizado-1',
      email: 'defensor@alzavoz.medellin.gov.co',
    });

    // A. Listar expedientes
    const listRes = await request.get('/api/admin/reports', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.status()).toBe(200);
    const listData = (await listRes.json()) as { reports: Array<{ code: string; commune: string }> };
    expect(listData.reports.some((r) => r.code === reportCode)).toBe(true);

    // B. Filtrado por comuna y búsqueda textual
    const filteredRes = await request.get('/api/admin/reports?commune=Comuna%2010%20-%20La%20Candelaria', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(filteredRes.status()).toBe(200);
    const filteredData = (await filteredRes.json()) as { reports: Array<{ code: string }> };
    expect(filteredData.reports.some((r) => r.code === reportCode)).toBe(true);

    const searchRes = await request.get(`/api/admin/reports?search=${reportCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(searchRes.status()).toBe(200);
    const searchData = (await searchRes.json()) as { reports: Array<{ code: string }> };
    expect(searchData.reports.length).toBe(1);
    expect(searchData.reports[0].code).toBe(reportCode);

    // C. Consultar detalle completo
    const detailRes = await request.get(`/api/admin/reports/${reportCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(detailRes.status()).toBe(200);
    const detailData = (await detailRes.json()) as {
      report: {
        code: string;
        status: string;
        attachments: Array<{ index: number; mime: string; sha256: string }>;
        recordingClips?: Array<{ index: number }>;
      };
    };
    expect(detailData.report.code).toBe(reportCode);
    expect(detailData.report.status).toBe('radicado');
    expect(detailData.report.attachments.length).toBe(1);
    expect(detailData.report.recordingClips?.length).toBe(1);

    // D. Descargar evidencia desde R2 vía el endpoint seguro de administración
    const attRes = await request.get(`/api/admin/reports/${reportCode}/attachments/0`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(attRes.status()).toBe(200);
    expect(attRes.headers()['content-type']).toBe('audio/wav');
    const downloadedBytes = new Uint8Array(await attRes.body()).buffer;
    expect(await sha256(downloadedBytes)).toBe(detailData.report.attachments[0].sha256);

    // E. Intentar acceder a adjunto inexistente -> 404
    const nonExistentAtt = await request.get(`/api/admin/reports/${reportCode}/attachments/99`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(nonExistentAtt.status()).toBe(404);

    // F. Intentar acceder a adjunto de expediente inexistente -> 404
    const nonExistentReportAtt = await request.get('/api/admin/reports/ALZ-2026-ZZZZZZ/attachments/0', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(nonExistentReportAtt.status()).toBe(404);

    // G. Actualizar estado del caso en D1
    const patchRes = await request.patch(`/api/admin/reports/${reportCode}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        status: 'en_revision',
        adminNotes: 'Caso asignado al equipo de veeduría y derechos humanos.',
      },
    });
    expect(patchRes.status()).toBe(200);
    const patchData = (await patchRes.json()) as { report: { status: string; adminNotes: string } };
    expect(patchData.report.status).toBe('en_revision');
    expect(patchData.report.adminNotes).toContain('veeduría');

    // Confirmar que la actualización persiste en D1 al recargar
    const recheckRes = await request.get(`/api/admin/reports/${reportCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const recheckData = (await recheckRes.json()) as { report: { status: string; adminNotes: string } };
    expect(recheckData.report.status).toBe('en_revision');
    expect(recheckData.report.adminNotes).toContain('veeduría');

    // H. Rechazar estado inválido con 400
    const badStatusRes = await request.patch(`/api/admin/reports/${reportCode}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: { status: 'estado_inexistente' },
    });
    expect(badStatusRes.status()).toBe(400);
  });

  test('4. Generación de Derecho de Petición con IA y exigencia de revisión humana obligatoria', async ({
    request,
  }) => {
    // 1. Crear un expediente para redactar
    const reportSecret = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    const createRes = await request.post('/api/reports', {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-report-client': '1',
        Authorization: `Bearer ${reportSecret}`,
        'Content-Type': 'application/json',
      },
      data: {
        requestId: crypto.randomUUID(),
        category: 'abuso-autoridad-reten',
        riskLevel: 'alto',
        commune: 'Comuna 11 - Laureles Estadio',
        neighborhoodReference: 'Av. Nutibara con Circular 4',
        summary: 'Uniformados imponen comparendo sin permitir presentar descargos ni filmar el procedimiento.',
        incidentDate: '2026-11-06',
        expectedAttachments: 0,
        privacyAck: true,
      },
    });
    expect(createRes.status()).toBe(201);
    const { code } = (await createRes.json()) as { code: string };

    const { token: adminToken } = await createSyntheticAdminToken({
      uid: 'legal-assistant-uid',
    });

    // 2. Generar borrador para MEVAL
    const draftRes = await request.post('/api/admin/drafts', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        reportCode: code,
        targetEntity: 'meval',
        documentKind: 'derecho_peticion',
        applicantName: 'Carlos Mario Restrepo',
        applicantId: '1017123456',
        applicantContact: 'carlos.restrepo@correo.com',
      },
    });
    expect(draftRes.status()).toBe(200);
    const draftData = (await draftRes.json()) as {
      documentText: string;
      requiresHumanReview: boolean;
      targetEntity: string;
      documentKind: string;
      mandatoryNotice: string;
    };

    expect(draftData.requiresHumanReview).toBe(true);
    expect(draftData.targetEntity).toBe('meval');
    expect(draftData.documentKind).toBe('derecho_peticion');
    expect(draftData.mandatoryNotice).toBe(MANDATORY_HUMAN_REVIEW_NOTICE);

    const text = draftData.documentText;
    // Verificaciones obligatorias del documento:
    expect(text).toContain(MANDATORY_HUMAN_REVIEW_NOTICE);
    expect(text).toContain('POLICÍA METROPOLITANA DEL VALLE DE ABURRÁ');
    expect(text).toContain('Carlos Mario Restrepo');
    expect(text).toContain('1017123456');
    expect(text).toContain('Artículo 23 de la Constitución Política');
    expect(text).toContain('Ley Estatutaria 1755 de 2015');
    expect(text).toContain('Ley 1801 de 2016');
    expect(text).toContain(code);
    expect(text).toContain('Comuna 11 - Laureles Estadio');
    expect(text).toContain('[DIRECCIÓN FÍSICA PARA NOTIFICACIONES EN MEDELLÍN]');
    expect(text).toContain('FIRMA: [FIRMA DEL SOLICITANTE O APODERADO]');

    // Confirmar que no hay envío automático
    expect(JSON.stringify(draftData)).not.toContain('sentToEntity');
  });

  test('5. Recorrido completo en interfaz /admin: login, filtros, visor R2 y borrador', async ({
    page,
    request,
  }) => {
    // 1. Crear un reporte de prueba con código conocido
    const reportSecret = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
    const createRes = await request.post('/api/reports', {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-report-client': '1',
        Authorization: `Bearer ${reportSecret}`,
        'Content-Type': 'application/json',
      },
      data: {
        requestId: crypto.randomUUID(),
        category: 'violencia-genero-intrafamiliar',
        riskLevel: 'alto',
        commune: 'Comuna 1 - Popular',
        neighborhoodReference: 'Sector Popular No. 1',
        summary: 'Caso de prueba para validación visual de la interfaz de administración.',
        incidentDate: '2026-11-07',
        expectedAttachments: 0,
        privacyAck: true,
      },
    });
    const { code } = (await createRes.json()) as { code: string };

    // 2. Visitar /admin sin sesión: debe mostrar pantalla de acceso
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Panel de Gestión Autorizado' })).toBeVisible();
    await expect(page.getByText('Tabla de expedientes')).not.toBeVisible();

    // 3. Introducir token inválido: debe mostrar error
    await page.fill('#admin-token-input', 'token_invalido_de_prueba');
    await page.getByRole('button', { name: 'Acceder al Panel Privado' }).click();
    await expect(page.locator('main [role="alert"]')).toBeVisible();

    // 4. Introducir token válido: debe acceder al panel
    const { token: adminToken } = await createSyntheticAdminToken({
      uid: 'e2e-browser-admin',
      email: 'defensor-e2e@alzavoz.medellin.gov.co',
    });
    await page.fill('#admin-token-input', adminToken);
    await page.getByRole('button', { name: 'Acceder al Panel Privado' }).click();

    // 5. Debe mostrar el panel principal con métricas y el reporte creado
    await expect(page.getByRole('heading', { name: 'Panel de Gestión y Acompañamiento' })).toBeVisible();
    await expect(page.getByText('Equipo Autorizado')).toBeVisible();
    await expect(page.getByText(code)).toBeVisible();

    // 6. Probar filtros interactivos
    await page.selectOption('#filter-risk', 'alto');
    await expect(page.getByText(code)).toBeVisible();

    // 7. Abrir el detalle del caso ("Ver caso")
    const viewButton = page.getByRole('button', { name: `Ver detalles del expediente ${code}` });
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // 8. Verificar que carga la vista de detalle
    await expect(page.getByText(`Expediente ${code}`)).toBeVisible();
    await expect(page.getByText('Bóveda de Evidencias Higienizadas (Cloudflare R2)')).toBeVisible();

    // 9. Modificar estado del caso
    await page.selectOption('#case-status-select', 'oficio_tramitado');
    await page.fill('#admin-notes-textarea', 'Oficio radicado ante la Personería con radicado PER-2026-987.');
    await page.getByRole('button', { name: 'Guardar Estado y Notas' }).click();
    await expect(page.getByRole('status')).toContainText('guardados exitosamente');

    // 10. Generar borrador con IA
    await page.selectOption('#target-entity-select', 'personeria');
    await page.selectOption('#doc-kind-select', 'derecho_peticion');
    await page.getByRole('button', { name: 'Generar Borrador Jurídico' }).click();

    // Debe mostrar el banner obligatorio y el texto generado
    await expect(page.locator('textarea#generated-draft-textarea')).toBeVisible();
    await expect(page.getByRole('note')).toContainText('BORRADOR PRELIMINAR GENERADO PARA APOYO JURÍDICO');
    await expect(page.getByRole('button', { name: 'Copiar Borrador' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descargar Documento (.txt)' })).toBeVisible();

    // 11. Volver al listado
    await page.getByRole('button', { name: 'Volver al listado de expedientes' }).click();
    await expect(page.getByRole('heading', { name: 'Panel de Gestión y Acompañamiento' })).toBeVisible();

    // 12. Verificar que el estado actualizado se refleja en la fila del expediente
    const reportRow = page.locator('tr', { hasText: code });
    await expect(reportRow.getByText('Oficio tramitado ante entidad')).toBeVisible();
  });
});
