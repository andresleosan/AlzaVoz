import { test, expect } from '@playwright/test';
import { ClipRecorder, emptyCapture } from '../src/lib/recording/recorder';
import { MAX_CLIP_BYTES, MAX_QUEUE_BYTES, MIME_TYPES, sha256, type RecordingSession } from '../src/lib/recording/contracts';

const session: RecordingSession = { id: '00000000-0000-4000-8000-000000000001', secret: '1'.repeat(64), expiresAt: Date.now() + 60000, uploadUntil: Date.now() + 60000, format: 'continuous-webm-v1' };
const chunk = (size: number, byte: number) => new Blob([new Uint8Array(size).fill(byte)], { type: MIME_TYPES[1] });

function controlledCapture(final: Blob, holdUploads = false) {
  let state = emptyCapture();
  const recorders: FakeRecorder[] = [];
  let releaseUpload!: () => void;
  const hold = new Promise<void>(resolve => { releaseUpload = resolve; });
  const uploads: Uint8Array[] = [];
  const completions: number[] = [];
  let stoppedTracks = 0;
  class FakeRecorder {
    static isTypeSupported() { return true; }
    state: RecordingState = 'inactive';
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { recorders.push(this); }
    start() { this.state = 'recording'; }
    data(blob: Blob) { this.ondataavailable?.({ data: blob }); }
    stop() {
      this.state = 'inactive';
      queueMicrotask(() => { this.data(final); this.onstop?.(); });
    }
  }
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
  const originalFetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => { stoppedTracks++; }, addEventListener: () => {} }] }) } } });
  Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: FakeRecorder });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/complete')) {
      const { clipCount } = JSON.parse(String(init?.body));
      completions.push(clipCount);
      return Response.json({ clipCount });
    }
    if (holdUploads) await hold;
    const blob = init?.body as Blob;
    const bytes = await blob.arrayBuffer();
    const headers = new Headers(init?.headers);
    const index = Number(url.split('/').at(-1));
    uploads[index] = new Uint8Array(bytes);
    return Response.json({ index, mime: headers.get('content-type'), startMs: Number(headers.get('x-clip-start')), endMs: Number(headers.get('x-clip-end')), bytes: bytes.byteLength, sha256: await sha256(bytes), receivedAt: new Date().toISOString(), etag: `test-${index}` });
  };
  const capture = new ClipRecorder(session, next => { state = next; });
  return {
    capture, uploads, completions, releaseUpload,
    state: () => state,
    stoppedTracks: () => stoppedTracks,
    data: (blob: Blob) => recorders[0].data(blob),
    dispose: () => {
      capture.dispose(); releaseUpload(); globalThis.fetch = originalFetch;
      if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
      else Reflect.deleteProperty(globalThis, 'navigator');
      if (originalRecorder) Object.defineProperty(globalThis, 'MediaRecorder', originalRecorder);
      else Reflect.deleteProperty(globalThis, 'MediaRecorder');
    },
  };
}

test('un evento grande se divide sin perder bytes y conserva la cola final', async () => {
  const first = chunk(MAX_CLIP_BYTES + 31, 0x31);
  const tail = chunk(37, 0x62);
  const fixture = controlledCapture(tail);
  try {
    await fixture.capture.start('audio');
    fixture.data(first);
    fixture.capture.stop();
    await expect.poll(() => fixture.completions).toEqual([3]);
    expect(fixture.state().clips.map(clip => clip.bytes)).toEqual([MAX_CLIP_BYTES, 31, 37]);
    expect(fixture.state().clips.every(clip => clip.status === 'received')).toBe(true);
    const combined = Buffer.concat(fixture.uploads);
    expect(combined).toEqual(Buffer.from(await new Blob([first, tail]).arrayBuffer()));
    expect(fixture.stoppedTracks()).toBe(1);
  } finally { fixture.dispose(); }
});

test('el último evento vacío confirma solo las partes con datos', async () => {
  const fixture = controlledCapture(new Blob());
  try {
    await fixture.capture.start('audio');
    fixture.data(chunk(16, 0x31));
    fixture.capture.stop();
    await expect.poll(() => fixture.completions).toEqual([1]);
    expect(fixture.state().clips).toHaveLength(1);
    expect(fixture.state().completion).toEqual({ clipCount: 1 });
    expect(fixture.state().completionPending).toBe(false);
    expect(fixture.state().clips[0].bytes).toBe(16);
  } finally { fixture.dispose(); }
});

test('el límite de cola reserva espacio para el último evento antes de detener', async () => {
  const tail = chunk(79, 0x62);
  const fixture = controlledCapture(tail, true);
  try {
    await fixture.capture.start('audio');
    const queued = chunk(MAX_QUEUE_BYTES - MAX_CLIP_BYTES, 0x31);
    fixture.data(queued);
    await expect.poll(() => fixture.state().phase).toBe('stopped');
    expect(fixture.state().clips.every(clip => clip.status !== 'lost')).toBe(true);
    expect(fixture.state().clips.reduce((sum, clip) => sum + clip.bytes, 0)).toBe(queued.size + tail.size);
    expect(fixture.completions).toEqual([]);
    fixture.releaseUpload();
    await expect.poll(() => fixture.completions).toEqual([8]);
    expect(Buffer.concat(fixture.uploads)).toEqual(Buffer.from(await new Blob([queued, tail]).arrayBuffer()));
  } finally { fixture.dispose(); }
});

test('el límite de partes conserva la parte cien entregada por stop', async () => {
  const fixture = controlledCapture(chunk(4, 0x62));
  try {
    await fixture.capture.start('audio');
    for (let index = 0; index < 99; index++) fixture.data(chunk(4, 0x31));
    await expect.poll(() => fixture.completions).toEqual([100]);
    expect(fixture.state().clips).toHaveLength(100);
    expect(fixture.state().clips.every(clip => clip.status === 'received')).toBe(true);
    expect(Array.from(fixture.uploads[99])).toEqual([0x62, 0x62, 0x62, 0x62]);
  } finally { fixture.dispose(); }
});
