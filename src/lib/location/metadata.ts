export const LOCATION_STALE_THRESHOLD_MS = 120_000;
export const ACCURACY_GOOD_MAX_METERS = 50;
export const ACCURACY_MODERATE_MAX_METERS = 150;

export type LocationFreshness = "recent" | "stale" | "manual" | "none";
export type LocationPrecisionLevel =
  | "good"
  | "moderate"
  | "imprecise"
  | "unknown"
  | "manual"
  | "none";
export type LocationSourceKind = "gps" | "manual" | null;
export type LocationStatusKind = "idle" | "loading" | "success" | "denied" | "error";
export type ManualLocationKind = "zone" | "corrected";

export interface LocationAssessmentInput {
  source: LocationSourceKind;
  manualKind?: ManualLocationKind;
  status: LocationStatusKind;
  timestamp: number | null;
  accuracy: number | null;
  now?: number | null;
}

export interface LocationAssessment {
  freshness: LocationFreshness;
  freshnessLabel: string;
  precisionLevel: LocationPrecisionLevel;
  precisionLabel: string;
  accuracyShort: string | null;
  ageMs: number | null;
  obtainedAtLabel: string | null;
  relativeAgeLabel: string | null;
  isStale: boolean;
  isImprecise: boolean;
  needsAttention: boolean;
  warningMessages: string[];
}

export function normalizeTimestamp(
  rawTimestamp: unknown,
  fallbackMs: number = Date.now()
): number {
  if (
    typeof rawTimestamp === "number" &&
    Number.isFinite(rawTimestamp) &&
    rawTimestamp > 0
  ) {
    return Math.round(rawTimestamp);
  }
  return fallbackMs;
}

export function normalizeAccuracy(rawAccuracy: unknown): number | null {
  if (
    typeof rawAccuracy === "number" &&
    Number.isFinite(rawAccuracy) &&
    rawAccuracy >= 0
  ) {
    return rawAccuracy;
  }
  return null;
}

export function formatColombiaClockTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString().slice(11, 19);
  }
}

export function formatColombiaDateTime(timestamp: number): string {
  try {
    const dateObj = new Date(timestamp);
    const time = formatColombiaClockTime(timestamp);
    const date = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
    }).format(dateObj);
    return `${time} COT (${date})`;
  } catch {
    return new Date(timestamp).toISOString();
  }
}

export function formatRelativeAge(ageMs: number): string {
  const clamped = Math.max(0, Math.floor(ageMs));
  const totalSeconds = Math.floor(clamped / 1000);
  if (totalSeconds < 5) {
    return "hace unos segundos";
  }
  if (totalSeconds < 60) {
    return `hace ${totalSeconds} s`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `hace ${totalMinutes} min`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return remainingMinutes > 0
      ? `hace ${totalHours} h ${remainingMinutes} min`
      : `hace ${totalHours} h`;
  }
  const totalDays = Math.floor(totalHours / 24);
  return totalDays === 1 ? "hace 1 día" : `hace ${totalDays} días`;
}

export function assessLocation(input: LocationAssessmentInput): LocationAssessment {
  const effectiveNow =
    typeof input.now === "number" && Number.isFinite(input.now)
      ? input.now
      : input.timestamp;

  const ageMs =
    input.timestamp !== null && effectiveNow !== null
      ? Math.max(0, effectiveNow - input.timestamp)
      : null;

  const obtainedAtLabel =
    input.timestamp !== null ? formatColombiaClockTime(input.timestamp) : null;
  const relativeAgeLabel = ageMs !== null ? formatRelativeAge(ageMs) : null;

  const normalizedAccuracy = normalizeAccuracy(input.accuracy);
  const roundedAccuracy =
    normalizedAccuracy !== null ? Math.round(normalizedAccuracy) : null;
  const accuracyShort = roundedAccuracy !== null ? `±${roundedAccuracy}m` : null;

  let precisionLevel: LocationPrecisionLevel = "none";
  let precisionLabel = "Sin ubicación confirmada";

  if (input.source === "manual") {
    precisionLevel = "manual";
    precisionLabel =
      input.manualKind === "corrected"
        ? "Corregida manualmente (sin GPS)"
        : "Zona elegida manualmente (sin GPS)";
  } else if (input.source === "gps") {
    if (roundedAccuracy === null) {
      precisionLevel = "unknown";
      precisionLabel = "Precisión no reportada por el dispositivo";
    } else if (roundedAccuracy <= ACCURACY_GOOD_MAX_METERS) {
      precisionLevel = "good";
      precisionLabel = `Precisión: ±${roundedAccuracy}m (buena)`;
    } else if (roundedAccuracy <= ACCURACY_MODERATE_MAX_METERS) {
      precisionLevel = "moderate";
      precisionLabel = `Precisión: ±${roundedAccuracy}m (aproximada)`;
    } else {
      precisionLevel = "imprecise";
      precisionLabel = `Precisión: ±${roundedAccuracy}m (baja / imprecisa)`;
    }
  } else if (input.status === "denied") {
    precisionLabel = "Permiso de ubicación denegado";
  } else if (input.status === "error") {
    precisionLabel = "Señal GPS no disponible";
  }

  let freshness: LocationFreshness = "none";
  let freshnessLabel = "Sin lectura";
  let isStale = false;

  if (input.source === "manual") {
    freshness = "manual";
    freshnessLabel =
      input.manualKind === "corrected"
        ? "Corregida manualmente"
        : "Zona elegida manualmente";
  } else if (input.source === "gps" && input.timestamp !== null) {
    isStale = ageMs !== null && ageMs >= LOCATION_STALE_THRESHOLD_MS;
    freshness = isStale ? "stale" : "recent";
    freshnessLabel = isStale ? "Lectura antigua" : "Lectura reciente";
  } else if (input.status === "loading") {
    freshnessLabel = "Consultando señal";
  } else if (input.status === "denied") {
    freshnessLabel = "Permiso denegado";
  } else if (input.status === "error") {
    freshnessLabel = "GPS no disponible";
  }

  const isImprecise = precisionLevel === "imprecise";
  const warningMessages: string[] = [];

  if (isStale) {
    warningMessages.push(
      "Esta lectura tiene más de 2 minutos y puede no reflejar tu ubicación actual. Actualiza el GPS o corrígela manualmente."
    );
  }
  if (isImprecise && roundedAccuracy !== null) {
    warningMessages.push(
      `Margen de error amplio (±${roundedAccuracy}m). Confirma un punto de referencia o corrige la ubicación manualmente.`
    );
  }
  if (precisionLevel === "unknown") {
    warningMessages.push(
      "El dispositivo no reportó precisión aproximada; confirma tu dirección antes de compartirla."
    );
  }
  if (input.status === "denied") {
    warningMessages.push(
      "El permiso de ubicación fue denegado. Elige tu comuna o escribe tu referencia manualmente."
    );
  } else if (input.status === "error") {
    warningMessages.push(
      "No fue posible leer la señal GPS. Reintenta o ingresa tu ubicación manualmente."
    );
  }

  const needsAttention =
    isStale ||
    isImprecise ||
    precisionLevel === "unknown" ||
    input.status === "denied" ||
    input.status === "error";

  return {
    freshness,
    freshnessLabel,
    precisionLevel,
    precisionLabel,
    accuracyShort,
    ageMs,
    obtainedAtLabel,
    relativeAgeLabel,
    isStale,
    isImprecise,
    needsAttention,
    warningMessages,
  };
}
