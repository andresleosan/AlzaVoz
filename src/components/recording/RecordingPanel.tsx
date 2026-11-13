'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppMode } from '@/context/AppModeContext';
import { useMediaCapture } from '@/context/MediaCaptureContext';
import {
  SHARED_DEVICE_STORAGE_KEY,
  SHARED_SESSION_CLEAR_EVENT,
  useSharedDevice,
} from '@/context/SharedDeviceContext';
import { createSession, recoverSession } from '@/lib/recording/client';
import { ClipRecorder, emptyCapture, type CaptureState } from '@/lib/recording/recorder';
import type { CaptureMode, RecordingSession } from '@/lib/recording/contracts';
import { RecordingPlayback } from '@/components/recording/RecordingPlayback';

const KEY = 'alzavoz_recording_key';
const control = 'min-h-14 min-w-14 rounded-xl border border-gray-600 px-4 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 disabled:opacity-50 motion-safe:active:scale-95';

export function RecordingPanel() {
  const { setNavigationLocked } = useAppMode();
  const { registerCapture, updateCapturePhase, clearCapture, statusLabel } = useMediaCapture();
  const { isSharedDevice } = useSharedDevice();
  const [mode, setMode] = useState<CaptureMode>('video');
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [state, setState] = useState<CaptureState>(emptyCapture);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');
  const [note, setNote] = useState('');
  const controller = useRef<ClipRecorder | null>(null);
  const operation = useRef<AbortController | null>(null);
  const preview = useRef<HTMLVideoElement | null>(null);
  const locked = useRef(false);
  const received = state.clips.filter(c => c.status === 'received');
  const pending = state.clips.filter(c => c.status === 'pending' || c.status === 'sending');
  const active = state.phase === 'recording' || state.phase === 'requesting' || state.phase === 'stopping';
  const recoveryKey = session ? `${session.id}.${session.secret}` : '';

  useEffect(() => {
    setNavigationLocked(active || pending.length > 0 || state.completionPending || busy);
    return () => setNavigationLocked(false);
  }, [active, pending.length, state.completionPending, busy, setNavigationLocked]);

  const resetRecordingSession = useCallback(() => {
    controller.current?.dispose(); controller.current = null;
    clearCapture();
    try { sessionStorage.removeItem(KEY); } catch { /* No persistent key to clear. */ }
    setSession(null); setState(emptyCapture()); setKey(''); setNote(''); setError('');
  }, [clearCapture]);

  useEffect(() => {
    const abort = new AbortController();
    operation.current = abort;
    let remembered = '';
    try {
      if (sessionStorage.getItem(SHARED_DEVICE_STORAGE_KEY) === 'true') {
        sessionStorage.removeItem(KEY);
      } else {
        remembered = sessionStorage.getItem(KEY) ?? '';
      }
    } catch { /* Recovery remains possible with a copied key. */ }
    if (remembered) {
      locked.current = true;
      void recoverSession(remembered, AbortSignal.any([abort.signal, AbortSignal.timeout(20_000)])).then(result => {
        if (abort.signal.aborted) return;
        setSession(result.session);
        setState({ ...emptyCapture(), phase: 'stopped', completion: result.session.completion, clips: result.clips.map(receipt => ({ ...receipt, status: 'received', receipt })) });
        setNote(result.session.completion ? 'Se recuperó la grabación con su cierre confirmado.' : 'Solo se recuperó lo recibido. Un cierre puede haber perdido la parte en curso y los pendientes.');
      }).catch(() => { if (!abort.signal.aborted) setError('No pudimos recuperar la sesión anterior. Pega tu clave para reintentar.'); })
        .finally(() => { locked.current = false; });
    }
    const cleanup = () => { operation.current?.abort(); controller.current?.dispose(); };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('pageshow', restore);
    window.addEventListener(SHARED_SESSION_CLEAR_EVENT, resetRecordingSession);
    return () => {
      abort.abort();
      cleanup();
      window.removeEventListener('pagehide', cleanup);
      window.removeEventListener('pageshow', restore);
      window.removeEventListener(SHARED_SESSION_CLEAR_EVENT, resetRecordingSession);
    };
  }, [resetRecordingSession]);
  useEffect(() => { if (preview.current) preview.current.srcObject = state.stream; }, [state.stream]);

  useEffect(() => {
    if (state.stream) {
      const unregister = registerCapture(state.stream, 'recording', () => {
        controller.current?.stop();
      });
      return () => {
        unregister();
      };
    } else {
      updateCapturePhase(state.phase, 'recording');
    }
  }, [state.stream, state.phase, registerCapture, updateCapturePhase]);

  async function start() {
    if (locked.current || session) return;
    locked.current = true; setBusy(true); setError(''); setNote('');
    const abort = new AbortController(); operation.current = abort;
    try {
      const created = await createSession(AbortSignal.any([abort.signal, AbortSignal.timeout(20_000)]));
      if (abort.signal.aborted) return;
      setSession(created);
      if (isSharedDevice) {
        try { sessionStorage.removeItem(KEY); } catch { /* Ignore storage error. */ }
        setNote('Sesión compartida activa: esta clave no se guarda en el navegador. Cópiala antes de salir.');
      } else {
        try { sessionStorage.setItem(KEY, `${created.id}.${created.secret}`); }
        catch { setNote('Este navegador no conserva la clave al recargar. Cópiala ahora para recuperar lo recibido.'); }
      }
      const recorder = new ClipRecorder(created, setState); controller.current = recorder;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(40);
      setBusy(false);
      void recorder.start(mode);
    } catch (cause) { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo iniciar.'); }
    finally { if (!abort.signal.aborted) setBusy(false); locked.current = false; }
  }
  async function recover() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    const abort = new AbortController(); operation.current = abort;
    try {
      const result = await recoverSession(key, AbortSignal.any([abort.signal, AbortSignal.timeout(20_000)]));
      if (abort.signal.aborted) return;
      setSession(result.session); setKey('');
      setState({ ...emptyCapture(), phase: 'stopped', completion: result.session.completion, clips: result.clips.map(receipt => ({ ...receipt, status: 'received', receipt })) });
      setNote(result.session.completion ? 'Se recuperó la grabación con su cierre confirmado.' : 'Solo se recuperó lo recibido. No podemos recuperar los pendientes de una pestaña cerrada.');
      if (isSharedDevice) {
        try { sessionStorage.removeItem(KEY); } catch { /* Ignore storage error. */ }
      } else {
        try { sessionStorage.setItem(KEY, `${result.session.id}.${result.session.secret}`); } catch { /* The copied key still works. */ }
      }
    } catch (cause) { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo recuperar.'); }
    finally { if (!abort.signal.aborted) setBusy(false); locked.current = false; }
  }
  function reset() {
    resetRecordingSession();
  }

  const liveLabel = statusLabel !== 'Cámara y micrófono apagados' && statusLabel !== 'Captura detenida'
    ? statusLabel
    : mode === 'video' ? 'Cámara y micrófono activos' : 'Micrófono activo';

  return (
    <section aria-labelledby="recording-title" className="mx-auto w-full max-w-3xl space-y-5 pb-28 text-base text-gray-100">
      <div className="flex items-center gap-4">
        <h1 id="recording-title" className="text-2xl font-bold">Graba y conserva</h1>
      </div>
      <p className="leading-relaxed">{session && !session.format ? 'Esta grabación anterior contiene clips independientes. Puedes reproducirlos seguidos o descargar cada clip.' : <>Graba de forma continua y descarga un solo archivo. Enviamos partes mientras grabas; solo están en el almacenamiento las que muestran <strong>Recibido</strong>.</>}</p>
      <p className="text-sm leading-relaxed text-gray-300">Mantén esta pestaña abierta hasta detener y confirmar la grabación. Cerrar o bloquear el dispositivo puede interrumpirla y perder lo pendiente.</p>
      {(active || pending.length > 0 || state.completionPending || busy) && <p role="status" className="rounded-xl border border-gray-600 p-4 text-sm leading-relaxed">Para cambiar de herramienta, detén la grabación y espera a que se reciban las partes pendientes y se confirme el cierre. Salir rápido sigue disponible.</p>}
      {!session && <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 font-semibold">Qué quieres grabar</legend><div className="grid grid-cols-2 gap-3">
        <button type="button" aria-pressed={mode === 'video'} className={`${control} ${mode === 'video' ? 'bg-gray-700 border-amber-200' : 'bg-gray-900'}`} onClick={() => setMode('video')}>Video y audio</button>
        <button type="button" aria-pressed={mode === 'audio'} className={`${control} ${mode === 'audio' ? 'bg-gray-700 border-amber-200' : 'bg-gray-900'}`} onClick={() => setMode('audio')}>Solo audio</button>
      </div></fieldset>}
      {state.stream && <div className="space-y-2">
        <p role="status" className="font-bold text-amber-200">{liveLabel}</p>
        {mode === 'video' && <video ref={preview} autoPlay muted playsInline data-sensitive="true" aria-label="Vista de la cámara" className="aspect-video w-full rounded-xl bg-black object-contain" />}
      </div>}
      <div className="rounded-xl border border-gray-700 bg-[#111827] p-4">
        <p role="status" className="mb-3 font-semibold">{state.phase === 'recording' ? 'Grabando de forma continua' : state.phase === 'requesting' ? 'Esperando permiso del dispositivo' : state.phase === 'stopping' ? 'Cerrando la grabación' : state.phase === 'stopped' ? 'Captura detenida' : 'Cámara y micrófono apagados'}</p>
        <dl className="grid grid-cols-3 gap-3 font-tabular">
          <div><dt className="text-sm text-gray-300">Capturados</dt><dd className="text-2xl font-bold">{state.clips.length}</dd></div>
          <div><dt className="text-sm text-gray-300">Pendientes</dt><dd data-testid="pending-count" className="text-2xl font-bold">{pending.length}</dd></div>
          <div><dt className="text-sm text-gray-300">Recibidos</dt><dd data-testid="received-count" className="text-2xl font-bold">{received.length}</dd></div>
        </dl>
        {state.clips.some(c => c.status === 'lost') && <p className="mt-3 font-semibold">Hay partes que no se conservaron. Revisa el detalle del envío.</p>}
      </div>
      {(error || state.message) && <p role="alert" className="rounded-xl border border-amber-300 p-4 text-amber-100">{error || state.message}</p>}
      {note && <p role="status" className="text-sm text-gray-200">{note}</p>}
      {session && <div className="space-y-3 border-t border-gray-700 pt-4">
        <h2 className="font-bold">Conserva tu clave privada</h2>
        <p className="text-sm text-gray-300">Quien tenga esta clave podrá acceder a tu grabación. Cópiala en un lugar seguro antes de salir. No se envía a contactos ni crea una denuncia.</p>
        <label htmlFor="recording-key" className="block text-sm">Clave de recuperación</label>
        <input id="recording-key" data-sensitive="true" type="password" readOnly value={recoveryKey} className="min-h-14 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 font-mono" />
        <button type="button" className={`${control} w-full`} onClick={() => void navigator.clipboard.writeText(recoveryKey).then(() => setNote('Clave copiada. Guárdala en un lugar privado.')).catch(() => setError('No se pudo copiar. Selecciona la clave en el campo y cópiala manualmente.'))}>Copiar clave privada</button>
        <p className="text-sm text-gray-300">Acceso hasta {new Date(session.expiresAt).toLocaleString('es-CO')}. Entorno de prueba: no uses evidencia real. Salir no borra lo recibido ni tus descargas.</p>
      </div>}
      {session && state.clips.length > 0 && <RecordingPlayback key={session.id} session={{ ...session, completion: state.completion ?? session.completion }} clips={state.clips} active={active} disabled={busy} completionPending={state.completionPending} />}
      {!session && <details className="border-t border-gray-700 pt-4"><summary className="min-h-14 cursor-pointer py-4 font-semibold">Recuperar una grabación anterior</summary><form className="space-y-3" onSubmit={event => { event.preventDefault(); void recover(); }}>
        <label htmlFor="recovery-input" className="block">Pega la clave privada</label><input id="recovery-input" type="password" autoComplete="off" spellCheck={false} value={key} onChange={event => setKey(event.target.value)} className="min-h-14 w-full rounded-lg border border-gray-600 bg-gray-950 px-3" />
        <button className={`${control} w-full`} disabled={busy || !key}>Recuperar clips recibidos</button>
      </form></details>}
      {session && !active && !pending.length && !state.completionPending && <button type="button" className={`${control} w-full`} disabled={busy} onClick={reset}>Nueva grabación · guarda la clave anterior</button>}
      <p className="text-sm text-gray-300">Límites: 100 partes, 2 MiB por envío, 16 MiB pendientes y 64 MiB por grabación. WebM en navegadores compatibles. Bloquear la pantalla puede retrasar o interrumpir la captura.</p>
      <div className="recording-controls z-40 border-t border-gray-700 bg-[#0B0F19] px-4 py-3">
        {active ? <button type="button" className={`${control} w-full bg-red-800`} onClick={() => controller.current?.stop()} disabled={state.phase === 'stopping'}>{state.phase === 'requesting' ? 'Cancelar solicitud de permiso' : 'Detener grabación'}</button>
          : pending.length ? <button type="button" className={`${control} w-full bg-amber-900`} onClick={() => controller.current?.retry()}>Reintentar {pending.length} pendientes</button>
            : state.completionPending ? <button type="button" className={`${control} w-full bg-amber-900`} disabled={state.finalizing} onClick={() => controller.current?.retry()}>{state.finalizing ? 'Confirmando grabación completa…' : 'Reintentar cierre de grabación'}</button>
              : !session ? <button type="button" className={`${control} w-full bg-red-800`} disabled={busy} onClick={() => void start()}>{busy ? 'Preparando almacenamiento…' : 'Iniciar grabación'}</button>
              : <p className="py-3 text-center font-semibold">{state.completion || session.completion ? 'Grabación lista' : `${received.length} ${session.format ? 'partes recibidas' : 'clips recibidos'}`} · captura apagada</p>}
      </div>
    </section>
  );
}
