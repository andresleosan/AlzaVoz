'use client';

import { useMediaCapture } from '@/context/MediaCaptureContext';
import { Video, Mic, Square } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MediaCaptureIndicator() {
  const {
    hasActiveVideo,
    hasActiveAudio,
    capturePhase,
    statusLabel,
    stopActiveCapture,
  } = useMediaCapture();
  const pathname = usePathname();

  const isCapturing =
    capturePhase === 'recording' ||
    capturePhase === 'requesting' ||
    capturePhase === 'stopping' ||
    hasActiveVideo ||
    hasActiveAudio;

  if (!isCapturing && capturePhase !== 'stopped') {
    return null;
  }

  // Si se detuvo, mostramos confirmación visible breve
  if (capturePhase === 'stopped' && !hasActiveVideo && !hasActiveAudio) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="media-capture-stopped-banner"
        className="sticky top-[88px] z-30 w-full bg-gray-900 border-b border-gray-700 px-4 py-2.5 text-xs sm:text-sm text-gray-300 flex items-center justify-between gap-3 animate-fade-in"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-500" aria-hidden="true" />
          <span className="font-semibold text-gray-200">Sensores apagados</span>
          <span className="text-gray-400">· Cámara y micrófono liberados</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="media-capture-active-banner"
      className="sticky top-[88px] z-30 w-full bg-[#111827] border-b-2 border-red-600/80 px-4 py-2.5 text-white shadow-xl transition-all"
    >
      <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        {/* Indicador de estado y pistas activas */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-red-100 flex items-center gap-1.5">
              {hasActiveVideo && <Video size={16} className="text-red-400 shrink-0" aria-label="Cámara" />}
              {hasActiveAudio && <Mic size={16} className="text-amber-400 shrink-0" aria-label="Micrófono" />}
              <span data-testid="banner-status-text">En vivo: {statusLabel}</span>
            </span>

            {pathname !== '/record' && (
              <Link
                href="/record"
                className="text-xs text-cyan-300 underline underline-offset-4 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-300 ml-1"
              >
                Ver grabación
              </Link>
            )}
          </div>
        </div>

        {/* Control crítico accesible de Detener captura (Fitts' Law >= 56px de touch target en móvil o min-h-12 accesible) */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={stopActiveCapture}
            data-testid="banner-stop-capture-button"
            aria-label="Detener captura y apagar cámara y micrófono"
            className="inline-flex min-h-12 sm:min-h-14 items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-600 active:bg-red-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md border border-red-500/50 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
          >
            <Square size={16} className="fill-white" aria-hidden="true" />
            <span>Detener captura</span>
          </button>
        </div>
      </div>
    </div>
  );
}
