import { test, expect } from "@playwright/test";

test.describe("Tarea 12: Vista previa de lo que se comparte (Idea I002)", () => {
  test.describe("Flujo SOS (/sos)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sos");
      await page.evaluate(() => localStorage.clear());
      await page.reload();
    });

    test("1. Abre la vista previa de lo que se comparte y muestra destinatarios, ubicación y payload en tiempo real", async ({
      page,
    }) => {
      const openPreviewBtn = page.locator('button[data-testid="btn-open-sos-preview"]');
      await expect(openPreviewBtn).toBeVisible();
      await openPreviewBtn.click();

      // Modal abierto
      const dialog = page.locator('[data-testid="sos-share-preview-dialog"]');
      await expect(dialog).toBeVisible();

      // Título y explicación
      await expect(dialog).toContainText("Vista previa de lo que se comparte");
      await expect(dialog).toContainText("Verifica destinatarios y precisión antes de enviar");

      // Destinatario oficial visible
      await expect(dialog).toContainText("Apoyo AlzaVoz");
      await expect(dialog).toContainText("+573234306794");

      // Botones de precisión de ubicación
      await expect(page.locator('button[data-testid="precision-exact-btn"]')).toBeVisible();
      await expect(page.locator('button[data-testid="precision-approximate-btn"]')).toBeVisible();
      await expect(page.locator('button[data-testid="precision-none-btn"]')).toBeVisible();

      // Payload inicial contiene encabezado de emergencia
      const payloadText = page.locator('[data-testid="sos-preview-payload-text"]');
      await expect(payloadText).toBeVisible();
      await expect(payloadText).toContainText("ALERTA DE EMERGENCIA ALZAVOZ MEDELLÍN");
    });

    test("2. Conmutar precisión de ubicación excluye coordenadas y mapas del payload en vivo", async ({
      page,
    }) => {
      // Primero fijar una comuna en la tarjeta SOS para tener texto de barrio
      const zonePickerToggle = page.locator('button[aria-label="Cambiar comuna manualmente"]');
      await zonePickerToggle.click();
      await page.click('button:has-text("Comuna 14 - El Poblado")');

      // Abrir vista previa
      const openPreviewBtn = page.locator('button[data-testid="btn-open-sos-preview"]');
      await expect(openPreviewBtn).toBeVisible();
      await openPreviewBtn.click();

      const payloadText = page.locator('[data-testid="sos-preview-payload-text"]');

      // 1. Estado exacto: contiene dirección / barrio
      await expect(payloadText).toContainText("El Poblado / Provenza");

      // 2. Conmutar a "Solo Barrio / Comuna"
      await page.click('button[data-testid="precision-approximate-btn"]');
      await expect(payloadText).toContainText("Ubicación aproximada (sector):");
      await expect(payloadText).toContainText("Coordenadas exactas GPS omitidas por protección del ciudadano");
      await expect(payloadText).not.toContainText("maps.google.com");

      // 3. Conmutar a "Sin Ubicación"
      await page.click('button[data-testid="precision-none-btn"]');
      await expect(payloadText).toContainText("Omitida por seguridad personal del ciudadano");
      await expect(payloadText).not.toContainText("Provenza");
      await expect(payloadText).not.toContainText("maps.google.com");
    });

    test("3. Cancelar la vista previa no envía nada y cierra el diálogo", async ({
      page,
    }) => {
      const openBtn = page.locator('button[data-testid="btn-open-sos-preview"]');
      await expect(openBtn).toBeVisible();
      await openBtn.click();

      const dialog = page.locator('[data-testid="sos-share-preview-dialog"]');
      if (!(await dialog.isVisible())) {
        await page.waitForTimeout(400);
        await openBtn.click();
      }
      await expect(dialog).toBeVisible();

      // Pulsar Cancelar
      const cancelBtn = page.locator('button[data-testid="sos-preview-cancel-btn"]');
      await expect(cancelBtn).toBeVisible();
      await cancelBtn.click();

      // Diálogo se cierra
      await expect(dialog).not.toBeVisible();

      // No hay mensaje de alerta difundida
      await expect(page.locator("text=¡Alerta Difundida!")).not.toBeVisible();
    });

    test("4. Retirar todos los destinatarios deshabilita el botón de confirmar", async ({
      page,
    }) => {
      const openBtn = page.locator('button[data-testid="btn-open-sos-preview"]');
      await expect(openBtn).toBeVisible();
      await openBtn.click();

      const confirmBtn = page.locator('button[data-testid="sos-preview-confirm-btn"]');
      await expect(confirmBtn).toBeEnabled();

      // Deseleccionar destinatario oficial
      await page.click('button[data-testid="recipient-toggle-official-concejal"]');

      // Si también estaba broadcast-all, deseleccionarlo
      const broadcastToggle = page.locator('button[data-testid="recipient-toggle-broadcast-all"]');
      if (await broadcastToggle.isVisible()) {
        await broadcastToggle.click();
      }

      // El botón de confirmación queda deshabilitado
      await expect(confirmBtn).toBeDisabled();
      await expect(page.locator("text=Debes seleccionar al menos un destinatario")).toBeVisible();
    });
  });

  test.describe("Flujo Denuncia Confidencial (/report)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/report");
      await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.clear();
      });
      await page.reload();
    });

    test("5. En el Paso 3, la vista previa reúne destinatarios, archivos y precisión territorial", async ({
      page,
    }) => {
      // Paso 1: Llenar hechos
      await page.fill("#report-summary", "Relato de prueba para verificar la vista previa de compartición de datos.");
      await page.click('button:has-text("Continuar a evidencias y voz")');

      // Paso 2: Avanzar al Paso 3
      await page.click('button:has-text("Continuar a privacidad y envío")');

      // Verificar presencia de la tarjeta de vista previa
      const previewCard = page.locator('[data-testid="report-share-preview-card"]');
      await expect(previewCard).toBeVisible();
      await expect(previewCard).toContainText("Vista previa de lo que se comparte");
      await expect(previewCard).toContainText("Saber quién recibirá cada dato antes de confirmar un envío");

      // Destinatarios
      await expect(previewCard).toContainText("Bóveda AlzaVoz (Cloudflare D1 + R2)");

      // Precisión de ubicación
      await expect(page.locator('button[data-testid="report-precision-full-btn"]')).toBeVisible();
      await expect(page.locator('button[data-testid="report-precision-commune-btn"]')).toBeVisible();
      await expect(page.locator('button[data-testid="report-precision-none-btn"]')).toBeVisible();

      // Botón de cancelar
      await expect(page.locator('button[data-testid="btn-cancel-report-submission"]')).toBeVisible();
    });

    test("6. Retirar una evidencia desde la vista previa la excluye del envío", async ({
      page,
    }) => {
      // Paso 1
      await page.fill("#report-summary", "Relato con evidencia adjunta que será retirada en la vista previa.");
      await page.click('button:has-text("Continuar a evidencias y voz")');

      // Paso 2: Subir archivo PNG válido a través de #report-file-input
      const filePayload = {
        name: "documento-prueba.png",
        mimeType: "image/png",
        buffer: Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
          0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
          0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
          0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
          0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
          0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
          0x42, 0x60, 0x82,
        ]),
      };
      await page.setInputFiles("#report-file-input", filePayload);

      // Esperar a que se procese la evidencia limpia
      await expect(page.getByTestId("sanitized-attachment-item")).toHaveCount(1);

      // Avanzar al Paso 3
      await page.click('button:has-text("Continuar a privacidad y envío")');

      // En la vista previa, debe aparecer el archivo adjunto
      const previewCard = page.locator('[data-testid="report-share-preview-card"]');
      await expect(previewCard).toContainText("Archivos y evidencias a transmitir (1)");
      await expect(previewCard).toContainText("evidencia-limpia-1.png");

      // Retirar el archivo desde la vista previa
      const removeBtn = previewCard.locator('button[data-testid^="remove-attachment-preview-"]').first();
      await expect(removeBtn).toBeVisible();
      await removeBtn.click();

      // Debe quedar en 0 evidencias
      await expect(previewCard).toContainText("Archivos y evidencias a transmitir (0)");
      await expect(previewCard).toContainText("Sin evidencias de archivos adjuntos");
    });

    test("7. Cancelar en la vista previa regresa a hechos sin radicar nada en el servidor", async ({
      page,
    }) => {
      let networkRequestsCount = 0;
      page.on("request", (req) => {
        if (req.url().includes("/api/reports") && req.method() === "POST") {
          networkRequestsCount++;
        }
      });

      // Llenar Paso 1
      await page.fill("#report-summary", "Relato para probar la cancelación en la vista previa.");
      await page.click('button:has-text("Continuar a evidencias y voz")');

      // Paso 2 -> Paso 3
      await page.click('button:has-text("Continuar a privacidad y envío")');

      // En Paso 3, pulsar "Cancelar y volver a hechos"
      const cancelBtn = page.locator('button[data-testid="btn-cancel-report-submission"]');
      await expect(cancelBtn).toBeVisible();
      await cancelBtn.click();

      // Regresó al Paso 1
      await expect(page.locator("#report-summary")).toBeVisible();
      await expect(page.locator("#report-summary")).toHaveValue("Relato para probar la cancelación en la vista previa.");

      // Cero peticiones POST a la API
      expect(networkRequestsCount).toBe(0);
    });

    test("8. Reducir precisión territorial a 'Solo Comuna' excluye la referencia barrial en la radicación", async ({
      page,
    }) => {
      // Paso 1: Comuna y referencia específica
      await page.selectOption("#report-commune", "Comuna 13 - San Javier");
      await page.fill("#report-neighborhood", "Calle 45 con Carrera 92, casa esquinera color azul");
      await page.fill("#report-summary", "Denuncia de extorsión barrial donde se desea ocultar la esquina exacta.");
      await page.click('button:has-text("Continuar a evidencias y voz")');

      // Paso 2 -> Paso 3
      await page.click('button:has-text("Continuar a privacidad y envío")');

      // Seleccionar "Solo Comuna"
      const communeOnlyBtn = page.locator('button[data-testid="report-precision-commune-btn"]');
      await communeOnlyBtn.click();

      // Comprobar explicación en pantalla
      await expect(page.locator('[data-testid="report-share-preview-card"]')).toContainText(
        "La referencia barrial exacta ha sido retirada del payload."
      );

      // Aceptar términos y radicar
      await page.check("#report-privacy-ack");
      await page.click('button:has-text("Radicar denuncia en bóveda D1")');

      // Esperar comprobante
      const receiptCard = page.locator('[data-testid="report-receipt-card"]');
      await expect(receiptCard).toBeVisible({ timeout: 15000 });

      // Obtener el código y clave privada
      const code = (await page.locator('[data-testid="report-code"]').textContent())?.trim();
      expect(code).toMatch(/^ALZ-\d{4}-[A-Z0-9]{6}$/);

      const secretKey = await page.locator("#report-secret-key").inputValue();
      expect(secretKey).toContain(code!);

      // Abrir el detalle desplegable para consultar
      await page.click('summary:has-text("Consultar un expediente radicado anteriormente")');

      // Consultar el expediente en D1 para verificar el payload persistido
      await page.fill("#report-lookup-input", secretKey);
      await page.click('button:has-text("Consultar expediente en D1")');

      const lookupCard = page.locator('[data-testid="lookup-result"]');
      await expect(lookupCard).toBeVisible();
      await expect(lookupCard).toContainText("Comuna: Comuna 13 - San Javier");

      // La referencia barrial no aparece en el resumen ni expone la calle/esquina
      await expect(lookupCard).not.toContainText("Calle 45 con Carrera 92");
    });
  });
});
