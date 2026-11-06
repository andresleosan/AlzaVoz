import { uploadClip } from './client';
import { CLIP_MS, MAX_CLIPS, MAX_CLIP_BYTES, MAX_QUEUE_BYTES, MIME_TYPES, type CaptureMode, type ClipReceipt, type RecordingMime, type RecordingSession } from './contracts';

export interface CapturedClip {
  index: number; startMs: number; endMs: number; mime: RecordingMime; bytes: number;
  status: 'pending' | 'sending' | 'received' | 'lost'; blob?: Blob; receipt?: ClipReceipt;
}
export interface CaptureState {
  phase: 'idle' | 'requesting' | 'recording' | 'stopping' | 'stopped';
  clips: CapturedClip[]; stream: MediaStream | null; message: string;
}
export const emptyCapture = (): CaptureState => ({ phase: 'idle', clips: [], stream: null, message: '' });

export class ClipRecorder {
  private state = emptyCapture();
  private active = false;
  private disposed = false;
  private pumping = false;
  private blocked = false;
  private recorder: MediaRecorder | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private origin = 0;
  private endMs = 0;
  private abort = new AbortController();
  constructor(private session: RecordingSession, private notify: (state: CaptureState) => void) {}
  private emit() { if (!this.disposed) this.notify({ ...this.state, clips: this.state.clips.map(c => ({ ...c })) }); }
  private releaseTracks() { this.state.stream?.getTracks().forEach(track => track.stop()); this.state.stream = null; }
  private pendingBytes() { return this.state.clips.reduce((sum, clip) => sum + (clip.blob?.size ?? 0), 0); }

  async start(mode: CaptureMode): Promise<void> {
    if (this.state.phase !== 'idle' || this.disposed) return;
    this.active = true;
    this.state.phase = 'requesting';
    this.emit();
    const mime = mode === 'video' ? MIME_TYPES[0] : MIME_TYPES[1];
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(mime)) throw new Error('Este navegador no admite esta grabación WebM. Prueba con Chrome o Edge actualizado.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: { ideal: 'environment' } } : false });
      if (!this.active || this.disposed) { stream.getTracks().forEach(t => t.stop()); return; }
      this.state.stream = stream;
      for (const track of stream.getTracks()) track.addEventListener('ended', () => { this.state.message = 'El dispositivo interrumpió la captura. Revisa los clips recibidos.'; this.stop(); }, { once: true });
      this.origin = performance.now();
      this.segment(mime);
    } catch (error) {
      if (this.disposed) return;
      this.active = false;
      this.releaseTracks();
      this.state.phase = 'stopped';
      this.state.message = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'No se autorizó la cámara o el micrófono. No se grabó nada.'
        : error instanceof DOMException && error.name === 'NotFoundError'
          ? 'No encontramos el dispositivo necesario. Puedes probar solo audio.'
          : error instanceof Error ? error.message : 'No se pudo iniciar la grabación.';
      this.emit();
    }
  }
  private segment(mime: RecordingMime) {
    if (!this.active || !this.state.stream) return;
    const parts: Blob[] = [];
    const startMs = Math.round(performance.now() - this.origin);
    this.endMs = startMs;
    try {
      const recorder = new MediaRecorder(this.state.stream, { mimeType: mime, videoBitsPerSecond: 800_000, audioBitsPerSecond: 64_000 });
      this.recorder = recorder;
      recorder.ondataavailable = event => { if (!this.disposed && event.data.size) parts.push(event.data); };
      recorder.onerror = () => { this.state.message = 'La captura tuvo un error. El último clip puede estar incompleto.'; this.stop(); };
      recorder.onstop = () => {
        if (this.disposed) return;
        clearTimeout(this.timer);
        if (this.endMs === startMs) this.endMs = Math.round(performance.now() - this.origin);
        const blob = new Blob(parts, { type: mime });
        const clip: CapturedClip = { index: this.state.clips.length, startMs, endMs: Math.max(startMs, this.endMs), mime, bytes: blob.size, status: 'pending', blob };
        if (!blob.size || blob.size > MAX_CLIP_BYTES || this.pendingBytes() + blob.size > MAX_QUEUE_BYTES) {
          clip.status = 'lost'; delete clip.blob;
          this.state.message = 'Un clip no pudo conservarse por su tamaño o por falta de datos. Se detuvo la captura.';
          this.active = false;
        }
        this.state.clips.push(clip);
        if (this.state.clips.length >= MAX_CLIPS || this.pendingBytes() > MAX_QUEUE_BYTES - MAX_CLIP_BYTES) {
          this.active = false;
          this.state.message = 'Se alcanzó el límite de esta grabación. Conserva la pestaña para enviar los pendientes.';
        }
        this.recorder = null;
        if (this.active) this.segment(mime);
        else { this.releaseTracks(); this.state.phase = 'stopped'; }
        this.emit();
        void this.pump();
      };
      recorder.start();
      this.state.phase = 'recording';
      this.timer = setTimeout(() => this.closeSegment(), CLIP_MS);
      this.emit();
    } catch {
      this.active = false; this.releaseTracks(); this.state.phase = 'stopped';
      this.state.message = 'El dispositivo no pudo continuar la grabación. Revisa lo recibido.';
      this.emit();
    }
  }
  private closeSegment() {
    this.endMs = Math.round(performance.now() - this.origin);
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
  }
  stop() {
    this.active = false;
    clearTimeout(this.timer);
    if (this.recorder && this.recorder.state !== 'inactive') { this.state.phase = 'stopping'; this.closeSegment(); }
    else if (!this.recorder) { this.releaseTracks(); this.state.phase = 'stopped'; }
    this.emit();
  }
  retry() { this.blocked = false; this.state.message = ''; void this.pump(); }
  private async pump() {
    if (this.pumping || this.blocked || this.disposed) return;
    this.pumping = true;
    try {
      for (const clip of this.state.clips) {
        if (!clip.blob || clip.status !== 'pending' || this.disposed) continue;
        clip.status = 'sending'; this.emit();
        try {
          const signal = AbortSignal.any([this.abort.signal, AbortSignal.timeout(20_000)]);
          clip.receipt = await uploadClip(this.session, { ...clip, blob: clip.blob }, signal);
          clip.status = 'received'; delete clip.blob;
        } catch (error) {
          clip.status = 'pending'; this.blocked = true;
          this.state.message = error instanceof Error ? error.message : 'No se confirmó el envío. Reintenta sin cerrar la pestaña.';
          break;
        }
        this.emit();
      }
    } finally { this.pumping = false; this.emit(); }
  }
  dispose() {
    this.disposed = true; this.active = false; clearTimeout(this.timer); this.abort.abort();
    if (this.recorder?.state !== 'inactive') this.recorder?.stop();
    this.releaseTracks(); this.state.clips = [];
  }
}
