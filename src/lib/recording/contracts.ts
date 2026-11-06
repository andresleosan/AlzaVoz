export const CLIP_MS = 3_000;
export const MAX_CLIP_BYTES = 2 * 1024 * 1024;
export const MAX_QUEUE_BYTES = 16 * 1024 * 1024;
export const MAX_RECORDING_BYTES = 64 * 1024 * 1024;
export const MAX_CLIPS = 100;
export const MIME_TYPES = ['video/webm;codecs=vp8,opus', 'audio/webm;codecs=opus'] as const;
export type RecordingMime = (typeof MIME_TYPES)[number];
export type CaptureMode = 'video' | 'audio';
export type RecordingFormat = 'continuous-webm-v1';
export interface RecordingCompletion { clipCount: number }
export interface RecordingSession {
  id: string; secret: string; expiresAt: number; uploadUntil: number;
  format?: RecordingFormat; completion?: RecordingCompletion;
}
export interface ClipReceipt {
  index: number;
  mime: RecordingMime;
  startMs: number;
  endMs: number;
  bytes: number;
  sha256: string;
  receivedAt: string;
  etag: string;
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const SECRET = /^[0-9a-f]{64}$/;
export function isMime(value: unknown): value is RecordingMime {
  return MIME_TYPES.some((mime) => mime === value);
}
export function isSession(value: unknown): value is RecordingSession {
  if (!value || typeof value !== 'object') return false;
  return 'id' in value && typeof value.id === 'string' && UUID.test(value.id)
    && 'secret' in value && typeof value.secret === 'string' && SECRET.test(value.secret)
    && 'expiresAt' in value && typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt)
    && 'uploadUntil' in value && typeof value.uploadUntil === 'number' && Number.isFinite(value.uploadUntil)
    && (!('format' in value) || value.format === undefined || value.format === 'continuous-webm-v1')
    && (!('completion' in value) || value.completion === undefined || ('format' in value && value.format === 'continuous-webm-v1' && isCompletion(value.completion)));
}
export function isCompletion(value: unknown): value is RecordingCompletion {
  return !!value && typeof value === 'object' && 'clipCount' in value
    && typeof value.clipCount === 'number' && Number.isInteger(value.clipCount)
    && value.clipCount > 0 && value.clipCount <= MAX_CLIPS;
}
export function isReceipt(value: unknown): value is ClipReceipt {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return typeof r.index === 'number' && Number.isInteger(r.index) && r.index >= 0 && r.index < MAX_CLIPS
    && isMime(r.mime) && typeof r.startMs === 'number' && Number.isFinite(r.startMs) && r.startMs >= 0
    && typeof r.endMs === 'number' && Number.isFinite(r.endMs) && r.endMs >= r.startMs
    && typeof r.bytes === 'number' && Number.isInteger(r.bytes) && r.bytes > 0 && r.bytes <= MAX_CLIP_BYTES
    && typeof r.sha256 === 'string' && SECRET.test(r.sha256)
    && typeof r.receivedAt === 'string' && Number.isFinite(Date.parse(r.receivedAt))
    && typeof r.etag === 'string' && r.etag.length > 0;
}
export async function sha256(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function readLimited(request: Request, limit: number): Promise<ArrayBuffer> {
  const reader = request.body?.getReader();
  if (!reader) return new ArrayBuffer(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error('body-limit'); }
    chunks.push(value);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result.buffer;
}
