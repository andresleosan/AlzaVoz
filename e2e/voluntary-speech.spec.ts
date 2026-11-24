import { test, expect, type Page } from "@playwright/test";
import { LEGAL_RESPONSES_REPOSITORY } from "../src/data/legalKnowledgeBase";
import {
  buildLegalResponseSegments,
  buildSoloLatasStepSegments,
  buildSpeechQueue,
  chunkSegmentText,
  sanitizeSpeechText,
  selectSpanishVoice,
} from "../src/lib/speech/readAloud";

interface SpeechSpySnapshot {
  spokenTexts: string[];
  utterances: Array<{ text: string; lang: string; voiceName: string | null }>;
  cancelCalls: number;
  speaking: boolean;
}

async function installSpeechSynthesisStub(
  page: Page,
  options: {
    unsupported?: boolean;
    failErrorCode?: string | null;
    voices?: Array<{ name: string; lang: string; localService: boolean }>;
  } = {}
) {
  await page.addInitScript(
    ({ unsupported, failErrorCode, voices }) => {
      if (unsupported) {
        Object.defineProperty(window, "speechSynthesis", {
          configurable: true,
          writable: true,
          value: undefined,
        });
        return;
      }

      const spokenTexts: string[] = [];
      const utterances: Array<{
        text: string;
        lang: string;
        voiceName: string | null;
      }> = [];
      let cancelCalls = 0;
      let nextFailCode: string | null = failErrorCode ?? null;

      interface StubUtterance {
        text: string;
        lang: string;
        voice: SpeechSynthesisVoice | null;
        rate: number;
        pitch: number;
        volume: number;
        onstart: ((ev: Event) => void) | null;
        onend: ((ev: Event) => void) | null;
        onerror: ((ev: { error: string }) => void) | null;
      }

      let activeUtterance: StubUtterance | null = null;

      class StubSpeechSynthesisUtterance {
        text: string;
        lang = "";
        voice: SpeechSynthesisVoice | null = null;
        rate = 1;
        pitch = 1;
        volume = 1;
        onstart: ((ev: Event) => void) | null = null;
        onend: ((ev: Event) => void) | null = null;
        onerror: ((ev: { error: string }) => void) | null = null;

        constructor(text = "") {
          this.text = String(text);
        }
      }

      const stubVoices: SpeechSynthesisVoice[] = (voices ?? []).map((voice) => ({
        default: false,
        lang: voice.lang,
        localService: voice.localService,
        name: voice.name,
        voiceURI: voice.name,
      }));

      const stubSynth = {
        speaking: false,
        pending: false,
        paused: false,
        getVoices() {
          return stubVoices;
        },
        speak(rawUtterance: StubUtterance) {
          spokenTexts.push(rawUtterance.text);
          utterances.push({
            text: rawUtterance.text,
            lang: rawUtterance.lang,
            voiceName: rawUtterance.voice?.name ?? null,
          });
          activeUtterance = rawUtterance;
          stubSynth.speaking = true;

          queueMicrotask(() => {
            if (activeUtterance !== rawUtterance) return;
            rawUtterance.onstart?.(new Event("start"));

            if (nextFailCode) {
              const code = nextFailCode;
              nextFailCode = null;
              activeUtterance = null;
              stubSynth.speaking = false;
              rawUtterance.onerror?.({ error: code });
            }
          });
        },
        cancel() {
          cancelCalls += 1;
          const notify = (
            window as unknown as { __notifySpeechCancel?: () => void }
          ).__notifySpeechCancel;
          notify?.();
          if (activeUtterance) {
            const aborted = activeUtterance;
            activeUtterance = null;
            stubSynth.speaking = false;
            stubSynth.pending = false;
            aborted.onerror?.({ error: "canceled" });
          } else {
            stubSynth.speaking = false;
            stubSynth.pending = false;
          }
        },
        pause() {
          stubSynth.paused = true;
        },
        resume() {
          stubSynth.paused = false;
        },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return true;
        },
      };

      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        writable: true,
        value: StubSpeechSynthesisUtterance,
      });

      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        writable: true,
        value: stubSynth,
      });

      Object.defineProperty(window, "__speechSpy", {
        configurable: true,
        value: {
          snapshot: (): SpeechSpySnapshot => ({
            spokenTexts: [...spokenTexts],
            utterances: [...utterances],
            cancelCalls,
            speaking: stubSynth.speaking,
          }),
          completeNext: (): boolean => {
            if (!activeUtterance) return false;
            const current = activeUtterance;
            activeUtterance = null;
            stubSynth.speaking = false;
            current.onend?.(new Event("end"));
            return true;
          },
          setFailErrorCode: (code: string | null) => {
            nextFailCode = code;
          },
        },
      });
    },
    {
      unsupported: Boolean(options.unsupported),
      failErrorCode: options.failErrorCode ?? null,
      voices:
        options.voices ?? [
          { name: "English US", lang: "en-US", localService: true },
          { name: "Español Colombia Local", lang: "es-CO", localService: true },
        ],
    }
  );
}

async function getSpeechSpySnapshot(page: Page): Promise<SpeechSpySnapshot> {
  return page.evaluate(() =>
    (
      window as unknown as { __speechSpy: { snapshot: () => SpeechSpySnapshot } }
    ).__speechSpy.snapshot()
  );
}

async function completeAllQueuedSpeech(page: Page, maxSteps = 30): Promise<number> {
  let completed = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    const didComplete = await page.evaluate(() =>
      (
        window as unknown as { __speechSpy: { completeNext: () => boolean } }
      ).__speechSpy.completeNext()
    );
    if (!didComplete) break;
    completed += 1;
    await page.waitForTimeout(10);
  }
  return completed;
}

test.describe("T20 — Lectura voluntaria de indicaciones (Idea I010)", () => {
  test("1. Lógica pura: segmentación, fragmentación <= 220 caracteres, selección de voz y cero PII en Solo Latas", () => {
    const clean = sanitizeSpeechText("  «Texto» con *marcas* \n y\t\tespacios  ");
    expect(clean).toBe("Texto con marcas y espacios");

    const longText =
      "Primera oración corta sobre el Artículo 21 de la Ley 1801. " +
      "Segunda oración suficientemente extensa para exigir fragmentación ordenada sin perder palabras ni cortar términos relevantes en el navegador Chromium durante la lectura de defensa ciudadana en vía pública. " +
      "Tercera oración breve de cierre.";
    const chunks = chunkSegmentText(longText, 120);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(120);
    }
    expect(chunks.join(" ")).toBe(longText);

    const unbrokenWord = "A".repeat(250);
    const wordChunks = chunkSegmentText(unbrokenWord, 100);
    expect(wordChunks).toEqual(["A".repeat(100), "A".repeat(100), "A".repeat(50)]);

    const baseResponse = LEGAL_RESPONSES_REPOSITORY["preset-grabar-policia"];
    const fullSegments = buildLegalResponseSegments(baseResponse, "full");
    expect(fullSegments.map((s) => s.id)).toEqual([
      "norm",
      "script",
      "checklist",
      "warning",
    ]);

    const scriptSegments = buildLegalResponseSegments(baseResponse, "script");
    expect(scriptSegments.map((s) => s.id)).toEqual(["script", "tone"]);

    const queue = buildSpeechQueue(fullSegments, 220);
    expect(queue.length).toBeGreaterThanOrEqual(fullSegments.length);
    for (const item of queue) {
      expect(item.text.length).toBeLessThanOrEqual(220);
    }

    for (const step of [1, 2, 3] as const) {
      const stepSegments = buildSoloLatasStepSegments(step);
      expect(stepSegments.length).toBe(2);
      const joined = stepSegments.map((s) => s.text).join(" ");
      expect(joined).not.toMatch(/Conductor [AB]|XXX-000|YYY-111|Calle 50/i);
    }

    const picked = selectSpanishVoice([
      { default: false, lang: "en-US", localService: true, name: "US", voiceURI: "US" },
      { default: false, lang: "es-ES", localService: true, name: "ES", voiceURI: "ES" },
      { default: false, lang: "es-MX", localService: false, name: "MX", voiceURI: "MX" },
      { default: false, lang: "es-CO", localService: false, name: "CO-Net", voiceURI: "CO-Net" },
      { default: false, lang: "es-CO", localService: true, name: "CO-Local", voiceURI: "CO-Local" },
    ]);
    expect(picked?.name).toBe("CO-Local");
    expect(selectSpanishVoice([])).toBeNull();
  });

  test("2. Silencio estricto al cargar, al cambiar de preset y al abrir Solo Latas, con 0 peticiones de red", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const unexpectedRequests: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await installSpeechSynthesisStub(page);
    await page.goto("/defender");

    page.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("/api/") ||
        (!url.startsWith("http://127.0.0.1:3000") &&
          !url.startsWith("data:") &&
          !url.startsWith("blob:"))
      ) {
        unexpectedRequests.push(`${req.method()} ${url}`);
      }
    });

    await expect(page.getByTestId("voluntary-speech-control")).toBeVisible();
    await expect(page.getByTestId("speech-toggle-button")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    await expect(page.getByTestId("speech-status")).toContainText(
      "Audio apagado por defecto"
    );
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);

    // Cambiar de preset no debe iniciar locución
    await page.locator('button:has-text("Retén: Amenaza de Grúa")').click();
    await expect(
      page.locator('section[aria-label="Bloque 1: Cita de Norma Exacta"]')
    ).toContainText("Ley 769 de 2002");

    // Cambiar a Choques "Solo Latas" tampoco debe iniciar locución
    await page.locator('button:has-text("Choques \\"Solo Latas\\"")').click();
    await expect(page.getByTestId("voluntary-speech-control")).toBeVisible();

    const spy = await getSpeechSpySnapshot(page);
    expect(spy.spokenTexts).toEqual([]);
    expect(spy.speaking).toBe(false);
    expect(unexpectedRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("3. Inicio voluntario, avance bloque a bloque, cambio de alcance y parada inline o desde barra flotante", async ({
    page,
  }) => {
    const unexpectedRequests: string[] = [];
    await installSpeechSynthesisStub(page);
    await page.goto("/defender");

    page.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("/api/") ||
        (!url.startsWith("http://127.0.0.1:3000") &&
          !url.startsWith("data:") &&
          !url.startsWith("blob:"))
      ) {
        unexpectedRequests.push(`${req.method()} ${url}`);
      }
    });

    // Iniciar lectura del resumen completo (4 bloques)
    await page.getByTestId("speech-toggle-button").click();

    await expect(page.getByTestId("speech-toggle-button")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByTestId("speech-toggle-button")).toContainText(
      "Detener lectura"
    );
    await expect(page.getByTestId("speech-sticky-stop-bar")).toBeVisible();
    await expect(page.getByTestId("speech-status")).toContainText("Leyendo bloque 1/4");

    const spyStart = await getSpeechSpySnapshot(page);
    expect(spyStart.utterances.length).toBe(1);
    expect(spyStart.utterances[0].lang).toBe("es-CO");
    expect(spyStart.utterances[0].voiceName).toBe("Español Colombia Local");

    // Completar toda la cola para comprobar avance y cierre limpio
    const chunksSpoken = await completeAllQueuedSpeech(page);
    expect(chunksSpoken).toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId("speech-status")).toContainText(
      "Lectura finalizada"
    );
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);

    // Cambiar a alcance "Solo guion" y detener desde la barra flotante tras hacer scroll
    await page.getByTestId("speech-scope-script").click();
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-status")).toContainText("Leyendo bloque 1/2");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const stickyStopBtn = page.getByTestId("speech-sticky-stop-button");
    await expect(stickyStopBtn).toBeVisible();
    await stickyStopBtn.click();

    await expect(page.getByTestId("speech-status")).toContainText("Lectura detenida");
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);

    // Iniciar de nuevo y detener con el botón inline
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-toggle-button")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-status")).toContainText("Lectura detenida");
    await expect(page.getByTestId("speech-status")).not.toContainText("No se pudo");

    const spyEnd = await getSpeechSpySnapshot(page);
    expect(spyEnd.cancelCalls).toBeGreaterThanOrEqual(2);
    expect(spyEnd.speaking).toBe(false);
    expect(unexpectedRequests).toEqual([]);
  });

  test("4. Detención automática ante cambio de preset, Antiespía, cambio de pestaña, paso Solo Latas (sin PII), ruta y Salida Rápida", async ({
    page,
  }) => {
    await installSpeechSynthesisStub(page);
    await page.goto("/defender");

    // a) Cambiar preset mientras habla
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toBeVisible();
    await page.locator('button:has-text("Retén: Amenaza de Grúa")').click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    await expect(page.getByTestId("speech-status")).toContainText(
      "Audio apagado por defecto"
    );
    expect((await getSpeechSpySnapshot(page)).cancelCalls).toBe(1);

    // b) Activar Modo Antiespía mientras habla
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toBeVisible();
    await page.locator('button[aria-label*="modo antiespía"]').click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    await expect(page.getByTestId("speech-status")).toContainText(
      "silenciada por Modo Antiespía"
    );
    expect((await getSpeechSpySnapshot(page)).cancelCalls).toBe(2);
    // Desactivar Antiespía para seguir probando
    await page.locator('button[aria-label*="modo antiespía"]').click();

    // c) Cambiar de pestaña a Choques "Solo Latas" mientras habla
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toBeVisible();
    await page.locator('button:has-text("Choques \\"Solo Latas\\"")').click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    expect((await getSpeechSpySnapshot(page)).cancelCalls).toBe(3);

    // d) En Solo Latas: iniciar lectura en Paso 1, avanzar al Paso 2, rellenar PII y comprobar cero filtración al hablar
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-status")).toContainText("Leyendo bloque 1/2");

    await page.locator('button:has-text("1. Panorámica 360°")').click();
    await page.locator('button:has-text("2. Posición en Calzada")').click();
    await page.locator('button:has-text("3. Detalle de Daños")').click();
    await page.locator('button:has-text("4. Placas y SOAT")').click();
    await page.locator('button:has-text("¡Fotos Listas! Despejar Vía y Llenar Datos")').click();

    // Al cambiar al Paso 2 debe detenerse la lectura del Paso 1
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    expect((await getSpeechSpySnapshot(page)).cancelCalls).toBe(4);

    // Rellenar datos personales ficticios en Paso 2 y escuchar indicaciones del Paso 2
    await page.locator('input[aria-label="Nombre Conductor A"]').fill("Carlos Prueba PII");
    await page.locator('input[aria-label="Placa Vehículo A"]').fill("PII-999");
    await page.locator('input[aria-label="Teléfono Conductor A"]').fill("3001112233");

    await page.getByTestId("speech-toggle-button").click();
    await completeAllQueuedSpeech(page, 10);
    const afterStep2 = await getSpeechSpySnapshot(page);
    const spokenStep2Joined = afterStep2.spokenTexts.join(" ");
    expect(spokenStep2Joined).not.toContain("Carlos Prueba PII");
    expect(spokenStep2Joined).not.toContain("PII-999");
    expect(spokenStep2Joined).not.toContain("3001112233");

    // e) Evento alzavoz:escape mientras habla
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event("alzavoz:escape")));
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    await expect(page.getByTestId("speech-status")).toContainText("Lectura detenida");
    expect((await getSpeechSpySnapshot(page)).cancelCalls).toBe(5);

    // f) Evento alzavoz:shared-session-clear mientras habla
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toBeVisible();
    await page.evaluate(() =>
      window.dispatchEvent(new Event("alzavoz:shared-session-clear"))
    );
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    await expect(page.getByTestId("speech-status")).toContainText("Lectura detenida");
    expect((await getSpeechSpySnapshot(page)).cancelCalls).toBe(6);

    // g) Navegar a otra ruta mientras habla y regresar con Atrás sin estado fantasma
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toBeVisible();
    await page.locator('a[href="/"]:visible').first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    expect((await getSpeechSpySnapshot(page)).cancelCalls).toBe(7);

    await page.goBack();
    await expect(page).toHaveURL(/\/defender\/?$/);
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    await expect(page.getByTestId("speech-toggle-button")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    await expect(page.getByTestId("speech-status")).toHaveText(
      /Audio apagado por defecto|Lectura detenida/
    );
    expect((await getSpeechSpySnapshot(page)).speaking).toBe(false);
  });

  test("5. QuickEscapeButton (Salir Rápido) cancela síncronamente la síntesis antes de salir", async ({
    page,
  }) => {
    let cancelNotifications = 0;
    await page.exposeFunction("__notifySpeechCancel", () => {
      cancelNotifications += 1;
    });

    await page.route("https://www.google.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>OK</body></html>" })
    );

    await installSpeechSynthesisStub(page);
    await page.goto("/defender");

    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toBeVisible();

    await page.locator('header button[aria-label*="Salida Rápida"]').click();
    await expect(page).toHaveURL(/google\.com/);
    expect(cancelNotifications).toBeGreaterThanOrEqual(1);
  });

  test("6. Alternativa silenciosa equivalente detiene el audio y conserva los bloques completos", async ({
    page,
  }) => {
    await installSpeechSynthesisStub(page);
    await page.goto("/defender");

    // Iniciar audio y luego optar por la alternativa silenciosa
    await page.getByTestId("speech-toggle-button").click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toBeVisible();

    await page.getByTestId("speech-silent-button").click();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    await expect(page.getByTestId("speech-status")).toContainText("Lectura detenida");

    const silentPanel = page.getByTestId("speech-silent-panel");
    await expect(silentPanel).toBeVisible();
    await expect(silentPanel).toContainText("Alternativa silenciosa equivalente");
    await expect(silentPanel).toContainText("1. Norma clave");
    await expect(silentPanel).toContainText("2. Guion sugerido");
    await expect(silentPanel).toContainText("3. Qué grabar");
    await expect(silentPanel).toContainText("4. Advertencia crucial");

    // Los 3 bloques originales permanecen intactos en pantalla
    await expect(
      page.locator('section[aria-label="Bloque 1: Cita de Norma Exacta"]')
    ).toBeVisible();
    await expect(page.getByTestId("agent-script-text")).toBeVisible();
    await expect(
      page.locator('section[aria-label="Bloque 3: Checklist de Pruebas a Grabar"]')
    ).toBeVisible();
  });

  test("7. Degradación sin síntesis de voz y ante fallo de motor en tiempo de ejecución", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    // Caso A: navegador sin window.speechSynthesis
    await installSpeechSynthesisStub(page, { unsupported: true });
    await page.goto("/defender");

    const toggleBtn = page.getByTestId("speech-toggle-button");
    await expect(toggleBtn).toBeDisabled();
    await expect(toggleBtn).toContainText("Voz no disponible en este navegador");
    await expect(page.getByTestId("speech-status")).toContainText(
      "no ofrece síntesis de voz local"
    );
    await expect(page.getByTestId("speech-silent-panel")).toBeVisible();
    await expect(page.getByTestId("agent-script-text")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("8. Fallo del motor en onerror abre automáticamente la alternativa silenciosa sin errores de consola", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await installSpeechSynthesisStub(page, { failErrorCode: "synthesis-unavailable" });
    await page.goto("/defender");

    await expect(page.getByTestId("speech-silent-panel")).toHaveCount(0);
    await page.getByTestId("speech-toggle-button").click();

    await expect(page.getByTestId("speech-status")).toContainText(
      "no ofrece síntesis de voz local"
    );
    await expect(page.getByTestId("speech-silent-panel")).toBeVisible();
    await expect(page.getByTestId("speech-sticky-stop-bar")).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });

  test("9. Ergonomía >= 56 px, barra flotante visible sobre bottom-nav y cero desbordamiento en 320px, 390px y 1440px", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await installSpeechSynthesisStub(page);

    for (const viewport of [
      { width: 320, height: 720 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/defender");

      for (const testId of [
        "speech-scope-full",
        "speech-scope-script",
        "speech-toggle-button",
        "speech-silent-button",
      ]) {
        const box = await page.getByTestId(testId).boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(56);
          expect(box.width).toBeGreaterThanOrEqual(56);
        }
      }

      // Abrir lectura y validar barra flotante en viewport + detención
      await page.getByTestId("speech-toggle-button").click();
      const stickyBar = page.getByTestId("speech-sticky-stop-bar");
      const stickyStop = page.getByTestId("speech-sticky-stop-button");
      await expect(stickyBar).toBeVisible();
      const stopBox = await stickyStop.boundingBox();
      expect(stopBox).not.toBeNull();
      if (stopBox) {
        expect(stopBox.height).toBeGreaterThanOrEqual(56);
        expect(stopBox.width).toBeGreaterThanOrEqual(56);
        expect(stopBox.y + stopBox.height).toBeLessThanOrEqual(viewport.height);
      }
      await stickyStop.click();

      // Abrir resumen silencioso y comprobar ausencia de scroll horizontal
      await page.getByTestId("speech-silent-button").click();
      await expect(page.getByTestId("speech-silent-panel")).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
    }

    expect(consoleErrors).toEqual([]);
  });
});
