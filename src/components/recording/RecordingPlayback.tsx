'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadClip } from '@/lib/recording/client';
import type { ClipReceipt, RecordingSession } from '@/lib/recording/contracts';
import type { CapturedClip } from '@/lib/recording/recorder';
import { ContinuousRecordingPlayback } from './ContinuousRecordingPlayback';

const control = 'min-h-14 min-w-14 rounded-xl border border-gray-600 px-4 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 disabled:opacity-50 motion-safe:active:scale-95';
const time = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
type LoadedClip = { url: string; receipt: ClipReceipt };
type LoadResult = { clip: LoadedClip } | { error: string } | null;
type PlaybackRun = {
  abort: AbortController;
  receipts: ClipReceipt[];
  position: number;
  current: LoadedClip | null;
  next: Promise<LoadResult> | null;
  urls: Set<string>;
  advancing: boolean;
};
type Playback = LoadedClip & { position: number; total: number };

export interface RecordingPlaybackProps {
  session: RecordingSession;
  clips: CapturedClip[];
  active: boolean;
  disabled: boolean;
  completionPending: boolean;
}

export function RecordingPlayback(props: RecordingPlaybackProps) {
  return props.session.format === 'continuous-webm-v1' ? <ContinuousRecordingPlayback {...props} /> : <LegacyRecordingPlayback {...props} />;
}

function LegacyRecordingPlayback({ session, clips, active, disabled }: RecordingPlaybackProps) {
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [completed, setCompleted] = useState(false);
  const runRef = useRef<PlaybackRun | null>(null);
  const media = useRef<HTMLMediaElement | null>(null);
  const received = clips.flatMap(clip => clip.receipt ? [clip.receipt] : []).sort((a, b) => a.index - b.index);
  const waitingForUploads = clips.some(clip => clip.status === 'pending' || clip.status === 'sending');
  const incomplete = clips.some(clip => clip.status !== 'received') || received.some((clip, i) => clip.index !== i);

  const dispose = useCallback(() => {
    const run = runRef.current;
    runRef.current = null;
    media.current?.pause();
    if (run) {
      run.abort.abort();
      for (const url of run.urls) URL.revokeObjectURL(url);
      run.urls.clear();
    }
  }, []);

  const handlePlayFailure = useCallback((cause: unknown) => {
    if (cause instanceof DOMException && cause.name === 'AbortError') return;
    if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
      setNeedsPlay(true);
      return;
    }
    setError('El navegador no pudo reproducir este clip. Puedes descargarlo o probar otro navegador compatible con WebM.');
    setCanRetry(false);
    setNeedsPlay(false);
  }, []);

  useEffect(() => {
    window.addEventListener('pagehide', dispose);
    return () => { window.removeEventListener('pagehide', dispose); dispose(); };
  }, [dispose]);

  useEffect(() => {
    const element = media.current;
    if (!element || !playback) return;
    if (playback.position === 0) element.scrollIntoView({ block: 'center' });
    let cancelled = false;
    void element.play().catch(cause => {
      if (!cancelled && runRef.current?.current?.url === playback.url) handlePlayFailure(cause);
    });
    return () => { cancelled = true; };
  }, [playback, handlePlayFailure]);

  async function load(run: PlaybackRun, receipt: ClipReceipt): Promise<LoadResult> {
    try {
      const blob = await downloadClip(session, receipt, AbortSignal.any([run.abort.signal, AbortSignal.timeout(20_000)]));
      if (run.abort.signal.aborted || runRef.current !== run) return null;
      const url = URL.createObjectURL(blob);
      run.urls.add(url);
      return { clip: { url, receipt } };
    } catch (cause) {
      if (run.abort.signal.aborted || runRef.current !== run) return null;
      return { error: cause instanceof Error ? cause.message : 'No se pudo recuperar el clip.' };
    }
  }

  async function advance(run: PlaybackRun) {
    if (runRef.current !== run || run.advancing) return;
    const position = run.position + 1;
    if (position >= run.receipts.length) { setCompleted(true); return; }
    run.advancing = true;
    setLoading(true); setError(''); setCanRetry(false); setNeedsPlay(false);
    const result = await (run.next ?? load(run, run.receipts[position]));
    if (runRef.current !== run || run.abort.signal.aborted) return;
    run.advancing = false;
    run.next = null;
    setLoading(false);
    if (!result) return;
    if ('error' in result) {
      setError(`No se pudo cargar el clip ${run.receipts[position].index + 1}. ${result.error} La reproducción se detuvo sin saltarlo.`);
      setCanRetry(true);
      return;
    }
    const previous = run.current;
    run.current = result.clip;
    run.position = position;
    setPlayback({ ...result.clip, position, total: run.receipts.length });
    setCompleted(false);
    if (previous) { URL.revokeObjectURL(previous.url); run.urls.delete(previous.url); }
    // Keep only the current clip and its successor in memory.
    if (position + 1 < run.receipts.length) run.next = load(run, run.receipts[position + 1]);
  }

  function start(receipts: ClipReceipt[]) {
    if (!receipts.length || disabled) return;
    dispose();
    setPlayback(null); setError(''); setNeedsPlay(false); setCompleted(false);
    const run: PlaybackRun = { abort: new AbortController(), receipts, position: -1, current: null, next: null, urls: new Set(), advancing: false };
    runRef.current = run;
    void advance(run);
  }

  function stop() {
    dispose();
    setPlayback(null); setLoading(false); setError(''); setCanRetry(false); setNeedsPlay(false); setCompleted(false);
  }

  function ended() {
    const run = runRef.current;
    if (run && run.current?.url === playback?.url) void advance(run);
  }

  function resume() {
    const element = media.current;
    const run = runRef.current;
    const url = run?.current?.url;
    if (!element || !run) return;
    void element.play().catch(cause => {
      if (runRef.current === run && run.current?.url === url) handlePlayFailure(cause);
    });
  }

  function playbackError() {
    if (runRef.current?.current?.url !== playback?.url) return;
    setError('El navegador no pudo reproducir este clip. Puedes descargarlo o probar otro navegador compatible con WebM.');
    setCanRetry(false);
    setNeedsPlay(false);
  }

  return (
    <section aria-label="Reproducción de la grabación" className="space-y-4 border-t border-gray-700 pt-4">
      <h2 className="font-bold">Reproduce tu grabación</h2>
      <button type="button" className={`${control} w-full bg-gray-700`} disabled={disabled || active || waitingForUploads || !received.length} onClick={() => start(received)}>Reproducir toda la grabación</button>
      <p className="text-sm leading-relaxed text-gray-300">Los clips recibidos se reproducen en orden, uno detrás de otro. Puedes pausar desde el reproductor. Puede haber pausas entre clips.</p>
      {active && <p className="text-sm text-gray-300">Detén la captura para reproducir los clips seguidos.</p>}
      {!active && waitingForUploads && <p className="text-sm text-gray-300">Espera a que se reciban los clips pendientes para reproducirlos todos seguidos.</p>}
      {incomplete && <p className="text-sm text-amber-200">Hay fragmentos no disponibles o pendientes. Solo se reproducirá lo recibido.</p>}
      {loading && <p role="status">Cargando el siguiente clip…</p>}
      {error && <p role="alert" className="rounded-xl border border-amber-300 p-4 text-amber-100">{error}</p>}
      {canRetry && <button type="button" className={`${control} w-full`} disabled={loading} onClick={() => { if (runRef.current) void advance(runRef.current); }}>Reintentar reproducción</button>}
      {playback && <div className="space-y-3" data-sensitive="true">
        <h3 className="font-bold">Clip {playback.receipt.index + 1} recuperado y verificado</h3>
        <p role="status" data-testid="playback-position" className="text-sm text-gray-300">Clip {playback.position + 1} de {playback.total}</p>
        {playback.receipt.mime.startsWith('video/')
          ? <video ref={element => { media.current = element; }} data-playback data-clip-index={playback.receipt.index} controls playsInline src={playback.url} onEnded={ended} onError={playbackError} onPlay={() => setNeedsPlay(false)} className="aspect-video w-full rounded-xl bg-black" />
          : <audio ref={element => { media.current = element; }} data-playback data-clip-index={playback.receipt.index} controls src={playback.url} onEnded={ended} onError={playbackError} onPlay={() => setNeedsPlay(false)} className="w-full" />}
        {needsPlay && <div className="space-y-2"><p role="status" className="text-sm text-amber-200">El navegador pausó la reproducción automática. Pulsa continuar o usa el control del reproductor.</p><button type="button" className={`${control} w-full`} onClick={resume}>Continuar reproducción</button></div>}
        {completed && <p role="status" className="text-sm text-gray-300">Terminó la reproducción de los clips seleccionados.</p>}
        <a className={`${control} flex items-center justify-center`} href={playback.url} download={`alzavoz-clip-${playback.receipt.index + 1}.webm`}>Descargar este clip</a>
      </div>}
      {(playback || loading || error) && <button type="button" className={`${control} w-full`} onClick={stop}>Detener reproducción</button>}
      <h2 className="pt-2 font-bold">Clips de esta grabación</h2>
      <ol className="divide-y divide-gray-700">
        {clips.map((clip, i) => <li key={clip.index} className="space-y-2 py-3">
          <div className="flex justify-between gap-3 font-semibold"><span>Clip {clip.index + 1}</span><span>{clip.status === 'received' ? 'Recibido' : clip.status === 'sending' ? 'Enviando' : clip.status === 'lost' ? 'No conservado' : 'Pendiente'}</span></div>
          <p className="font-tabular text-sm text-gray-300">{time(clip.startMs)}–{time(clip.endMs)} · {(clip.bytes / 1024).toFixed(1)} KiB{ i > 0 ? ` · Pausa: ${Math.max(0, clip.startMs - clips[i - 1].endMs)} ms` : ''}</p>
          {clip.receipt && <button type="button" className={`${control} w-full`} disabled={disabled} onClick={() => { if (clip.receipt) start([clip.receipt]); }}>Reproducir clip {clip.index + 1}</button>}
        </li>)}
      </ol>
    </section>
  );
}
