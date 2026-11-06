'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadRecording } from '@/lib/recording/client';
import type { RecordingPlaybackProps } from './RecordingPlayback';

const control = 'min-h-14 min-w-14 rounded-xl border border-gray-600 px-4 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 disabled:opacity-50 motion-safe:active:scale-95';
type RecordingFile = { url: string; mime: string; complete: boolean; play: boolean };

export function ContinuousRecordingPlayback({ session, clips, active, disabled, completionPending }: RecordingPlaybackProps) {
  const [file, setFile] = useState<RecordingFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [needsPlay, setNeedsPlay] = useState(false);
  const media = useRef<HTMLMediaElement | null>(null);
  const operation = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);
  const received = clips.flatMap(clip => clip.receipt ? [clip.receipt] : []);
  const pending = clips.some(clip => clip.status === 'pending' || clip.status === 'sending');
  const waiting = active || pending || completionPending;
  const complete = !!session.completion && session.completion.clipCount === received.length && clips.every(clip => clip.status === 'received');
  const unavailable = disabled || waiting || !received.length;
  const partial = !complete && !waiting;
  const playLabel = partial ? 'Reproducir parte recuperada' : 'Reproducir toda la grabación';
  const downloadLabel = partial ? 'Descargar parte recuperada' : 'Descargar grabación completa';
  const filename = (whole: boolean) => whole ? 'alzavoz-grabacion-completa.webm' : 'alzavoz-parte-recuperada.webm';

  const dispose = useCallback(() => {
    operation.current?.abort(); operation.current = null;
    media.current?.pause();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, []);

  const playError = useCallback((cause: unknown) => {
    if (cause instanceof DOMException && cause.name === 'AbortError') return;
    if (cause instanceof DOMException && cause.name === 'NotAllowedError') { setNeedsPlay(true); return; }
    setError('El navegador no pudo reproducir este WebM. Puedes descargarlo y abrirlo en un reproductor compatible.');
  }, []);

  useEffect(() => {
    window.addEventListener('pagehide', dispose);
    return () => { window.removeEventListener('pagehide', dispose); dispose(); };
  }, [dispose]);

  useEffect(() => {
    const element = media.current;
    if (!element || !file) return;
    element.scrollIntoView({ block: 'center' });
    let cancelled = false;
    if (file.play) void element.play().catch(cause => { if (!cancelled) playError(cause); });
    return () => { cancelled = true; };
  }, [file, playError]);

  function resume() {
    const element = media.current;
    const url = file?.url;
    if (!element) return;
    element.scrollIntoView({ block: 'center' });
    void element.play().catch(cause => { if (objectUrl.current === url) playError(cause); });
  }

  async function prepare(play: boolean) {
    if (unavailable || loading) return;
    if (file && play) { resume(); return; }
    dispose(); setFile(null); setError(''); setNeedsPlay(false); setProgress(0); setLoading(true);
    const abort = new AbortController(); operation.current = abort;
    try {
      const blob = await downloadRecording(session, received, abort.signal, count => {
        if (operation.current === abort) setProgress(count);
      });
      if (abort.signal.aborted || operation.current !== abort) return;
      const url = URL.createObjectURL(blob); objectUrl.current = url;
      setFile({ url, mime: blob.type, complete, play });
    } catch (cause) {
      if (!abort.signal.aborted && operation.current === abort) setError(cause instanceof Error ? cause.message : 'No se pudo preparar la grabación. Reintenta.');
    } finally { if (operation.current === abort) setLoading(false); }
  }

  function stop() {
    dispose(); setFile(null); setLoading(false); setError(''); setNeedsPlay(false); setProgress(0);
  }

  return <section aria-label="Reproducción de la grabación" className="space-y-4 border-t border-gray-700 pt-4">
    <h2 className="text-lg font-bold">Tu grabación</h2>
    <p className="text-sm leading-relaxed text-gray-300">Una sola grabación de principio a fin. Puedes reproducirla, pausarla y descargarla en un archivo WebM.</p>
    {partial && <p role="status" className="rounded-xl border border-amber-300 p-4 text-sm text-amber-100">Captura incompleta: no se confirmó su cierre. Solo se recuperó lo recibido y puede faltar el final. El archivo parcial puede no reproducirse en todos los dispositivos.</p>}
    {waiting && <p role="status" className="text-sm text-gray-300">{active ? 'Detén la captura para preparar la grabación.' : pending ? 'Espera a que se reciban las partes pendientes.' : 'Falta confirmar el cierre de la grabación.'}</p>}
    <button type="button" className={`${control} w-full bg-gray-700`} disabled={unavailable || loading} onClick={() => void prepare(true)}>{playLabel}</button>
    {!file && <button type="button" className={`${control} w-full`} disabled={unavailable || loading} onClick={() => void prepare(false)}>{downloadLabel}</button>}
    {loading && <p role="status">Preparando archivo · {progress} de {received.length} partes verificadas…</p>}
    {error && <p role="alert" className="rounded-xl border border-amber-300 p-4 text-amber-100">{error}</p>}
    {file && <div className="space-y-3" data-sensitive="true">
      <h3 className="font-bold">{file.complete ? 'Grabación completa' : 'Parte recuperada'}</h3>
      {file.mime.startsWith('video/')
        ? <video ref={element => { media.current = element; }} data-playback data-recording-kind="continuous" controls playsInline src={file.url} onPlay={() => setNeedsPlay(false)} onError={() => playError(null)} className="aspect-video w-full rounded-xl bg-black" />
        : <audio ref={element => { media.current = element; }} data-playback data-recording-kind="continuous" controls src={file.url} onPlay={() => setNeedsPlay(false)} onError={() => playError(null)} className="w-full" />}
      {needsPlay && <button type="button" className={`${control} w-full`} onClick={resume}>Continuar reproducción</button>}
      {!file.play && <p role="status" className="text-sm text-gray-300">Archivo listo. Pulsa descargar para guardarlo en tu dispositivo.</p>}
      <a className={`${control} flex items-center justify-center bg-gray-700`} href={file.url} download={filename(file.complete)}>{file.complete ? 'Descargar grabación completa' : 'Descargar parte recuperada'}</a>
    </div>}
    {(file || loading) && <button type="button" className={`${control} w-full`} onClick={stop}>{loading ? 'Cancelar preparación' : 'Cerrar reproductor'}</button>}
    <details className="border-t border-gray-700 pt-2">
      <summary className="min-h-14 cursor-pointer py-4 font-semibold">Detalle del envío · {received.length} partes recibidas</summary>
      <p className="pb-3 text-sm text-gray-300">Estas partes pertenecen al mismo archivo y se unen al recuperarlo.</p>
      <ol className="divide-y divide-gray-700">{clips.map(clip => <li key={clip.index} className="flex justify-between gap-3 py-3 text-sm">
        <span>Parte {clip.index + 1} · {(clip.bytes / 1024).toFixed(1)} KiB</span>
        <span>{clip.status === 'received' ? 'Recibido' : clip.status === 'sending' ? 'Enviando' : clip.status === 'lost' ? 'No conservado' : 'Pendiente'}</span>
      </li>)}</ol>
    </details>
  </section>;
}
