'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { captureNoise, type NoiseObservation } from '@/lib/community/capture';
import { bogotaDay, COMMUNITY_CATEGORIES, type CommunityCategory, type CommunityInput } from '@/lib/community/contracts';
import { MEDELLIN_COMUNAS } from '@/utils/medellinGeo';
import { CommunityMap } from './CommunityMap';

export function CommunityPanel() {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<NoiseObservation | null>(null);
  const [error, setError] = useState('');
  const [commune, setCommune] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('music');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revision, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef<CommunityInput | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);
  async function start() {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    pending.current = null;
    setAttempted(false);
    setActive(true); setResult(null); setError(''); setSent(false); setSeconds(0);
    try {
      const observation = await captureNoise(current.signal, setSeconds);
      if (mounted.current && !current.signal.aborted) setResult(observation);
    } catch (problem) {
      if (mounted.current) setError(problem instanceof Error ? problem.message : 'No se pudo completar la observación.');
    } finally { controller.current = null; if (mounted.current) setActive(false); }
  }
  async function share() {
    if (!result || !commune || sending || sent) return;
    // Freeze the payload on first attempt, including its day, for safe retries across midnight.
    pending.current ??= { requestId: crypto.randomUUID(), commune: Number(commune), category, day: bogotaDay(new Date(result.capturedAt)) };
    setAttempted(true);
    setSending(true); setError('');
    try {
      const response = await fetch('/api/community', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-community-client': '1' },
        body: JSON.stringify(pending.current), signal: AbortSignal.timeout(15000) });
      const data: unknown = await response.json();
      if (!response.ok || !data || typeof data !== 'object' || !('accepted' in data) || data.accepted !== true) {
        throw new Error(data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'El servidor no confirmó el envío. Reintenta.');
      }
      if (mounted.current) { setSent(true); setRevision(value => value + 1); }
    } catch (problem) {
      if (mounted.current) setError(problem instanceof Error && problem.name !== 'TimeoutError' ? problem.message : 'No se confirmó el envío. Reintenta con los mismos datos.');
    } finally { if (mounted.current) setSending(false); }
  }
  return <div className="community-panel">
    <header className="community-heading">
      <div><h1>Convivencia barrial</h1><p>Observa el sonido a tu alrededor y aporta al mapa de tu comuna.</p></div>
      <Image src="/assets/alzabot/bot-radar-thumb.webp" alt="Alza Bot en modo Radar" width={72} height={72} />
    </header>
    <div className="community-layout">
      <section className="community-capture" aria-labelledby="noise-title">
        <h2 id="noise-title">Observación de sonido</h2>
        <p>El micrófono se usa durante 15 segundos. El audio se procesa aquí y se descarta; no se graba ni se envía.</p>
        <span className="community-calibration">Sin calibración</span>
        <p className="community-note">La lectura en dBFS describe señal digital, no presión sonora en dB SPL o dBA. No certifica una infracción ni permite comparar teléfonos.</p>
        <div className="community-reading" aria-live="polite" aria-atomic="true">
          {active ? <><strong>{seconds.toFixed(0)} / 15 s</strong><span>{seconds === 0 ? 'Esperando permiso y señal…' : 'Micrófono activo. Mantén esta pestaña visible.'}</span></> :
            result ? <><strong data-sensitive="true">{result.dbfs === null ? 'Sin señal' : `${result.dbfs.toFixed(1)} dBFS`}</strong><span>Observación completa · Micrófono apagado</span></> : <><strong>15 segundos</strong><span>El micrófono está apagado.</span></>}
        </div>
        {active && <progress value={seconds} max={15} aria-label="Segundos de audio observados" />}
        {error && <p role="alert" className="community-error">{error}</p>}
        {result && <div data-sensitive="true" className="community-result">
          <p>Fecha: {new Date(result.capturedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} (Bogotá)</p>
          <p>{result.duration.toFixed(2)} s · {result.sampleRate} Hz · {result.samples} muestras · mono</p>
          {result.peak >= 0.99 && <p role="status">Señal saturada o cerca del límite digital. La lectura puede estar distorsionada.</p>}
          {result.dbfs === null && <p>No llegó señal útil. Esto no demuestra silencio en el entorno.</p>}
          <details><summary>Método y límites de la lectura</summary>
            <p>RMS de todas las muestras: 20 × log10(RMS / 1), sin ponderación de frecuencia. El pico digital fue {result.peak.toFixed(3)}.</p>
            <p>Procesamiento informado por el dispositivo: {result.processing}. Si algún ajuste está activo o no informado, puede alterar la lectura.</p>
            <p>No hay calibración física disponible. Una comparación acústica requiere micrófono y referencia calibrados, ganancia fija y pruebas a varias frecuencias y niveles.</p>
          </details>
        </div>}
        {result && !sent && <fieldset className="community-share" disabled={sending || attempted}>
          <legend>Aportar una observación (opcional)</legend>
          <label className="community-field">Comuna elegida
            <select data-sensitive="true" value={commune} onChange={event => setCommune(event.target.value)}><option value="">Elige tu comuna</option>
              {MEDELLIN_COMUNAS.map(zone => <option key={zone.number} value={zone.number}>{zone.name}</option>)}
            </select>
          </label>
          <label className="community-field">Categoría del ruido
            <select data-sensitive="true" value={category} onChange={event => setCategory(event.target.value as CommunityCategory)}>
              {Object.entries(COMMUNITY_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </fieldset>}
        {result && !sent && <>
          <p className="community-note">Al compartir, envías solo comuna, categoría y día, con un código aleatorio para evitar duplicados. No enviamos audio, lectura, GPS ni dirección. Se cuentan avisos de 30 días; no es una denuncia ni un envío a autoridades.</p>
          <button className="community-primary" disabled={!commune || sending} onClick={() => void share()}>{sending ? 'Confirmando…' : attempted ? 'Reintentar envío' : 'Compartir observación'}</button>
        </>}
        {sent && <p role="status" className="community-success">Observación recibida. El mapa muestra el recuento agregado.</p>}
        <div className="community-capture-actions">
          {active ? <button className="community-secondary" onClick={() => controller.current?.abort()}><Square size={20} aria-hidden="true" />Cancelar observación</button> :
            <button className="community-primary" disabled={sending} onClick={() => void start()}><Mic size={20} aria-hidden="true" />{result ? 'Observar de nuevo' : 'Observar 15 segundos'}</button>}
        </div>
      </section>
      <CommunityMap key={revision} />
    </div>
  </div>;
}
