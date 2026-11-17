import { MIME_TYPES } from "@/lib/recording/contracts";

export type SensorKind = "camera" | "microphone" | "location";

export type SensorCheckStatus =
  | "idle"
  | "requesting"
  | "active"
  | "verified"
  | "denied"
  | "missing"
  | "busy"
  | "unsupported"
  | "insecure"
  | "timeout"
  | "interrupted"
  | "error";

export type PermissionHint = "granted" | "denied" | "prompt" | "unknown";

export interface BrowserCapabilitiesSnapshot {
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasEnumerateDevices: boolean;
  hasMediaRecorder: boolean;
  supportsVideoWebm: boolean;
  supportsVideoWebmFallback: boolean;
  supportsAudioWebm: boolean;
  supportsAudioContext: boolean;
  supportsAudioWorklet: boolean;
  hasGeolocation: boolean;
  cameraDeviceCount: number | null;
  microphoneDeviceCount: number | null;
  permissionHints: Record<SensorKind, PermissionHint>;
}

export interface CameraDetails {
  width: number | null;
  height: number | null;
  frameRate: number | null;
  facingMode: string | null;
  deviceLabel: string | null;
  liveTracksAtPeak: number;
  released: boolean;
  remainingLiveTracks: number;
}

export interface MicrophoneDetails {
  sampleRate: number | null;
  channelCount: number | null;
  deviceLabel: string | null;
  peakLevelDbfs: number | null;
  liveLevelDbfs: number | null;
  signalDetected: boolean;
  audioContextClosed: boolean;
  released: boolean;
  remainingLiveTracks: number;
}

export interface LocationDetails {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

export interface AlternativeAction {
  id: string;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}

export type ToolReadinessStatus =
  | "ready"
  | "limited"
  | "fallback"
  | "untested"
  | "unavailable";

export interface ToolReadinessItem {
  id: string;
  toolName: string;
  href: string;
  status: ToolReadinessStatus;
  summary: string;
}

export const DEVICE_PREVIEW_TIMEOUT_MS = 15_000;
export const SEQUENCE_CAMERA_SAMPLE_MS = 500;
export const SEQUENCE_MIC_SAMPLE_MS = 700;
export const MIC_SIGNAL_THRESHOLD_DBFS = -58;

export function sanitizeDeviceLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 80);
  return cleaned.length > 0 ? cleaned : null;
}

function safeIsTypeSupported(mime: string): boolean {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return false;
  }
  try {
    return MediaRecorder.isTypeSupported(mime);
  } catch {
    return false;
  }
}

export function readPassiveCapabilities(): BrowserCapabilitiesSnapshot {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isSecureContext: true,
      hasMediaDevices: false,
      hasEnumerateDevices: false,
      hasMediaRecorder: false,
      supportsVideoWebm: false,
      supportsVideoWebmFallback: false,
      supportsAudioWebm: false,
      supportsAudioContext: false,
      supportsAudioWorklet: false,
      hasGeolocation: false,
      cameraDeviceCount: null,
      microphoneDeviceCount: null,
      permissionHints: {
        camera: "unknown",
        microphone: "unknown",
        location: "unknown",
      },
    };
  }

  const hasMediaDevices = typeof navigator.mediaDevices?.getUserMedia === "function";
  const hasEnumerateDevices = typeof navigator.mediaDevices?.enumerateDevices === "function";
  const hasMediaRecorder = typeof MediaRecorder !== "undefined";
  const win = window as Window & { webkitAudioContext?: typeof AudioContext };
  const supportsAudioContext =
    typeof window.AudioContext === "function" || typeof win.webkitAudioContext === "function";
  const supportsAudioWorklet = typeof window.AudioWorkletNode === "function";

  return {
    isSecureContext: Boolean(window.isSecureContext),
    hasMediaDevices,
    hasEnumerateDevices,
    hasMediaRecorder,
    supportsVideoWebm: safeIsTypeSupported(MIME_TYPES[0]),
    supportsVideoWebmFallback: safeIsTypeSupported("video/webm"),
    supportsAudioWebm: safeIsTypeSupported(MIME_TYPES[1]),
    supportsAudioContext,
    supportsAudioWorklet,
    hasGeolocation: "geolocation" in navigator && typeof navigator.geolocation?.getCurrentPosition === "function",
    cameraDeviceCount: null,
    microphoneDeviceCount: null,
    permissionHints: {
      camera: "unknown",
      microphone: "unknown",
      location: "unknown",
    },
  };
}

function normalizePermissionState(state: string | undefined): PermissionHint {
  if (state === "granted" || state === "denied" || state === "prompt") {
    return state;
  }
  return "unknown";
}

export async function probePassivePermissionsAndDevices(): Promise<Partial<BrowserCapabilitiesSnapshot>> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {};
  }

  const permissionHints: Record<SensorKind, PermissionHint> = {
    camera: "unknown",
    microphone: "unknown",
    location: "unknown",
  };

  if (navigator.permissions && typeof navigator.permissions.query === "function") {
    const entries: Array<[SensorKind, PermissionName]> = [
      ["camera", "camera" as PermissionName],
      ["microphone", "microphone" as PermissionName],
      ["location", "geolocation"],
    ];

    await Promise.all(
      entries.map(async ([sensor, name]) => {
        try {
          const result = await navigator.permissions.query({ name });
          permissionHints[sensor] = normalizePermissionState(result?.state);
        } catch {
          permissionHints[sensor] = "unknown";
        }
      })
    );
  }

  let cameraDeviceCount: number | null = null;
  let microphoneDeviceCount: number | null = null;

  if (typeof navigator.mediaDevices?.enumerateDevices === "function") {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (Array.isArray(devices)) {
        cameraDeviceCount = devices.filter((device) => device.kind === "videoinput").length;
        microphoneDeviceCount = devices.filter((device) => device.kind === "audioinput").length;
      }
    } catch {
      cameraDeviceCount = null;
      microphoneDeviceCount = null;
    }
  }

  return {
    permissionHints,
    cameraDeviceCount,
    microphoneDeviceCount,
  };
}

function extractErrorName(err: unknown): string {
  if (err instanceof DOMException) {
    return err.name;
  }
  if (err && typeof err === "object" && "name" in err && typeof err.name === "string") {
    return err.name;
  }
  return "";
}

export function classifyMediaError(
  sensor: "camera" | "microphone",
  err: unknown,
  capabilities: BrowserCapabilitiesSnapshot
): { status: SensorCheckStatus; headline: string; detail: string } {
  const sensorName = sensor === "camera" ? "cámara" : "micrófono";

  if (!capabilities.isSecureContext) {
    return {
      status: "insecure",
      headline: "Conexión no segura (sin HTTPS)",
      detail: `El navegador bloquea el acceso a ${sensorName} en páginas sin HTTPS (salvo localhost).`,
    };
  }

  if (!capabilities.hasMediaDevices) {
    return {
      status: "unsupported",
      headline:
        sensor === "camera"
          ? "Cámara no compatible en este navegador"
          : "Micrófono no compatible en este navegador",
      detail: `Este navegador no ofrece acceso web a ${sensorName} (navigator.mediaDevices).`,
    };
  }

  const name = extractErrorName(err);

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      status: "denied",
      headline: `Permiso de ${sensorName} denegado`,
      detail: `El navegador o el sistema bloqueó el acceso a ${sensorName}. Puedes habilitarlo en el icono junto a la dirección web o usar una alternativa sin ${sensorName}.`,
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      status: "missing",
      headline: sensor === "camera" ? "Cámara no detectada" : "Micrófono no detectado",
      detail: `No encontramos ${sensor === "camera" ? "una cámara disponible" : "un micrófono disponible"} en este equipo o está desconectado a nivel del sistema.`,
    };
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      status: "busy",
      headline:
        sensor === "camera" ? "Cámara ocupada o bloqueada" : "Micrófono ocupado o bloqueado",
      detail: `Otra aplicación, videollamada o pestaña está usando ${sensor === "camera" ? "la cámara" : "el micrófono"}, o el sistema impidió abrirlo.`,
    };
  }

  if (name === "SecurityError") {
    return {
      status: "insecure",
      headline: `Acceso a ${sensorName} restringido`,
      detail: "La política de seguridad o contexto del navegador impide activar este sensor aquí.",
    };
  }

  if (name === "AbortError") {
    return {
      status: "interrupted",
      headline: `Prueba de ${sensorName} interrumpida`,
      detail: "La apertura del dispositivo fue cancelada antes de completarse.",
    };
  }

  return {
    status: "error",
    headline: `No fue posible probar ${sensor === "camera" ? "la cámara" : "el micrófono"}`,
    detail: `Ocurrió un fallo al abrir ${sensor === "camera" ? "la cámara" : "el micrófono"} (${name || "error del dispositivo"}).`,
  };
}

export function classifyGeolocationError(
  code: number | undefined,
  capabilities: BrowserCapabilitiesSnapshot
): { status: SensorCheckStatus; headline: string; detail: string } {
  if (!capabilities.isSecureContext) {
    return {
      status: "insecure",
      headline: "Conexión no segura (sin HTTPS)",
      detail: "El navegador exige HTTPS (o localhost) para consultar la ubicación del dispositivo.",
    };
  }

  if (!capabilities.hasGeolocation) {
    return {
      status: "unsupported",
      headline: "Ubicación no soportada",
      detail: "Este navegador no incluye la API de geolocalización.",
    };
  }

  if (code === 1) {
    return {
      status: "denied",
      headline: "Permiso de ubicación denegado",
      detail: "El navegador rechazó el permiso de ubicación. En SOS y Denuncia puedes elegir comuna o escribir tu dirección manualmente.",
    };
  }

  if (code === 2) {
    return {
      status: "missing",
      headline: "Ubicación no disponible en el dispositivo",
      detail: "El hardware o el sistema no pudo determinar ninguna posición (GPS apagado, interior cerrado o equipo sin receptor).",
    };
  }

  if (code === 3) {
    return {
      status: "timeout",
      headline: "Tiempo de espera agotado",
      detail: "El dispositivo tardó demasiado en responder con señal GPS. Puedes reintentar o usar comuna y dirección manual.",
    };
  }

  return {
    status: "error",
    headline: "No se pudo leer la ubicación",
    detail: "El navegador devolvió un fallo de ubicación. Puedes usar la selección manual de comuna.",
  };
}

export function getAlternativesForSensor(
  sensor: SensorKind,
  status: SensorCheckStatus,
  otherStatuses: {
    camera: SensorCheckStatus;
    microphone: SensorCheckStatus;
    location: SensorCheckStatus;
  }
): AlternativeAction[] {
  if (sensor === "camera") {
    const actions: AlternativeAction[] = [];

    if (otherStatuses.microphone === "verified" || otherStatuses.microphone === "idle") {
      actions.push({
        id: "cam-alt-audio-only",
        title: "Grabar evidencia en modo Solo audio",
        description:
          "En Grabar evidencia puedes conservar clips continuos solo con micrófono sin depender de la cámara.",
        href: "/record",
        actionLabel: "Ir a Grabar evidencia",
      });
    }

    actions.push({
      id: "cam-alt-native-photo",
      title: "Adjuntar foto con la cámara nativa o galería",
      description:
        "Denuncia confidencial (limpia EXIF/GPS) y Choques Solo Latas permiten elegir archivos o usar la app de cámara del teléfono.",
      href: "/report",
      actionLabel: "Abrir Denuncia confidencial",
    });

    if (status === "denied") {
      actions.push({
        id: "cam-alt-unblock",
        title: "Cómo habilitar el permiso si cambiaste de opinión",
        description:
          "Toca el icono del candado o ajustes junto a la dirección web, cambia Cámara a Permitir y vuelve a pulsar Probar cámara.",
      });
    } else if (status === "busy") {
      actions.push({
        id: "cam-alt-busy",
        title: "Libera la cámara en otras apps",
        description:
          "Cierra videollamadas o apps de cámara abiertas en segundo plano y pulsa Probar cámara de nuevo.",
      });
    }

    return actions;
  }

  if (sensor === "microphone") {
    const actions: AlternativeAction[] = [
      {
        id: "mic-alt-written-report",
        title: "Usar relato escrito y archivos sin hablar",
        description:
          "Denuncia confidencial y Defensor en retén funcionan completamente por texto y selección de botones sin micrófono.",
        href: "/report",
        actionLabel: "Ir a Denuncia confidencial",
      },
      {
        id: "mic-alt-defender",
        title: "Consultar normas y guiones por texto",
        description:
          "En Defensor en retén tienes presets legales y el asistente de choques Solo Latas sin usar audio.",
        href: "/defender",
        actionLabel: "Abrir Defensor en retén",
      },
      {
        id: "mic-alt-community-map",
        title: "Consultar el mapa barrial sin sonómetro",
        description:
          "Puedes ver el recuento de los últimos 30 días por comuna sin activar el micrófono.",
        href: "/community",
        actionLabel: "Ver mapa barrial",
      },
    ];

    if (status === "denied") {
      actions.unshift({
        id: "mic-alt-unblock",
        title: "Cómo habilitar el micrófono en el navegador",
        description:
          "Abre los ajustes del sitio junto a la barra de dirección, permite Micrófono y vuelve a probar.",
      });
    } else if (status === "busy") {
      actions.unshift({
        id: "mic-alt-busy",
        title: "Cierra llamadas o notas de voz activas",
        description:
          "Si tienes una llamada u otra app grabando, el sistema puede bloquear el micrófono en el navegador.",
      });
    }

    return actions;
  }

  // location
  const actions: AlternativeAction[] = [
    {
      id: "loc-alt-sos-manual",
      title: "Elegir comuna o corregir dirección manualmente en SOS",
      description:
        "En SOS puedes seleccionar cualquiera de las 16 comunas de Medellín o escribir tu dirección exacta para dictar al 123 y compartir por WhatsApp.",
      href: "/sos",
      actionLabel: "Abrir SOS",
    },
    {
      id: "loc-alt-report-reserved",
      title: "Denunciar con comuna manual o ubicación reservada",
      description:
        "Denuncia confidencial no requiere GPS: puedes dejar la ubicación en reserva o indicar solo la comuna.",
      href: "/report",
      actionLabel: "Abrir Denuncia confidencial",
    },
  ];

  if (status === "denied" || status === "missing" || status === "timeout") {
    actions.push({
      id: "loc-alt-check-os",
      title: "Verifica ubicación del teléfono y permiso del sitio",
      description:
        "Confirma que el GPS/Ubicación del sistema esté encendido y que el navegador tenga permiso de ubicación para este sitio.",
    });
  }

  return actions;
}

export function isSensorFailureStatus(status: SensorCheckStatus): boolean {
  return (
    status === "denied" ||
    status === "missing" ||
    status === "busy" ||
    status === "unsupported" ||
    status === "insecure" ||
    status === "timeout" ||
    status === "interrupted" ||
    status === "error"
  );
}

export function computeToolReadiness(
  caps: BrowserCapabilitiesSnapshot,
  states: {
    camera: SensorCheckStatus;
    microphone: SensorCheckStatus;
    location: SensorCheckStatus;
  }
): ToolReadinessItem[] {
  const camFailed = isSensorFailureStatus(states.camera);
  const micFailed = isSensorFailureStatus(states.microphone);
  const locFailed = isSensorFailureStatus(states.location);

  // 1. SOS
  const sosItem: ToolReadinessItem =
    states.location === "verified"
      ? {
          id: "tool-sos",
          toolName: "Emergencia SOS y 123",
          href: "/sos",
          status: "ready",
          summary: "Llamadas 123/155, contactos y ubicación GPS listos.",
        }
      : locFailed
        ? {
            id: "tool-sos",
            toolName: "Emergencia SOS y 123",
            href: "/sos",
            status: "fallback",
            summary:
              "GPS no disponible: funciona con selector manual de las 16 comunas, dirección escrita y llamadas 123.",
          }
        : {
            id: "tool-sos",
            toolName: "Emergencia SOS y 123",
            href: "/sos",
            status: "ready",
            summary:
              "Llamadas y selector manual listos. Prueba Ubicación para validar lectura GPS previa.",
          };

  // 2. Grabar evidencia (/record)
  const canRecordVideoMime = caps.supportsVideoWebm || caps.supportsVideoWebmFallback;
  const canRecordAudioMime = caps.supportsAudioWebm;
  let recordItem: ToolReadinessItem;

  if (!caps.isSecureContext || !caps.hasMediaDevices || !caps.hasMediaRecorder) {
    recordItem = {
      id: "tool-record",
      toolName: "Grabar evidencia continua",
      href: "/record",
      status: "unavailable",
      summary:
        "Falta MediaRecorder o acceso seguro a cámara/micrófono. Usa Denuncia confidencial para adjuntar fotos o relato.",
    };
  } else if (camFailed && micFailed) {
    recordItem = {
      id: "tool-record",
      toolName: "Grabar evidencia continua",
      href: "/record",
      status: "unavailable",
      summary:
        "Ni cámara ni micrófono respondieron. Usa el grabador del sistema y adjunta fotos o texto en Denuncia confidencial.",
    };
  } else if (camFailed && states.microphone === "verified" && canRecordAudioMime) {
    recordItem = {
      id: "tool-record",
      toolName: "Grabar evidencia continua",
      href: "/record",
      status: "fallback",
      summary:
        "Cámara no disponible: el micrófono está verificado para grabar en modo Solo audio.",
    };
  } else if (
    states.camera === "verified" &&
    states.microphone === "verified" &&
    canRecordVideoMime
  ) {
    recordItem = {
      id: "tool-record",
      toolName: "Grabar evidencia continua",
      href: "/record",
      status: "ready",
      summary: "Video y audio WebM verificados y liberados para grabar en /record.",
    };
  } else if (!canRecordVideoMime && canRecordAudioMime) {
    recordItem = {
      id: "tool-record",
      toolName: "Grabar evidencia continua",
      href: "/record",
      status: "fallback",
      summary:
        "Este navegador no admite video WebM; admite Solo audio WebM o fotos en /report.",
    };
  } else if (micFailed && states.camera === "verified") {
    recordItem = {
      id: "tool-record",
      toolName: "Grabar evidencia continua",
      href: "/record",
      status: "limited",
      summary:
        "La cámara respondió, pero el micrófono falló. En /record la grabación de video pide también micrófono.",
    };
  } else {
    recordItem = {
      id: "tool-record",
      toolName: "Grabar evidencia continua",
      href: "/record",
      status: "untested",
      summary:
        "Capacidades WebM compatibles detectadas; prueba Cámara y Micrófono arriba para confirmar permisos.",
    };
  }

  // 3. Denuncia confidencial (/report)
  const reportItem: ToolReadinessItem =
    states.microphone === "verified"
      ? {
          id: "tool-report",
          toolName: "Denuncia confidencial (Escudo Violeta)",
          href: "/report",
          status: "ready",
          summary:
            "Relato escrito, limpieza local de metadatos (JPEG/PNG/WebP/WAV) y nota de voz disponibles.",
        }
      : micFailed || !caps.hasMediaDevices || !caps.hasMediaRecorder
        ? {
            id: "tool-report",
            toolName: "Denuncia confidencial (Escudo Violeta)",
            href: "/report",
            status: "fallback",
            summary:
              "Sin micrófono activo puedes completar la denuncia por texto y adjuntar fotos/audios compatibles.",
          }
        : {
            id: "tool-report",
            toolName: "Denuncia confidencial (Escudo Violeta)",
            href: "/report",
            status: "ready",
            summary:
              "Relato escrito y limpieza de archivos listos; la nota de voz es opcional.",
          };

  // 4. Sonómetro y mapa barrial (/community)
  let communityItem: ToolReadinessItem;
  if (!caps.isSecureContext || !caps.hasMediaDevices || !caps.supportsAudioContext || !caps.supportsAudioWorklet) {
    communityItem = {
      id: "tool-community",
      toolName: "Convivencia y mapa barrial",
      href: "/community",
      status: "fallback",
      summary:
        "Falta AudioWorklet o acceso al micrófono para medir 15 s; el mapa comunitario por comuna sigue disponible.",
    };
  } else if (micFailed) {
    communityItem = {
      id: "tool-community",
      toolName: "Convivencia y mapa barrial",
      href: "/community",
      status: "fallback",
      summary:
        "Micrófono no disponible para el sonómetro de 15 s; puedes consultar el mapa barrial de 30 días.",
    };
  } else if (states.microphone === "verified") {
    communityItem = {
      id: "tool-community",
      toolName: "Convivencia y mapa barrial",
      href: "/community",
      status: "ready",
      summary: "Micrófono y AudioWorklet listos para observación de 15 s y consulta del mapa.",
    };
  } else {
    communityItem = {
      id: "tool-community",
      toolName: "Convivencia y mapa barrial",
      href: "/community",
      status: "untested",
      summary: "AudioWorklet compatible detectado; prueba Micrófono para confirmar permiso.",
    };
  }

  // 5. Defensor en retén y Solo Latas (/defender)
  const defenderItem: ToolReadinessItem = {
    id: "tool-defender",
    toolName: "Defensor en retén y Solo Latas",
    href: "/defender",
    status: "ready",
    summary:
      "Consultas legales por texto y asistente Solo Latas disponibles sin depender de sensores en vivo.",
  };

  return [sosItem, recordItem, reportItem, communityItem, defenderItem];
}
