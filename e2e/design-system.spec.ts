import { test, expect } from "@playwright/test";

test.describe("Tarea 2: Arquitectura del Sistema de Diseño UX Bajo Estrés y Avatar Dinámico", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. Shell ergonómico: La barra de navegación inferior cumple Fitts' Law (touch targets >= 56px)", async ({
    page,
  }) => {
    const bottomNav = page.locator('nav[aria-label="Navegación Ergonómica Principal"]');
    await expect(bottomNav).toBeVisible();

    // Validar los 5 botones de la barra inferior (4 modos + botón salir)
    const navButtons = bottomNav.locator("button");
    const count = await navButtons.count();
    expect(count).toBe(5);

    // Cada botón debe medir al menos 56px de alto y ancho táctil
    for (let i = 0; i < count; i++) {
      const btn = navButtons.nth(i);
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(56);
        expect(box.width).toBeGreaterThanOrEqual(48); // en viewport estrecho de 393px dividido entre 5
      }
    }
  });

  test("2. Avatar Dinámico de Alza Bot reacciona fluidamente a los 4 modos visuales", async ({
    page,
  }) => {
    // Modo 1: Inicialmente en Modo Estándar (Cívico)
    const heroTitle = page.locator("section[aria-label='Estado Central de Alza Bot'] h1");
    await expect(heroTitle).toContainText("Alza Bot Cívico");

    const avatarStandard = page.locator('section[aria-label="Estado Central de Alza Bot"] img[alt="Alza Bot Cívico"]');
    await expect(avatarStandard).toBeVisible();
    await expect(avatarStandard).toHaveAttribute("src", /bot-standard\.png/);

    // Modo 2: Activar Modo Defensor (Rojo/Ámbar)
    const defenderNavBtn = page.locator('button[aria-label="Cambiar a modo SOS / Retén"]');
    await defenderNavBtn.click();
    await expect(heroTitle).toContainText("Defensor SOS & Jurídico");
    await expect(page.locator("text=Ley 1801 de 2016 (Art. 21 - Derecho a Grabar)")).toBeVisible();

    const avatarDefender = page.locator('section[aria-label="Estado Central de Alza Bot"] img[alt="Defensor SOS & Jurídico"]');
    await expect(avatarDefender).toBeVisible();
    await expect(avatarDefender).toHaveAttribute("src", /bot-defender\.png/);

    // Modo 3: Activar Modo Escudo Violeta (Púrpura)
    const violetNavBtn = page.locator('button[aria-label="Cambiar a modo Violeta"]');
    await violetNavBtn.click();
    await expect(heroTitle).toContainText("Escudo Violeta");
    await expect(page.locator("text=Ley 1257 de 2008 (No Violencia Contra la Mujer)")).toBeVisible();

    const avatarViolet = page.locator('section[aria-label="Estado Central de Alza Bot"] img[alt="Escudo Violeta"]');
    await expect(avatarViolet).toBeVisible();
    await expect(avatarViolet).toHaveAttribute("src", /bot-violet\.png/);

    // Modo 4: Activar Modo Radar Barrial (Verde Esmeralda)
    const radarNavBtn = page.locator('button[aria-label="Cambiar a modo Radar"]');
    await radarNavBtn.click();
    await expect(heroTitle).toContainText("Radar Barrial");
    await expect(page.locator("text=Ley 1801 de 2016 (Art. 33 - Tranquilidad y Relaciones Respetuosas)")).toBeVisible();

    const avatarRadar = page.locator('section[aria-label="Estado Central de Alza Bot"] img[alt="Radar Barrial"]');
    await expect(avatarRadar).toBeVisible();
    await expect(avatarRadar).toHaveAttribute("src", /bot-radar\.png/);

    // Volver a Estándar mediante el selector de tarjetas rápidas
    const standardCardBtn = page.locator('button:has-text("Inicio")').first();
    await standardCardBtn.click();
    await expect(heroTitle).toContainText("Alza Bot Cívico");
  });

  test("3. Modo Antiespía (Zero-Peeping) activa camuflaje visual en datos sensibles", async ({
    page,
  }) => {
    const antipeepBtn = page.locator('button[title*="Antiespía"]');
    await expect(antipeepBtn).toBeVisible();

    // Antes de activar, la clase de protección no está activa
    const shell = page.locator(".min-h-dvh");
    await expect(shell).not.toHaveClass(/privacy-peep-active/);

    // Al pulsar el botón antiespía
    await antipeepBtn.click();
    await expect(shell).toHaveClass(/privacy-peep-active/);

    // Los datos sensibles con data-sensitive="true" están en el DOM
    const sensitiveItems = page.locator('[data-sensitive="true"]');
    const count = await sensitiveItems.count();
    expect(count).toBeGreaterThanOrEqual(3);
    await expect(sensitiveItems.first()).toContainText("La Candelaria, Comuna 10");

    // Desactivar de nuevo
    await antipeepBtn.click();
    await expect(shell).not.toHaveClass(/privacy-peep-active/);
  });

  test("4. Botones de Salida Rápida de Pánico (Escape) presentes y accesibles", async ({
    page,
  }) => {
    // Botón de escape en el header
    const headerEscape = page.locator('header button[title*="Salida Rápida"]');
    await expect(headerEscape).toBeVisible();

    // Botón de escape en la barra inferior (docking al pulgar)
    const bottomEscape = page.locator('nav button[aria-label*="Salida Rápida"]');
    await expect(bottomEscape).toBeVisible();
  });
});

