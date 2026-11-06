import { isReceipt, isSession, sha256, type ClipReceipt, type RecordingSession, type RecordingMime } from './contracts';

async function checked(response: Response): Promise<Response> {
  if (response.ok) return response;
  const data: unknown = await response.json().catch(() => null);
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') throw new Error(data.error);
  throw new Error('No se pudo confirmar la operación. Conserva la pestaña y reintenta.');
}
const auth = (session: RecordingSession) => ({ authorization: `Bearer ${session.secret}`, 'x-recording-client': '1' });
const base = (session: RecordingSession) => `/api/recordings/sessions/${session.id}`;
export async function createSession(signal: AbortSignal): Promise<RecordingSession> {
  const response = await checked(await fetch('/api/recordings/sessions', { method: 'POST', headers: { 'x-recording-client': '1' }, signal }));
  const data: unknown = await response.json();
  if (!isSession(data)) throw new Error('El servidor no entregó una clave válida.');
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
  const session = { ...candidate, expiresAt: result.expiresAt, uploadUntil: result.uploadUntil };
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
