import { test, expect } from "@playwright/test";

test.describe("Tarea 3: Bloque 1 (Parte A): Botón SOS Inteligente de Emergencia y Alerta Rápida", () => {
  test.beforeEach(async ({ context, page }) => {
    try {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    } catch {
      // Ignorar si no soporta
    }
    await page.goto("/sos");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("1. Carga de /sos con Botón de Pánico Hero y Touch Target ergonómico >= 56px", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/SOS Emergencia 123/i);

    // Botón de pánico central
    const panicHeroBtn = page.locator('a[aria-label="Llamar a Emergencias Policía 123 ahora"]');
    await expect(panicHeroBtn).toBeVisible();
    await expect(panicHeroBtn).toHaveAttribute("href", "tel:123");

    // Verificar tamaño Fitts' Law (debe ser gigante, mayor a 100px)
    const box = await panicHeroBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(100);
      expect(box.width).toBeGreaterThanOrEqual(100);
    }
  });

  test("2. Bloque Gigante de Lectura para el 123 y Selector Manual de Comunas", async ({
    page,
  }) => {
    const locationCard = page.locator(
      'section[aria-label="Ubicación GPS de Emergencia para el 123"]'
    );
    await expect(locationCard).toBeVisible();

    // Textos de lectura gigante con data-sensitive="true"
    const sensitiveFields = locationCard.locator('[data-sensitive="true"]');
    const count = await sensitiveFields.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Selector rápido de Comuna (desplegable de 16 comunas)
    const zonePickerToggle = page.locator('button[aria-label="Cambiar comuna manualmente"]');
    await expect(zonePickerToggle).toBeVisible();
    await zonePickerToggle.click();

    // Seleccionar Comuna 14 - El Poblado
    const pobladoBtn = page.locator('button:has-text("Comuna 14 - El Poblado")');
    await expect(pobladoBtn).toBeVisible();
    await pobladoBtn.click();

    // Verificar actualización instantánea de barrio y dirección
    await expect(locationCard).toContainText("El Poblado / Provenza");
    await expect(locationCard).toContainText("Cra 43A con Calle 10");

    // Probar botón de copiar ubicación
    const copyBtn = page.locator('button[aria-label="Copiar dirección para dictar o enviar"]');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(page.locator("text=¡Copiado al Portapapeles!")).toBeVisible();
  });

  test("3. Marcación Directa de Emergencia (5 líneas con touch targets >= 56px)", async ({
    page,
  }) => {
    const dialerSection = page.locator(
      'section[aria-label="Marcación Telefónica Directa de Emergencia"]'
    );
    await expect(dialerSection).toBeVisible();

    const emergencyLinks = [
      { phone: "tel:123", label: /Policía 123/i },
      { phone: "tel:155", label: /Línea Púrpura 155/i },
      { phone: "tel:125", label: /Ambulancia 125/i },
      { phone: "tel:119", label: /Bomberos 119/i },
      { phone: "tel:123", label: /Tránsito 123/i },
    ];

    for (const item of emergencyLinks) {
      const link = dialerSection.locator(`a[href="${item.phone}"]`).filter({ hasText: item.label });
      await expect(link).toBeVisible();

      // Fitts' Law >= 56px
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(56);
      }
    }
  });

  test("4. Botón de Alerta Silenciosa por WhatsApp al Despacho del Concejal (+57 3234306794)", async ({
    page,
  }) => {
    const silentWaBtn = page.locator('a:has-text("Alerta Silenciosa WhatsApp")');
    await expect(silentWaBtn).toBeVisible();

    const href = await silentWaBtn.getAttribute("href");
    expect(href).not.toBeNull();
    expect(href).toContain("wa.me/573234306794");
    expect(href).toContain(encodeURIComponent("🚨 *¡ALERTA DE EMERGENCIA ALZAVOZ MEDELLÍN!* 🚨"));
  });

  test("5. Gestión de Contactos de Confianza (Persistencia localStorage, llamada y eliminación)", async ({
    page,
  }) => {
    const contactsSection = page.locator(
      'section[aria-label="Contactos de Confianza y Red de Apoyo"]'
    );
    await expect(contactsSection).toBeVisible();

    // 1. Canal Oficial está presente por defecto
    await expect(contactsSection).toContainText("Despacho Concejal Medellín");
    await expect(contactsSection).toContainText("+573234306794");

    // 2. Abrir formulario de agregar contacto
    const addToggle = page.locator('button[aria-label="Agregar nuevo contacto de confianza"]');
    await addToggle.click();

    // 3. Llenar datos de contacto
    await page.fill("#contact-name", "Abogado Penalista");
    await page.fill("#contact-phone", "3119876543");
    await page.selectOption("#contact-rel", "Abogado(a)");

    // Guardar
    await page.click('button:has-text("Guardar Contacto de Confianza")');

    // 4. Verificar que aparece en la lista
    await expect(contactsSection).toContainText("Abogado Penalista");
    await expect(contactsSection).toContainText("+573119876543");

    // 5. Verificar botones de llamada y WhatsApp para el contacto
    const lawyerCall = contactsSection.locator('a[href="tel:+573119876543"]');
    await expect(lawyerCall).toBeVisible();

    const lawyerWa = contactsSection.locator('a[href*="wa.me/573119876543"]');
    await expect(lawyerWa).toBeVisible();

    // 6. Eliminar el contacto
    const deleteBtn = page.locator('button[aria-label="Eliminar contacto Abogado Penalista"]');
    await deleteBtn.click();
    await expect(contactsSection).not.toContainText("Abogado Penalista");
  });

  test("6. Modo Antiespía protege datos en la pantalla SOS", async ({ page }) => {
    const antipeepBtn = page.locator('button[title*="Antiespía"]');
    await expect(antipeepBtn).toBeVisible();

    const shell = page.locator(".min-h-dvh");
    await expect(shell).not.toHaveClass(/privacy-peep-active/);

    // Activar antiespía
    await antipeepBtn.click();
    await expect(shell).toHaveClass(/privacy-peep-active/);

    // Los datos sensibles están protegidos
    const locationCard = page.locator(
      'section[aria-label="Ubicación GPS de Emergencia para el 123"]'
    );
    const sensitiveItem = locationCard.locator('[data-sensitive="true"]').first();
    await expect(sensitiveItem).toBeVisible();
  });
});
