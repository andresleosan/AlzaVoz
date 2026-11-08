import { inspectMediaMetadata } from './sanitizer';
import { MAX_ATTACHMENT_BYTES, type SanitizationSummary } from './contracts';

export const TARGET_SAMPLE_RATE = 16_000;
export const MAX_VOICE_DURATION_SEC = 45;

export interface VoiceProcessResult {
  bytes: ArrayBuffer;
  mime: 'audio/wav';
  fileName: string;
  durationSec: number;
  acousticDeltaPercent: number;
  summary: SanitizationSummary;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function encodeCleanWav(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE): ArrayBuffer {
  const maxSamples = Math.min(samples.length, sampleRate * MAX_VOICE_DURATION_SEC);
  const dataBytes = maxSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < maxSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  return buffer;
}

export function decodePcmWavFallback(bytes: ArrayBuffer): { samples: Float32Array; sampleRate: number; metadataMarkers: string[] } | null {
  const u8 = new Uint8Array(bytes);
  if (u8.byteLength < 44) return null;
  const dv = new DataView(bytes);
  const riff = String.fromCharCode(u8[0], u8[1], u8[2], u8[3]);
  const wave = String.fromCharCode(u8[8], u8[9], u8[10], u8[11]);
  if (riff !== 'RIFF' || wave !== 'WAVE') return null;

  let offset = 12;
  let channels = 1;
  let sampleRate = TARGET_SAMPLE_RATE;
  let bitsPerSample = 16;
  let audioFormat = 1;
  let dataStart = -1;
  let dataSize = 0;
  const metadataMarkers: string[] = [];

  while (offset + 8 <= u8.byteLength) {
    const fourCC = String.fromCharCode(u8[offset], u8[offset + 1], u8[offset + 2], u8[offset + 3]);
    const chunkSize = dv.getUint32(offset + 4, true);
    const payloadOffset = offset + 8;
    if (payloadOffset + chunkSize > u8.byteLength) break;
    if (fourCC === 'fmt ' && chunkSize >= 16) {
      audioFormat = dv.getUint16(payloadOffset, true);
      channels = dv.getUint16(payloadOffset + 2, true);
      sampleRate = dv.getUint32(payloadOffset + 4, true);
      bitsPerSample = dv.getUint16(payloadOffset + 14, true);
    } else if (fourCC === 'data') {
      dataStart = payloadOffset;
      dataSize = chunkSize;
    } else {
      metadataMarkers.push(fourCC.trim() || 'META');
    }
    offset = payloadOffset + chunkSize + (chunkSize % 2);
  }

  if (dataStart < 0 || dataSize <= 0 || (audioFormat !== 1 && audioFormat !== 3) || channels < 1) {
    return null;
  }
  const bytesPerSample = bitsPerSample / 8;
  const frameSize = bytesPerSample * channels;
  if (frameSize <= 0) return null;
  const totalFrames = Math.floor(dataSize / frameSize);
  const mono = new Float32Array(totalFrames);

  for (let i = 0; i < totalFrames; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      const pos = dataStart + i * frameSize + ch * bytesPerSample;
      if (audioFormat === 3 && bitsPerSample === 32) {
        sum += dv.getFloat32(pos, true);
      } else if (bitsPerSample === 16) {
        sum += dv.getInt16(pos, true) / 0x8000;
      } else if (bitsPerSample === 8) {
        sum += (dv.getUint8(pos) - 128) / 128;
      }
    }
    mono[i] = sum / channels;
  }

  return { samples: mono, sampleRate, metadataMarkers };
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.min(toRate * MAX_VOICE_DURATION_SEC, Math.floor(input.length / ratio)));
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[Math.min(input.length - 1, idx + 1)] ?? a;
    output[i] = a + (b - a) * frac;
  }
  return output;
}

function zeroCrossingRate(samples: Float32Array): number {
  if (samples.length < 2) return 0;
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] >= 0 && samples[i] < 0) || (samples[i - 1] < 0 && samples[i] >= 0)) {
      crossings++;
    }
  }
  return crossings / (samples.length - 1);
}

/**
 * Aplica una transformación acústica determinista (desplazamiento de tono por ventana granular,
 * modulación en anillo suave y filtro paso banda telefónico) para distorsionar el timbre vocal
 * sin prometer anonimato irreversible.
 */
export function transformAndSanitizeAudio(
  rawSamples: Float32Array,
  inputSampleRate: number,
  transformVoice: boolean
): { samples: Float32Array; acousticDeltaPercent: number } {
  const baseSamples = resampleLinear(rawSamples, inputSampleRate, TARGET_SAMPLE_RATE);
  if (!transformVoice || baseSamples.length === 0) {
    return { samples: baseSamples, acousticDeltaPercent: 0 };
  }

  const N = baseSamples.length;
  const transformed = new Float32Array(N);
  // Granular pitch shift (factor 0.78 -> voz más grave con preservación de duración)
  const grainSize = 512;
  const halfGrain = grainSize / 2;
  const pitchFactor = 0.78;

  for (let i = 0; i < N; i++) {
    const grainBase = Math.floor(i / halfGrain) * halfGrain;
    const offsetInGrain = i - grainBase;
    const posA = grainBase + offsetInGrain * pitchFactor;
    const posB = grainBase - halfGrain + (offsetInGrain + halfGrain) * pitchFactor;

    const winA = 0.5 * (1 - Math.cos((2 * Math.PI * offsetInGrain) / grainSize));
    const winB = 1 - winA;

    const idxA = Math.max(0, Math.min(N - 1, Math.floor(posA)));
    const idxB = Math.max(0, Math.min(N - 1, Math.floor(posB)));
    const pitched = baseSamples[idxA] * winA + baseSamples[idxB] * winB;

    // Ring modulation suave (42 Hz) + saturación no lineal de formantes
    const carrier = 1 + 0.24 * Math.sin((2 * Math.PI * 42 * i) / TARGET_SAMPLE_RATE);
    transformed[i] = Math.tanh(1.55 * pitched * carrier);
  }

  // Filtro paso banda ligero (elimina subgraves y brillo agudo identificable)
  const filtered = new Float32Array(N);
  let lp = 0;
  let hpState = 0;
  let prevIn = 0;
  const alphaLp = 0.42;
  const alphaHp = 0.91;
  for (let i = 0; i < N; i++) {
    const x = transformed[i];
    hpState = alphaHp * (hpState + x - prevIn);
    prevIn = x;
    lp = lp + alphaLp * (hpState - lp);
    filtered[i] = Math.max(-0.98, Math.min(0.98, lp));
  }

  let diffSum = 0;
  let magSum = 0;
  for (let i = 0; i < N; i++) {
    diffSum += Math.abs(filtered[i] - baseSamples[i]);
    magSum += Math.abs(baseSamples[i]) + 1e-5;
  }
  const zcrBefore = zeroCrossingRate(baseSamples);
  const zcrAfter = zeroCrossingRate(filtered);
  const zcrDelta = Math.abs(zcrAfter - zcrBefore) / Math.max(0.01, zcrBefore);
  const waveformDelta = diffSum / magSum;
  const acousticDeltaPercent = Math.min(99, Math.max(12, Math.round((waveformDelta * 0.65 + zcrDelta * 0.35) * 100)));

  return { samples: filtered, acousticDeltaPercent };
}

export async function processAudioBlobForReport(
  blob: Blob,
  options: { transformVoice: boolean; index?: number }
): Promise<VoiceProcessResult> {
  const originalBytes = await blob.arrayBuffer();
  if (originalBytes.byteLength === 0) {
    throw new Error('El archivo de audio está vacío.');
  }
  if (originalBytes.byteLength > MAX_ATTACHMENT_BYTES * 2) {
    throw new Error('El audio supera el tamaño permitido para procesarse en el navegador.');
  }

  const wavParsed = decodePcmWavFallback(originalBytes);
  let rawSamples: Float32Array | null = wavParsed?.samples ?? null;
  let sampleRate = wavParsed?.sampleRate ?? TARGET_SAMPLE_RATE;
  const removedMarkers = new Set<string>(wavParsed?.metadataMarkers ?? []);

  if (!rawSamples && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      try {
        const decoded = await ctx.decodeAudioData(originalBytes.slice(0));
        sampleRate = decoded.sampleRate;
        const ch0 = decoded.getChannelData(0);
        rawSamples = new Float32Array(ch0.length);
        rawSamples.set(ch0);
        removedMarkers.add('CONTAINER_META');
      } catch {
        rawSamples = null;
      } finally {
        void ctx.close().catch(() => {});
      }
    }
  }

  if (!rawSamples || rawSamples.length === 0) {
    throw new Error(
      'Formato de audio no admitido o corrupto. Usa la grabadora de nota de voz integrada o sube un archivo WAV/WebM/MP3 válido.'
    );
  }

  const { samples, acousticDeltaPercent } = transformAndSanitizeAudio(rawSamples, sampleRate, options.transformVoice);
  const cleanWav = encodeCleanWav(samples, TARGET_SAMPLE_RATE);
  if (cleanWav.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error('La nota de voz limpia supera el límite de 2 MiB. Graba un mensaje más breve.');
  }
  const inspection = inspectMediaMetadata(cleanWav, 'audio/wav');
  if (!inspection.validFormat || inspection.hasIdentifiableMetadata) {
    throw new Error('No se pudo verificar la limpieza de metadatos del audio.');
  }

  const durationSec = Math.max(1, Math.round((samples.length / TARGET_SAMPLE_RATE) * 10) / 10);
  const idx = options.index ?? 1;

  return {
    bytes: cleanWav,
    mime: 'audio/wav',
    fileName: options.transformVoice ? `nota-voz-modulada-${idx}.wav` : `nota-voz-limpia-${idx}.wav`,
    durationSec,
    acousticDeltaPercent,
    summary: {
      originalMime: blob.type || 'audio/wav',
      sanitizedMime: 'audio/wav',
      originalBytes: originalBytes.byteLength,
      sanitizedBytes: cleanWav.byteLength,
      removedMarkers: [...removedMarkers],
      voiceTransformed: options.transformVoice,
      verifiedClean: true,
      acousticDeltaPercent,
    },
  };
}
