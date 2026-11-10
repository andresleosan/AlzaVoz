'use client';

import { usePracticeMode } from '@/context/PracticeModeContext';
import { GraduationCap, X } from 'lucide-react';

export function PracticeModeBanner() {
  const { isPracticeMode, disablePracticeMode } = usePracticeMode();

  if (!isPracticeMode) {
    return null;
  }

  return (
    <aside
      aria-label="Aviso de Modo de Práctica"
      data-testid="practice-mode-banner"
      className="sticky top-[88px] z-30 w-full border-b border-amber-500/60 bg-amber-950/90 px-4 py-2 text-amber-100 shadow-md backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
            <GraduationCap size={18} aria-hidden="true" />
          </span>
          <div className="text-xs sm:text-sm leading-tight">
            <strong className="block font-bold text-amber-200">
              Modo de práctica activo
            </strong>
            <span className="text-amber-300/80">
              Ensayos con datos ficticios sin llamadas ni despachos reales.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={disablePracticeMode}
          data-testid="exit-practice-mode-button"
          aria-label="Salir del modo de práctica y volver al modo operativo"
          className="inline-flex min-h-11 sm:min-h-12 items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-900/60 hover:bg-amber-800/80 active:bg-amber-950 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <X size={15} aria-hidden="true" />
          <span>Salir de práctica</span>
        </button>
      </div>
    </aside>
  );
}

export function PracticeModeToggle({ className = '' }: { className?: string }) {
  const { isPracticeMode, togglePracticeMode } = usePracticeMode();

  return (
    <button
      type="button"
      onClick={togglePracticeMode}
      data-testid="toggle-practice-mode-button"
      aria-pressed={isPracticeMode}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all focus-visible:outline-2 ${
        isPracticeMode
          ? 'border-amber-400 bg-amber-950/80 text-amber-200 hover:bg-amber-900/80'
          : 'border-gray-700 bg-gray-900/80 text-gray-300 hover:bg-gray-800 hover:text-white'
      } ${className}`}
    >
      <GraduationCap size={16} className={isPracticeMode ? 'text-amber-400' : 'text-gray-400'} aria-hidden="true" />
      <span>{isPracticeMode ? 'Modo de práctica (Activo)' : 'Ensayar en modo práctica'}</span>
    </button>
  );
}
