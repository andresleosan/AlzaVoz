import { isSanitizedMime, MAX_ATTACHMENT_BYTES, type SanitizationSummary, type SanitizedImageMime, type SanitizedMime } from './contracts';

export interface MetadataInspection {
  validFormat: boolean;
  detectedMime: SanitizedMime | null;
  hasIdentifiableMetadata: boolean;
  detectedMarkers: string[];
  byteLength: number;
  reason?: string;
}

function readAscii(view: Uint8Array, start: number, length: number): string {
  let out = '';
  const end = Math.min(view.byteLength, start + length);
  for (let i = start; i < end; i++) {
    out += String.fromCharCode(view[i]);
  }
  return out;
}

function includesAscii(view: Uint8Array, needle: string): boolean {
  if (needle.length === 0 || view.byteLength < needle.length) return false;
  const first = needle.charCodeAt(0);
  const limit = view.byteLength - needle.length;
  for (let i = 0; i <= limit; i++) {
    if (view[i] !== first) continue;
    let matched = true;
    for (let j = 1; j < needle.length; j++) {
      if (view[i + j] !== needle.charCodeAt(j)) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

function inspectJpeg(view: Uint8Array): MetadataInspection {
  if (view.byteLength < 4 || view[0] !== 0xff || view[1] !== 0xd8) {
    return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: false, detectedMarkers: [], byteLength: view.byteLength, reason: 'Cabecera JPEG no válida.' };
  }
  const markers = new Set<string>();
  let offset = 2;
  let sawSof = false;
  let sawSos = false;
  while (offset < view.byteLength) {
    if (view[offset] !== 0xff) {
      return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: markers.size > 0, detectedMarkers: [...markers], byteLength: view.byteLength, reason: 'Estructura de segmentos JPEG inválida.' };
    }
    while (offset < view.byteLength && view[offset] === 0xff) offset++;
    if (offset >= view.byteLength) break;
    const marker = view[offset++];
    if (marker === 0xd9) {
      return {
        validFormat: sawSof && sawSos,
        detectedMime: 'image/jpeg',
        hasIdentifiableMetadata: markers.size > 0,
        detectedMarkers: [...markers],
        byteLength: view.byteLength,
        ...(sawSof && sawSos ? {} : { reason: 'Imagen JPEG incompleta.' }),
      };
    }
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd8) || marker === 0x01) {
      continue;
    }
    if (offset + 2 > view.byteLength) {
      return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: markers.size > 0, detectedMarkers: [...markers], byteLength: view.byteLength, reason: 'Longitud de segmento JPEG truncada.' };
    }
    const segLen = (view[offset] << 8) | view[offset + 1];
    if (segLen < 2 || offset + segLen > view.byteLength) {
      return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: markers.size > 0, detectedMarkers: [...markers], byteLength: view.byteLength, reason: 'Segmento JPEG fuera de rango.' };
    }
    const payload = view.subarray(offset + 2, offset + segLen);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      sawSof = true;
    }
    if (marker === 0xe1) {
      markers.add('APP1');
      if (includesAscii(payload, 'Exif')) markers.add('EXIF');
      if (includesAscii(payload, 'http://ns.adobe.com/xap/')) markers.add('XMP');
      if (includesAscii(payload, 'GPS')) markers.add('GPS');
      // TIFF tag 0x8825 (GPSInfo IFD Pointer) in big-endian or little-endian
      for (let i = 0; i + 1 < payload.byteLength; i++) {
        if ((payload[i] === 0x88 && payload[i + 1] === 0x25) || (payload[i] === 0x25 && payload[i + 1] === 0x88)) {
          markers.add('GPS');
          break;
        }
      }
    } else if (marker >= 0xe2 && marker <= 0xef) {
      markers.add(`APP${marker - 0xe0}`);
      if (marker === 0xed) markers.add('IPTC');
    } else if (marker === 0xfe) {
      markers.add('COM');
    }
    offset += segLen;
    if (marker === 0xda) {
      sawSos = true;
      while (offset < view.byteLength - 1) {
        if (view[offset] === 0xff) {
          const next = view[offset + 1];
          if (next === 0x00) {
            offset += 2;
            continue;
          }
          if (next >= 0xd0 && next <= 0xd7) {
            offset += 2;
            continue;
          }
          if (next === 0xff) {
            offset += 1;
            continue;
          }
          break;
        }
        offset++;
      }
    }
  }
  return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: markers.size > 0, detectedMarkers: [...markers], byteLength: view.byteLength, reason: 'Falta marcador de cierre EOI en JPEG.' };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const PNG_METADATA_CHUNKS = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);

function inspectPng(view: Uint8Array): MetadataInspection {
  if (view.byteLength < 33 || !PNG_SIGNATURE.every((b, idx) => view[idx] === b)) {
    return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: false, detectedMarkers: [], byteLength: view.byteLength, reason: 'Cabecera PNG no válida.' };
  }
  const markers = new Set<string>();
  const dv = new DataView(view.buffer, view.byteOffset, view.byteLength);
  let offset = 8;
  let sawIhdr = false;
  let sawIdat = false;
  while (offset + 12 <= view.byteLength) {
    const length = dv.getUint32(offset, false);
    const type = readAscii(view, offset + 4, 4);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > view.byteLength) {
      return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: markers.size > 0, detectedMarkers: [...markers], byteLength: view.byteLength, reason: 'Chunk PNG truncado.' };
    }
    if (type === 'IHDR') sawIhdr = true;
    if (type === 'IDAT') sawIdat = true;
    if (PNG_METADATA_CHUNKS.has(type)) {
      markers.add(type);
      const payload = view.subarray(offset + 8, offset + 8 + length);
      if (includesAscii(payload, 'GPS') || includesAscii(payload, 'Latitude') || includesAscii(payload, 'Longitude')) {
        markers.add('GPS');
      }
    }
    offset = chunkEnd;
    if (type === 'IEND') {
      return {
        validFormat: sawIhdr && sawIdat && offset === view.byteLength,
        detectedMime: 'image/png',
        hasIdentifiableMetadata: markers.size > 0,
        detectedMarkers: [...markers],
        byteLength: view.byteLength,
        ...(sawIhdr && sawIdat && offset === view.byteLength ? {} : { reason: 'Estructura PNG incompleta.' }),
      };
    }
  }
  return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: markers.size > 0, detectedMarkers: [...markers], byteLength: view.byteLength, reason: 'Falta chunk IEND en PNG.' };
}

function inspectWebp(view: Uint8Array): MetadataInspection {
  if (view.byteLength < 20 || readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WEBP') {
    return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: false, detectedMarkers: [], byteLength: view.byteLength, reason: 'Cabecera WebP no válida.' };
  }
  const dv = new DataView(view.buffer, view.byteOffset, view.byteLength);
  const riffSize = dv.getUint32(4, true);
  if (riffSize + 8 > view.byteLength) {
    return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: false, detectedMarkers: [], byteLength: view.byteLength, reason: 'Tamaño RIFF WebP truncado.' };
  }
  const markers = new Set<string>();
  let offset = 12;
  let sawImageChunk = false;
  while (offset + 8 <= riffSize + 8) {
    const fourCC = readAscii(view, offset, 4);
    const chunkSize = dv.getUint32(offset + 4, true);
    const padded = chunkSize + (chunkSize % 2);
    if (offset + 8 + padded > view.byteLength) {
      return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: markers.size > 0, detectedMarkers: [...markers], byteLength: view.byteLength, reason: 'Chunk WebP fuera de rango.' };
    }
    if (fourCC === 'VP8 ' || fourCC === 'VP8L') sawImageChunk = true;
    if (fourCC === 'EXIF') markers.add('EXIF');
    if (fourCC === 'XMP ') markers.add('XMP');
    offset += 8 + padded;
  }
  return {
    validFormat: sawImageChunk,
    detectedMime: 'image/webp',
    hasIdentifiableMetadata: markers.size > 0,
    detectedMarkers: [...markers],
    byteLength: view.byteLength,
    ...(sawImageChunk ? {} : { reason: 'WebP sin datos de imagen.' }),
  };
}

function inspectWav(view: Uint8Array): MetadataInspection {
  if (view.byteLength < 44 || readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') {
    return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: false, detectedMarkers: [], byteLength: view.byteLength, reason: 'Cabecera WAV no válida.' };
  }
  const dv = new DataView(view.buffer, view.byteOffset, view.byteLength);
  const riffSize = dv.getUint32(4, true);
  if (riffSize + 8 > view.byteLength) {
    return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: false, detectedMarkers: [], byteLength: view.byteLength, reason: 'Tamaño RIFF WAV truncado.' };
  }
  const markers = new Set<string>();
  let offset = 12;
  let sawFmt = false;
  let sawData = false;
  while (offset + 8 <= riffSize + 8) {
    const fourCC = readAscii(view, offset, 4);
    const chunkSize = dv.getUint32(offset + 4, true);
    const padded = chunkSize + (chunkSize % 2);
    if (offset + 8 + chunkSize > view.byteLength) {
      return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: markers.size > 0, detectedMarkers: [...markers], byteLength: view.byteLength, reason: 'Chunk WAV fuera de rango.' };
    }
    if (fourCC === 'fmt ') sawFmt = true;
    else if (fourCC === 'data' && chunkSize > 0) sawData = true;
    else markers.add(fourCC.trim() || 'META');
    offset += 8 + padded;
  }
  return {
    validFormat: sawFmt && sawData,
    detectedMime: 'audio/wav',
    hasIdentifiableMetadata: markers.size > 0,
    detectedMarkers: [...markers],
    byteLength: view.byteLength,
    ...(sawFmt && sawData ? {} : { reason: 'Archivo WAV sin muestras válidas.' }),
  };
}

export function inspectMediaMetadata(bytes: ArrayBuffer, declaredMime?: string): MetadataInspection {
  const view = new Uint8Array(bytes);
  if (view.byteLength === 0) {
    return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: false, detectedMarkers: [], byteLength: 0, reason: 'El archivo está vacío.' };
  }
  if (view.byteLength > MAX_ATTACHMENT_BYTES) {
    return { validFormat: false, detectedMime: null, hasIdentifiableMetadata: false, detectedMarkers: [], byteLength: view.byteLength, reason: 'El archivo supera el límite de 2 MiB.' };
  }
  let inspection: MetadataInspection;
  if (view[0] === 0xff && view[1] === 0xd8) {
    inspection = inspectJpeg(view);
  } else if (view.byteLength >= 8 && PNG_SIGNATURE.every((b, idx) => view[idx] === b)) {
    inspection = inspectPng(view);
  } else if (view.byteLength >= 12 && readAscii(view, 0, 4) === 'RIFF' && readAscii(view, 8, 4) === 'WEBP') {
    inspection = inspectWebp(view);
  } else if (view.byteLength >= 12 && readAscii(view, 0, 4) === 'RIFF' && readAscii(view, 8, 4) === 'WAVE') {
    inspection = inspectWav(view);
  } else {
    return {
      validFormat: false,
      detectedMime: null,
      hasIdentifiableMetadata: false,
      detectedMarkers: [],
      byteLength: view.byteLength,
      reason: 'Formato no admitido. Solo se aceptan imágenes JPEG, PNG o WebP y notas de voz WAV limpias.',
    };
  }
  if (inspection.validFormat && declaredMime && isSanitizedMime(declaredMime) && inspection.detectedMime !== declaredMime) {
    return {
      ...inspection,
      validFormat: false,
      reason: `El contenido binario (${inspection.detectedMime}) no coincide con el tipo declarado (${declaredMime}).`,
    };
  }
  return inspection;
}

export function stripImageMetadataBytes(bytes: ArrayBuffer, mime: SanitizedImageMime): ArrayBuffer {
  const view = new Uint8Array(bytes);
  if (mime === 'image/jpeg') {
    if (view.byteLength < 4 || view[0] !== 0xff || view[1] !== 0xd8) {
      throw new Error('No es una imagen JPEG válida.');
    }
    const kept: Uint8Array[] = [view.subarray(0, 2)];
    let offset = 2;
    while (offset < view.byteLength) {
      const segStart = offset;
      while (offset < view.byteLength && view[offset] === 0xff) offset++;
      if (offset >= view.byteLength) break;
      const marker = view[offset++];
      if (marker === 0xd9) {
        kept.push(new Uint8Array([0xff, 0xd9]));
        break;
      }
      if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd8) || marker === 0x01) {
        kept.push(view.subarray(segStart, offset));
        continue;
      }
      if (offset + 2 > view.byteLength) throw new Error('Segmento JPEG corrupto.');
      const segLen = (view[offset] << 8) | view[offset + 1];
      if (segLen < 2 || offset + segLen > view.byteLength) throw new Error('Longitud JPEG fuera de rango.');
      const segEnd = offset + segLen;
      const isAppMeta = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
      if (!isAppMeta) {
        kept.push(view.subarray(segStart, segEnd));
      }
      offset = segEnd;
      if (marker === 0xda) {
        const scanStart = offset;
        while (offset < view.byteLength - 1) {
          if (view[offset] === 0xff) {
            const next = view[offset + 1];
            if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
              offset += 2;
              continue;
            }
            if (next === 0xff) {
              offset += 1;
              continue;
            }
            break;
          }
          offset++;
        }
        kept.push(view.subarray(scanStart, offset));
      }
    }
    const total = kept.reduce((sum, part) => sum + part.byteLength, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const part of kept) {
      out.set(part, pos);
      pos += part.byteLength;
    }
    return out.buffer;
  }

  if (mime === 'image/png') {
    if (view.byteLength < 33 || !PNG_SIGNATURE.every((b, idx) => view[idx] === b)) {
      throw new Error('No es una imagen PNG válida.');
    }
    const kept: Uint8Array[] = [view.subarray(0, 8)];
    const dv = new DataView(view.buffer, view.byteOffset, view.byteLength);
    let offset = 8;
    while (offset + 12 <= view.byteLength) {
      const length = dv.getUint32(offset, false);
      const type = readAscii(view, offset + 4, 4);
      const chunkEnd = offset + 12 + length;
      if (chunkEnd > view.byteLength) throw new Error('Chunk PNG corrupto.');
      if (!PNG_METADATA_CHUNKS.has(type)) {
        kept.push(view.subarray(offset, chunkEnd));
      }
      offset = chunkEnd;
      if (type === 'IEND') break;
    }
    const total = kept.reduce((sum, part) => sum + part.byteLength, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const part of kept) {
      out.set(part, pos);
      pos += part.byteLength;
    }
    return out.buffer;
  }

  if (mime === 'image/webp') {
    if (view.byteLength < 20 || readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WEBP') {
      throw new Error('No es una imagen WebP válida.');
    }
    const dv = new DataView(view.buffer, view.byteOffset, view.byteLength);
    const riffSize = dv.getUint32(4, true);
    const keptChunks: Uint8Array[] = [];
    let offset = 12;
    while (offset + 8 <= Math.min(view.byteLength, riffSize + 8)) {
      const fourCC = readAscii(view, offset, 4);
      const chunkSize = dv.getUint32(offset + 4, true);
      const padded = chunkSize + (chunkSize % 2);
      const chunkEnd = offset + 8 + padded;
      if (chunkEnd > view.byteLength) throw new Error('Chunk WebP corrupto.');
      if (fourCC !== 'EXIF' && fourCC !== 'XMP ') {
        const copy = new Uint8Array(view.subarray(offset, chunkEnd));
        if (fourCC === 'VP8X' && copy.byteLength >= 12) {
          copy[8] &= ~0x0c; // Clear EXIF (0x08) and XMP (0x04) feature flags
        }
        keptChunks.push(copy);
      }
      offset = chunkEnd;
    }
    const payloadBytes = keptChunks.reduce((sum, part) => sum + part.byteLength, 0);
    const out = new Uint8Array(12 + payloadBytes);
    out.set(view.subarray(0, 12), 0);
    new DataView(out.buffer).setUint32(4, 4 + payloadBytes, true);
    let pos = 12;
    for (const part of keptChunks) {
      out.set(part, pos);
      pos += part.byteLength;
    }
    return out.buffer;
  }

  throw new Error('Formato de imagen no soportado.');
}

async function reencodeImageViaCanvas(bytes: ArrayBuffer, mime: SanitizedImageMime): Promise<{ bytes: ArrayBuffer; mime: SanitizedImageMime } | null> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return null;
  }
  try {
    const blob = new Blob([bytes], { type: mime });
    const bitmap = await createImageBitmap(blob);
    const maxDim = 1920;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width || 1, bitmap.height || 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const targetMime: SanitizedImageMime = mime === 'image/png' ? 'image/png' : 'image/jpeg';
    const outBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, targetMime, 0.88));
    if (!outBlob) return null;
    return { bytes: await outBlob.arrayBuffer(), mime: targetMime };
  } catch {
    return null;
  }
}

export async function sanitizeImageFile(file: File | Blob, index = 1): Promise<{
  bytes: ArrayBuffer;
  mime: SanitizedImageMime;
  fileName: string;
  summary: SanitizationSummary;
}> {
  const originalBytes = await file.arrayBuffer();
  const initialInspection = inspectMediaMetadata(originalBytes);
  if (!initialInspection.validFormat || !initialInspection.detectedMime || initialInspection.detectedMime === 'audio/wav') {
    throw new Error(
      initialInspection.reason ??
        'Formato no admitido. Solo aceptamos imágenes JPEG, PNG o WebP y notas de voz compatibles para limpiar sus metadatos en tu navegador.'
    );
  }
  const detectedImageMime = initialInspection.detectedMime;
  const reencoded = await reencodeImageViaCanvas(originalBytes, detectedImageMime);
  const candidateMime = reencoded ? reencoded.mime : detectedImageMime;
  const candidateBytes = reencoded ? reencoded.bytes : originalBytes;
  const strippedBytes = stripImageMetadataBytes(candidateBytes, candidateMime);
  const finalInspection = inspectMediaMetadata(strippedBytes, candidateMime);
  if (!finalInspection.validFormat || finalInspection.hasIdentifiableMetadata) {
    throw new Error('No pudimos verificar la eliminación total de metadatos de esta imagen. Intenta con otra captura.');
  }
  const ext = candidateMime === 'image/png' ? 'png' : candidateMime === 'image/webp' ? 'webp' : 'jpg';
  return {
    bytes: strippedBytes,
    mime: candidateMime,
    fileName: `evidencia-limpia-${index}.${ext}`,
    summary: {
      originalMime: file.type || detectedImageMime,
      sanitizedMime: candidateMime,
      originalBytes: originalBytes.byteLength,
      sanitizedBytes: strippedBytes.byteLength,
      removedMarkers: initialInspection.detectedMarkers,
      voiceTransformed: false,
      verifiedClean: true,
    },
  };
}
