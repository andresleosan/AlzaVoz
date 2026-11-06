import { isCompletion, isReceipt, isSession, MAX_CLIPS, MAX_RECORDING_BYTES, sha256, type ClipReceipt, type RecordingCompletion, type RecordingSession, type RecordingMime } from './contracts';

async function checked(response: Response): Promise<Response> {
  if (response.ok) return response;
  const data: unknown = await response.json().catch(() => null);
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') throw new Error(data.error);
  throw new Error('No se pudo confirmar la operación. Conserva la pestaña y reintenta.');
}
const auth = (session: RecordingSession) => ({ authorization: `Bearer ${session.secret}`, 'x-recording-client': '1' });
const base = (session: RecordingSession) => `/api/recordings/sessions/${session.id}`;
export async function createSession(signal: AbortSignal): Promise<RecordingSession> {
  const response = await checked(await fetch('/api/recordings/sessions', { method: 'POST', headers: { 'x-recording-client': '1', 'x-recording-format': 'continuous-webm-v1' }, signal }));
  const data: unknown = await response.json();
  if (!isSession(data)) throw new Error('El servidor no entregó una clave válida.');
  if (data.format !== 'continuous-webm-v1') throw new Error('El almacenamiento todavía no admite grabación continua. Recarga e inténtalo de nuevo.');
  return data;
}
export async function recoverSession(key: string, signal: AbortSignal): Promise<{ session: RecordingSession; clips: ClipReceipt[] }> {
  const [id, secret, ...extra] = key.trim().split('.');
  const candidate = { id, secret, expiresAt: 0, uploadUntil: 0 };
  if (extra.length || !isSession(candidate)) throw new Error('Revisa la clave completa de recuperación.');
  const response = await checked(await fetch(`${base(candidate)}/clips`, { headers: auth(candidate), cache: 'no-store', signal }));
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') throw new Error('Respuesta de recuperación no válida.');
  const result = data as Record<string, unknown>;
  const session = { ...candidate, expiresAt: result.expiresAt, uploadUntil: result.uploadUntil, format: result.format, completion: result.completion };
  if (result.id !== id || !isSession(session) || !Array.isArray(result.clips) || !result.clips.every(isReceipt)) throw new Error('Recibos de recuperación no válidos.');
  return { session, clips: result.clips };
}
export async function uploadClip(session: RecordingSession, clip: { index: number; startMs: number; endMs: number; mime: RecordingMime; blob: Blob }, signal: AbortSignal): Promise<ClipReceipt> {
  const hash = await sha256(await clip.blob.arrayBuffer());
  const response = await checked(await fetch(`${base(session)}/clips/${clip.index}`, {
    method: 'PUT', headers: { ...auth(session), 'content-type': clip.mime, 'x-clip-start': String(clip.startMs), 'x-clip-end': String(clip.endMs) }, body: clip.blob, signal,
  }));
  const data: unknown = await response.json();
  if (!isReceipt(data) || data.index !== clip.index || data.bytes !== clip.blob.size || data.sha256 !== hash || data.mime !== clip.mime || data.startMs !== clip.startMs || data.endMs !== clip.endMs) throw new Error('El recibo no coincide con el clip. No se marcó como recibido.');
  return data;
}
export async function downloadClip(session: RecordingSession, receipt: ClipReceipt, signal: AbortSignal): Promise<Blob> {
  const response = await checked(await fetch(`${base(session)}/clips/${receipt.index}`, { headers: auth(session), cache: 'no-store', signal }));
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== receipt.bytes || await sha256(bytes) !== receipt.sha256) throw new Error('El archivo no coincide con su recibo.');
  return new Blob([bytes], { type: receipt.mime });
}

export async function completeSession(session: RecordingSession, clipCount: number, signal: AbortSignal): Promise<RecordingCompletion> {
  const response = await checked(await fetch(`${base(session)}/complete`, {
    method: 'POST', headers: { ...auth(session), 'content-type': 'application/json' }, body: JSON.stringify({ clipCount }), signal,
  }));
  const result: unknown = await response.json();
  if (!isCompletion(result) || result.clipCount !== clipCount) throw new Error('No se pudo confirmar el cierre de la grabación. Reintenta sin cerrar la pestaña.');
  return result;
}

export async function downloadRecording(session: RecordingSession, receipts: ClipReceipt[], signal: AbortSignal, progress: (received: number) => void): Promise<Blob> {
  if (session.format !== 'continuous-webm-v1') throw new Error('Esta sesión contiene archivos independientes. Usa la reproducción por clips.');
  const ordered = [...receipts].sort((a, b) => a.index - b.index);
  if (!ordered.length || ordered.length > MAX_CLIPS || ordered.some((clip, index) => !isReceipt(clip) || clip.index !== index || clip.mime !== ordered[0].mime || clip.startMs !== (index ? ordered[index - 1].endMs : 0))) {
    throw new Error('Faltan partes o sus datos no coinciden. No se puede reconstruir la grabación.');
  }
  if (session.completion && session.completion.clipCount !== ordered.length) throw new Error('Faltan partes de la grabación completa. Recupera la sesión e inténtalo de nuevo.');
  if (ordered.reduce((sum, clip) => sum + clip.bytes, 0) > MAX_RECORDING_BYTES) throw new Error('La grabación supera el límite de 64 MiB para descargar en este dispositivo.');
  const parts: Blob[] = [];
  for (const receipt of ordered) {
    signal.throwIfAborted();
    parts.push(await downloadClip(session, receipt, AbortSignal.any([signal, AbortSignal.timeout(20_000)])));
    progress(parts.length);
  }
  signal.throwIfAborted();
  return new Blob(parts, { type: ordered[0].mime });
}
