import { test, expect } from "@playwright/test";

test.describe("Navegación adaptable", () => {
  test("el escritorio usa el espacio disponible y navegación lateral", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(page.getByRole("navigation", { name: "Navegación principal", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación móvil", exact: true })).toBeHidden();
    const content = await page.locator("main").boundingBox();
    expect(content).not.toBeNull();
    expect(content!.width).toBeGreaterThan(800);
  });

  for (const width of [320, 393, 768]) {
    test(`el contenido y los controles caben a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 851 });
      for (const route of ["/", "/sos", "/defender", "/record"]) {
        await page.goto(route);
        await expect(page.getByRole("navigation", { name: "Navegación móvil", exact: true })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Navegación principal", exact: true })).toBeHidden();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow, `desbordamiento en ${route} a ${width}px`).toBe(false);
      }
    });
  }

  test("los accesos del inicio abren su herramienta y actualizan la navegación", async ({ page }) => {
    for (const route of ["/sos", "/defender", "/record"]) {
      await page.goto("/");
      await page.locator(`main a[href="${route}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${route}/?$`));
      await expect(page.getByRole("navigation", { name: "Navegación móvil", exact: true }).locator(`a[href="${route}"]`)).toHaveAttribute("aria-current", "page");
    }
  });

  test("un acceso directo identifica la página activa en escritorio", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/defender");
    const navigation = page.getByRole("navigation", { name: "Navegación principal", exact: true });
    await expect(navigation.locator('a[href="/defender"]')).toHaveAttribute("aria-current", "page");
    await expect(navigation.locator('a[href="/"]')).not.toHaveAttribute("aria-current", "page");
  });

  test("la acción de grabación queda dentro del área de trabajo en escritorio", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/record");
    const control = page.getByRole("button", { name: "Iniciar grabación", exact: true });
    await expect(control).toBeVisible();
    const button = await control.boundingBox();
    const main = await page.locator("main").boundingBox();
    expect(button).not.toBeNull();
    expect(main).not.toBeNull();
    expect(button!.x).toBeGreaterThanOrEqual(main!.x);
    expect(button!.x + button!.width).toBeLessThanOrEqual(main!.x + main!.width);
    expect(Math.abs(button!.x + button!.width / 2 - (main!.x + main!.width / 2))).toBeLessThan(24);
  });
});
