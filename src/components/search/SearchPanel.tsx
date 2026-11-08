'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { bogotaDay } from '@/lib/community/contracts';
import { isPublicNotice, NOTICE_KINDS, NOTICE_LABELS, object, parseCreateNotice, parseTip, type CreateNoticeInput, type NoticeKind, type PublicNotice, type Suggestion, type TipInput } from '@/lib/search/contracts';
import { MEDELLIN_COMUNAS } from '@/utils/medellinGeo';
import styles from './search.module.css';

class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
async function api(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`/api/search${path}`, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? undefined : { 'Content-Type': 'application/json', 'x-search-client': '1' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000), cache: 'no-store' });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, object(data) && typeof data.error === 'string' ? data.error : 'El servidor no confirmó la solicitud.');
  return data;
}
const message = (problem: unknown) => problem instanceof Error && !['TimeoutError', 'TypeError'].includes(problem.name) ? problem.message : 'No se pudo confirmar. Conserva esta pestaña y reintenta.';
const formatDate = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
function CommuneSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label>Comuna del suceso<select required value={value} onChange={event => onChange(event.target.value)}><option value="">Elige una comuna</option>{MEDELLIN_COMUNAS.map(commune => <option key={commune.number} value={commune.number}>{commune.name}</option>)}</select></label>; }

function NoticeWizard({ onPublished, onClose }: { onPublished: (notice: PublicNotice) => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<NoticeKind>('person-lost');
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [commune, setCommune] = useState(''); const [eventDate, setEventDate] = useState(''); const [contact, setContact] = useState('');
  const [attempted, setAttempted] = useState(false); const [consent, setConsent] = useState(false); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const pending = useRef<CreateNoticeInput | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  async function publish() {
    if (!consent || sending) return;
    if (!pending.current) {
      const validated = parseCreateNotice({ requestId: crypto.randomUUID(), kind, title, description, commune: Number(commune), eventDate, contact, consent });
      if (!validated) { setError('Revisa el título, la descripción, la comuna y la fecha antes de publicar. El título necesita al menos 3 caracteres sin contar espacios exteriores.'); return; }
      pending.current = validated;
    }
    setAttempted(true); setSending(true); setError('');
    try { const data = await api('', pending.current); if (!object(data) || !isPublicNotice(data.notice)) throw new Error('No se confirmó el aviso. Reintenta.'); onPublished(data.notice); }
    catch (problem) {
      if (problem instanceof ApiError && problem.status === 400) { pending.current = null; setAttempted(false); }
      setError(message(problem));
    } finally { setSending(false); }
  }
  return <section className={styles.surface} aria-label="Crear aviso">
    <p className={styles.eyebrow}>Nuevo aviso · Paso {step + 1} de 5</p>
    <h2 ref={heading} tabIndex={-1}>{['¿Qué ocurrió?', 'Describe lo que se puede compartir', '¿Dónde y cuándo ocurrió?', 'Contacto para el equipo', 'Revisa antes de publicar'][step]}</h2>
    <p>No publiques documentos, teléfonos, direcciones precisas ni información sensible. Comparte solo datos que tienes autorización para publicar.</p>
    <form onSubmit={event => { event.preventDefault(); if (step === 4) void publish(); else setStep(value => value + 1); }}>
      <fieldset disabled={sending || attempted}>
        {step === 0 && <label>Tipo de aviso<select value={kind} onChange={event => setKind(event.target.value as NoticeKind)}>{NOTICE_KINDS.map(value => <option key={value} value={value}>{NOTICE_LABELS[value]}</option>)}</select></label>}
        {step === 1 && <><label>Título breve<input required minLength={3} maxLength={80} value={title} onChange={event => setTitle(event.target.value)} /></label><label>Descripción pública<textarea required minLength={10} maxLength={1200} rows={5} value={description} onChange={event => setDescription(event.target.value)} /></label></>}
        {step === 2 && <><CommuneSelect value={commune} onChange={setCommune} /><label>Fecha del suceso<input type="date" required min="1900-01-01" max={bogotaDay()} value={eventDate} onChange={event => setEventDate(event.target.value)} /></label></>}
        {step === 3 && <><label>Contacto privado (opcional)<input data-sensitive="true" autoComplete="off" maxLength={200} value={contact} onChange={event => setContact(event.target.value)} /></label><p>Se almacena de forma privada. No aparece en el tablero ni en el afiche. No garantiza contacto o respuesta.</p></>}
        {step === 4 && <><div className={styles.review}><strong>{NOTICE_LABELS[kind]} · {title}</strong><p>{description}</p><p>Comuna {commune} · {formatDate(eventDate)}</p><p>Contacto privado: {contact ? 'incluido, no se publica' : 'sin contacto'}</p></div><label className={styles.check}><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} />Autorizo publicar estos datos</label><p>El aviso será público y podrá copiarse fuera de AlzaVoz. No está verificado.</p></>}
      </fieldset>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        {step > 0 && !attempted && <button type="button" disabled={sending} onClick={() => setStep(value => value - 1)}>Atrás</button>}
        <button className={styles.primary} disabled={sending || (step === 4 && !consent)} type="submit">{sending ? 'Publicando…' : attempted ? 'Reintentar publicación' : step === 4 ? 'Publicar aviso' : step === 3 ? 'Revisar aviso' : 'Continuar'}</button>
        <button type="button" disabled={sending} onClick={onClose}>{attempted ? 'Cerrar formulario' : 'Cancelar'}</button>
      </div>
      {attempted && <p>El envío puede estar guardado. Reintenta para confirmarlo; cerrar descarta la confirmación pendiente.</p>}
    </form>
  </section>;
}

function NoticeDetail({ notice }: { notice: PublicNotice }) {
  const [text, setText] = useState(''); const [contact, setContact] = useState(''); const [consent, setConsent] = useState(false);
  const [attempted, setAttempted] = useState(false); const [sending, setSending] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState('');
  const [aiConsent, setAiConsent] = useState(false); const [aiBusy, setAiBusy] = useState(false); const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null); const [aiError, setAiError] = useState('');
  const [posterBusy, setPosterBusy] = useState(false); const [posterError, setPosterError] = useState('');
  const pending = useRef<TipInput | null>(null);
  async function sendTip() {
    if (!consent || sending || sent) return;
    if (!pending.current) {
      const validated = parseTip({ requestId: crypto.randomUUID(), text, contact, consent });
      if (!validated) { setError('Revisa la pista. Necesita al menos 3 caracteres sin contar espacios exteriores.'); return; }
      pending.current = validated;
    }
    setAttempted(true); setSending(true); setError('');
    try { const data = await api(`/${notice.id}/tips`, pending.current); if (!object(data) || data.accepted !== true) throw new Error('No se confirmó la pista. Reintenta.'); setSent(true); setText(''); setContact(''); pending.current = null; }
    catch (problem) {
      if (problem instanceof ApiError && problem.status === 400) { pending.current = null; setAttempted(false); }
      setError(message(problem));
    } finally { setSending(false); }
  }
  async function matches() {
    if (!aiConsent || aiBusy) return;
    setAiBusy(true); setAiError(''); setSuggestions(null);
    try {
      const data = await api(`/${notice.id}/matches`, { consent: true });
      if (!object(data) || !['deepseek-ai', 'no-candidates'].includes(String(data.source)) || !Array.isArray(data.suggestions) || !data.suggestions.every((value: unknown) => object(value) && typeof value.id === 'string' && typeof value.reason === 'string')) throw new Error('No se confirmaron las sugerencias.');
      setSuggestions(data.suggestions as Suggestion[]);
    } catch (problem) { setAiError(message(problem)); } finally { setAiBusy(false); }
  }
  async function poster() { setPosterBusy(true); setPosterError(''); try { const { downloadPoster } = await import('@/lib/search/poster'); await downloadPoster(notice); } catch (problem) { setPosterError(message(problem)); } finally { setPosterBusy(false); } }
  return <div className={styles.detail}>
    <article className={styles.surface}><p className={styles.eyebrow}>{NOTICE_LABELS[notice.kind]} · Aviso no verificado</p><h2>{notice.title}</h2><p className={styles.description}>{notice.description}</p><p>Comuna {notice.commune} · Suceso: {formatDate(notice.eventDate)}</p><p>Publicado: {new Date(notice.createdAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</p><button className={styles.primary} onClick={() => void poster()} disabled={posterBusy}>{posterBusy ? 'Generando afiche…' : 'Descargar afiche PNG'}</button><p>El afiche incluye la descripción pública y un QR a este aviso. Puedes imprimirlo en blanco y negro.</p>{posterError && <p role="alert" className={styles.error}>{posterError}</p>}</article>
    <section className={styles.surface} aria-labelledby="tip-title"><h2 id="tip-title">¿Tienes una pista?</h2><p>No necesitas una cuenta ni dar tu identidad. La pista y el contacto se almacenan de forma privada para revisión futura del equipo. Este canal no ofrece seguimiento ni respuesta inmediata.</p>
      {sent ? <p role="status">Pista recibida y almacenada de forma privada.</p> : <form onSubmit={event => { event.preventDefault(); void sendTip(); }}><fieldset disabled={sending || attempted}><label>Tu pista privada<textarea data-sensitive="true" autoComplete="off" required minLength={3} maxLength={1200} rows={4} value={text} onChange={event => setText(event.target.value)} /></label><label>Tu contacto privado (opcional)<input data-sensitive="true" autoComplete="off" maxLength={200} value={contact} onChange={event => setContact(event.target.value)} /></label><label className={styles.check}><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} />Autorizo almacenar esta pista</label></fieldset>{error && <p role="alert" className={styles.error}>{error}</p>}<button className={styles.primary} disabled={sending || !consent}>{sending ? 'Enviando pista…' : attempted ? 'Reintentar pista' : 'Enviar pista privada'}</button></form>}
    </section>
    <section className={styles.surface} aria-labelledby="matches-title"><h2 id="matches-title">Explorar avisos similares</h2><p>La IA compara hasta 20 avisos recientes de la categoría complementaria. Son sugerencias para revisar, no identificación de personas ni coincidencias confirmadas.</p><label className={styles.check}><input type="checkbox" checked={aiConsent} disabled={aiBusy} onChange={event => setAiConsent(event.target.checked)} />Autorizo enviar a DeepSeek los datos públicos de este aviso y sus candidatos</label><button disabled={!aiConsent || aiBusy} onClick={() => void matches()}>{aiBusy ? 'Comparando…' : 'Buscar sugerencias con IA'}</button>{aiError && <p role="alert" className={styles.error}>{aiError}</p>}{suggestions && (suggestions.length ? <ul>{suggestions.map(suggestion => <li key={suggestion.id}><a href={`/search?id=${suggestion.id}`}>Revisar aviso sugerido</a><p>{suggestion.reason}</p></li>)}</ul> : <p role="status">No hay sugerencias entre los candidatos consultados.</p>)}</section>
  </div>;
}

export function SearchPanel() {
  const [notices, setNotices] = useState<PublicNotice[]>([]); const [selected, setSelected] = useState<PublicNotice | null>(null);
  const [kind, setKind] = useState<NoticeKind>('person-lost'); const [creating, setCreating] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const id = new URLSearchParams(window.location.search).get('id');
    void api(id ? `/${encodeURIComponent(id)}` : '').then(data => {
      if (!active) return;
      if (id) { if (!object(data) || !isPublicNotice(data.notice)) throw new Error('No se pudo consultar el aviso.'); setSelected(data.notice); }
      else { if (!object(data) || !Array.isArray(data.notices) || !data.notices.every(isPublicNotice)) throw new Error('No se pudo consultar el tablero.'); setNotices(data.notices); }
    }).catch(problem => { if (active) setError(message(problem)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  function published(notice: PublicNotice) { window.history.replaceState(null, '', `/search?id=${notice.id}`); setSelected(notice); setCreating(false); }
  return <div className={styles.panel}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>Radar comunitario</p><h1>Tableros de búsqueda</h1><p>Personas y mascotas perdidas o encontradas en Medellín.</p></div><Image src="/assets/alzabot/bot-radar-thumb.webp" alt="Alza Bot en modo Radar" width={88} height={88} /></header>
    <p className={styles.notice}>Avisos públicos sin verificar. No publiques información que pueda poner a alguien en riesgo. La salida rápida no elimina el historial completo ni las copias del aviso.</p>
    {creating ? <NoticeWizard onPublished={published} onClose={() => setCreating(false)} /> : <>
      <div className={styles.toolbar}>{selected ? <a href="/search">Volver a los tableros</a> : <button className={styles.primary} onClick={() => setCreating(true)}>Crear aviso</button>}</div>
      {loading && <p role="status">Consultando avisos…</p>}{error && <div role="alert" className={styles.error}><p>{error}</p><button onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1); }}>Reintentar consulta</button><a href="/search">Ver tableros</a></div>}
      {selected ? <NoticeDetail key={selected.id} notice={selected} /> : !loading && !error && <section aria-labelledby="board-title"><h2 id="board-title">Consulta un tablero</h2><p>Se muestran los últimos 60 avisos del conjunto de tableros. Un aviso ausente puede ser anterior a este listado.</p><div role="group" aria-label="Elegir tablero" className={styles.tabs}>{NOTICE_KINDS.map(value => <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{NOTICE_LABELS[value]}</button>)}</div><div className={styles.board}>{notices.filter(notice => notice.kind === kind).map(notice => <article className={styles.row} key={notice.id}><p>Comuna {notice.commune} · {formatDate(notice.eventDate)}</p><h3><a href={`/search?id=${notice.id}`}>{notice.title}</a></h3><p>{notice.description}</p></article>)}{!notices.some(notice => notice.kind === kind) && <p>No hay avisos de esta categoría en el listado reciente.</p>}</div></section>}
    </>}
  </div>;
}
