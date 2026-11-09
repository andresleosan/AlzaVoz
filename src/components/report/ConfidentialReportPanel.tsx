'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Eye,
  Trash2,
  MapPin,
  Users,
  FileText,
  X,
} from 'lucide-react';
import { AlzaBotAvatar } from '@/components/AlzaBotAvatar';
import { QuickEscapeButton } from '@/components/QuickEscapeButton';
import {
  EvidenceSanitizerSection,
  type PreparedAttachment,
} from '@/components/report/EvidenceSanitizerSection';
import { useAppMode } from '@/context/AppModeContext';
import {
  buildReportWhatsAppUrl,
  createClientSecret,
  createOrRecoverReport,
  getReportByKey,
  parseReportRecoveryKey,
  uploadReportAttachment,
  updateReportSafeContact,
} from '@/lib/report/client';
import {
  REPORT_CATEGORIES,
  REPORT_COMMUNES,
  REPORT_RISK_LEVELS,
  RESERVED_COMMUNE,
  SAFE_CONTACT_CHANNELS,
  SAFE_CONTACT_DAYS,
  SAFE_CONTACT_TIME_SLOTS,
  type ReportCategory,
  type ReportRecord,
  type ReportRiskLevel,
  type SafeContactConfig,
  type SafeContactChannel,
  type SafeContactDays,
  type SafeContactTimeSlot,
} from '@/lib/report/contracts';

const DRAFT_STORAGE_KEY = 'alzavoz_report_draft';
const RECORDING_STORAGE_KEY = 'alzavoz_recording_key';

const control =
  'min-h-14 min-w-14 inline-flex items-center justify-center rounded-xl border border-gray-600 px-4 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 disabled:opacity-50 motion-safe:active:scale-95';

type Step = 1 | 2 | 3;

interface DraftData {
  category: ReportCategory;
  riskLevel: ReportRiskLevel;
  commune: string;
  neighborhoodReference: string;
  incidentDate: string;
  summary: string;
}

function loadInitialDraft(): DraftData {
  const defaults: DraftData = {
    category: 'violencia-genero-intrafamiliar',
    riskLevel: 'alto',
    commune: RESERVED_COMMUNE,
    neighborhoodReference: '',
    incidentDate: '',
    summary: '',
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<DraftData>;
    return {
      category: parsed.category ?? defaults.category,
      riskLevel: parsed.riskLevel ?? defaults.riskLevel,
      commune: parsed.commune ?? defaults.commune,
      neighborhoodReference:
        typeof parsed.neighborhoodReference === 'string' ? parsed.neighborhoodReference : '',
      incidentDate: typeof parsed.incidentDate === 'string' ? parsed.incidentDate : '',
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  } catch {
    return defaults;
  }
}

function loadInitialSessionRecordingKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(RECORDING_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function SafeContactStatusCard({
  record,
  secretKey,
  onUpdated,
  triggerHaptic,
}: {
  record: ReportRecord;
  secretKey: string;
  onUpdated: (updated: ReportRecord) => void;
  triggerHaptic: (ms: number) => void;
}) {
  const currentConfig: SafeContactConfig = record.safeContact ?? { preference: 'no_contact' };
  const [isEditing, setIsEditing] = useState(false);
  const [channel, setChannel] = useState<SafeContactChannel>(currentConfig.channel ?? 'whatsapp');
  const [contactValue, setContactValue] = useState(currentConfig.contactValue ?? '');
  const [timeSlot, setTimeSlot] = useState<SafeContactTimeSlot>(currentConfig.timeSlot ?? 'morning');
  const [customStart, setCustomStart] = useState(currentConfig.customStart ?? '08:00');
  const [customEnd, setCustomEnd] = useState(currentConfig.customEnd ?? '12:00');
  const [days, setDays] = useState<SafeContactDays>(currentConfig.days ?? 'all');
  const [safetyNotes, setSafetyNotes] = useState(currentConfig.safetyNotes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValue.trim()) {
      setError('Indica tu número, usuario o correo de contacto seguro.');
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const config: SafeContactConfig = {
        preference: 'safe_contact',
        channel,
        contactValue: contactValue.trim(),
        timeSlot,
        ...(timeSlot === 'custom' ? { customStart, customEnd } : {}),
        days,
        safetyNotes: safetyNotes.trim() || undefined,
      };
      const updated = await updateReportSafeContact(record.code, secretKey, config);
      onUpdated(updated);
      setIsEditing(false);
      setMessage('Condiciones de contacto actualizadas exitosamente.');
      triggerHaptic(30);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar contacto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateReportSafeContact(record.code, secretKey, { preference: 'no_contact' });
      onUpdated(updated);
      setIsEditing(false);
      setMessage('Preferencia actualizada a NO CONTACTO. El equipo no podrá comunicarse contigo.');
      triggerHaptic(30);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al retirar contacto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div data-testid="safe-contact-card" className="rounded-xl border border-violet-500/40 bg-[#0B0F19] p-4 space-y-3 mt-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white">
          Condiciones de contacto vigentes
        </h3>
        <span
          data-testid="safe-contact-badge"
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            currentConfig.preference === 'no_contact'
              ? 'bg-amber-950/80 text-amber-200 border border-amber-500/40'
              : 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/40'
          }`}
        >
          {currentConfig.preference === 'no_contact'
            ? '🚫 Sin contacto (No recibir mensajes)'
            : `🛡️ Contacto seguro (${currentConfig.channel?.toUpperCase()})`}
        </span>
      </div>

      {currentConfig.preference === 'safe_contact' ? (
        <div className="text-xs text-gray-300 space-y-1">
          <p>
            <strong>Canal:</strong> {currentConfig.channel?.toUpperCase()} · <strong>Dato:</strong>{' '}
            <span data-sensitive="true">{currentConfig.contactValue}</span>
          </p>
          <p>
            <strong>Franja horaria:</strong>{' '}
            {currentConfig.timeSlot === 'custom'
              ? `${currentConfig.customStart} – ${currentConfig.customEnd} COT`
              : currentConfig.timeSlot === 'morning'
              ? 'Mañana (08:00 – 12:00 COT)'
              : currentConfig.timeSlot === 'afternoon'
              ? 'Tarde (14:00 – 18:00 COT)'
              : 'Noche (18:00 – 21:00 COT)'}{' '}
            · <strong>Días:</strong>{' '}
            {currentConfig.days === 'weekdays'
              ? 'Lunes a Viernes'
              : currentConfig.days === 'weekends'
              ? 'Fines de semana'
              : 'Todos los días'}
          </p>
          {currentConfig.safetyNotes && (
            <p>
              <strong>Notas para el equipo:</strong> {currentConfig.safetyNotes}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-300">
          Has seleccionado la opción de <strong>no recibir mensajes ni llamadas</strong>. El equipo tiene estrictamente prohibido contactarte para salvaguardar tu seguridad.
        </p>
      )}

      {message && (
        <p role="status" className="text-xs text-emerald-300 font-medium">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-300 font-medium">
          {error}
        </p>
      )}

      {!isEditing ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            id="btn-edit-safe-contact"
            onClick={() => {
              setChannel(currentConfig.channel ?? 'whatsapp');
              setContactValue(currentConfig.contactValue ?? '');
              setTimeSlot(currentConfig.timeSlot ?? 'morning');
              setCustomStart(currentConfig.customStart ?? '08:00');
              setCustomEnd(currentConfig.customEnd ?? '12:00');
              setDays(currentConfig.days ?? 'all');
              setSafetyNotes(currentConfig.safetyNotes ?? '');
              setIsEditing(true);
              setMessage(null);
              setError(null);
            }}
            className="min-h-12 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-800 text-white hover:bg-gray-700 border border-gray-600"
          >
            Modificar condiciones seguras
          </button>
          {currentConfig.preference === 'safe_contact' && (
            <button
              type="button"
              id="btn-withdraw-safe-contact"
              disabled={isSaving}
              onClick={handleWithdraw}
              className="min-h-12 px-3 py-2 text-xs font-semibold rounded-lg bg-red-950/80 text-red-200 hover:bg-red-900 border border-red-700"
            >
              Retirar contacto por completo
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="border-t border-gray-700 pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-safe-channel" className="block text-xs font-semibold text-white mb-1">
                Canal seguro
              </label>
              <select
                id="edit-safe-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as SafeContactChannel)}
                className="min-h-12 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 text-xs text-white"
              >
                {SAFE_CONTACT_CHANNELS.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-safe-value" className="block text-xs font-semibold text-white mb-1">
                Dato de contacto (teléfono, usuario o correo)
              </label>
              <input
                id="edit-safe-value"
                type="text"
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder="+57 300 0000000"
                className="min-h-12 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-safe-slot" className="block text-xs font-semibold text-white mb-1">
                Franja horaria (COT)
              </label>
              <select
                id="edit-safe-slot"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value as SafeContactTimeSlot)}
                className="min-h-12 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 text-xs text-white"
              >
                {SAFE_CONTACT_TIME_SLOTS.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-safe-days" className="block text-xs font-semibold text-white mb-1">
                Días permitidos
              </label>
              <select
                id="edit-safe-days"
                value={days}
                onChange={(e) => setDays(e.target.value as SafeContactDays)}
                className="min-h-12 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 text-xs text-white"
              >
                {SAFE_CONTACT_DAYS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {timeSlot === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-custom-start" className="block text-xs text-gray-300 mb-1">
                  Hora inicio (HH:MM)
                </label>
                <input
                  id="edit-custom-start"
                  type="time"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="min-h-12 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="edit-custom-end" className="block text-xs text-gray-300 mb-1">
                  Hora fin (HH:MM)
                </label>
                <input
                  id="edit-custom-end"
                  type="time"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="min-h-12 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 text-xs text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="edit-safe-notes" className="block text-xs font-semibold text-white mb-1">
              Notas de discreción
            </label>
            <input
              id="edit-safe-notes"
              type="text"
              value={safetyNotes}
              onChange={(e) => setSafetyNotes(e.target.value)}
              placeholder="Instrucciones para el equipo (opcional)"
              maxLength={200}
              className="min-h-12 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 text-xs text-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              id="btn-save-safe-contact"
              disabled={isSaving}
              className="min-h-12 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-800 text-white hover:bg-emerald-700"
            >
              {isSaving ? 'Guardando…' : 'Guardar condiciones'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="min-h-12 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ConfidentialReportPanel() {
  const { setNavigationLocked, triggerHaptic } = useAppMode();
  const initialDraft = loadInitialDraft();
  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<ReportCategory>(initialDraft.category);
  const [riskLevel, setRiskLevel] = useState<ReportRiskLevel>(initialDraft.riskLevel);
  const [commune, setCommune] = useState<string>(initialDraft.commune);
  const [neighborhoodReference, setNeighborhoodReference] = useState(initialDraft.neighborhoodReference);
  const [incidentDate, setIncidentDate] = useState(initialDraft.incidentDate);
  const [summary, setSummary] = useState(initialDraft.summary);
  const [recordingKey, setRecordingKey] = useState('');
  const [sessionRecordingKey] = useState<string>(loadInitialSessionRecordingKey);
  const [attachments, setAttachments] = useState<PreparedAttachment[]>([]);
  const [privacyAck, setPrivacyAck] = useState(false);

  const [submittedRecord, setSubmittedRecord] = useState<ReportRecord | null>(null);
  const [submittedSecret, setSubmittedSecret] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [lookupKey, setLookupKey] = useState('');
  const [lookupResult, setLookupResult] = useState<ReportRecord | null>(null);

  // Safe contact preferences (Tarea 11 / Idea I001)
  const [contactPreference, setContactPreference] = useState<'no_contact' | 'safe_contact'>('no_contact');
  const [safeChannel, setSafeChannel] = useState<SafeContactChannel>('whatsapp');
  const [safeContactValue, setSafeContactValue] = useState('');
  const [safeTimeSlot, setSafeTimeSlot] = useState<SafeContactTimeSlot>('morning');
  const [safeCustomStart, setSafeCustomStart] = useState('08:00');
  const [safeCustomEnd, setSafeCustomEnd] = useState('12:00');
  const [safeDays, setSafeDays] = useState<SafeContactDays>('all');
  const [safeNotes, setSafeNotes] = useState('');

  // Vista previa de lo que se comparte: precisión territorial (Tarea 12 / Idea I002)
  const [reportLocationPrecision, setReportLocationPrecision] = useState<'full' | 'commune_only' | 'none'>('full');

  const attemptRef = useRef<{ requestId: string; clientSecret: string } | null>(null);
  const attachmentsRef = useRef<PreparedAttachment[]>([]);

  const pendingAttachments = attachments.filter((item) => !item.uploadedReceipt);
  const isPartiallySubmitted = Boolean(submittedRecord && pendingAttachments.length > 0);
  const isComplete = Boolean(submittedRecord && pendingAttachments.length === 0);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    setNavigationLocked(busy || isPartiallySubmitted);
    return () => setNavigationLocked(false);
  }, [busy, isPartiallySubmitted, setNavigationLocked]);

  useEffect(() => {
    return () => {
      for (const item of attachmentsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (isComplete) return;
    try {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ category, riskLevel, commune, neighborhoodReference, incidentDate, summary })
      );
    } catch {
      // Ignore storage quota errors.
    }
  }, [category, riskLevel, commune, neighborhoodReference, incidentDate, summary, isComplete]);

  function handleAddAttachment(item: PreparedAttachment) {
    setAttachments((prev) => [...prev, item]);
  }

  function handleRemoveAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  function goToStep(target: Step) {
    setError('');
    setStep(target);
  }

  function handleNextFromStep1() {
    if (summary.trim().length < 15) {
      setError('Describe brevemente lo ocurrido (mínimo 15 caracteres) antes de continuar.');
      return;
    }
    setError('');
    setStep(2);
  }

  async function handleSubmitToD1() {
    if (busy) return;
    if (summary.trim().length < 15) {
      setError('El relato debe tener al menos 15 caracteres.');
      setStep(1);
      return;
    }
    if (contactPreference === 'safe_contact' && !safeContactValue.trim()) {
      setError('Indica tu teléfono o dato de contacto seguro antes de continuar, o selecciona la opción "No recibir mensajes".');
      return;
    }
    if (!privacyAck) {
      setError('Marca la casilla confirmando que leíste qué comparte cada canal y los límites de privacidad.');
      return;
    }

    setBusy(true);
    setError('');
    setStatusMessage('Radicando expediente en Cloudflare D1…');
    if (!attemptRef.current) {
      attemptRef.current = {
        requestId: crypto.randomUUID(),
        clientSecret: createClientSecret(),
      };
    }
    const { requestId, clientSecret } = attemptRef.current;
    setSubmittedSecret(clientSecret);

    const safeContactConfig: SafeContactConfig =
      contactPreference === 'no_contact'
        ? { preference: 'no_contact' }
        : {
            preference: 'safe_contact',
            channel: safeChannel,
            contactValue: safeContactValue.trim(),
            timeSlot: safeTimeSlot,
            ...(safeTimeSlot === 'custom' ? { customStart: safeCustomStart, customEnd: safeCustomEnd } : {}),
            days: safeDays,
            safetyNotes: safeNotes.trim() || undefined,
          };

    const finalCommune = reportLocationPrecision === 'none' ? RESERVED_COMMUNE : commune;
    const finalNeighborhood = reportLocationPrecision === 'full' ? neighborhoodReference : '';

    try {
      const baseRecord = await createOrRecoverReport(
        {
          requestId,
          category,
          riskLevel,
          commune: finalCommune,
          neighborhoodReference: finalNeighborhood,
          summary,
          incidentDate,
          ...(recordingKey.trim() ? { recordingKey: recordingKey.trim() } : {}),
          expectedAttachments: attachments.length,
          privacyAck: true,
          safeContact: safeContactConfig,
        },
        clientSecret,
        AbortSignal.timeout(20_000)
      );
      setSubmittedRecord(baseRecord);

      for (let idx = 0; idx < attachments.length; idx++) {
        const item = attachments[idx];
        if (item.uploadedReceipt) continue;
        setStatusMessage(`Subiendo evidencia limpia ${idx + 1} de ${attachments.length} a R2…`);
        const receipt = await uploadReportAttachment(
          baseRecord.code,
          clientSecret,
          idx,
          item.bytes,
          item.mime,
          item.summary,
          AbortSignal.timeout(20_000)
        );
        setAttachments((prev) =>
          prev.map((entry, i) => (i === idx ? { ...entry, uploadedReceipt: { receivedAt: receipt.receivedAt } } : entry))
        );
      }

      const refreshed = await getReportByKey(`${baseRecord.code}.${clientSecret}`, AbortSignal.timeout(15_000));
      setSubmittedRecord(refreshed.record);
      setStatusMessage('Expediente radicado y verificado en Cloudflare D1.');
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore storage errors.
      }
      triggerHaptic(40);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar el envío. Tu expediente o adjuntos pendientes pueden reintentarse sin duplicar.'
      );
      setStatusMessage('');
    } finally {
      setBusy(false);
    }
  }

  async function handleLookupReport(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupKey.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const { record } = await getReportByKey(lookupKey, AbortSignal.timeout(15_000));
      setLookupResult(record);
      setStatusMessage(`Expediente ${record.code} consultado desde Cloudflare D1.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el expediente.');
      setLookupResult(null);
    } finally {
      setBusy(false);
    }
  }

  function handleStartNewReport() {
    for (const item of attachments) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setAttachments([]);
    setSummary('');
    setNeighborhoodReference('');
    setIncidentDate('');
    setRecordingKey('');
    setPrivacyAck(false);
    setSubmittedRecord(null);
    setSubmittedSecret('');
    attemptRef.current = null;
    setError('');
    setStatusMessage('');
    setStep(1);
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore.
    }
  }

  const fullCaseKey = submittedRecord && submittedSecret ? `${submittedRecord.code}.${submittedSecret}` : '';
  const effectiveCommune = reportLocationPrecision === 'none' ? RESERVED_COMMUNE : commune;
  const effectiveNeighborhood = reportLocationPrecision === 'full' ? neighborhoodReference : '';
  const whatsappData = buildReportWhatsAppUrl({
    code: submittedRecord?.code,
    category,
    riskLevel,
    commune: effectiveCommune,
    neighborhoodReference: effectiveNeighborhood,
    summary: summary.trim() || 'Solicitud de apoyo confidencial en Medellín.',
    incidentDate,
    cleanAttachmentCount: attachments.length,
    hasLinkedRecording: Boolean(recordingKey.trim() || submittedRecord?.recordingSessionId),
  });

  return (
    <section aria-labelledby="report-title" className="mx-auto w-full max-w-3xl space-y-6 pb-12 text-base text-gray-100">
      <div className="flex items-center gap-4">
        <AlzaBotAvatar mode="violet" size="md" showLivePulse={false} />
        <div>
          <h1 id="report-title" className="text-2xl font-bold text-white">
            Denuncia confidencial y bóveda D1
          </h1>
          <p className="mt-1 text-sm text-gray-300">
            Limpia metadatos en tu navegador, protege tu voz y elige cómo compartir tu caso sin crear cuenta.
          </p>
        </div>
      </div>

      <nav aria-label="Pasos de la denuncia confidencial" className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => goToStep(1)}
          aria-current={step === 1 ? 'step' : undefined}
          className={`${control} text-sm ${
            step === 1 ? 'bg-gray-700 border-amber-200' : 'bg-[#111827] text-gray-300'
          }`}
        >
          1. Hechos
        </button>
        <button
          type="button"
          onClick={() => goToStep(2)}
          aria-current={step === 2 ? 'step' : undefined}
          className={`${control} text-sm ${
            step === 2 ? 'bg-gray-700 border-amber-200' : 'bg-[#111827] text-gray-300'
          }`}
        >
          2. Evidencias ({attachments.length})
        </button>
        <button
          type="button"
          onClick={() => goToStep(3)}
          aria-current={step === 3 ? 'step' : undefined}
          className={`${control} text-sm ${
            step === 3 ? 'bg-gray-700 border-amber-200' : 'bg-[#111827] text-gray-300'
          }`}
        >
          3. Privacidad y envío
        </button>
      </nav>

      {error && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-gray-900 p-4 text-amber-100">
          {error}
        </p>
      )}
      {statusMessage && (
        <p role="status" className="rounded-xl border border-gray-600 bg-gray-900 p-4 text-gray-100">
          {statusMessage}
        </p>
      )}

      {step === 1 && (
        <div className="space-y-5 rounded-xl border border-gray-700 bg-[#111827] p-5">
          <div className="space-y-2">
            <label htmlFor="report-category" className="block font-semibold text-white">
              Tipo de situación
            </label>
            <select
              id="report-category"
              disabled={busy || isComplete}
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-white"
            >
              {REPORT_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset disabled={busy || isComplete} className="space-y-2">
            <legend className="font-semibold text-white">Nivel de urgencia o riesgo</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {REPORT_RISK_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  aria-pressed={riskLevel === lvl.id}
                  onClick={() => setRiskLevel(lvl.id)}
                  className={`${control} text-sm ${
                    riskLevel === lvl.id ? 'bg-gray-700 border-amber-200' : 'bg-gray-950 text-gray-300'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="report-commune" className="block font-semibold text-white">
              Comuna o corregimiento (opcional por privacidad)
            </label>
            <select
              id="report-commune"
              disabled={busy || isComplete}
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-white"
            >
              {REPORT_COMMUNES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="report-neighborhood" className="block text-sm font-medium text-gray-200">
                Referencia del lugar (opcional)
              </label>
              <input
                id="report-neighborhood"
                data-sensitive="true"
                type="text"
                maxLength={160}
                disabled={busy || isComplete}
                value={neighborhoodReference}
                onChange={(e) => setNeighborhoodReference(e.target.value)}
                placeholder="Ej. Cerca a estación o vía pública (no pongas tu casa)"
                className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-white"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="report-date" className="block text-sm font-medium text-gray-200">
                Fecha o momento aproximado (opcional)
              </label>
              <input
                id="report-date"
                type="text"
                maxLength={40}
                disabled={busy || isComplete}
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                placeholder="Ej. Hoy 7:30 p. m."
                className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="report-summary" className="font-semibold text-white">
                Qué ocurrió (mínimo 15 caracteres)
              </label>
              <span className="font-tabular text-xs text-gray-300">{summary.trim().length} / 2000</span>
            </div>
            <textarea
              id="report-summary"
              data-sensitive="true"
              rows={4}
              maxLength={2000}
              disabled={busy || isComplete}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe los hechos relevantes. Si prefieres no identificarte, evita incluir tu nombre completo o teléfono en este texto."
              className="w-full rounded-xl border border-gray-600 bg-gray-950 p-3 text-white leading-relaxed"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <EvidenceSanitizerSection
          attachments={attachments}
          onAddAttachment={handleAddAttachment}
          onRemoveAttachment={handleRemoveAttachment}
          recordingKey={recordingKey}
          onRecordingKeyChange={setRecordingKey}
          sessionRecordingKey={sessionRecordingKey}
          disabled={busy || isComplete}
        />
      )}

      {step === 3 && (
        <div className="space-y-5">
          {/* Condiciones de contacto seguro (Tarea 11 / Idea I001) */}
          <div className="rounded-xl border border-violet-500/30 bg-[#111827] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-violet-400" aria-hidden="true" />
              <h2 className="text-lg font-bold text-white">
                Condiciones de contacto seguro (Protección personal)
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-300">
              Si tu situación es de alto riesgo o convives con un presunto agresor, puedes ordenar que nadie intente comunicarse contigo o limitar el contacto a un canal y horario seguro.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="contact-pref-none"
                onClick={() => setContactPreference('no_contact')}
                className={`min-h-14 rounded-xl border p-4 text-left transition ${
                  contactPreference === 'no_contact'
                    ? 'border-amber-400 bg-amber-950/40 text-white font-bold'
                    : 'border-gray-700 bg-[#0B0F19] text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-base font-semibold">🚫 No recibir mensajes</div>
                <div className="text-xs text-gray-400 mt-1">Reserva total. Nadie te llamará ni te escribirá. Consultas tú con tu clave privada.</div>
              </button>

              <button
                type="button"
                id="contact-pref-safe"
                onClick={() => setContactPreference('safe_contact')}
                className={`min-h-14 rounded-xl border p-4 text-left transition ${
                  contactPreference === 'safe_contact'
                    ? 'border-violet-400 bg-violet-950/40 text-white font-bold'
                    : 'border-gray-700 bg-[#0B0F19] text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-base font-semibold">🛡️ Autorizar contacto seguro</div>
                <div className="text-xs text-gray-400 mt-1">Solo por el canal y franja horaria que elijas a continuación.</div>
              </button>
            </div>

            {contactPreference === 'safe_contact' && (
              <div className="rounded-xl border border-gray-700 bg-[#0B0F19] p-4 space-y-4 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="safe-channel-select" className="block text-sm font-semibold text-white mb-1">
                      Canal seguro
                    </label>
                    <select
                      id="safe-channel-select"
                      value={safeChannel}
                      onChange={(e) => setSafeChannel(e.target.value as SafeContactChannel)}
                      className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white"
                    >
                      {SAFE_CONTACT_CHANNELS.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="safe-contact-value-input" className="block text-sm font-semibold text-white mb-1">
                      Teléfono, usuario o correo seguro
                    </label>
                    <input
                      id="safe-contact-value-input"
                      type="text"
                      value={safeContactValue}
                      onChange={(e) => setSafeContactValue(e.target.value)}
                      placeholder="Ej: +57 300 1234567 o usuario"
                      className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="safe-timeslot-select" className="block text-sm font-semibold text-white mb-1">
                      Franja horaria autorizada (Hora Colombia COT)
                    </label>
                    <select
                      id="safe-timeslot-select"
                      value={safeTimeSlot}
                      onChange={(e) => setSafeTimeSlot(e.target.value as SafeContactTimeSlot)}
                      className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white"
                    >
                      {SAFE_CONTACT_TIME_SLOTS.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="safe-days-select" className="block text-sm font-semibold text-white mb-1">
                      Días autorizados
                    </label>
                    <select
                      id="safe-days-select"
                      value={safeDays}
                      onChange={(e) => setSafeDays(e.target.value as SafeContactDays)}
                      className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white"
                    >
                      {SAFE_CONTACT_DAYS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {safeTimeSlot === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="safe-custom-start-input" className="block text-xs text-gray-300 mb-1">
                        Hora inicio (HH:MM)
                      </label>
                      <input
                        id="safe-custom-start-input"
                        type="time"
                        value={safeCustomStart}
                        onChange={(e) => setSafeCustomStart(e.target.value)}
                        className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white font-tabular"
                      />
                    </div>
                    <div>
                      <label htmlFor="safe-custom-end-input" className="block text-xs text-gray-300 mb-1">
                        Hora fin (HH:MM)
                      </label>
                      <input
                        id="safe-custom-end-input"
                        type="time"
                        value={safeCustomEnd}
                        onChange={(e) => setSafeCustomEnd(e.target.value)}
                        className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white font-tabular"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="safe-notes-textarea" className="block text-sm font-semibold text-white mb-1">
                    Instrucciones de discreción para el equipo (opcional)
                  </label>
                  <input
                    id="safe-notes-textarea"
                    type="text"
                    value={safeNotes}
                    onChange={(e) => setSafeNotes(e.target.value)}
                    maxLength={200}
                    placeholder="Ej: Preguntar por 'María', decir que es encuesta cívica, no dejar correo de voz."
                    className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vista previa de lo que se comparte (Tarea 12 / Idea I002) */}
          <div
            data-testid="report-share-preview-card"
            className="rounded-xl border border-amber-300/40 bg-[#111827] p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-300 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white">
                  Vista previa de lo que se comparte
                </h2>
                <p className="text-xs text-gray-300">
                  Saber quién recibirá cada dato antes de confirmar un envío.
                </p>
              </div>
            </div>

            {/* 1. Destinatarios */}
            <div className="rounded-xl border border-gray-700 bg-[#0B0F19] p-4 space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                <Users className="h-4 w-4 text-amber-300" />
                Destinatarios autorizados para este reporte
              </span>
              <ul className="space-y-1.5 text-xs text-gray-200">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <div>
                    <strong className="text-white">Bóveda AlzaVoz (Cloudflare D1 + R2):</strong> Recepción cifrada en tránsito; el equipo cívico procesa tu caso según el nivel de riesgo ({riskLevel}) y categoría ({category}).
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <div>
                    <strong className="text-white">Regla de contacto:</strong>{' '}
                    {contactPreference === 'no_contact' ? (
                      <span className="text-amber-200">🚫 Sin contacto (nadie te llamará ni escribirá).</span>
                    ) : (
                      <span className="text-violet-200">
                        📱 Canal {safeChannel} ({safeContactValue || 'Sin dato'}) en franja {safeTimeSlot}.
                      </span>
                    )}
                  </div>
                </li>
              </ul>
            </div>

            {/* 2. Archivos y evidencias a transmitir */}
            <div className="rounded-xl border border-gray-700 bg-[#0B0F19] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  Archivos y evidencias a transmitir ({attachments.length})
                </span>
                <span className="text-[11px] text-gray-400">Puedes retirar elementos antes de enviar</span>
              </div>

              {attachments.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {attachments.map((item, idx) => (
                    <div
                      key={item.id}
                      data-testid={`attachment-preview-row-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-900/60 p-2.5 text-xs text-gray-200"
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <p className="font-semibold text-white truncate">
                          {item.fileName || `Evidencia ${idx + 1}`}
                        </p>
                        <p className="text-[11px] text-gray-400 font-tabular">
                          {item.mime} · {(item.bytes.byteLength / 1024).toFixed(1)} KB (Limpio de EXIF)
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid={`remove-attachment-preview-${item.id}`}
                        onClick={() => {
                          triggerHaptic(30);
                          setAttachments((prev) => {
                            const target = prev.find((a) => a.id === item.id);
                            if (target) URL.revokeObjectURL(target.previewUrl);
                            return prev.filter((a) => a.id !== item.id);
                          });
                        }}
                        aria-label={`Retirar evidencia ${item.fileName || idx + 1} de este envío`}
                        className="touch-target-min flex items-center gap-1 rounded-lg border border-red-800/60 bg-red-950/40 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Retirar</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Sin evidencias de archivos adjuntos. Solo se transmitirá el relato de los hechos.
                </p>
              )}

              {Boolean(recordingKey.trim()) && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-950/20 p-2.5 text-xs text-amber-200">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">
                      Grabación de caja negra vinculada
                    </p>
                    <p className="font-mono text-[11px] text-amber-300 truncate">
                      {recordingKey}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="unlink-recording-preview-btn"
                    onClick={() => {
                      triggerHaptic(30);
                      setRecordingKey('');
                    }}
                    className="touch-target-min flex items-center gap-1 rounded-lg border border-amber-700 bg-amber-900/40 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-800/50 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Desvincular</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Precisión de ubicación */}
            <div className="rounded-xl border border-gray-700 bg-[#0B0F19] p-4 space-y-2.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                <MapPin className="h-4 w-4 text-red-400" />
                Precisión territorial de la denuncia
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  data-testid="report-precision-full-btn"
                  onClick={() => setReportLocationPrecision('full')}
                  className={`min-h-14 rounded-xl border p-2 text-center flex flex-col items-center justify-center transition ${
                    reportLocationPrecision === 'full'
                      ? 'border-amber-400 bg-amber-950/40 text-amber-100 font-bold'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xs">Comuna + Referencia</span>
                  <span className="text-[10px] text-gray-400">Información completa</span>
                </button>

                <button
                  type="button"
                  data-testid="report-precision-commune-btn"
                  onClick={() => setReportLocationPrecision('commune_only')}
                  className={`min-h-14 rounded-xl border p-2 text-center flex flex-col items-center justify-center transition ${
                    reportLocationPrecision === 'commune_only'
                      ? 'border-amber-400 bg-amber-950/40 text-amber-100 font-bold'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xs">Solo Comuna</span>
                  <span className="text-[10px] text-gray-400">Ocultar referencia exacta</span>
                </button>

                <button
                  type="button"
                  data-testid="report-precision-none-btn"
                  onClick={() => setReportLocationPrecision('none')}
                  className={`min-h-14 rounded-xl border p-2 text-center flex flex-col items-center justify-center transition ${
                    reportLocationPrecision === 'none'
                      ? 'border-violet-400 bg-violet-950/40 text-violet-100 font-bold'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xs">Sin Ubicación</span>
                  <span className="text-[10px] text-gray-400">Reserva territorial total</span>
                </button>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed pt-1">
                {reportLocationPrecision === 'full'
                  ? `Se informará: Comuna "${commune}" y referencia "${neighborhoodReference || 'Sin referencia barrial específica'}".`
                  : reportLocationPrecision === 'commune_only'
                  ? `Se informará: Únicamente Comuna "${commune}". La referencia barrial exacta ha sido retirada del payload.`
                  : 'Se informará: "Sin indicar (reserva de ubicación)". Ni la comuna ni la referencia territorial viajarán en el expediente.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-[#111827] p-5 space-y-4">
            <h2 className="text-lg font-bold text-white">Qué comparte y qué observa cada canal</h2>
            <p className="text-sm leading-relaxed text-gray-300">
              Ningún sistema en internet ofrece anonimato mágico. Revisa qué datos recibe cada opción antes de elegir:
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-600 bg-[#0B0F19] p-4 space-y-2">
                <h3 className="font-bold text-white">Opción A · Bóveda AlzaVoz (Cloudflare D1 + R2)</h3>
                <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-300 space-y-1">
                  <li>
                    <strong>Qué se guarda:</strong> tu relato, categoría, nivel de riesgo, comuna elegida, archivos ya
                    limpios de EXIF/GPS y el vínculo a tu sesión de grabación R2.
                  </li>
                  <li>
                    <strong>Qué no guarda la base de datos:</strong> no pedimos cuenta ni guardamos tu dirección IP,
                    teléfono ni User-Agent en D1 o R2.
                  </li>
                  <li>
                    <strong>Límite real:</strong> la solicitud viaja por la red de Cloudflare (que observa metadatos de
                    conexión HTTPS en tránsito) y el equipo autorizado podrá leer el relato y las evidencias para
                    atender el caso.
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-600 bg-[#0B0F19] p-4 space-y-2">
                <h3 className="font-bold text-white">Opción B · Compartir por WhatsApp (+57 3234306794)</h3>
                <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-300 space-y-1">
                  <li>
                    <strong>Qué se envía:</strong> un mensaje de texto con el resumen del caso (y el código{' '}
                    <code>ALZ-XXXX</code> si ya radicaste en D1).
                  </li>
                  <li>
                    <strong>Qué observa el destinatario y Meta:</strong> al abrir WhatsApp,{' '}
                    <strong>quedan visibles tu número de teléfono, nombre de perfil y foto</strong> ante el receptor y
                    los servidores de WhatsApp/Meta.
                  </li>
                  <li>
                    <strong>Archivos:</strong> el enlace web no adjunta archivos automáticamente; si deseas enviarlos,
                    descarga la copia limpia en el Paso 2 y adjúntala en el chat.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div
            data-testid="quick-escape-explanation"
            className="rounded-xl border border-gray-700 bg-[#111827] p-5 space-y-3"
          >
            <h2 className="text-lg font-bold text-white">Qué limpia y qué puede permanecer al usar Salir Rápido</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm leading-relaxed text-gray-300">
              <div className="rounded-lg border border-gray-700 bg-[#0B0F19] p-3">
                <strong className="block text-white mb-1">Lo que sí limpia en este navegador:</strong>
                Borra al instante el borrador en memoria, <code>sessionStorage</code> y claves temporales de{' '}
                <code>localStorage</code> (<code>alzavoz_report_draft</code>, <code>alzavoz_draft</code>,{' '}
                <code>alzavoz_temp_audio</code>), apaga el micrófono activo y reemplaza esta entrada del historial por
                Google (<code>window.location.replace</code>).
              </div>
              <div className="rounded-lg border border-gray-700 bg-[#0B0F19] p-3">
                <strong className="block text-amber-200 mb-1">Lo que puede permanecer fuera de la app:</strong>
                No borra un expediente que ya hayas radicado en el servidor D1, archivos que hayas descargado en la
                memoria de tu teléfono, conversaciones abiertas en WhatsApp ni registros previos del navegador o de tu
                operador de internet.
              </div>
            </div>
            <QuickEscapeButton variant="full" />
          </div>

          {!isComplete && (
            <label
              htmlFor="report-privacy-ack"
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-gray-600 bg-[#111827] p-4"
            >
              <input
                id="report-privacy-ack"
                type="checkbox"
                checked={privacyAck}
                disabled={busy}
                onChange={(e) => setPrivacyAck(e.target.checked)}
                className="h-6 w-6 accent-amber-300"
              />
              <span className="text-sm font-medium leading-relaxed text-white">
                Entiendo qué datos comparte cada canal, los límites de la transformación de voz y qué limpia la salida
                rápida.
              </span>
            </label>
          )}

          {submittedRecord && (
            <div
              data-testid="report-receipt-card"
              className="rounded-xl border border-amber-200 bg-[#111827] p-5 space-y-3"
            >
              <h2 className="text-xl font-bold text-white">
                {isPartiallySubmitted ? 'Expediente creado · faltan evidencias por subir' : 'Expediente radicado en D1'}
              </h2>
              <p className="text-sm text-gray-300">
                Código único de caso:{' '}
                <strong data-testid="report-code" data-sensitive="true" className="font-tabular text-lg text-amber-200">
                  {submittedRecord.code}
                </strong>
              </p>
              <p className="text-sm text-gray-300 font-tabular">
                Estado: <strong>{submittedRecord.status}</strong> · Evidencias en R2:{' '}
                <strong>
                  {submittedRecord.attachmentCount} / {submittedRecord.expectedAttachments}
                </strong>
                {submittedRecord.recordingSessionId
                  ? ` · Grabación vinculada (${submittedRecord.recordingClipCount} clips en R2)`
                  : ''}
              </p>
              <div className="space-y-2 pt-2">
                <label htmlFor="report-secret-key" className="block text-sm font-semibold text-white">
                  Clave privada de consulta del expediente (cópiala antes de salir)
                </label>
                <input
                  id="report-secret-key"
                  data-sensitive="true"
                  type="password"
                  readOnly
                  value={fullCaseKey}
                  className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 font-mono text-sm text-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(fullCaseKey)
                      .then(() => setStatusMessage('Clave del expediente copiada al portapapeles.'))
                      .catch(() => setError('No se pudo copiar automáticamente. Copia el valor del campo.'))
                  }
                  className={`${control} w-full bg-gray-900`}
                >
                  Copiar clave privada del expediente
                </button>
              </div>

              {/* Condiciones de contacto vigentes en el expediente recién radicado */}
              <SafeContactStatusCard
                record={submittedRecord}
                secretKey={submittedSecret}
                onUpdated={setSubmittedRecord}
                triggerHaptic={triggerHaptic}
              />

              {isComplete && (
                <button
                  type="button"
                  onClick={handleStartNewReport}
                  className={`${control} w-full bg-gray-900 text-sm`}
                >
                  Preparar otro reporte nuevo
                </button>
              )}
            </div>
          )}

          <div className="rounded-xl border border-gray-700 bg-[#111827] p-5 space-y-3">
            <h2 className="text-lg font-bold text-white">Canal opcional: vista previa para WhatsApp</h2>
            <p className="text-sm text-gray-300">
              Este es el texto exacto que se preparará si decides abrir WhatsApp. No se envía nada automáticamente:
            </p>
            <pre
              data-testid="whatsapp-preview-text"
              data-sensitive="true"
              className="whitespace-pre-wrap rounded-xl border border-gray-700 bg-[#0B0F19] p-3 font-sans text-xs leading-relaxed text-gray-200"
            >
              {whatsappData.previewText}
            </pre>
            <a
              data-testid="whatsapp-channel-link"
              href={whatsappData.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${control} w-full bg-gray-900 hover:bg-gray-800 text-center text-sm`}
            >
              Abrir resumen en WhatsApp (revela tu teléfono al destinatario)
            </a>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-700 bg-[#111827] p-4">
        {step === 1 ? (
          <button
            type="button"
            onClick={handleNextFromStep1}
            className={`${control} w-full bg-gray-800 border-amber-200`}
          >
            Continuar a evidencias y voz
          </button>
        ) : step === 2 ? (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => goToStep(1)} className={`${control} w-full bg-gray-900`}>
              Volver a hechos
            </button>
            <button
              type="button"
              onClick={() => goToStep(3)}
              className={`${control} w-full bg-gray-800 border-amber-200`}
            >
              Continuar a privacidad y envío
            </button>
          </div>
        ) : isPartiallySubmitted ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSubmitToD1()}
            className={`${control} w-full bg-amber-900 border-amber-300`}
          >
            {busy ? 'Reintentando subida…' : `Reintentar ${pendingAttachments.length} evidencia(s) pendiente(s)`}
          </button>
        ) : !isComplete ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="btn-cancel-report-submission"
              onClick={() => goToStep(1)}
              className={`${control} w-full bg-gray-900 hover:bg-gray-800 text-gray-300`}
            >
              Cancelar y volver a hechos
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSubmitToD1()}
              className={`${control} w-full bg-red-800`}
            >
              {busy ? 'Radicando en Cloudflare D1…' : 'Radicar denuncia en bóveda D1'}
            </button>
          </div>
        ) : (
          <p className="py-3 text-center font-semibold text-white font-tabular">
            Expediente {submittedRecord?.code} confirmado en D1
          </p>
        )}
      </div>

      <details className="rounded-xl border border-gray-700 bg-[#111827] p-4">
        <summary className="min-h-14 cursor-pointer py-3 font-semibold text-white">
          Consultar un expediente radicado anteriormente
        </summary>
        <form onSubmit={(e) => void handleLookupReport(e)} className="mt-3 space-y-3">
          <label htmlFor="report-lookup-input" className="block text-sm text-gray-200">
            Pega tu clave <code>ALZ-AAAA-XXXXXX.secreto</code>
          </label>
          <input
            id="report-lookup-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={lookupKey}
            onChange={(e) => setLookupKey(e.target.value)}
            className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 font-mono text-sm text-white"
          />
          <button type="submit" disabled={busy || !lookupKey.trim()} className={`${control} w-full bg-gray-900`}>
            Consultar expediente en D1
          </button>
          {lookupResult && (
            <div data-testid="lookup-result" className="rounded-xl border border-gray-700 bg-[#0B0F19] p-4 text-sm space-y-1">
              <p className="font-bold text-white font-tabular">
                Código: <span data-sensitive="true">{lookupResult.code}</span> · Estado: {lookupResult.status}
              </p>
              <p className="text-gray-300">
                Comuna: {lookupResult.commune} · Adjuntos verificados: {lookupResult.attachmentCount}
                {lookupResult.recordingSessionId ? ` · Clips R2 vinculados: ${lookupResult.recordingClipCount}` : ''}
              </p>
              <p data-sensitive="true" className="text-gray-200 pt-1">
                {lookupResult.summary}
              </p>
              {(() => {
                try {
                  const parsedSecret = parseReportRecoveryKey(lookupKey).secret;
                  return (
                    <SafeContactStatusCard
                      record={lookupResult}
                      secretKey={parsedSecret}
                      onUpdated={setLookupResult}
                      triggerHaptic={triggerHaptic}
                    />
                  );
                } catch {
                  return null;
                }
              })()}
            </div>
          )}
        </form>
      </details>
    </section>
  );
}
