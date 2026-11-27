"use client";

import { useId } from "react";
import { FileText, Square, Volume2, VolumeX } from "lucide-react";
import { useAppMode } from "@/context/AppModeContext";
import {
  useActiveSpeechBanner,
  useVoluntarySpeech,
} from "@/hooks/useVoluntarySpeech";
import { type SpeechScope, type SpeechSegment } from "@/lib/speech/readAloud";

export interface VoluntarySpeechScopeOption {
  id: SpeechScope;
  label: string;
}

export interface VoluntarySpeechControlProps {
  title?: string;
  contextLabel: string;
  contentKey: string;
  segments: readonly SpeechSegment[];
  scopes?: readonly VoluntarySpeechScopeOption[];
  activeScope?: SpeechScope;
  onScopeChange?: (scope: SpeechScope) => void;
  className?: string;
}

export function VoluntarySpeechControl({
  title = "Lectura voluntaria de indicaciones",
  contextLabel,
  contentKey,
  segments,
  scopes,
  activeScope,
  onScopeChange,
  className = "",
}: VoluntarySpeechControlProps) {
  const { triggerHaptic } = useAppMode();
  const headingId = useId();
  const silentPanelId = useId();

  const {
    support,
    status,
    activeSegmentIndex,
    errorMessage,
    isSilentOpen,
    isCamouflaged,
    start,
    stop,
    toggleSilentMode,
  } = useVoluntarySpeech({ segments, contentKey, contextLabel });

  const isUnsupported = support === "unsupported";
  const isSpeaking = status === "speaking";
  const totalSegments = segments.length;
  const currentPosition = activeSegmentIndex >= 0 ? activeSegmentIndex + 1 : 1;
  const currentSegment =
    activeSegmentIndex >= 0 ? segments[activeSegmentIndex] : segments[0];

  const handleToggleSpeech = () => {
    triggerHaptic(30);
    if (isSpeaking) {
      stop();
    } else {
      start();
    }
  };

  const handleToggleSilent = () => {
    triggerHaptic(30);
    toggleSilentMode();
  };

  return (
    <section
      aria-labelledby={headingId}
      data-testid="voluntary-speech-control"
      className={`rounded-xl border border-gray-700 bg-[#0B0F19] p-4 space-y-3.5 text-gray-100 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        {isUnsupported || status === "unavailable" ? (
          <VolumeX
            className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"
            aria-hidden="true"
          />
        ) : (
          <Volume2
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h3
            id={headingId}
            className="text-sm font-semibold text-white leading-snug"
          >
            {title}
          </h3>
          <p className="text-xs leading-relaxed text-gray-300">
            Solo suena si la activas. Audio local del navegador; usa audífonos o
            volumen bajo si hay terceros cerca.
          </p>
        </div>
      </div>

      {scopes && scopes.length > 0 && onScopeChange && (
        <div
          role="group"
          aria-label="Alcance de la lectura"
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {scopes.map((scope) => {
            const isSelected = activeScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                data-testid={`speech-scope-${scope.id}`}
                aria-pressed={isSelected}
                onClick={() => {
                  triggerHaptic(30);
                  onScopeChange(scope.id);
                }}
                className={`touch-target-min min-h-[56px] min-w-[56px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                  isSelected
                    ? "border-amber-400/80 bg-gray-700 text-white"
                    : "border-gray-700 bg-[#111827] text-gray-200 hover:bg-gray-800"
                }`}
              >
                {scope.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          data-testid="speech-toggle-button"
          disabled={isUnsupported || totalSegments === 0}
          aria-pressed={isUnsupported ? undefined : isSpeaking}
          onClick={handleToggleSpeech}
          className={`touch-target-min min-h-[56px] min-w-[56px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
            isUnsupported || totalSegments === 0
              ? "cursor-not-allowed border border-gray-600 bg-gray-800 text-gray-300"
              : isSpeaking
                ? "border-2 border-red-400 bg-red-800 text-white hover:bg-red-700"
                : "border-2 border-amber-400/80 bg-[#111827] text-[#F9FAFB] hover:bg-gray-800"
          }`}
        >
          {isUnsupported ? (
            <>
              <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Voz no disponible en este navegador</span>
            </>
          ) : isSpeaking ? (
            <>
              <Square className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Detener lectura</span>
            </>
          ) : (
            <>
              <Volume2
                className="h-4 w-4 shrink-0 text-amber-300"
                aria-hidden="true"
              />
              <span>Escuchar indicaciones</span>
            </>
          )}
        </button>

        <button
          type="button"
          data-testid="speech-silent-button"
          aria-expanded={isSilentOpen}
          aria-controls={silentPanelId}
          onClick={handleToggleSilent}
          className="touch-target-min min-h-[56px] min-w-[56px] inline-flex items-center justify-center gap-2 rounded-xl border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-100 transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <FileText className="h-4 w-4 shrink-0 text-gray-200" aria-hidden="true" />
          <span>
            {isSilentOpen
              ? "Ocultar resumen silencioso"
              : "Leer en silencio (resumen)"}
          </span>
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        data-testid="speech-status"
        className={`text-xs leading-relaxed break-words ${
          status === "error"
            ? "text-red-200"
            : isSpeaking
              ? "text-amber-200"
              : "text-gray-300"
        }`}
      >
        {isUnsupported || status === "unavailable" ? (
          "Este navegador no ofrece síntesis de voz local. Usa el resumen silencioso o el texto completo sin perder ninguna indicación."
        ) : isSpeaking ? (
          <>
            Leyendo bloque{" "}
            <span className="font-tabular font-semibold text-white">
              {currentPosition}/{totalSegments}
            </span>
            {currentSegment ? ` · ${currentSegment.label}` : ""}. Puedes
            detener en cualquier momento.
          </>
        ) : status === "stopped" ? (
          `Lectura detenida. El texto completo sigue disponible en pantalla.${
            isCamouflaged ? " (silenciada por Modo Antiespía)" : ""
          }`
        ) : status === "completed" ? (
          "Lectura finalizada. Todas las indicaciones siguen visibles en texto."
        ) : status === "error" ? (
          errorMessage ??
          "No se pudo completar la lectura en voz alta. Usa el resumen silencioso o el texto completo en pantalla."
        ) : (
          "Audio apagado por defecto. El texto completo permanece siempre visible."
        )}
      </p>

      {isSilentOpen && (
        <div
          id={silentPanelId}
          data-testid="speech-silent-panel"
          className="rounded-xl border border-gray-700 bg-[#111827] p-3.5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700 pb-2">
            <p className="text-xs font-semibold text-gray-200">
              Alternativa silenciosa equivalente (sin audio)
            </p>
            <span className="text-xs text-gray-300 break-words">
              {contextLabel}
            </span>
          </div>

          <ol className="space-y-2.5">
            {segments.map((segment, index) => {
              const isActiveStep = index === activeSegmentIndex;
              return (
                <li
                  key={segment.id}
                  aria-current={isActiveStep ? "step" : undefined}
                  className={`rounded-lg border p-3 ${
                    isActiveStep
                      ? "border-amber-400 bg-[#0B0F19]"
                      : "border-gray-700 bg-[#0B0F19]"
                  }`}
                >
                  <p className="text-xs font-semibold text-amber-200">
                    {segment.label}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#F9FAFB] break-words">
                    {segment.text}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

/**
 * Barra flotante en zona del pulgar alojada en el layout raíz para quedar
 * fuera de subárboles ocultos por <Activity mode="hidden"> al cambiar de ruta.
 */
export function VoluntarySpeechStickyBar() {
  const banner = useActiveSpeechBanner();
  const { triggerHaptic } = useAppMode();

  if (!banner) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Control rápido para detener lectura en voz alta"
      data-testid="speech-sticky-stop-bar"
      className="speech-sticky-bar pointer-events-none fixed bottom-[calc(3.25rem+40px+env(safe-area-inset-bottom))] left-4 right-4 z-40 lg:bottom-5 lg:left-[calc(240px+40px)] lg:right-10"
    >
      <div className="pointer-events-auto mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-400 bg-[#0B0F19] p-3 shadow-2xl">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="break-words text-xs font-semibold text-red-200">
            {banner.contextLabel}
          </p>
          <p className="text-sm font-semibold text-white break-words">
            Leyendo{" "}
            <span className="font-tabular">
              {banner.currentPosition}/{banner.totalSegments}
            </span>
            {banner.segmentLabel ? ` · ${banner.segmentLabel}` : ""}
          </p>
        </div>
        <button
          type="button"
          data-testid="speech-sticky-stop-button"
          onClick={() => {
            triggerHaptic(30);
            banner.onStop();
          }}
          className="touch-target-min min-h-[56px] min-w-[56px] inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Square className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Detener lectura</span>
        </button>
      </div>
    </div>
  );
}
