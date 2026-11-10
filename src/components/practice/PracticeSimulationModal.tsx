'use client';

import { useEffect, useRef } from 'react';
import { usePracticeMode } from '@/context/PracticeModeContext';
import { PhoneCall, Send, Info, X } from 'lucide-react';

export function PracticeSimulationModal() {
  const { simulationModal, closeSimulationModal } = usePracticeMode();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (simulationModal) {
      closeButtonRef.current?.focus();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeSimulationModal();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [simulationModal, closeSimulationModal]);

  if (!simulationModal) {
    return null;
  }

  const isCall = !!simulationModal.phoneNumber;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulation-modal-title"
      data-testid="practice-simulation-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 pb-24 sm:pb-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-amber-500/80 bg-[#111827] p-5 sm:p-6 text-white shadow-2xl space-y-4">
        {/* Encabezado con badge pedagógico */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-700/80 pb-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              {isCall ? <PhoneCall size={22} aria-hidden="true" /> : <Send size={22} aria-hidden="true" />}
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Simulación Educativa · Sin Envíos
              </span>
              <h2 id="simulation-modal-title" className="text-lg sm:text-xl font-bold text-white">
                {simulationModal.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSimulationModal}
            aria-label="Cerrar ventana de simulación"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Explicación principal */}
        <p className="text-sm leading-relaxed text-gray-200">
          {simulationModal.message}
        </p>

        {/* Datos que se habrían utilizado */}
        {simulationModal.phoneNumber && (
          <div className="rounded-xl border border-gray-700 bg-gray-950 p-3 space-y-1">
            <span className="text-xs text-gray-400 font-semibold">Línea que se marcaría en una emergencia:</span>
            <div className="font-mono text-base font-bold text-amber-300">
              {simulationModal.serviceName ?? 'Emergencia'} ({simulationModal.phoneNumber})
            </div>
          </div>
        )}

        {simulationModal.recipients && simulationModal.recipients.length > 0 && (
          <div className="rounded-xl border border-gray-700 bg-gray-950 p-3 space-y-1">
            <span className="text-xs text-gray-400 font-semibold">Destinatarios que recibirían la alerta:</span>
            <ul className="text-xs space-y-1 text-gray-300">
              {simulationModal.recipients.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {simulationModal.payloadText && (
          <div className="rounded-xl border border-gray-700 bg-gray-950 p-3 space-y-1">
            <span className="text-xs text-gray-400 font-semibold">Texto simulado del mensaje:</span>
            <p className="text-xs font-mono text-gray-300 break-words line-clamp-3">
              {simulationModal.payloadText}
            </p>
          </div>
        )}

        {simulationModal.details && simulationModal.details.length > 0 && (
          <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-3 flex items-start gap-2.5 text-xs text-blue-200">
            <Info size={16} className="shrink-0 text-cyan-400 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              {simulationModal.details.map((d, i) => (
                <p key={i}>{d}</p>
              ))}
            </div>
          </div>
        )}

        {/* Botón de confirmación (Fitts' Law >= 56px de touch target) */}
        <div className="pt-2">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeSimulationModal}
            data-testid="close-simulation-modal-button"
            className="w-full min-h-14 inline-flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 px-4 py-3 text-sm sm:text-base font-bold text-gray-950 shadow-lg transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            Entendido, continuar practicando
          </button>
        </div>
      </div>
    </div>
  );
}
