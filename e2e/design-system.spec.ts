import { test, expect } from "@playwright/test";

test.describe("Interfaz de protección ciudadana", () => {
  test("la navegación móvil tiene destinos reales y controles de al menos 56px", async ({ page }) => {
    await page.goto("/");
    const navigation = page.getByRole("navigation", { name: "Navegación móvil", exact: true });
    await expect(navigation).toBeVisible();
    await expect(navigation.locator("a")).toHaveCount(4);
    await expect(navigation.locator('button[title*="Salida Rápida"]')).toBeVisible();

    const controls = navigation.locator("a, button");
    for (const control of await controls.all()) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(56);
      expect(box!.width).toBeGreaterThanOrEqual(56);
    }
  });

  test("el inicio presenta las herramientas sin cargar los flujos completos", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "¿En qué necesitas ayuda?", exact: true })).toBeVisible();
    await expect(page.locator('main a[href="/sos"]')).toBeVisible();
    await expect(page.locator('main a[href="/defender"]')).toBeVisible();
    await expect(page.locator('main a[href="/record"]')).toBeVisible();
    await expect(page.locator('main a[href="tel:155"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Botón de Pánico Principal"]')).toHaveCount(0);
    await expect(page.locator('section[aria-label="Defensor Legal en Vivo y Choques Solo Latas"]')).toHaveCount(0);
    await expect(page.getByText("GPS Listo", { exact: true })).toHaveCount(0);
    await expect(page.getByText("ALZ-2026-MED-042", { exact: true })).toHaveCount(0);
  });

  test("el modo antiespía desenfoca y vuelve a mostrar los datos de SOS", async ({ page }) => {
    await page.goto("/sos");
    const toggle = page.locator('header button[title*="Antiespía"]');
    const sensitive = page.locator('[data-sensitive="true"]').first();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(sensitive).toBeVisible();
    await expect(sensitive).toHaveCSS("filter", "none");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(sensitive).toHaveCSS("filter", "blur(8px)");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(sensitive).toHaveCSS("filter", "none");
  });

  test("la salida rápida sigue accesible desde la cabecera y el pulgar", async ({ page }) => {
    await page.goto("/sos");
    await expect(page.locator('header button[title*="Salida Rápida"]')).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación móvil", exact: true }).locator('button[title*="Salida Rápida"]')).toBeVisible();
  });
});
