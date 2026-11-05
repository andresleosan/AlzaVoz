import { test, expect } from "@playwright/test";

test.describe("AlzaVoz Cimentación & PWA Setup", () => {
  test("Carga Home con identidad oficial, Alza Bot y módulos táctiles de 56px", async ({ page }) => {
    await page.goto("/");

    // 1. Verificar título y metadatos
    await expect(page).toHaveTitle(/AlzaVoz & Alza Bot/i);

    // 2. Verificar cabecera e identidad oficial
    const brand = page.locator("header");
    await expect(brand).toContainText("AlzaVoz");
    await expect(brand).toContainText("Medellín");

    // 3. Verificar los 4 módulos de alta urgencia (UX bajo estrés)
    const sosButton = page.locator('a[href="#sos-panico"]');
    const legalButton = page.locator('a[href="#defensor-reten"]');
    const violetaButton = page.locator('a[href="#escudo-violeta"]');
    const radarButton = page.locator('a[href="#radar-comunitario"]');

    await expect(sosButton).toBeVisible();
    await expect(legalButton).toBeVisible();
    await expect(violetaButton).toBeVisible();
    await expect(radarButton).toBeVisible();

    // 4. Verificar accesibilidad de zona táctil mínima (Fitts' Law >= 56px de alto)
    const box = await sosButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(56);
    }
  });

  test("Verifica disponibilidad de manifest.json e iconos PWA", async ({ request }) => {
    const manifestRes = await request.get("/manifest.json");
    expect(manifestRes.status()).toBe(200);

    const manifest = await manifestRes.json();
    expect(manifest.name).toBe("AlzaVoz & Alza Bot");
    expect(manifest.theme_color).toBe("#06B6D4");

    const iconRes = await request.get("/assets/brand/icon-512.svg");
    expect(iconRes.status()).toBe(200);
  });
});

