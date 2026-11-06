import { test, expect } from "@playwright/test";

test.describe("AlzaVoz: inicio y PWA", () => {
  test("el inicio conserva la identidad y ofrece acceso a cada herramienta disponible", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AlzaVoz & Alza Bot/i);
    await expect(page.locator("header")).toContainText("AlzaVoz");
    await expect(page.locator("header")).toContainText("Medellín");

    for (const href of ["/sos", "/defender", "/record", "tel:155"]) {
      await expect(page.locator(`main a[href="${href}"]`)).toBeVisible();
    }

    const sos = await page.locator('main a[href="/sos"]').boundingBox();
    expect(sos).not.toBeNull();
    expect(sos!.height).toBeGreaterThanOrEqual(56);
  });

  test("el manifiesto y los iconos PWA están disponibles", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.name).toBe("AlzaVoz & Alza Bot");
    expect(manifest.theme_color).toBe("#06B6D4");
    expect((await request.get("/assets/brand/icon-512.svg")).status()).toBe(200);
  });
});
