import { test, expect } from '@playwright/test';
import { inspectMediaMetadata, stripImageMetadataBytes } from '../src/lib/report/sanitizer';
import { encodeCleanWav, TARGET_SAMPLE_RATE, transformAndSanitizeAudio } from '../src/lib/report/voice';
import { sha256 } from '../src/lib/recording/contracts';

// Minimal valid 1x1 JPEG with injected APP1 (EXIF + GPS tag 0x8825 + XMP) and COM segments.
function buildJpegWithExifAndGps(): Uint8Array<ArrayBuffer> {
  const soi = [0xff, 0xd8];
  const xmpBytes = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/ Medellin-GPS');
  const exifPayload = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x25, 0x88, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00,
    ...xmpBytes,
  ];
  const app1Len = exifPayload.length + 2;
  const app1 = [0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff, ...exifPayload];
  const comPayload = new TextEncoder().encode('Autor: Ciudadano Prueba - Telefono 3000000000');
  const comLen = comPayload.byteLength + 2;
  const com = [0xff, 0xfe, (comLen >> 8) & 0xff, comLen & 0xff, ...comPayload];
  // Standard minimal 1x1 grayscale JPEG tables + scan
  const dqt = [
    0xff, 0xdb, 0x00, 0x43, 0x00,
    16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55,
    14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
    18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92,
    49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
  ];
  const sof0 = [0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00];
  const dht = [
    0xff, 0xc4, 0x00, 0x1f, 0x00,
    0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    0xff, 0xc4, 0x00, 0x14, 0x10,
    0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0,
  ];
  const sos = [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x00];
  const eoi = [0xff, 0xd9];
  const bytes = [...soi, ...app1, ...com, ...dqt, ...sof0, ...dht, ...sos, ...eoi];
  const out = new Uint8Array(new ArrayBuffer(bytes.length));
  out.set(bytes);
  return out;
}

function buildPngWithTextChunk(): Uint8Array<ArrayBuffer> {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdr = [
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
  ];
  const textPayload = new TextEncoder().encode('Author\0Victima GPS Latitude 6.2518');
  const textLen = textPayload.byteLength;
  const textChunk = [
    (textLen >> 24) & 0xff,
    (textLen >> 16) & 0xff,
    (textLen >> 8) & 0xff,
    textLen & 0xff,
    0x74, 0x45, 0x58, 0x74, // tEXt
    ...textPayload,
    0x00, 0x00, 0x00, 0x00,
  ];
  const idat = [
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
    0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb0,
  ];
  const iend = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
  const bytes = [...sig, ...ihdr, ...textChunk, ...idat, ...iend];
  const out = new Uint8Array(new ArrayBuffer(bytes.length));
  out.set(bytes);
  return out;
}

function buildWavWithMetadataChunk(): Uint8Array<ArrayBuffer> {
  const samples = new Float32Array(TARGET_SAMPLE_RATE);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = 0.4 * Math.sin((2 * Math.PI * 220 * i) / TARGET_SAMPLE_RATE);
  }
  const clean = new Uint8Array(encodeCleanWav(samples, TARGET_SAMPLE_RATE));
  const listData = new TextEncoder().encode('INFOIART\x0c\0\0\0Juan Perez\0\0');
  const listChunk = new Uint8Array(new ArrayBuffer(8 + listData.byteLength));
  listChunk.set([0x4c, 0x49, 0x53, 0x54], 0); // LIST
  new DataView(listChunk.buffer).setUint32(4, listData.byteLength, true);
  listChunk.set(listData, 8);

  const combined = new Uint8Array(new ArrayBuffer(clean.byteLength + listChunk.byteLength));
  combined.set(clean, 0);
  combined.set(listChunk, clean.byteLength);
  new DataView(combined.buffer).setUint32(4, combined.byteLength - 8, true);
  return combined;
}

const VALID_WEBM_HEADER = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]);

test.describe('T6: Denuncia Confidencial y Enlace Cloudflare D1', () => {
  test('inspecciona y retira metadatos identificables en JPEG, PNG y WAV, y transforma la voz de forma medible', async () => {
    const dirtyJpeg = buildJpegWithExifAndGps();
    const beforeJpeg = inspectMediaMetadata(dirtyJpeg.buffer);
    expect(beforeJpeg.validFormat).toBe(true);
    expect(beforeJpeg.detectedMime).toBe('image/jpeg');
    expect(beforeJpeg.hasIdentifiableMetadata).toBe(true);
    expect(beforeJpeg.detectedMarkers).toEqual(expect.arrayContaining(['APP1', 'EXIF', 'GPS', 'XMP', 'COM']));

    const cleanJpeg = stripImageMetadataBytes(dirtyJpeg.buffer, 'image/jpeg');
    const afterJpeg = inspectMediaMetadata(cleanJpeg, 'image/jpeg');
    expect(afterJpeg.validFormat).toBe(true);
    expect(afterJpeg.hasIdentifiableMetadata).toBe(false);
    expect(afterJpeg.detectedMarkers).toEqual([]);

    const dirtyPng = buildPngWithTextChunk();
    const beforePng = inspectMediaMetadata(dirtyPng.buffer);
    expect(beforePng.validFormat).toBe(true);
    expect(beforePng.hasIdentifiableMetadata).toBe(true);
    expect(beforePng.detectedMarkers).toEqual(expect.arrayContaining(['tEXt', 'GPS']));

    const cleanPng = stripImageMetadataBytes(dirtyPng.buffer, 'image/png');
    const afterPng = inspectMediaMetadata(cleanPng, 'image/png');
    expect(afterPng.validFormat).toBe(true);
    expect(afterPng.hasIdentifiableMetadata).toBe(false);

    const dirtyWav = buildWavWithMetadataChunk();
    const beforeWav = inspectMediaMetadata(dirtyWav.buffer, 'audio/wav');
    expect(beforeWav.validFormat).toBe(true);
    expect(beforeWav.hasIdentifiableMetadata).toBe(true);
    expect(beforeWav.detectedMarkers).toContain('LIST');

    const inputSignal = new Float32Array(TARGET_SAMPLE_RATE);
    for (let i = 0; i < inputSignal.length; i++) {
      inputSignal[i] = 0.5 * Math.sin((2 * Math.PI * 190 * i) / TARGET_SAMPLE_RATE);
    }
    const unmodulated = transformAndSanitizeAudio(inputSignal, TARGET_SAMPLE_RATE, false);
    const modulated = transformAndSanitizeAudio(inputSignal, TARGET_SAMPLE_RATE, true);
    expect(unmodulated.acousticDeltaPercent).toBe(0);
    expect(modulated.acousticDeltaPercent).toBeGreaterThanOrEqual(15);
    const wavOut = encodeCleanWav(modulated.samples, TARGET_SAMPLE_RATE);
    const wavInspection = inspectMediaMetadata(wavOut, 'audio/wav');
    expect(wavInspection.validFormat).toBe(true);
    expect(wavInspection.hasIdentifiableMetadata).toBe(false);
  });

  test('radica expediente en D1, vincula sesión R2 de /record, valida limpieza y rechaza accesos no autorizados o archivos con EXIF', async ({
    page,
    request,
  }) => {
    // 1. Crear una sesión de grabación de prueba en R2 (T5) con 1 clip confirmado
    const sessionRes = await request.post('/api/recordings/sessions', {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-recording-client': '1',
      },
    });
    expect(sessionRes.status()).toBe(201);
    const recSession = (await sessionRes.json()) as { id: string; secret: string };

    const clipRes = await request.put(`/api/recordings/sessions/${recSession.id}/clips/0`, {
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
    expect(clipRes.status()).toBe(201);
    const recordingKey = `${recSession.id}.${recSession.secret}`;

    // 2. Navegar desde Inicio hacia /report y completar los 3 pasos
    await page.goto('/');
    const reportEntry = page.locator('main a[href="/report"]');
    await expect(reportEntry).toBeVisible();
    await reportEntry.click();
    await expect(page).toHaveURL(/\/report\/?$/);

    await expect(page.getByRole('heading', { name: 'Denuncia confidencial y bóveda D1' })).toBeVisible();
    await page.selectOption('#report-category', 'extorsion-amenaza');
    await page.selectOption('#report-commune', 'Comuna 13 - San Javier');
    await page.fill('#report-neighborhood', 'Cerca a estación San Javier (dato de prueba)');
    await page.fill(
      '#report-summary',
      'Reporte sintético de prueba para verificar persistencia en Cloudflare D1 y limpieza de evidencias R2.'
    );

    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();

    // 3. Subir archivo no soportado (.pdf) y comprobar rechazo con explicación
    await page.setInputFiles('#report-file-input', {
      name: 'documento-privado.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7 contenido no admitido'),
    });
    await expect(page.locator('main [role="alert"]')).toContainText(/Formato no admitido/i);

    // 4. Subir JPEG con metadatos EXIF/GPS y comprobar que se purgan en el cliente
    const dirtyJpeg = buildJpegWithExifAndGps();
    await page.setInputFiles('#report-file-input', {
      name: 'foto-con-gps-JuanPerez.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(dirtyJpeg),
    });
    await expect(page.getByTestId('sanitized-attachment-item')).toHaveCount(1);
    await expect(page.getByTestId('sanitized-attachment-item').first()).toContainText(
      /Metadatos eliminados:.*EXIF.*GPS/i
    );

    // 5. Generar nota de voz con transformación activa y comprobar advertencia de límites
    await expect(page.getByText(/no promete ni garantiza impedir tu identificación/i)).toBeVisible();
    await page.getByRole('button', { name: /Generar audio de prueba \(modulado\)/i }).click();
    await expect(page.getByTestId('sanitized-attachment-item')).toHaveCount(2);
    await expect(page.getByTestId('sanitized-attachment-item').nth(1)).toContainText(/Voz transformada/i);

    // 6. Vincular la clave de grabación de T5 (/record)
    await page.fill('#report-recording-key', recordingKey);

    // 7. Pasar al Paso 3, revisar explicaciones de canales y salida rápida, y radicar en D1
    await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();
    await expect(page.getByText(/Opción A · Bóveda AlzaVoz/i)).toBeVisible();
    await expect(page.getByText(/Opción B · Compartir por WhatsApp/i)).toBeVisible();
    await expect(page.getByTestId('quick-escape-explanation')).toContainText(/Lo que sí limpia en este navegador/i);
    await expect(page.getByTestId('quick-escape-explanation')).toContainText(/Lo que puede permanecer fuera de la app/i);

    await page.check('#report-privacy-ack');
    await page.getByRole('button', { name: 'Radicar denuncia en bóveda D1' }).click();

    const receiptCard = page.getByTestId('report-receipt-card');
    await expect(receiptCard).toBeVisible();
    const codeText = (await page.getByTestId('report-code').textContent())?.trim() ?? '';
    expect(codeText).toMatch(/^ALZ-\d{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    await expect(receiptCard).toContainText('2 / 2');
    await expect(receiptCard).toContainText('Grabación vinculada (1 clips en R2)');

    const fullKey = await page.locator('#report-secret-key').inputValue();
    const [parsedCode, parsedSecret] = fullKey.split('.');
    expect(parsedCode).toBe(codeText);
    expect(parsedSecret).toHaveLength(64);

    // Consultar el expediente desde el bloque de consulta en la propia interfaz
    await page.locator('details summary', { hasText: 'Consultar un expediente radicado anteriormente' }).click();
    await page.fill('#report-lookup-input', fullKey);
    await page.getByRole('button', { name: 'Consultar expediente en D1' }).click();
    await expect(page.getByTestId('lookup-result')).toContainText(codeText);
    await expect(page.getByTestId('lookup-result')).toContainText('Clips R2 vinculados: 1');

    // 8. Verificar en el backend D1 y R2 que el expediente y sus archivos están limpios y protegidos
    const unauthGet = await request.get(`/api/reports/${codeText}`);
    expect(unauthGet.status()).toBe(401);

    const authGet = await request.get(`/api/reports/${codeText}`, {
      headers: { Authorization: `Bearer ${parsedSecret}` },
    });
    expect(authGet.status()).toBe(200);
    const storedRecord = (await authGet.json()) as {
      code: string;
      recordingSessionId: string;
      recordingClipCount: number;
      attachmentCount: number;
      attachments: Array<{ index: number; sha256: string; mime: string }>;
    };
    expect(storedRecord.code).toBe(codeText);
    expect(storedRecord.recordingSessionId).toBe(recSession.id);
    expect(storedRecord.recordingClipCount).toBe(1);
    expect(storedRecord.attachmentCount).toBe(2);
    // El secreto de grabación nunca se expone en el registro D1
    expect(JSON.stringify(storedRecord)).not.toContain(recSession.secret);

    const att0Res = await request.get(`/api/reports/${codeText}/attachments/0`, {
      headers: { Authorization: `Bearer ${parsedSecret}` },
    });
    expect(att0Res.status()).toBe(200);
    const att0Bytes = new Uint8Array(await att0Res.body()).buffer;
    expect(await sha256(att0Bytes)).toBe(storedRecord.attachments[0].sha256);
    const serverCheck0 = inspectMediaMetadata(att0Bytes);
    expect(serverCheck0.validFormat).toBe(true);
    expect(serverCheck0.hasIdentifiableMetadata).toBe(false);

    // 9. Verificar que el servidor rechaza con 422 una imagen con EXIF si alguien intenta saltarse el cliente
    const dirtySummary = encodeURIComponent(
      JSON.stringify({
        originalMime: 'image/jpeg',
        sanitizedMime: 'image/jpeg',
        originalBytes: dirtyJpeg.byteLength,
        sanitizedBytes: dirtyJpeg.byteLength,
        removedMarkers: [],
        voiceTransformed: false,
        verifiedClean: true,
      })
    );
    const bypassRes = await request.put(`/api/reports/${codeText}/attachments/2`, {
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'x-report-client': '1',
        Authorization: `Bearer ${parsedSecret}`,
        'Content-Type': 'image/jpeg',
        'x-sanitization-summary': dirtySummary,
      },
      data: Buffer.from(dirtyJpeg),
    });
    expect(bypassRes.status()).toBe(422);
  });

  test('reintenta la subida de evidencia tras un fallo de red sin duplicar el expediente en D1 y permite salir rápido', async ({
    page,
  }) => {
    await page.goto('/report');
    await page.fill(
      '#report-summary',
      'Prueba de resiliencia y reintento ante corte de red durante la subida de evidencia limpia.'
    );
    await page.getByRole('button', { name: 'Continuar a evidencias y voz' }).click();

    await page.getByRole('button', { name: /Generar audio de prueba/i }).click();
    await expect(page.getByTestId('sanitized-attachment-item')).toHaveCount(1);

    await page.getByRole('button', { name: 'Continuar a privacidad y envío' }).click();
    await page.check('#report-privacy-ack');

    // Simular fallo de red en el primer intento de PUT de adjunto
    let failFirstPut = true;
    await page.route('**/api/reports/*/attachments/0', async (route) => {
      if (failFirstPut && route.request().method() === 'PUT') {
        failFirstPut = false;
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    await page.getByRole('button', { name: 'Radicar denuncia en bóveda D1' }).click();
    await expect(page.locator('main [role="alert"]')).toBeVisible();
    await expect(page.getByTestId('report-receipt-card')).toContainText('0 / 1');
    const firstCode = (await page.getByTestId('report-code').textContent())?.trim();
    expect(firstCode).toMatch(/^ALZ-\d{4}-/);

    // Reintentar y comprobar que conserva el mismo código ALZ-XXXX y completa 1 / 1
    await page.getByRole('button', { name: /Reintentar 1 evidencia\(s\) pendiente\(s\)/i }).click();
    await expect(page.getByTestId('report-receipt-card')).toContainText('1 / 1');
    const secondCode = (await page.getByTestId('report-code').textContent())?.trim();
    expect(secondCode).toBe(firstCode);

    // Comprobar enlace de WhatsApp y modo Antiespía (Zero-Peeping)
    const waLink = page.getByTestId('whatsapp-channel-link');
    await expect(waLink).toHaveAttribute('href', new RegExp(`https://wa\\.me/573234306794\\?text=.*${firstCode}`));

    const peepToggle = page.locator('header button[title*="Antiespía"]');
    await peepToggle.click();
    await expect(page.getByTestId('report-code')).toHaveCSS('filter', 'blur(8px)');
    await peepToggle.click();

    // Comprobar Salida Rápida interceptando la redirección externa sin salir a internet real
    await page.evaluate(() => {
      sessionStorage.setItem('alzavoz_report_draft', '{"summary":"borrador sensible"}');
      localStorage.setItem('alzavoz_report_draft', '{"summary":"borrador sensible"}');
    });
    let escapedToGoogle = false;
    await page.route('https://www.google.com/**', async (route) => {
      escapedToGoogle = true;
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Google Mock</body></html>' });
    });

    await page.getByTestId('quick-escape-explanation').getByRole('button', { name: /Salida Rápida/i }).click();
    await expect.poll(() => escapedToGoogle).toBe(true);
  });

  test('cumple Fitts Law (>=56px) y ausencia de desbordamiento en móvil y escritorio', async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 851 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/report');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `desbordamiento en /report a ${viewport.width}px`).toBe(false);

      const primaryBtn = page.getByRole('button', { name: 'Continuar a evidencias y voz' });
      const box = await primaryBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(56);
      expect(box!.width).toBeGreaterThanOrEqual(56);
    }
  });
});
