import { type LegalResponse } from "../../types/defender";

export type SpeechSegmentKind = "norm" | "script" | "checklist" | "warning" | "step";

export interface SpeechSegment {
  id: string;
  kind: SpeechSegmentKind;
  label: string;
  text: string;
}

export type SpeechSupportStatus = "checking" | "supported" | "unsupported";

export type SpeechPlaybackStatus =
  | "idle"
  | "speaking"
  | "stopped"
  | "completed"
  | "unavailable"
  | "error";

export type SpeechScope = "full" | "script";

export interface SpeechChunk {
  segmentIndex: number;
  segmentLabel: string;
  text: string;
}

const LATAM_SPANISH_LANGS = new Set([
  "es-419",
  "es-mx",
  "es-us",
  "es-ar",
  "es-cl",
  "es-pe",
  "es-ec",
  "es-ve",
]);

function normalizeLangTag(lang: string | undefined): string {
  return (lang ?? "").trim().toLowerCase().replace(/_/g, "-");
}

function splitOversizedPiece(piece: string, maxChars: number): string[] {
  const words = piece.split(/\s+/).filter(Boolean);
  const result: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        result.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxChars) {
        result.push(word.slice(i, i + maxChars));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) result.push(current);
      current = word;
    }
  }

  if (current) result.push(current);
  return result;
}

function packTextPieces(pieces: readonly string[], maxChars: number): string[] {
  const packed: string[] = [];
  let current = "";

  for (const rawPiece of pieces) {
    const piece = rawPiece.trim();
    if (!piece) continue;

    if (piece.length > maxChars) {
      if (current) {
        packed.push(current);
        current = "";
      }
      const subChunks = splitOversizedPiece(piece, maxChars);
      packed.push(...subChunks);
      continue;
    }

    const candidate = current ? `${current} ${piece}` : piece;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) packed.push(current);
      current = piece;
    }
  }

  if (current) packed.push(current);
  return packed;
}

/**
 * Limpia caracteres de control, comillas tipográficas y marcas Markdown
 * antes de mostrar o sintetizar texto en voz alta.
 */
export function sanitizeSpeechText(raw: string, maxLength = 900): string {
  if (!raw || maxLength <= 0) return "";
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[«»`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const slice = cleaned.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace >= Math.floor(maxLength * 0.6)) {
    return slice.slice(0, lastSpace).trimEnd();
  }
  return slice.trimEnd();
}

/**
 * Divide un texto en fragmentos cortos compatibles con síntesis del navegador
 * sin truncar palabras ni perder contenido.
 */
export function chunkSegmentText(text: string, maxChars = 220): string[] {
  const limit = Math.max(1, Math.floor(maxChars));
  const normalized = sanitizeSpeechText(text, Number.MAX_SAFE_INTEGER);
  if (!normalized) return [];
  if (normalized.length <= limit) return [normalized];

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const expanded: string[] = [];

  for (const sentence of sentences) {
    if (sentence.length <= limit) {
      expanded.push(sentence);
    } else {
      const clauses = sentence.split(/(?<=[,;:])\s+/).filter(Boolean);
      expanded.push(...clauses);
    }
  }

  return packTextPieces(expanded, limit);
}

/**
 * Convierte segmentos estructurados en una cola ordenada de reproducción local.
 */
export function buildSpeechQueue(
  segments: readonly SpeechSegment[],
  maxChars = 220
): SpeechChunk[] {
  const queue: SpeechChunk[] = [];
  segments.forEach((segment, segmentIndex) => {
    const chunks = chunkSegmentText(segment.text, maxChars);
    for (const chunkText of chunks) {
      queue.push({
        segmentIndex,
        segmentLabel: segment.label,
        text: chunkText,
      });
    }
  });
  return queue;
}

/**
 * Construye los bloques legibles/audibles para una asesoría de /defender.
 */
export function buildLegalResponseSegments(
  response: LegalResponse,
  scope: SpeechScope
): SpeechSegment[] {
  if (scope === "script") {
    const segments: SpeechSegment[] = [
      {
        id: "script",
        kind: "script",
        label: "1. Guion para decir al agente",
        text: sanitizeSpeechText(response.agentScript.scriptText),
      },
      {
        id: "tone",
        kind: "step",
        label: "2. Consejo de tono",
        text: sanitizeSpeechText(response.agentScript.toneAdvice),
      },
    ];
    return segments.filter((segment) => segment.text.length > 0);
  }

  const checklistText = response.evidenceChecklist
    .map((item, index) => `Punto ${index + 1}: ${item.instruction}`)
    .join(" ");

  const segments: SpeechSegment[] = [
    {
      id: "norm",
      kind: "norm",
      label: "1. Norma clave",
      text: sanitizeSpeechText(
        `${response.lawCitation.lawNumber}. ${response.lawCitation.article}. ${response.lawCitation.summary}`
      ),
    },
    {
      id: "script",
      kind: "script",
      label: "2. Guion sugerido",
      text: sanitizeSpeechText(
        `${response.agentScript.scriptText} Consejo de tono: ${response.agentScript.toneAdvice}`
      ),
    },
    {
      id: "checklist",
      kind: "checklist",
      label: "3. Qué grabar",
      text: sanitizeSpeechText(checklistText),
    },
  ];

  if (response.keyWarning?.trim()) {
    segments.push({
      id: "warning",
      kind: "warning",
      label: "4. Advertencia crucial",
      text: sanitizeSpeechText(response.keyWarning),
    });
  }

  return segments.filter((segment) => segment.text.length > 0);
}

/**
 * Indicaciones breves y puramente procedimentales para Choques "Solo Latas".
 * Nunca recibe ni lee datos personales ingresados en el formulario.
 */
export function buildSoloLatasStepSegments(step: 1 | 2 | 3): SpeechSegment[] {
  if (step === 1) {
    return [
      {
        id: "sololatas-step1-rule",
        kind: "norm",
        label: "1. Regla Ley 2251",
        text: "Choque simple sin heridos. Toma las cuatro fotos reglamentarias y retira los vehículos de la vía de inmediato para evitar la multa C cero tres.",
      },
      {
        id: "sololatas-step1-photos",
        kind: "step",
        label: "2. Cuatro fotos obligatorias",
        text: "Captura primero: uno, panorámica de la vía; dos, posición en la calzada; tres, detalle de daños; cuatro, placas y documentos de ambos vehículos.",
      },
    ];
  }

  if (step === 2) {
    return [
      {
        id: "sololatas-step2-safety",
        kind: "step",
        label: "1. Datos en lugar seguro",
        text: "Con los vehículos ya retirados de la calzada hacia un costado seguro, registra el lugar del incidente y los datos básicos de las partes.",
      },
      {
        id: "sololatas-step2-fields",
        kind: "checklist",
        label: "2. Qué anotar",
        text: "Ingresa nombre, placa, teléfono y aseguradora de ambos conductores. Esta lectura voluntaria no pronuncia los datos personales que escribas.",
      },
    ];
  }

  return [
    {
      id: "sololatas-step3-review",
      kind: "step",
      label: "1. Revisar acta en silencio",
      text: "Verifica en silencio sobre la pantalla el acta de retiro amistoso antes de compartirla.",
    },
    {
      id: "sololatas-step3-share",
      kind: "checklist",
      label: "2. Enviar a aseguradoras",
      text: "Copia o comparte el acta junto con las cuatro fotos digitales hacia las aseguradoras. Si hay personas lesionadas, llama de inmediato al uno dos tres.",
    },
  ];
}

export interface SpeechCapableWindow {
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
}

/**
 * Comprueba de forma segura si la Web Speech API de síntesis está presente.
 */
export function isSpeechSynthesisAvailable(
  win?: SpeechCapableWindow | undefined
): boolean {
  const target: SpeechCapableWindow | undefined =
    win ?? (typeof window !== "undefined" ? (window as SpeechCapableWindow) : undefined);
  if (!target) return false;
  try {
    const synth = target.speechSynthesis;
    return (
      Boolean(synth) &&
      typeof synth === "object" &&
      typeof synth.speak === "function" &&
      typeof synth.cancel === "function" &&
      typeof target.SpeechSynthesisUtterance === "function"
    );
  } catch {
    return false;
  }
}

/**
 * Selecciona la voz en español más adecuada sin bloquear la reproducción
 * si la lista aún está vacía (la utterance conserva lang = "es-CO").
 */
export function selectSpanishVoice(
  voices: readonly SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const esCoLocal = voices.find(
    (voice) => normalizeLangTag(voice.lang) === "es-co" && voice.localService
  );
  if (esCoLocal) return esCoLocal;

  const esCoAny = voices.find((voice) => normalizeLangTag(voice.lang) === "es-co");
  if (esCoAny) return esCoAny;

  const latamLocal = voices.find(
    (voice) => LATAM_SPANISH_LANGS.has(normalizeLangTag(voice.lang)) && voice.localService
  );
  if (latamLocal) return latamLocal;

  const latamAny = voices.find((voice) =>
    LATAM_SPANISH_LANGS.has(normalizeLangTag(voice.lang))
  );
  if (latamAny) return latamAny;

  const anySpanishLocal = voices.find((voice) => {
    const lang = normalizeLangTag(voice.lang);
    return (lang === "es" || lang.startsWith("es-")) && voice.localService;
  });
  if (anySpanishLocal) return anySpanishLocal;

  const anySpanish = voices.find((voice) => {
    const lang = normalizeLangTag(voice.lang);
    return lang === "es" || lang.startsWith("es-");
  });
  return anySpanish ?? null;
}

/**
 * Detiene de forma segura cualquier síntesis activa o en cola del navegador.
 */
export function cancelBrowserSpeech(): void {
  if (typeof window === "undefined") return;
  try {
    const synth = window.speechSynthesis;
    if (synth && typeof synth.cancel === "function") {
      synth.cancel();
    }
  } catch {
    // Ignorar fallos de motores restrictivos al cancelar síntesis
  }
}
