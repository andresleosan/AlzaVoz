import { test, expect } from "@playwright/test";

test.describe("T18 — Comprobación previa del dispositivo (Idea I008)", () => {
  test("no pide permisos al abrir y realiza pruebas aceptadas de cámara, micrófono y ubicación sin tráfico de red", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const unexpectedRequests: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.addInitScript(() => {
      const trackedStreams: MediaStream[] = [];
      const trackedAudioContexts: AudioContext[] = [];
      let getUserMediaCalls = 0;
      let geolocationCalls = 0;

      const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices
      );
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        getUserMediaCalls += 1;
        const stream = await origGetUserMedia(constraints);
        trackedStreams.push(stream);
        return stream;
      };

      const OrigAudioContext = window.AudioContext;
      if (OrigAudioContext) {
        const WrappedAudioContext = function (
          this: AudioContext,
          options?: AudioContextOptions
        ) {
          const ctx = new OrigAudioContext(options);
          trackedAudioContexts.push(ctx);
          return ctx;
        } as unknown as typeof AudioContext;
        WrappedAudioContext.prototype = OrigAudioContext.prototype;
        window.AudioContext = WrappedAudioContext;
      }

      navigator.geolocation.getCurrentPosition = (success) => {
        geolocationCalls += 1;
        success({
          coords: {
            latitude: 6.2088,
            longitude: -75.5656,
            accuracy: 22,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now() - 5_000,
          toJSON: () => ({}),
        });
      };

      Object.defineProperty(window, "__deviceCheckSpy", {
        configurable: true,
        value: () => ({
          getUserMediaCalls,
          geolocationCalls,
          liveTracks: trackedStreams.flatMap((s) =>
            s.getTracks().filter((t) => t.readyState === "live")
          ).length,
          totalTracks: trackedStreams.flatMap((s) => s.getTracks()).length,
          openAudioContexts: trackedAudioContexts.filter(
            (c) => c.state !== "closed"
          ).length,
          totalAudioContexts: trackedAudioContexts.length,
        }),
      });
    });

    await page.goto("/device-check");

    // Registrar tráfico de red después de hidratar la ruta
    page.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("/api/") ||
        url.includes("nominatim") ||
        (!url.startsWith("http://127.0.0.1:3000") && !url.startsWith("data:") && !url.startsWith("blob:"))
      ) {
        unexpectedRequests.push(`${req.method()} ${url}`);
      }
    });

    // 1. No debe solicitar permisos automáticamente al cargar
    const initialSpy = await page.evaluate(() =>
      (window as unknown as { __deviceCheckSpy: () => Record<string, number> }).__deviceCheckSpy()
    );
    expect(initialSpy.getUserMediaCalls).toBe(0);
    expect(initialSpy.geolocationCalls).toBe(0);

    // 2. Probar cámara y detener manualmente comprobando liberación
    await page.getByTestId("camera-test-btn").click();
    await expect(page.getByTestId("camera-status-badge")).toContainText("Cámara activa (local)");
    await expect(page.locator('video[aria-label="Vista previa local de la cámara"]')).toBeVisible();
    await expect(page.getByTestId("media-capture-active-banner")).toContainText("Cámara activa");

    const whileCamActive = await page.evaluate(() =>
      (window as unknown as { __deviceCheckSpy: () => Record<string, number> }).__deviceCheckSpy()
    );
    expect(whileCamActive.liveTracks).toBeGreaterThan(0);

    await page.getByTestId("camera-stop-btn").click();
    await expect(page.getByTestId("camera-status-badge")).toContainText("Lista y liberada");
    await expect(page.getByTestId("camera-release-status")).toContainText("0 pistas activas");

    await expect.poll(async () => {
      return await page.evaluate(() =>
        (window as unknown as { __deviceCheckSpy: () => Record<string, number> }).__deviceCheckSpy().liveTracks
      );
    }).toBe(0);

    // 3. Probar micrófono y detener desde el banner sticky global
    await page.getByTestId("microphone-test-btn").click();
    await expect(page.getByTestId("microphone-status-badge")).toContainText("Micrófono activo (local)");
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.getByTestId("media-capture-active-banner")).toContainText("Micrófono activo");

    await page.getByTestId("banner-stop-capture-button").click();
    await expect(page.getByTestId("microphone-status-badge")).toContainText("Listo y liberado");
    await expect(page.getByTestId("microphone-release-status")).toContainText("0 pistas activas");
    await expect(page.getByTestId("microphone-release-status")).toContainText("Audio cerrado");

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const s = (window as unknown as { __deviceCheckSpy: () => Record<string, number> }).__deviceCheckSpy();
        return s.liveTracks === 0 && s.openAudioContexts === 0;
      });
    }).toBe(true);

    // 4. Probar ubicación (solo local, con edad y precisión, sin Nominatim)
    await page.getByTestId("location-test-btn").click();
    await expect(page.getByTestId("location-status-badge")).toContainText("Ubicación leída (local)");
    await expect(page.getByTestId("device-location-freshness-badge")).toContainText("Lectura reciente");
    await expect(page.getByTestId("device-location-precision-label")).toContainText("±22m (buena)");
    await expect(page.getByTestId("device-location-status-panel")).toContainText("6.2088, -75.5656");

    // 5. Verificar Antiespía sobre coordenadas sensibles
    await page.locator('header button[title*="Antiespía"]').click();
    await expect(
      page.getByTestId("device-location-status-panel").locator('[data-sensitive="true"]').first()
    ).toHaveCSS("filter", "blur(8px)");
    await page.locator('header button[title*="Antiespía"]').click();

    // 6. Verificar resumen de herramientas listas
    await expect(page.getByTestId("tool-sos")).toContainText("Disponible");
    await expect(page.getByTestId("tool-record")).toContainText("Disponible");
    await expect(page.getByTestId("tool-report")).toContainText("Disponible");
    await expect(page.getByTestId("tool-community")).toContainText("Disponible");
    await expect(page.getByTestId("tool-defender")).toContainText("Disponible");

    expect(unexpectedRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("comprobar los tres en secuencia ejecuta cámara, micrófono y ubicación liberando todo", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const trackedStreams: MediaStream[] = [];
      const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices
      );
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await origGetUserMedia(constraints);
        trackedStreams.push(stream);
        return stream;
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 6.2442,
            longitude: -75.5812,
            accuracy: 35,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      };
      Object.defineProperty(window, "__seqTracks", {
        configurable: true,
        value: () => ({
          total: trackedStreams.flatMap((s) => s.getTracks()).length,
          live: trackedStreams.flatMap((s) =>
            s.getTracks().filter((t) => t.readyState === "live")
          ).length,
        }),
      });
    });

    await page.goto("/device-check");
    await page.getByTestId("device-check-run-all").click();

    await expect(page.getByTestId("camera-status-badge")).toContainText("Lista y liberada", {
      timeout: 10_000,
    });
    await expect(page.getByTestId("microphone-status-badge")).toContainText("Listo y liberado", {
      timeout: 10_000,
    });
    await expect(page.getByTestId("location-status-badge")).toContainText("Ubicación leída (local)", {
      timeout: 10_000,
    });

    const tracks = await page.evaluate(() =>
      (window as unknown as { __seqTracks: () => { total: number; live: number } }).__seqTracks()
    );
    expect(tracks.total).toBeGreaterThanOrEqual(2);
    expect(tracks.live).toBe(0);
  });

  test("permisos denegados informan causa y muestran alternativas reales", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      };
      navigator.geolocation.getCurrentPosition = (_success, error) => {
        error?.({
          code: 1,
          message: "User denied Geolocation",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      };
    });

    await page.goto("/device-check");

    await page.getByTestId("camera-test-btn").click();
    await expect(page.getByTestId("camera-status-badge")).toContainText("Permiso denegado");
    await expect(page.getByTestId("camera-alternatives")).toContainText("Solo audio");
    await expect(page.getByTestId("camera-alternatives")).toContainText("Denuncia confidencial");

    await page.getByTestId("microphone-test-btn").click();
    await expect(page.getByTestId("microphone-status-badge")).toContainText("Permiso denegado");
    await expect(page.getByTestId("microphone-alternatives")).toContainText("relato escrito");
    await expect(page.getByTestId("microphone-alternatives")).toContainText("Defensor en retén");

    await page.getByTestId("location-test-btn").click();
    await expect(page.getByTestId("location-status-badge")).toContainText("Permiso denegado");
    await expect(page.getByTestId("location-alternatives")).toContainText("16 comunas");

    await expect(page.getByTestId("tool-sos")).toContainText("Con alternativa");
  });

  test("hardware ausente (sin cámara pero con micrófono y sin GPS) detecta el fallo y habilita Solo audio", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices
      );
      navigator.mediaDevices.enumerateDevices = async () => [
        {
          deviceId: "mic-1",
          groupId: "g1",
          kind: "audioinput",
          label: "Micrófono de prueba",
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ];
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (constraints?.video) {
          throw new DOMException("Requested device not found", "NotFoundError");
        }
        return await origGetUserMedia(constraints);
      };
      navigator.geolocation.getCurrentPosition = (_success, error) => {
        error?.({
          code: 2,
          message: "Position unavailable",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      };
    });

    await page.goto("/device-check");

    await expect(page.getByTestId("sensor-card-camera")).toContainText("0");
    await page.getByTestId("camera-test-btn").click();
    await expect(page.getByTestId("camera-status-badge")).toContainText("No detectada");
    await expect(page.getByTestId("camera-alternatives")).toContainText("Solo audio");

    await page.getByTestId("microphone-test-btn").click();
    await expect(page.getByTestId("microphone-status-badge")).toContainText("Micrófono activo (local)");
    await page.getByTestId("microphone-stop-btn").click();
    await expect(page.getByTestId("microphone-status-badge")).toContainText("Listo y liberado");

    await page.getByTestId("location-test-btn").click();
    await expect(page.getByTestId("location-status-badge")).toContainText("No detectada");

    await expect(page.getByTestId("tool-record")).toContainText("Con alternativa");
    await expect(page.getByTestId("tool-record")).toContainText("Solo audio");
  });

  test("reintenta si las restricciones de cámara son estrictas, detecta ocupación e interrupción y libera al navegar o usar escape", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const trackedStreams: MediaStream[] = [];
      let mode = "overconstrained-once";
      const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices
      );

      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (mode === "overconstrained-once") {
          mode = "normal";
          throw new DOMException("Overconstrained", "OverconstrainedError");
        }
        if (mode === "busy") {
          throw new DOMException("Device in use", "NotReadableError");
        }
        const stream = await origGetUserMedia(constraints);
        trackedStreams.push(stream);
        return stream;
      };

      Object.defineProperty(window, "__setCameraMockMode", {
        configurable: true,
        value: (next: string) => {
          mode = next;
        },
      });
      Object.defineProperty(window, "__liveTrackedCount", {
        configurable: true,
        value: () =>
          trackedStreams.flatMap((s) =>
            s.getTracks().filter((t) => t.readyState === "live")
          ).length,
      });
    });

    await page.goto("/device-check");

    // 1. OverconstrainedError hace fallback a { video: true } y abre cámara
    await page.getByTestId("camera-test-btn").click();
    await expect(page.getByTestId("camera-status-badge")).toContainText("Cámara activa (local)");

    // 2. Navegar fuera de /device-check libera las pistas automáticamente y limpia el banner
    await page.locator('nav a[href="/record"]:visible').first().click();
    await expect(page).toHaveURL(/\/record\/?$/);
    await expect(page.getByTestId("media-capture-active-banner")).toHaveCount(0);
    await expect(page.getByTestId("media-capture-stopped-banner")).toHaveCount(0);
    await expect.poll(async () => {
      return await page.evaluate(() =>
        (window as unknown as { __liveTrackedCount: () => number }).__liveTrackedCount()
      );
    }).toBe(0);

    // 3. Probar NotReadableError (ocupada)
    await page.goto("/device-check");
    await page.evaluate(() =>
      (window as unknown as { __setCameraMockMode: (m: string) => void }).__setCameraMockMode("busy")
    );
    await page.getByTestId("camera-test-btn").click();
    await expect(page.getByTestId("camera-status-badge")).toContainText("Ocupada en otra app");

    // 4. Probar interrupción externa de pista (track ended)
    await page.evaluate(() =>
      (window as unknown as { __setCameraMockMode: (m: string) => void }).__setCameraMockMode("normal")
    );
    await page.getByTestId("camera-test-btn").click();
    await expect(page.getByTestId("camera-status-badge")).toContainText("Cámara activa (local)");
    await page.evaluate(() => {
      const video = document.querySelector('video[aria-label="Vista previa local de la cámara"]') as HTMLVideoElement | null;
      const stream = video?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      track?.stop();
      track?.dispatchEvent(new Event("ended"));
    });
    await expect(page.getByTestId("camera-status-badge")).toContainText("Interrumpida");
    await expect(page.getByTestId("camera-alternatives")).toBeVisible();

    // 5. Probar limpieza ante alzavoz:escape y respuesta GPS tardía cancelada
    await page.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        Object.defineProperty(window, "__lateGps", {
          configurable: true,
          value: () =>
            success({
              coords: {
                latitude: 6.29,
                longitude: -75.55,
                accuracy: 15,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON: () => ({}),
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            }),
        });
      };
    });

    await page.getByTestId("location-test-btn").click();
    await expect(page.getByTestId("location-cancel-btn")).toBeVisible();
    await page.getByTestId("location-cancel-btn").click();
    await page.evaluate(() =>
      (window as unknown as { __lateGps?: () => void }).__lateGps?.()
    );
    await expect(page.getByTestId("location-status-badge")).toContainText("Sin probar");

    await page.getByTestId("camera-test-btn").click();
    await expect(page.getByTestId("camera-status-badge")).toContainText("Cámara activa (local)");
    await page.evaluate(() => window.dispatchEvent(new Event("alzavoz:escape")));
    await expect(page.getByTestId("camera-status-badge")).toContainText("Sin probar");
    expect(
      await page.evaluate(() =>
        (window as unknown as { __liveTrackedCount: () => number }).__liveTrackedCount()
      )
    ).toBe(0);
  });

  test("navegador sin APIs de cámara/micrófono ni geolocalización muestra Sin soporte y alternativas", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: undefined,
      });
    });

    await page.goto("/device-check");
    await page.getByTestId("camera-test-btn").click();
    await expect(page.getByTestId("camera-status-badge")).toContainText("Sin soporte");
    await expect(page.getByTestId("camera-alternatives")).toContainText("Denuncia confidencial");

    await page.getByTestId("microphone-test-btn").click();
    await expect(page.getByTestId("microphone-status-badge")).toContainText("Sin soporte");

    await page.getByTestId("location-test-btn").click();
    await expect(page.getByTestId("location-status-badge")).toContainText("Sin soporte");
    await expect(page.getByTestId("location-alternatives")).toContainText("SOS");
  });

  test("accesos desde Inicio, /record y /sos, ergonomía >= 56px y cero desbordamiento en móvil y escritorio", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 320, height: 720 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);

      // Acceso desde Inicio
      await page.goto("/");
      const homeLink = page.getByTestId("home-device-check-link");
      await expect(homeLink).toBeVisible();
      const homeBox = await homeLink.boundingBox();
      expect(homeBox).not.toBeNull();
      expect(homeBox!.height).toBeGreaterThanOrEqual(56);

      await homeLink.click();
      await expect(page).toHaveURL(/\/device-check\/?$/);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow, `desbordamiento en /device-check a ${viewport.width}px`).toBe(false);

      for (const testId of [
        "device-check-run-all",
        "camera-test-btn",
        "microphone-test-btn",
        "location-test-btn",
      ]) {
        const box = await page.getByTestId(testId).boundingBox();
        expect(box, `${testId} visible en ${viewport.width}px`).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(56);
      }
    }

    // Acceso desde /record y /sos
    await page.goto("/record");
    await expect(page.getByTestId("record-device-check-link")).toBeVisible();
    await page.goto("/sos");
    await expect(page.getByTestId("sos-device-check-link")).toBeVisible();
  });
});
