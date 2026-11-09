"use client";

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  Scale,
  Video,
  FileCheck,
  Copy,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ADMIN_REPORT_STATUSES,
  AUTHORITY_ENTITIES,
  DOCUMENT_KINDS,
  MANDATORY_HUMAN_REVIEW_NOTICE,
  type AdminReportDetail,
  type AdminReportStatus,
  type AuthorityEntityId,
  type DocumentKindId,
  type LegalDraftResult,
  type SimulateContactResult,
} from '../../lib/admin/contracts';
import {
  isCurrentTimeInSafeWindow,
  SAFE_CONTACT_CHANNELS,
  type SafeContactChannel,
} from '../../lib/report/contracts';
import styles from './admin.module.css';

interface AdminReportDetailProps {
  report: AdminReportDetail;
  token: string;
  onBack: () => void;
  onStatusUpdated: (updated: AdminReportDetail) => void;
}

export function AdminReportDetailView({
  report,
  token,
  onBack,
  onStatusUpdated,
}: AdminReportDetailProps) {
  const [currentStatus, setCurrentStatus] = useState<AdminReportStatus>(
    (report.status as AdminReportStatus) || 'radicado'
  );
  const [adminNotes, setAdminNotes] = useState(report.adminNotes || '');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Draft generator state
  const [targetEntity, setTargetEntity] = useState<AuthorityEntityId>('personeria');
  const [documentKind, setDocumentKind] = useState<DocumentKindId>('derecho_peticion');
  const [applicantName, setApplicantName] = useState('');
  const [applicantId, setApplicantId] = useState('');
  const [applicantContact, setApplicantContact] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftResult, setDraftResult] = useState<LegalDraftResult | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Safe contact simulation state (Idea I001)
  const [simulatedChannel, setSimulatedChannel] = useState<SafeContactChannel | ''>('');
  const [simulatedTime, setSimulatedTime] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulateContactResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const handleSimulateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimulationError(null);
    setSimulationResult(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.code}/simulate-contact`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: simulatedChannel || undefined,
          simulatedAt: simulatedTime ? new Date(simulatedTime).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error en simulación.' }));
        throw new Error(errData.error || 'Error al procesar simulación.');
      }
      const data = (await res.json()) as SimulateContactResult;
      setSimulationResult(data);
    } catch (err: unknown) {
      setSimulationError(err instanceof Error ? err.message : 'Error al conectar.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStatus(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.code}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: currentStatus,
          adminNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error al actualizar estado.' }));
        throw new Error(errData.error || 'Error al actualizar.');
      }

      const data = await res.json();
      setStatusMessage('Estado y notas guardados exitosamente.');
      if (data.report) {
        onStatusUpdated({
          ...report,
          status: data.report.status,
          adminNotes: data.report.adminNotes,
          updatedAt: data.report.updatedAt,
        });
      }
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Error al guardar estado.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleDownloadAttachment = async (slotIndex: number, ext: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${report.code}/attachments/${slotIndex}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('No se pudo descargar la evidencia.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidencia-${report.code}-${slotIndex + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al descargar archivo.');
    }
  };

  const handleDownloadClip = async (clipIndex: number) => {
    try {
      const res = await fetch(`/api/admin/reports/${report.code}/recording/${clipIndex}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('No se pudo descargar el clip de grabación.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grabacion-${report.code}-clip-${clipIndex + 1}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al descargar clip.');
    }
  };

  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingDraft(true);
    setDraftError(null);
    setCopiedDraft(false);

    try {
      const res = await fetch('/api/admin/drafts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportCode: report.code,
          targetEntity,
          documentKind,
          applicantName: applicantName.trim() || undefined,
          applicantId: applicantId.trim() || undefined,
          applicantContact: applicantContact.trim() || undefined,
          customContext: customContext.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error al generar borrador.' }));
        throw new Error(errData.error || 'Error al generar borrador legal.');
      }

      const result = (await res.json()) as LegalDraftResult;
      setDraftResult(result);
      setDraftContent(result.documentText);
    } catch (err: unknown) {
      setDraftError(err instanceof Error ? err.message : 'Error de comunicación.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draftContent);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 3000);
    } catch {
      alert('No se pudo copiar automáticamente. Puedes seleccionar el texto y copiarlo.');
    }
  };

  const handleDownloadDraft = () => {
    const blob = new Blob([draftContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `borrador-${report.code}-${targetEntity}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <article className={styles.detailContainer}>
      <header className={styles.detailHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onBack}
            className={styles.btnSecondary}
            style={{ minHeight: 48, minWidth: 48, padding: '8px 16px' }}
            aria-label="Volver al listado de expedientes"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Volver</span>
          </button>
          <h2 style={{ fontSize: '1.35rem', margin: 0 }}>
            Expediente <span className={styles.codeCell}>{report.code}</span>
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className={
              report.riskLevel === 'alto'
                ? styles.badgeRiskAlto
                : report.riskLevel === 'medio'
                ? styles.badgeRiskMedio
                : styles.badgeRiskBajo
            }
          >
            Riesgo {report.riskLevel.toUpperCase()}
          </span>
          <span className={styles.badgeStatus}>
            {ADMIN_REPORT_STATUSES.find((s) => s.id === report.status)?.label || report.status}
          </span>
        </div>
      </header>

      {/* Factual Metadata Grid */}
      <section className={styles.detailGrid} aria-label="Metadatos del expediente">
        <div className={styles.detailField}>
          <span>Categoría Legal</span>
          <strong>{report.category}</strong>
        </div>
        <div className={styles.detailField}>
          <span>Comuna / Ubicación</span>
          <strong className="data-sensitive">{report.commune}</strong>
        </div>
        <div className={styles.detailField}>
          <span>Punto / Barrio de Referencia</span>
          <strong className="data-sensitive">{report.neighborhoodReference || 'Sin especificar'}</strong>
        </div>
        <div className={styles.detailField}>
          <span>Fecha del Suceso</span>
          <strong>{report.incidentDate || 'No indicada'}</strong>
        </div>
        <div className={styles.detailField}>
          <span>Fecha de Radicación</span>
          <strong>{new Date(report.createdAt).toLocaleString('es-CO')}</strong>
        </div>
        <div className={styles.detailField}>
          <span>Archivos Adjuntos</span>
          <strong>{report.attachmentCount} archivo(s) higienizados</strong>
        </div>
      </section>

      {/* Condiciones de Contacto Seguro (Tarea 11 / Idea I001) */}
      {!report.safeContact || report.safeContact.preference === 'no_contact' ? (
        <section
          data-testid="admin-safe-contact-none"
          className={styles.safeContactNoContact}
          aria-labelledby="safe-contact-heading"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <AlertTriangle size={24} color="#EF4444" aria-hidden="true" />
            <h3 id="safe-contact-heading" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FCA5A5', margin: 0 }}>
              REGLA DE SEGURIDAD PERSONAL: NO CONTACTAR (RESERVA TOTAL)
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#E5E7EB', lineHeight: 1.5 }}>
            El ciudadano ha configurado expresamente la opción de <strong>NO RECIBIR MENSAJES NI LLAMADAS</strong>.
            Cualquier intento de comunicación directa está estrictamente prohibido para salvaguardar su integridad física.
          </p>
        </section>
      ) : (
        <section
          data-testid="admin-safe-contact-active"
          className={styles.safeContactCard}
          aria-labelledby="safe-contact-heading"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <h3 id="safe-contact-heading" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#F9FAFB' }}>
              Condición de Contacto Seguro Autorizada
            </h3>
            {(() => {
              const check = isCurrentTimeInSafeWindow(report.safeContact);
              return check.allowed ? (
                <div data-testid="safe-window-status-allowed" className={styles.safeWindowAllowed}>
                  <span>🟢 EN FRANJA SEGURA</span>
                  <span style={{ fontSize: '0.78rem', color: '#D1FAE5' }}>({check.colombiaTime})</span>
                </div>
              ) : (
                <div data-testid="safe-window-status-blocked" className={styles.safeWindowBlocked}>
                  <span>🔴 FUERA DE FRANJA SEGURA</span>
                  <span style={{ fontSize: '0.78rem', color: '#FEE2E2' }}>({check.colombiaTime})</span>
                </div>
              );
            })()}
          </div>

          <div className={styles.detailGrid} style={{ marginTop: 8 }}>
            <div className={styles.detailField}>
              <span>Canal Autorizado</span>
              <strong>{report.safeContact.channel?.toUpperCase()}</strong>
            </div>
            <div className={styles.detailField}>
              <span>Dato de Contacto</span>
              <strong className="data-sensitive">{report.safeContact.contactValue}</strong>
            </div>
            <div className={styles.detailField}>
              <span>Franja Horaria (Hora Colombia COT)</span>
              <strong>
                {report.safeContact.timeSlot === 'custom'
                  ? `${report.safeContact.customStart} – ${report.safeContact.customEnd} COT`
                  : report.safeContact.timeSlot === 'morning'
                  ? 'Mañana (08:00 – 12:00 COT)'
                  : report.safeContact.timeSlot === 'afternoon'
                  ? 'Tarde (14:00 – 18:00 COT)'
                  : 'Noche (18:00 – 21:00 COT)'}
              </strong>
            </div>
            <div className={styles.detailField}>
              <span>Días Permitidos</span>
              <strong>
                {report.safeContact.days === 'weekdays'
                  ? 'Lunes a Viernes'
                  : report.safeContact.days === 'weekends'
                  ? 'Fines de Semana'
                  : 'Todos los días'}
              </strong>
            </div>
          </div>

          {report.safeContact.safetyNotes && (
            <div style={{ marginTop: 12, padding: 12, background: '#0B0F19', borderRadius: 8, border: '1px solid #1F2937' }}>
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', display: 'block', marginBottom: 4 }}>
                Instrucciones de Discreción Ciudadana:
              </span>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#F3F4F6' }}>
                {report.safeContact.safetyNotes}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Herramienta de Simulación y Verificación de Envíos */}
      <section className={styles.simulateSection} aria-labelledby="simulate-heading">
        <h4 id="simulate-heading" style={{ fontSize: '1rem', fontWeight: 650, margin: '0 0 6px 0', color: '#F9FAFB' }}>
          Simulación de Despacho y Auditoría de Reglas
        </h4>
        <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: '0 0 14px 0' }}>
          Verifica si un intento de comunicación cumple las condiciones vigentes. La acción es una simulación lógica y <strong>no contacta a nadie en la realidad</strong>.
        </p>

        <form onSubmit={handleSimulateContact} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label htmlFor="sim-channel-select" style={{ display: 'block', fontSize: '0.8rem', color: '#D1D5DB', marginBottom: 4 }}>
              Canal de envío simulado
            </label>
            <select
              id="sim-channel-select"
              value={simulatedChannel}
              onChange={(e) => setSimulatedChannel(e.target.value as SafeContactChannel)}
              className={styles.filterSelect}
              style={{ width: '100%', minHeight: 48 }}
            >
              <option value="">Canal por defecto del caso</option>
              {SAFE_CONTACT_CHANNELS.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sim-time-input" style={{ display: 'block', fontSize: '0.8rem', color: '#D1D5DB', marginBottom: 4 }}>
              Hora simulada (opcional para pruebas)
            </label>
            <input
              id="sim-time-input"
              type="datetime-local"
              value={simulatedTime}
              onChange={(e) => setSimulatedTime(e.target.value)}
              className={styles.filterInput}
              style={{ width: '100%', minHeight: 48 }}
            />
          </div>

          <div>
            <button
              type="submit"
              id="btn-simulate-contact"
              disabled={isSimulating}
              className={styles.btnSecondary}
              style={{ minHeight: 48, width: '100%', background: '#1F2937', color: '#F9FAFB' }}
            >
              {isSimulating ? 'Evaluando reglas…' : 'Simular Despacho'}
            </button>
          </div>
        </form>

        {simulationError && (
          <div role="alert" style={{ marginTop: 12, padding: 10, background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', borderRadius: 8, fontSize: '0.85rem' }}>
            {simulationError}
          </div>
        )}

        {simulationResult && (
          <div
            data-testid={simulationResult.allowed ? 'simulate-contact-allowed' : 'simulate-contact-blocked'}
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 10,
              border: simulationResult.allowed ? '1px solid #10B981' : '1px solid #EF4444',
              background: simulationResult.allowed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {simulationResult.allowed ? (
                <CheckCircle size={20} color="#10B981" aria-hidden="true" />
              ) : (
                <AlertTriangle size={20} color="#EF4444" aria-hidden="true" />
              )}
              <strong style={{ fontSize: '0.92rem', color: simulationResult.allowed ? '#6EE7B7' : '#FCA5A5' }}>
                {simulationResult.allowed ? 'ENVÍO SIMULADO PERMITIDO' : 'ENVÍO BLOQUEADO'}
              </strong>
            </div>
            <p style={{ margin: '4px 0', fontSize: '0.88rem', color: '#F3F4F6' }}>
              <strong>Explicación:</strong> {simulationResult.reason}
            </p>
            {simulationResult.colombiaTime && (
              <p style={{ margin: '2px 0', fontSize: '0.82rem', color: '#9CA3AF' }}>
                Hora oficial evaluada: {simulationResult.colombiaTime}
              </p>
            )}
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#9CA3AF', fontStyle: 'italic' }}>
              {simulationResult.simulatedNotice}
            </p>
          </div>
        )}
      </section>

      {/* Narrative Summary */}
      <section aria-labelledby="summary-heading">
        <h3 id="summary-heading" style={{ fontSize: '1.1rem', fontWeight: 650, marginBottom: 8 }}>
          Relato Fáctico Ciudadano
        </h3>
        <div className={`${styles.summaryBox} data-sensitive`}>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{report.summary}</p>
        </div>
      </section>

      {/* Multimedia Evidence from R2 */}
      <section aria-labelledby="evidence-heading" style={{ marginTop: 24 }}>
        <h3 id="evidence-heading" style={{ fontSize: '1.1rem', fontWeight: 650, marginBottom: 8 }}>
          Bóveda de Evidencias Higienizadas (Cloudflare R2)
        </h3>

        {report.attachments.length === 0 && !report.recordingSessionId && (
          <p style={{ color: '#9CA3AF', fontSize: '0.95rem' }}>
            Este expediente fue radicado sin archivos multimedia adjuntos.
          </p>
        )}

        {report.attachments.length > 0 && (
          <div className={styles.evidenceList}>
            {report.attachments.map((att) => {
              const ext = att.mime.split('/')[1] || 'bin';
              return (
                <div key={att.index} className={styles.evidenceCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={20} color="#60A5FA" aria-hidden="true" />
                    <strong style={{ fontSize: '0.95rem' }}>
                      Adjunto #{att.index + 1} ({att.kind.toUpperCase()})
                    </strong>
                  </div>
                  <div className={styles.evidenceMeta}>
                    <span>Formato: {att.mime}</span>
                    <span>Tamaño: {Math.round(att.bytes / 1024)} KiB</span>
                    <span title={att.sha256}>
                      SHA-256: {att.sha256.slice(0, 16)}...
                    </span>
                    <span style={{ color: '#6EE7B7', fontWeight: 600 }}>
                      ✓ Metadatos higienizados ({att.sanitizationSummary.removedMarkers.length} purgados)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(att.index, ext)}
                    className={styles.btnSecondary}
                    style={{ minHeight: 48, width: '100%', marginTop: 'auto' }}
                  >
                    <Download size={16} aria-hidden="true" />
                    <span>Descargar prueba</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Linked Recording Session Clips */}
        {report.recordingSessionId && (
          <div style={{ marginTop: 16, background: '#0B0F19', padding: 16, borderRadius: 12, border: '1px solid #1F2937' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Video size={20} color="#EF4444" aria-hidden="true" />
              <strong>Grabación Continua en la Nube Vinculada</strong>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#9CA3AF', margin: '4px 0 12px' }}>
              Sesión ID: <code className={styles.codeCell}>{report.recordingSessionId}</code> ({report.recordingClipCount} clips en R2)
            </p>
            {report.recordingClips && report.recordingClips.length > 0 ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {report.recordingClips.map((clip) => (
                  <button
                    key={clip.index}
                    type="button"
                    onClick={() => handleDownloadClip(clip.index)}
                    className={styles.btnSmall}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={14} aria-hidden="true" />
                    <span>Clip #{clip.index + 1} ({Math.round(clip.bytes / 1024)} KB)</span>
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#D1D5DB' }}>
                Clips de grabación disponibles para descarga administrativa.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Case Management & Status Update Form */}
      <section
        aria-labelledby="status-management-heading"
        style={{ marginTop: 28, background: '#0B0F19', padding: 20, borderRadius: 14, border: '1px solid #1F2937' }}
      >
        <h3 id="status-management-heading" style={{ fontSize: '1.1rem', fontWeight: 650, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="#F59E0B" aria-hidden="true" />
          <span>Gestión de Estado y Bitácora Interna</span>
        </h3>

        <form onSubmit={handleSaveStatus}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label htmlFor="case-status-select">Estado del Expediente</label>
              <select
                id="case-status-select"
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value as AdminReportStatus)}
                className={styles.formInput}
                style={{ cursor: 'pointer' }}
              >
                {ADMIN_REPORT_STATUSES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label htmlFor="admin-notes-textarea">Notas Internas del Equipo Legal</label>
              <textarea
                id="admin-notes-textarea"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Radicado de la entidad, observaciones, fecha de respuesta..."
                className={styles.formInput}
                style={{ minHeight: 80, resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={isSavingStatus}
              className={styles.btnPrimary}
              style={{ maxWidth: 280 }}
            >
              <CheckCircle size={18} aria-hidden="true" />
              <span>{isSavingStatus ? 'Guardando...' : 'Guardar Estado y Notas'}</span>
            </button>
            {statusMessage && (
              <span
                role="status"
                style={{
                  color: statusMessage.includes('exitosamente') ? '#6EE7B7' : '#FCA5A5',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                {statusMessage}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* AI Legal Draft Generator (Derecho de Petición / Oficio Oficial) */}
      <section className={styles.draftSection} aria-labelledby="draft-generator-heading">
        <h3 id="draft-generator-heading" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={22} color="#EF4444" aria-hidden="true" />
          <span>Generador de Documentos Jurídicos con IA (DeepSeek)</span>
        </h3>
        <p style={{ color: '#9CA3AF', fontSize: '0.92rem', marginBottom: 20 }}>
          Redacta un borrador formal fundamentado en la legislación colombiana (Ley 1755 de 2015, Ley 1801 de 2016, Ley 769 de 2002).
          El documento incluye campos pendientes señalados y requiere validación humana obligatoria.
        </p>

        <form onSubmit={handleGenerateDraft}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label htmlFor="target-entity-select">Entidad Destinataria</label>
              <select
                id="target-entity-select"
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value as AuthorityEntityId)}
                className={styles.formInput}
              >
                {AUTHORITY_ENTITIES.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label htmlFor="doc-kind-select">Tipo de Documento</label>
              <select
                id="doc-kind-select"
                value={documentKind}
                onChange={(e) => setDocumentKind(e.target.value as DocumentKindId)}
                className={styles.formInput}
              >
                {DOCUMENT_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label htmlFor="applicant-name">Nombre del Peticionario (Opcional)</label>
              <input
                id="applicant-name"
                type="text"
                placeholder="Dejar vacío si es anónimo"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label htmlFor="applicant-id">Cédula / Documento (Opcional)</label>
              <input
                id="applicant-id"
                type="text"
                placeholder="C.C. No."
                value={applicantId}
                onChange={(e) => setApplicantId(e.target.value)}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup} style={{ margin: 0 }}>
              <label htmlFor="applicant-contact">Correo para Notificaciones (Opcional)</label>
              <input
                id="applicant-contact"
                type="text"
                placeholder="correo@ejemplo.com"
                value={applicantContact}
                onChange={(e) => setApplicantContact(e.target.value)}
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 20 }}>
            <label htmlFor="custom-context">Contexto Adicional para el Oficio (Opcional)</label>
            <textarea
              id="custom-context"
              rows={2}
              placeholder="Instrucciones específicas, pretensión especial, solicitud de cámaras..."
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              className={styles.formInput}
              style={{ minHeight: 60, resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={isGeneratingDraft}
            className={styles.btnPrimary}
            style={{ maxWidth: 360 }}
          >
            <Scale size={20} aria-hidden="true" />
            <span>{isGeneratingDraft ? 'Redactando con IA...' : 'Generar Borrador Jurídico'}</span>
          </button>
        </form>

        {draftError && (
          <div role="alert" style={{ marginTop: 16, color: '#FCA5A5', background: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 8 }}>
            <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
            {draftError}
          </div>
        )}

        {draftResult && (
          <div style={{ marginTop: 24 }}>
            {/* Mandatory Banner */}
            <div className={styles.draftBanner} role="note">
              <FileCheck size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
              <strong>{MANDATORY_HUMAN_REVIEW_NOTICE}</strong>
            </div>

            <label htmlFor="generated-draft-textarea" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#E5E7EB', marginBottom: 8 }}>
              Contenido del Borrador (Revisa y completa los campos entre corchetes [PENDIENTE: ...])
            </label>
            <textarea
              id="generated-draft-textarea"
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className={styles.draftTextarea}
              aria-label="Contenido editable del borrador jurídico"
            />

            <div className={styles.draftActions}>
              <button
                type="button"
                onClick={handleCopyDraft}
                className={styles.btnPrimary}
                style={{ width: 'auto', padding: '12px 20px', minHeight: 52 }}
              >
                <Copy size={18} aria-hidden="true" />
                <span>{copiedDraft ? '¡Copiado al portapapeles!' : 'Copiar Borrador'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadDraft}
                className={styles.btnSecondary}
                style={{ minHeight: 52 }}
              >
                <Download size={18} aria-hidden="true" />
                <span>Descargar Documento (.txt)</span>
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#9CA3AF', marginTop: 12 }}>
              * Este documento no se envía a ninguna autoridad de forma automática. Debe radicarse por ventanilla única o correo oficial de la entidad por el ciudadano o su apoderado.
            </p>
          </div>
        )}
      </section>
    </article>
  );
}
