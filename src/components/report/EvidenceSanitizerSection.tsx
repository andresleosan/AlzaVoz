'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMediaCapture } from '@/context/MediaCaptureContext';
import { sha256 } from '@/lib/recording/contracts';
import { MAX_REPORT_ATTACHMENTS, type SanitizationSummary, type SanitizedMime } from '@/lib/report/contracts';
import { sanitizeImageFile } from '@/lib/report/sanitizer';
import { encodeCleanWav, processAudioBlobForReport, TARGET_SAMPLE_RATE } from '@/lib/report/voice';

export interface PreparedAttachment {
  id: string;
  fileName: string;
  mime: SanitizedMime;
  bytes: ArrayBuffer;
  sha256: string;
  previewUrl: string;
  summary: SanitizationSummary;
  uploadedReceipt?: { receivedAt: string };
}

interface EvidenceSanitizerSectionProps {
  attachments: PreparedAttachment[];
  onAddAttachment: (item: PreparedAttachment) => void;
  onRemoveAttachment: (id: string) => void;
  recordingKey: string;
  onRecordingKeyChange: (value: string) => void;
  sessionRecordingKey: string;
  disabled: boolean;
}

const control =
  'min-h-14 min-w-14 inline-flex items-center justify-center rounded-xl border border-gray-600 px-4 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 disabled:opacity-50 motion-safe:active:scale-95';

function createSyntheticVoiceWav(): Blob {
  const durationSec = 1.6;
  const totalSamples = Math.floor(TARGET_SAMPLE_RATE * durationSec);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / TARGET_SAMPLE_RATE;
    const envelope = Math.sin((Math.PI * i) / totalSamples);
    const f0 = 175 + 18 * Math.sin(2 * Math.PI * 3.2 * t);
    const harmonic =
      0.55 * Math.sin(2 * Math.PI * f0 * t) +
      0.28 * Math.sin(2 * Math.PI * f0 * 2 * t) +
      0.14 * Math.sin(2 * Math.PI * f0 * 3 * t);
    samples[i] = envelope * harmonic;
  }
  const wavBuffer = encodeCleanWav(samples, TARGET_SAMPLE_RATE);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

export function EvidenceSanitizerSection({
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  recordingKey,
  onRecordingKeyChange,
  sessionRecordingKey,
  disabled,
}: EvidenceSanitizerSectionProps) {
  const [transformVoice, setTransformVoice] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { registerCapture, updateCapturePhase } = useMediaCapture();
  const unregisterCaptureRef = useRef<(() => void) | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopVoiceStream = useCallback(() => {
    unregisterCaptureRef.current?.();
    unregisterCaptureRef.current = null;
    updateCapturePhase('stopped', 'voice-note');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore already stopped recorder.
      }
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setRecordingVoice(false);
  }, [updateCapturePhase]);

  useEffect(() => {
    const onEscape = () => stopVoiceStream();
    window.addEventListener('alzavoz:escape', onEscape);
    window.addEventListener('pagehide', onEscape);
    return () => {
      onEscape();
      window.removeEventListener('alzavoz:escape', onEscape);
      window.removeEventListener('pagehide', onEscape);
    };
  }, [stopVoiceStream]);

  async function handleFileSelection(file: File | null) {
    if (!file) return;
    if (attachments.length >= MAX_REPORT_ATTACHMENTS) {
      setErrorMsg('Ya alcanzaste el máximo de 4 archivos adjuntos por expediente.');
      return;
    }
    setProcessing(true);
    setErrorMsg('');
    setStatusNote('Inspeccionando y retirando metadatos en tu navegador…');
    try {
      const nextIndex = attachments.length + 1;
      const isAudioCandidate =
        file.type.startsWith('audio/') || /\.(wav|webm|ogg|mp3|m4a)$/i.test(file.name);
      if (isAudioCandidate) {
        const processed = await processAudioBlobForReport(file, {
          transformVoice,
          index: nextIndex,
        });
        const hash = await sha256(processed.bytes);
        const previewUrl = URL.createObjectURL(new Blob([processed.bytes], { type: processed.mime }));
        onAddAttachment({
          id: crypto.randomUUID(),
          fileName: processed.fileName,
          mime: processed.mime,
          bytes: processed.bytes,
          sha256: hash,
          previewUrl,
          summary: processed.summary,
        });
        setStatusNote(
          transformVoice
            ? `Audio procesado: metadatos eliminados y voz transformada (${processed.acousticDeltaPercent}% de cambio acústico medido).`
            : 'Audio procesado: metadatos eliminados conservando el tono original.'
        );
      } else {
        const sanitized = await sanitizeImageFile(file, nextIndex);
        const hash = await sha256(sanitized.bytes);
        const previewUrl = URL.createObjectURL(new Blob([sanitized.bytes], { type: sanitized.mime }));
        onAddAttachment({
          id: crypto.randomUUID(),
          fileName: sanitized.fileName,
          mime: sanitized.mime,
          bytes: sanitized.bytes,
          sha256: hash,
          previewUrl,
          summary: sanitized.summary,
        });
        const removed = sanitized.summary.removedMarkers;
        setStatusNote(
          removed.length > 0
            ? `Imagen limpia: se retiraron ${removed.join(', ')} antes de subir.`
            : 'Imagen verificada: 0 metadatos identificables (EXIF/GPS/XMP).'
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Formato no admitido o archivo corrupto. Solo se aceptan imágenes JPEG/PNG/WebP y audios válidos.'
      );
      setStatusNote('');
    } finally {
      setProcessing(false);
    }
  }

  async function handleSyntheticVoiceSample() {
    if (attachments.length >= MAX_REPORT_ATTACHMENTS) {
      setErrorMsg('Ya alcanzaste el máximo de 4 archivos adjuntos por expediente.');
      return;
    }
    setProcessing(true);
    setErrorMsg('');
    try {
      const sampleBlob = createSyntheticVoiceWav();
      const processed = await processAudioBlobForReport(sampleBlob, {
        transformVoice,
        index: attachments.length + 1,
      });
      const hash = await sha256(processed.bytes);
      const previewUrl = URL.createObjectURL(new Blob([processed.bytes], { type: processed.mime }));
      onAddAttachment({
        id: crypto.randomUUID(),
        fileName: processed.fileName,
        mime: processed.mime,
        bytes: processed.bytes,
        sha256: hash,
        previewUrl,
        summary: processed.summary,
      });
      setStatusNote(
        transformVoice
          ? `Nota de voz de prueba generada con transformación activa (${processed.acousticDeltaPercent}% de cambio acústico).`
          : 'Nota de voz de prueba generada sin transformación (solo limpieza de metadatos).'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo procesar la muestra de voz.');
    } finally {
      setProcessing(false);
    }
  }

  async function startVoiceNoteRecording() {
    if (recordingVoice || processing) return;
    if (attachments.length >= MAX_REPORT_ATTACHMENTS) {
      setErrorMsg('Ya alcanzaste el máximo de 4 archivos adjuntos.');
      return;
    }
    setErrorMsg('');
    setStatusNote('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      unregisterCaptureRef.current = registerCapture(stream, 'voice-note', () => {
        stopVoiceStream();
      });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const rawBlob = new Blob(chunksRef.current, { type: mimeType });
        stopVoiceStream();
        if (rawBlob.size > 0) {
          const file = new File([rawBlob], 'nota-voz.webm', { type: mimeType });
          void handleFileSelection(file);
        }
      };
      recorder.start(250);
      setRecordingVoice(true);
      setStatusNote('Grabando nota de voz… Habla con calma y pulsa Detener cuando termines.');
    } catch {
      stopVoiceStream();
      setErrorMsg(
        'No pudimos acceder al micrófono. Puedes adjuntar un archivo de audio o generar una muestra de prueba.'
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-700 bg-[#111827] p-4 space-y-4">
        <h2 className="text-lg font-bold text-white">1. Limpieza local de imágenes y documentos</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          Antes de enviar cualquier archivo, tu navegador inspecciona sus bytes y elimina metadatos identificables:
          coordenadas <strong>GPS</strong>, datos de cámara <strong>EXIF/XMP/IPTC</strong>, fecha de toma y nombre original
          del archivo. Los formatos que no permitan verificar su limpieza (como PDF, Word, MP4 o ejecutables) se rechazan.
        </p>
        <div>
          <label
            htmlFor="report-file-input"
            className={`${control} w-full cursor-pointer bg-gray-800 border-amber-200 hover:bg-gray-700`}
          >
            {processing ? 'Procesando y verificando archivo…' : 'Seleccionar foto (JPEG/PNG/WebP) o audio'}
          </label>
          <input
            id="report-file-input"
            type="file"
            disabled={disabled || processing || attachments.length >= MAX_REPORT_ATTACHMENTS}
            accept="image/jpeg,image/png,image/webp,audio/wav,audio/webm,audio/ogg,audio/mpeg"
            className="sr-only"
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              e.target.value = '';
              void handleFileSelection(selected);
            }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-700 bg-[#111827] p-4 space-y-4">
        <h2 className="text-lg font-bold text-white">2. Protección opcional de voz (Web Audio)</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          Si grabas o adjuntas una nota de voz, puedes activar la transformación acústica para desplazar el tono, modular
          los formantes y exportar un archivo WAV sin etiquetas <code>ID3/INFO</code>.
        </p>
        <p className="rounded-lg border border-amber-300/50 bg-gray-900 p-3 text-sm leading-relaxed text-amber-100">
          <strong>Límite real de la distorsión de voz:</strong> el cambio de tono y timbre es perceptible al oído, pero{' '}
          <strong>no promete ni garantiza impedir tu identificación</strong> si alguien reconoce tus expresiones, datos del
          relato, ruido de fondo o aplica análisis forense.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled || processing}
            aria-pressed={transformVoice}
            onClick={() => setTransformVoice(true)}
            className={`${control} ${
              transformVoice ? 'bg-gray-700 border-amber-200' : 'bg-gray-900 text-gray-300'
            }`}
          >
            Transformar voz (tono modulado)
          </button>
          <button
            type="button"
            disabled={disabled || processing}
            aria-pressed={!transformVoice}
            onClick={() => setTransformVoice(false)}
            className={`${control} ${
              !transformVoice ? 'bg-gray-700 border-amber-200' : 'bg-gray-900 text-gray-300'
            }`}
          >
            Voz original (solo limpiar metadatos)
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {!recordingVoice ? (
            <button
              type="button"
              disabled={disabled || processing || attachments.length >= MAX_REPORT_ATTACHMENTS}
              onClick={() => void startVoiceNoteRecording()}
              className={`${control} bg-gray-900 hover:bg-gray-800`}
            >
              Grabar nota de voz con micrófono
            </button>
          ) : (
            <button
              type="button"
              onClick={stopVoiceStream}
              className={`${control} bg-red-800 border-red-300`}
            >
              Detener y procesar nota de voz
            </button>
          )}
          <button
            type="button"
            disabled={disabled || processing || attachments.length >= MAX_REPORT_ATTACHMENTS}
            onClick={() => void handleSyntheticVoiceSample()}
            className={`${control} bg-gray-900 hover:bg-gray-800`}
          >
            Generar audio de prueba ({transformVoice ? 'modulado' : 'original'})
          </button>
        </div>
      </div>

      {errorMsg && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-gray-900 p-4 text-sm font-medium text-amber-100">
          {errorMsg}
        </p>
      )}
      {statusNote && (
        <p role="status" className="rounded-xl border border-gray-600 bg-gray-900 p-3 text-sm text-gray-100">
          {statusNote}
        </p>
      )}

      <div className="rounded-xl border border-gray-700 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-white">Archivos listos y verificados</h3>
          <span className="font-tabular text-sm text-gray-300">
            {attachments.length} / {MAX_REPORT_ATTACHMENTS}
          </span>
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-gray-300">
            No has adjuntado archivos. Puedes radicar solo con tu relato o añadir hasta 4 evidencias limpias.
          </p>
        ) : (
          <ul className="space-y-3">
            {attachments.map((item) => (
              <li
                key={item.id}
                data-testid="sanitized-attachment-item"
                className="rounded-xl border border-gray-700 bg-[#0B0F19] p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm text-white">{item.fileName}</strong>
                  <span className="font-tabular text-xs text-gray-300">
                    {item.mime} · {item.bytes.byteLength} bytes
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-amber-100">
                  {item.summary.removedMarkers.length > 0
                    ? `Metadatos eliminados: ${item.summary.removedMarkers.join(', ')} · Verificado limpio.`
                    : 'Inspección superada: 0 metadatos identificables (EXIF/GPS/etiquetas).'}
                  {item.mime === 'audio/wav' &&
                    (item.summary.voiceTransformed
                      ? ` · Voz transformada (cambio acústico ${item.summary.acousticDeltaPercent ?? 0}%).`
                      : ' · Voz sin distorsión (solo limpieza de contenedor).')}
                </p>
                <p className="font-tabular text-xs text-gray-300">
                  SHA-256: <code>{item.sha256.slice(0, 24)}…</code>
                  {item.uploadedReceipt ? ' · Guardado en R2/D1' : ' · Listo en navegador'}
                </p>
                {item.mime === 'audio/wav' && (
                  <audio
                    controls
                    src={item.previewUrl}
                    aria-label={`Escuchar ${item.fileName}`}
                    className="w-full mt-2"
                  />
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={item.previewUrl}
                    download={item.fileName}
                    className={`${control} text-sm bg-gray-900`}
                  >
                    Descargar copia limpia
                  </a>
                  <button
                    type="button"
                    disabled={disabled || Boolean(item.uploadedReceipt)}
                    onClick={() => onRemoveAttachment(item.id)}
                    className={`${control} text-sm bg-gray-900 text-red-200 hover:bg-red-950/60`}
                  >
                    Retirar archivo
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-gray-700 bg-[#111827] p-4 space-y-3">
        <h2 className="text-lg font-bold text-white">3. Vincular grabación de Caja Negra R2 (Opcional)</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          Si grabaste video o audio en <strong>Grabar evidencia</strong>, puedes vincular esa sesión a este expediente.
          El servidor comprobará que la clave tenga clips confirmados en R2 y guardará en D1 únicamente el identificador de
          la sesión y el total de fragmentos, sin almacenar tu clave secreta.
        </p>
        {sessionRecordingKey && recordingKey !== sessionRecordingKey && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRecordingKeyChange(sessionRecordingKey)}
            className={`${control} w-full bg-gray-900 border-amber-200 text-sm`}
          >
            Vincular grabación activa de esta pestaña
          </button>
        )}
        <label htmlFor="report-recording-key" className="block text-sm font-medium text-gray-200">
          Clave privada de grabación (formato <code>id.secreto</code>)
        </label>
        <input
          id="report-recording-key"
          data-sensitive="true"
          type="password"
          disabled={disabled}
          value={recordingKey}
          onChange={(e) => onRecordingKeyChange(e.target.value)}
          placeholder="Opcional: pega aquí la clave copiada en /record"
          autoComplete="off"
          spellCheck={false}
          className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 font-mono text-sm text-white"
        />
      </div>
    </div>
  );
}
