'use client';

import { useId, useRef } from 'react';
import { EyeOff, Globe, Info, ShieldAlert, Trash2, X } from 'lucide-react';
import { useAppMode } from '@/context/AppModeContext';
import { QuickEscapeButton } from '@/components/QuickEscapeButton';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

export type EscapeLimitsButtonVariant = 'home' | 'report' | 'sidebar' | 'footer';

const BUTTON_TEST_IDS: Record<EscapeLimitsButtonVariant, string> = {
  home: 'open-escape-limits-home',
  report: 'open-escape-limits-report',
  sidebar: 'open-escape-limits-sidebar',
  footer: 'open-escape-limits-shell',
};

export function QuickEscapeLimitsContent({ compact = false }: { compact?: boolean }) {
  const baseId = useId();
  const hideHeadingId = `${baseId}-hide`;
  const localHeadingId = `${baseId}-local`;
  const externalHeadingId = `${baseId}-external`;

  return (
    <div className={compact ? 'grid grid-cols-1 gap-3 text-sm leading-relaxed text-gray-200' : 'space-y-3 text-xs sm:text-sm leading-relaxed text-gray-200'}>
      <section
        data-testid="escape-limits-hide"
        aria-labelledby={hideHeadingId}
        className="rounded-xl border border-violet-400/50 bg-[#0B0F19] p-3.5 sm:p-4 space-y-1.5"
      >
        <h3 id={hideHeadingId} className="flex items-center gap-2 text-sm font-bold text-violet-200">
          <EyeOff size={16} className="shrink-0 text-violet-300" aria-hidden="true" />
          <span>1. Lo que solo oculta en pantalla (Modo Antiespía · icono del ojo)</span>
        </h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-200">
          <li>
            Solo desenfoca visualmente los datos marcados en pantalla (<code>blur</code>) mientras sigues dentro de AlzaVoz; al tocarlos, enfocarlos o recargar vuelven a mostrarse.
          </li>
          <li>
            <strong>No cifra ni borra</strong> ningún dato de la memoria, del navegador ni de internet.
          </li>
        </ul>
      </section>

      <section
        data-testid="escape-limits-local"
        aria-labelledby={localHeadingId}
        className="rounded-xl border border-cyan-400/50 bg-[#0B0F19] p-3.5 sm:p-4 space-y-1.5"
      >
        <h3 id={localHeadingId} className="flex items-center gap-2 text-sm font-bold text-cyan-200">
          <Trash2 size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
          <span>2. Lo que sí limpia en este navegador (Salir Rápido)</span>
        </h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-200">
          <li>
            Borra al instante borradores y adjuntos en memoria de esta pestaña, vacía <code>sessionStorage</code> (denuncia en curso, clave de grabación en sesión, modo práctica, sesión compartida y acceso admin) y elimina claves temporales en <code>localStorage</code> (<code>alzavoz_report_draft</code>, <code>alzavoz_draft</code>, <code>alzavoz_temp_audio</code>, <code>alzavoz_sos_active</code>).
          </li>
          <li>
            Detiene micrófono o cámara activos en esta pestaña y reemplaza <strong>solo la página actual</strong> por <code>google.com</code> (requiere conexión para cargar Google).
          </li>
        </ul>
      </section>

      <section
        data-testid="escape-limits-external"
        aria-labelledby={externalHeadingId}
        className="rounded-xl border border-amber-400/50 bg-[#0B0F19] p-3.5 sm:p-4 space-y-1.5"
      >
        <h3 id={externalHeadingId} className="flex items-center gap-2 text-sm font-bold text-amber-200">
          <Globe size={16} className="shrink-0 text-amber-300" aria-hidden="true" />
          <span>3. Lo que puede permanecer fuera de la app (Salir Rápido no lo borra)</span>
        </h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-200">
          <li>
            <strong>Botón Atrás e historial del navegador:</strong> si antes abriste otras vistas de AlzaVoz en esta misma pestaña (por ejemplo Inicio antes de Denuncia), pulsar <strong>Atrás</strong> desde Google puede volver a esa pantalla anterior; todas las URL visitadas siguen en el historial del navegador (<code>Ctrl+H</code> o cuenta sincronizada) y en otras pestañas abiertas.
          </li>
          <li>
            <strong>Contactos guardados en SOS:</strong> los contactos de confianza de <code>/sos</code> (<code>alzavoz_trusted_contacts</code>) se conservan en <code>localStorage</code> hasta que los elimines manualmente en <code>/sos</code>.
          </li>
          <li>
            <strong>Dispositivo y servicios externos:</strong> no borra archivos descargados (fotos limpias, audios, afiches QR), textos copiados al portapapeles o teclado, expedientes ya radicados en <code>D1</code> ni clips confirmados en <code>R2</code>, mensajes en WhatsApp, llamadas (<code>123</code>/<code>155</code>) ni registros de red del Wi-Fi u operador.
          </li>
        </ul>
      </section>
    </div>
  );
}

export function EscapeLimitsButton({
  variant = 'home',
  className = '',
}: {
  variant?: EscapeLimitsButtonVariant;
  className?: string;
}) {
  const { openEscapeLimits } = useAppMode();

  const label =
    variant === 'sidebar'
      ? 'Límites de privacidad y salida'
      : variant === 'footer'
        ? 'Qué oculta Antiespía y límites de Salir Rápido'
        : variant === 'report'
          ? 'Límites de Salir Rápido'
          : 'Ver qué oculta y qué no borra Salir rápido';

  const styleByVariant: Record<EscapeLimitsButtonVariant, string> = {
    home: 'w-full justify-between border-cyan-400/50 bg-[#0B0F19] px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-gray-800',
    report: 'border-gray-600 bg-[#111827] px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-100 hover:bg-gray-800',
    sidebar: 'w-full justify-start border-gray-700 bg-[#0B0F19] px-3.5 py-2.5 text-xs font-semibold text-gray-100 hover:bg-gray-800',
    footer: 'w-full sm:w-auto justify-center border-gray-700 bg-[#111827] px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-100 hover:bg-gray-800',
  };

  return (
    <button
      type="button"
      onClick={openEscapeLimits}
      data-testid={BUTTON_TEST_IDS[variant]}
      className={`touch-target-min inline-flex min-h-14 min-w-14 items-center gap-2 rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-safe:active:scale-95 ${styleByVariant[variant]} ${className}`}
    >
      <Info size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
      <span className="min-w-0 text-left leading-snug">{label}</span>
    </button>
  );
}

export function QuickEscapeLimitsModal() {
  const { isEscapeLimitsOpen, closeEscapeLimits } = useAppMode();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useDialogFocusTrap({
    isOpen: isEscapeLimitsOpen,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onClose: closeEscapeLimits,
  });

  if (!isEscapeLimitsOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="escape-limits-modal-title"
      aria-describedby="escape-limits-modal-intro"
      data-testid="quick-escape-limits-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 p-4 pb-24 sm:pb-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border-2 border-cyan-500/70 bg-[#111827] p-5 sm:p-6 text-gray-100 shadow-2xl space-y-4 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-700 pb-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
              <ShieldAlert size={22} aria-hidden="true" />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                Alcance real antes de usar la salida
              </span>
              <h2 id="escape-limits-modal-title" className="text-lg sm:text-xl font-bold text-white">
                Qué oculta Antiespía y qué limpia Salir Rápido
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={closeEscapeLimits}
            aria-label="Cerrar guía de límites de Antiespía y Salir Rápido"
            className="touch-target-min flex min-h-14 min-w-14 shrink-0 items-center justify-center rounded-xl text-gray-200 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p
          id="escape-limits-modal-intro"
          className="rounded-xl border border-gray-700 bg-[#0B0F19] px-3.5 py-2.5 text-xs sm:text-sm text-gray-200 leading-relaxed"
        >
          Consultar esta guía no frena la salida de emergencia: el botón <strong className="text-white">Salir Rápido</strong> de la cabecera y la barra móvil sigue saliendo a Google con un solo toque sin pedir confirmación.
        </p>

        <QuickEscapeLimitsContent />

        <div className="space-y-3 pt-1">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeEscapeLimits}
            data-testid="close-escape-limits-modal"
            className="touch-target-min w-full min-h-14 inline-flex items-center justify-center rounded-xl bg-cyan-400 hover:bg-cyan-300 px-4 py-3 text-sm sm:text-base font-bold text-[#0B0F19] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-safe:active:scale-95"
          >
            Entendido, seguir aquí
          </button>
          <QuickEscapeButton variant="full" />
        </div>
      </div>
    </div>
  );
}
