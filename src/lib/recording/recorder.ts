import { completeSession, uploadClip } from './client';
import { CLIP_MS, MAX_CLIPS, MAX_CLIP_BYTES, MAX_QUEUE_BYTES, MAX_RECORDING_BYTES, MIME_TYPES, type CaptureMode, type ClipReceipt, type RecordingCompletion, type RecordingMime, type RecordingSession } from './contracts';

export interface CapturedClip {
  index: number; startMs: number; endMs: number; mime: RecordingMime; bytes: number;
  status: 'pending' | 'sending' | 'received' | 'lost'; blob?: Blob; receipt?: ClipReceipt;
}
export interface CaptureState {
  phase: 'idle' | 'requesting' | 'recording' | 'stopping' | 'stopped';
  clips: CapturedClip[]; stream: MediaStream | null; message: string;
  completion?: RecordingCompletion; completionPending: boolean; finalizing: boolean;
}
export const emptyCapture = (): CaptureState => ({ phase: 'idle', clips: [], stream: null, message: '', completionPending: false, finalizing: false });

export class ClipRecorder {
  private state = emptyCapture();
  private active = false;
  private disposed = false;
  private pumping = false;
  private blocked = false;
  private recorder: MediaRecorder | null = null;
  private origin = 0;
  private endMs = 0;
  private stopEndMs: number | null = null;
  private failed = false;
  private dataLost = false;
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
      this.capture(mime);
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
  private capture(mime: RecordingMime) {
    if (!this.active || !this.state.stream) return;
    try {
      const recorder = new MediaRecorder(this.state.stream, { mimeType: mime, videoBitsPerSecond: 800_000, audioBitsPerSecond: 64_000 });
      this.recorder = recorder;
      recorder.ondataavailable = event => { if (!this.disposed && event.data.size) this.receiveData(event.data, mime); };
      recorder.onerror = () => { this.failed = true; this.state.message = 'La captura tuvo un error. Solo se podrá recuperar la parte recibida.'; this.stop(); };
      recorder.onstop = () => {
        if (this.disposed) return;
        this.active = false;
        this.recorder = null;
        this.releaseTracks(); this.state.phase = 'stopped';
        this.state.completionPending = !this.failed && this.state.clips.length > 0;
        if (!this.state.clips.length) this.state.message = 'El dispositivo no entregó datos. No se conservó una grabación.';
        this.emit();
        void this.pump();
      };
      recorder.start(CLIP_MS);
      this.state.phase = 'recording';
      this.emit();
    } catch {
      this.active = false; this.releaseTracks(); this.state.phase = 'stopped';
      this.state.message = 'El dispositivo no pudo continuar la grabación. Revisa lo recibido.';
      this.emit();
    }
  }
  private receiveData(data: Blob, mime: RecordingMime) {
    if (this.dataLost) return;
    const endMs = Math.max(this.endMs, this.stopEndMs ?? Math.round(performance.now() - this.origin));
    const count = Math.ceil(data.size / MAX_CLIP_BYTES);
    const totalBytes = this.state.clips.reduce((sum, clip) => sum + clip.bytes, 0);
    if (this.state.clips.length + count > MAX_CLIPS || this.pendingBytes() + data.size > MAX_QUEUE_BYTES || totalBytes + data.size > MAX_RECORDING_BYTES) {
      this.failed = true; this.dataLost = true;
      if (this.state.clips.length < MAX_CLIPS) this.state.clips.push({ index: this.state.clips.length, startMs: this.endMs, endMs, mime, bytes: data.size, status: 'lost' });
      this.state.message = 'Una parte no pudo conservarse por el límite de tamaño. Se detuvo la captura; lo recibido puede estar incompleto.';
      this.stop();
      return;
    }
    const startMs = this.endMs;
    // A delayed event can exceed the upload limit; byte slicing preserves this single WebM stream.
    for (let offset = 0; offset < data.size; offset += MAX_CLIP_BYTES) {
      const blob = data.slice(offset, offset + MAX_CLIP_BYTES, mime);
      const partEnd = startMs + Math.round((endMs - startMs) * Math.min(offset + blob.size, data.size) / data.size);
      this.state.clips.push({ index: this.state.clips.length, startMs: this.endMs, endMs: partEnd, mime, bytes: blob.size, status: 'pending', blob });
      this.endMs = partEnd;
    }
    // Leave room for stop()'s final dataavailable event.
    if (this.active && (this.state.clips.length >= MAX_CLIPS - 1 || this.pendingBytes() >= MAX_QUEUE_BYTES - MAX_CLIP_BYTES || totalBytes + data.size >= MAX_RECORDING_BYTES - MAX_CLIP_BYTES)) {
      this.state.message = 'Se alcanzó el límite de esta grabación. Conserva la pestaña para enviar los pendientes.';
      this.stop();
    }
    this.emit();
    void this.pump();
  }
  stop() {
    this.active = false;
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.stopEndMs = Math.max(this.endMs, Math.round(performance.now() - this.origin));
      this.state.phase = 'stopping'; this.recorder.stop();
    }
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
      if (!this.blocked && !this.disposed && this.state.completionPending && this.state.clips.every(clip => clip.status === 'received')) {
        this.state.finalizing = true; this.emit();
        try {
          this.state.completion = await completeSession(this.session, this.state.clips.length, AbortSignal.any([this.abort.signal, AbortSignal.timeout(20_000)]));
          this.state.completionPending = false;
        } catch (error) {
          this.blocked = true;
          this.state.message = error instanceof Error ? error.message : 'No se confirmó el cierre. Reintenta sin cerrar la pestaña.';
        } finally { this.state.finalizing = false; }
      }
    } finally { this.pumping = false; this.emit(); }
  }
  dispose() {
    this.disposed = true; this.active = false; this.abort.abort();
    if (this.recorder?.state !== 'inactive') this.recorder?.stop();
    this.releaseTracks(); this.state.clips = [];
  }
}
