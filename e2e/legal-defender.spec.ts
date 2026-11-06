import { test, expect } from "@playwright/test";

test.describe("Tarea 4: Bloque 1 (Parte B): Alza Bot Defensor Legal en Vivo y Choques 'Solo Latas'", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/defender");
  });

  test("1. Carga de /defender con avatar en Modo Defensor, pestañas táctiles >= 56px y escena oficial", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/Defensor Legal en Vivo & Choques Solo Latas/i);

    // Banner principal con Alza Bot Defensor
    const defenderBanner = page.locator('section[aria-label="Defensor Legal en Vivo y Choques Solo Latas"]');
    await expect(defenderBanner).toBeVisible();

    // Pestañas táctiles
    const tabConsultor = page.locator('button:has-text("Consultor Retenes")');
    const tabSoloLatas = page.locator('button:has-text("Choques \\"Solo Latas\\"")');
    await expect(tabConsultor).toBeVisible();
    await expect(tabSoloLatas).toBeVisible();

    // Validar ergonomía Fitts' Law >= 56px
    const boxConsultor = await tabConsultor.boundingBox();
    expect(boxConsultor).not.toBeNull();
    if (boxConsultor) {
      expect(boxConsultor.height).toBeGreaterThanOrEqual(56);
    }
  });

  test("2. Estructura Rígida de 3 Secciones en Asesoría Legal (Norma Exacta, Guion y Checklist)", async ({
    page,
  }) => {
    // Verificar Bloque 1: Cita de Norma Exacta
    const bloqueNorma = page.locator('section[aria-label="Bloque 1: Cita de Norma Exacta"]');
    await expect(bloqueNorma).toBeVisible();
    await expect(bloqueNorma).toContainText("Ley 1801 de 2016");
    await expect(bloqueNorma).toContainText("Artículo 21");

    // Verificar Bloque 2: Guion para leer al agente
    const bloqueGuion = page.locator('section[aria-label="Bloque 2: Guion para Leer al Agente"]');
    await expect(bloqueGuion).toBeVisible();
    await expect(page.locator('[data-testid="agent-script-text"]')).toBeVisible();
    await expect(bloqueGuion.locator('button[aria-label="Copiar guion al portapapeles"]')).toBeVisible();

    // Verificar Bloque 3: Checklist de pruebas a grabar
    const bloqueChecklist = page.locator('section[aria-label="Bloque 3: Checklist de Pruebas a Grabar"]');
    await expect(bloqueChecklist).toBeVisible();
    const items = bloqueChecklist.locator("li button");
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("3. Conmutación dinámica entre Presets Rápidos (Retén de Tránsito vs Grabar Policía)", async ({
    page,
  }) => {
    // Clic en preset de amenaza de grúa
    const presetGrua = page.locator('button:has-text("Retén: Amenaza de Grúa")');
    await expect(presetGrua).toBeVisible();
    await presetGrua.click();

    // La norma debe actualizarse a Ley 769 de 2002 y Art. 125
    const bloqueNorma = page.locator('section[aria-label="Bloque 1: Cita de Norma Exacta"]');
    await expect(bloqueNorma).toContainText("Ley 769 de 2002");
    await expect(bloqueNorma).toContainText("125");

    // El guion debe contener referencia a los 60 minutos de subsanación
    const script = page.locator('[data-testid="agent-script-text"]');
    await expect(script).toContainText("60 minutos");
  });

  test("4. Interactividad en el Checklist de Pruebas en Vivo", async ({
    page,
  }) => {
    const bloqueChecklist = page.locator('section[aria-label="Bloque 3: Checklist de Pruebas a Grabar"]');
    const firstCheckItem = bloqueChecklist.locator("li button").first();

    // Estado inicial no marcado
    await expect(firstCheckItem).toHaveAttribute("aria-pressed", "false");

    // Clic para marcar
    await firstCheckItem.click();
    await expect(firstCheckItem).toHaveAttribute("aria-pressed", "true");
  });

  test("5. Asistente de Choques 'Solo Latas' (Paso 1: Fotos, Paso 2: Datos, Paso 3: Acta con Ley 2251)", async ({
    page,
  }) => {
    // Cambiar a la pestaña de Solo Latas
    const tabSoloLatas = page.locator('button:has-text("Choques \\"Solo Latas\\"")');
    await tabSoloLatas.click();

    const soloLatasSec = page.locator('div[aria-label="Asistente de Choques Solo Latas"]');
    await expect(soloLatasSec).toBeVisible();
    await expect(soloLatasSec).toContainText("Ley 2251 de 2022");

    // Botón continuar inicialmente deshabilitado
    const nextBtn = page.locator('button:has-text("Faltan 4 Fotos Obligatorias")');
    await expect(nextBtn).toBeDisabled();

    // Tomar las 4 fotos
    await page.locator('button:has-text("1. Panorámica 360°")').click();
    await page.locator('button:has-text("2. Posición en Calzada")').click();
    await page.locator('button:has-text("3. Detalle de Daños")').click();
    await page.locator('button:has-text("4. Placas y SOAT")').click();

    // El botón se habilita
    const readyBtn = page.locator('button:has-text("¡Fotos Listas! Despejar Vía y Llenar Datos")');
    await expect(readyBtn).toBeEnabled();
    await readyBtn.click({ force: true });

    // Paso 2: Llenar datos de conductores
    const inputConductorA = page.locator('input[aria-label="Nombre Conductor A"]');
    await expect(inputConductorA).toBeVisible();
    await inputConductorA.fill("Carlos Morales");

    const inputPlacaA = page.locator('input[aria-label="Placa Vehículo A"]');
    await inputPlacaA.fill("ENV-456");

    const inputConductorB = page.locator('input[aria-label="Nombre Conductor B"]');
    await inputConductorB.fill("Mariana Restrepo");

    const inputPlacaB = page.locator('input[aria-label="Placa Vehículo B"]');
    await inputPlacaB.fill("MED-789");

    // Avanzar a generar acta
    const genActaBtn = page.locator('button:has-text("Generar Acta Rápida")');
    await genActaBtn.click({ force: true });

    // Paso 3: Acta Amistosa generada
    const paso3 = page.locator('section[aria-label="Paso 3: Acta Rápida de Conciliación"]');
    await expect(paso3).toBeVisible();
    await expect(paso3).toContainText("¡Acta Digital Generada Exitosamente!");
    await expect(paso3).toContainText("Ley 2251 de 2022");
    await expect(paso3).toContainText("ENV-456");
    await expect(paso3).toContainText("MED-789");
    await expect(paso3).toContainText("infracción C.03");

    // Botones de acción
    await expect(page.locator('button[aria-label="Copiar acta al portapapeles"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Compartir acta por WhatsApp"]')).toBeVisible();
  });

  test("6. El acceso de inicio abre el flujo de defensor en su propia pantalla", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('main a[href="/defender"]').click();
    await expect(page).toHaveURL(/\/defender\/?$/);
    await expect(page.locator('section[aria-label="Defensor Legal en Vivo y Choques Solo Latas"]')).toBeVisible();
  });
});
