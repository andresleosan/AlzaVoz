import { test, expect, type Page } from "@playwright/test";

const ALL_ROUTES = [
  "/",
  "/sos",
  "/defender",
  "/record",
  "/report",
  "/device-check",
  "/community",
  "/search",
  "/admin",
] as const;

const ROUTE_CRITICAL_SELECTORS: Record<(typeof ALL_ROUTES)[number], string> = {
  "/": 'main a[href="/sos"]',
  "/sos": 'a[href="tel:123"], button[aria-label*="Emergencias Policía 123"]',
  "/defender": 'button:has-text("Consultor Retenes")',
  "/record": 'button:has-text("Iniciar grabación")',
  "/report": 'button:has-text("Continuar a evidencias y voz")',
  "/device-check": '[data-testid="device-check-run-all"]',
  "/community": 'button:has-text("Observar 15 segundos")',
  "/search": 'button:has-text("Crear aviso")',
  "/admin": 'button:has-text("Acceder al Panel Privado")',
};

async function applyTextZoom200(page: Page) {
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
}

async function mockStaticFriendlyApis(page: Page) {
  await page.route("**/api/community", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        groups: [
          { commune: 10, category: "music", count: 4 },
          { commune: 14, category: "traffic", count: 2 },
        ],
        days: 30,
      }),
    });
  });

  await page.route("**/api/search", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notices: [
            {
              id: "notice-test-t22",
              kind: "person-lost",
              title: "Aviso de prueba para verificación visual",
              description: "Descripción sintética para verificar tableros y tarjetas al 200%.",
              commune: 10,
              eventDate: "2026-11-20",
              createdAt: "2026-11-20T12:00:00.000Z",
            },
          ],
        }),
      });
      return;
    }
    await route.continue();
  });
}

async function assertNoHorizontalOverflow(page: Page, context: string) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    metrics.scrollWidth,
    `Desbordamiento horizontal en ${context}: scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`
  ).toBeLessThanOrEqual(metrics.innerWidth);
}

test.describe("T22 (I012): Texto grande 200 % y reflow 200 %-400 % sin perder acciones", () => {
  test("1. Texto al 200 % en las 9 rutas a 320px, 390px y 1280px mantiene acciones visibles y sin scroll lateral", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await mockStaticFriendlyApis(page);

    for (const viewport of [
      { width: 320, height: 720 },
      { width: 390, height: 844 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      for (const route of ALL_ROUTES) {
        await page.goto(route);
        await applyTextZoom200(page);

        await assertNoHorizontalOverflow(page, `${route} a ${viewport.width}x${viewport.height} (200% texto)`);

        const sizes = await page.evaluate(() => {
          const h1 = document.querySelector("h1");
          const p = document.querySelector("main p") ?? document.querySelector("main button, main a");
          return {
            h1Size: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0,
            bodyControlSize: p ? parseFloat(getComputedStyle(p).fontSize) : 0,
          };
        });
        expect(sizes.h1Size, `h1 debe escalar en ${route}`).toBeGreaterThanOrEqual(36);
        expect(sizes.bodyControlSize, `texto/control debe escalar en ${route}`).toBeGreaterThanOrEqual(22);

        const critical = page.locator(ROUTE_CRITICAL_SELECTORS[route]).first();
        await critical.scrollIntoViewIfNeeded();
        await expect(critical).toBeVisible();
        const box = await critical.boundingBox();
        expect(box, `boundingBox ausente en ${route}`).not.toBeNull();
        expect(box!.x, `acción recortada a la izquierda en ${route}`).toBeGreaterThanOrEqual(-1);
        expect(
          box!.x + box!.width,
          `acción recortada a la derecha en ${route} (${viewport.width}px)`
        ).toBeLessThanOrEqual(viewport.width + 1);
      }
    }
  });

  test("2. Reflow 200 % (640x360) y 400 % (320x256 y 320x180) sin barras sticky bloqueantes ni desbordamiento", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await mockStaticFriendlyApis(page);

    for (const viewport of [
      { width: 640, height: 360 },
      { width: 320, height: 256 },
      { width: 320, height: 180 },
    ]) {
      await page.setViewportSize(viewport);
      for (const route of ALL_ROUTES) {
        await page.goto(route);
        await assertNoHorizontalOverflow(page, `${route} reflow ${viewport.width}x${viewport.height}`);

        if (viewport.height <= 480) {
          const positions = await page.evaluate(() => {
            const chrome = document.querySelector(".app-sticky-chrome");
            const nav = document.querySelector(".bottom-nav");
            return {
              chromePosition: chrome ? getComputedStyle(chrome).position : null,
              navPosition: nav ? getComputedStyle(nav).position : null,
            };
          });
          expect(positions.chromePosition).toBe("static");
          expect(positions.navPosition).toBe("static");
        }
      }
    }

    // Confirmar operabilidad real al 400 % (320x256) navegando desde Inicio a SOS
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto("/");
    const sosLink = page.locator('main a[href="/sos"]').first();
    await sosLink.scrollIntoViewIfNeeded();
    await sosLink.click();
    await expect(page).toHaveURL(/\/sos\/?$/);
    const dialBtn = page.locator('a[href="tel:123"], button[aria-label*="Emergencias Policía 123"]').first();
    await dialBtn.scrollIntoViewIfNeeded();
    await expect(dialBtn).toBeVisible();
  });

  test("3. Formularios y modales de /sos, /report y /defender operan con texto al 200 % en 320px sin solapar banners", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 320, height: 720 });

    // A. /sos: editor manual + SosSharePreviewModal + QuickEscapeLimitsModal
    await page.goto("/sos");
    await applyTextZoom200(page);

    await page.getByTestId("sos-manual-correction-toggle").scrollIntoViewIfNeeded();
    await page.getByTestId("sos-manual-correction-toggle").click();
    await page.locator("#sos-manual-address").fill("Calle 10 con Cra 43A");
    await page.getByTestId("sos-manual-correction-save").click();
    await assertNoHorizontalOverflow(page, "/sos tras corrección manual 200%");

    await page.getByTestId("btn-open-sos-preview").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-open-sos-preview").click();
    await expect(page.getByTestId("sos-share-preview-dialog")).toBeVisible();
    await page.getByTestId("precision-approximate-btn").click();
    await assertNoHorizontalOverflow(page, "SosSharePreviewModal 200%");
    await page.getByTestId("sos-preview-cancel-btn").click();
    await expect(page.getByTestId("sos-share-preview-dialog")).toHaveCount(0);

    await page.getByTestId("open-escape-limits-shell").scrollIntoViewIfNeeded();
    await page.getByTestId("open-escape-limits-shell").click();
    await expect(page.getByTestId("quick-escape-limits-modal")).toBeVisible();
    await assertNoHorizontalOverflow(page, "QuickEscapeLimitsModal 200%");
    await page.getByTestId("close-escape-limits-modal").click();

    // B. /report: banners combinados (Sesión compartida + Modo de práctica) sin solapamiento vertical y Pasos 1->2->3
    await page.goto("/report");
    await applyTextZoom200(page);

    await page.getByTestId("toggle-shared-device-button").click();
    await expect(page.getByTestId("shared-device-banner")).toBeVisible();
    await page.getByTestId("toggle-practice-mode-button").click();
    await expect(page.getByTestId("practice-mode-banner")).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 0));
    const headerBox = await page.locator(".app-header").boundingBox();
    const practiceBox = await page.getByTestId("practice-mode-banner").boundingBox();
    const sharedBox = await page.getByTestId("shared-device-banner").boundingBox();
    expect(headerBox && practiceBox && sharedBox).toBeTruthy();
    expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(practiceBox!.y + 1);
    expect(practiceBox!.y + practiceBox!.height).toBeLessThanOrEqual(sharedBox!.y + 1);
    await assertNoHorizontalOverflow(page, "/report con ambos banners 200%");

    await page.getByTestId("load-practice-report-button").click();
    await page.getByRole("button", { name: "Continuar a evidencias y voz" }).click();
    await expect(page.getByRole("heading", { name: /Paso 2:/ })).toBeVisible();
    await assertNoHorizontalOverflow(page, "/report Paso 2 200%");

    await page.getByRole("button", { name: "Continuar a privacidad y envío" }).click();
    await expect(page.getByRole("heading", { name: /Paso 3:/ })).toBeVisible();
    await page.locator("#contact-pref-safe").click();
    await page.locator("#safe-timeslot-select").selectOption("custom");
    await expect(page.locator("#safe-custom-start-input")).toBeVisible();
    await assertNoHorizontalOverflow(page, "/report Paso 3 contacto seguro 200%");

    // C. /defender: Choques Solo Latas 3 pasos al 200 %
    await page.goto("/defender");
    await applyTextZoom200(page);
    await page.getByRole("button", { name: /Choques "Solo Latas"/ }).click();
    await page.getByRole("button", { name: /1\. Panorámica 360°/ }).click();
    await page.getByRole("button", { name: /2\. Posición en Calzada/ }).click();
    await page.getByRole("button", { name: /3\. Detalle de Daños/ }).click();
    await page.getByRole("button", { name: /4\. Placas y SOAT/ }).click();
    await assertNoHorizontalOverflow(page, "/defender Solo Latas Paso 1 200%");

    await page.getByRole("button", { name: /Despejar Vía y Llenar Datos/ }).click();
    await page.getByLabel("Nombre Conductor A").fill("Andrea Gómez");
    await page.getByLabel("Placa Vehículo A").fill("ABC123");
    await assertNoHorizontalOverflow(page, "/defender Solo Latas Paso 2 200%");

    await page.getByRole("button", { name: "Generar Acta Rápida" }).click();
    await expect(page.getByRole("button", { name: "Copiar acta al portapapeles" })).toBeVisible();
    await assertNoHorizontalOverflow(page, "/defender Solo Latas Paso 3 200%");
  });

  test("4. Excepciones 2D justificadas (/community y /admin) se contienen en regiones enfocables sin desbordar la página", async ({
    page,
  }) => {
    await mockStaticFriendlyApis(page);
    await page.setViewportSize({ width: 320, height: 720 });

    // A. /community tabla y SVG
    await page.goto("/community");
    await applyTextZoom200(page);
    const communityTableWrap = page.locator(".community-table-wrap");
    await expect(communityTableWrap).toHaveAttribute("tabindex", "0");
    await expect(page.getByRole("table")).toBeVisible();
    const svgBox = await page.locator(".commune-map").boundingBox();
    expect(svgBox).not.toBeNull();
    expect(svgBox!.width).toBeLessThanOrEqual(320);
    await assertNoHorizontalOverflow(page, "/community 200% en 320px");

    // B. /admin autenticado con datos sintéticos
    await page.route("**/api/admin/reports**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reports: [
            {
              code: "ALZ-2026-T22001",
              createdAt: "2026-11-26T10:00:00.000Z",
              commune: "Comuna 14 - El Poblado",
              riskLevel: "medio",
              category: "abuso-autoridad-reten",
              status: "radicado",
              attachmentCount: 1,
              recordingSessionId: null,
              adminNotes: "",
              updatedAt: "2026-11-26T10:00:00.000Z",
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto("/admin");
    await applyTextZoom200(page);
    await page.locator("#admin-token-input").fill("token-sintetico-t22");
    await page.getByRole("button", { name: "Acceder al Panel Privado" }).click();

    await expect(page.getByRole("heading", { name: "Panel de Gestión y Acompañamiento" })).toBeVisible();
    const adminTableWrap = page.locator('section[aria-label="Tabla de expedientes"]');
    await expect(adminTableWrap).toHaveAttribute("tabindex", "0");
    await expect(page.getByRole("button", { name: "Ver detalles del expediente ALZ-2026-T22001" })).toBeVisible();
    await assertNoHorizontalOverflow(page, "/admin autenticado 200% en 320px");
  });
});
