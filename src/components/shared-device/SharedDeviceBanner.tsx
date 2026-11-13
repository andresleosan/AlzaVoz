'use client';

import { useEffect, useRef } from 'react';
import { Info, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react';
import { useAppMode } from '@/context/AppModeContext';
import { useSharedDevice } from '@/context/SharedDeviceContext';
import { QuickEscapeButton } from '@/components/QuickEscapeButton';

export function SharedDeviceBanner() {
  const { isSharedDevice, exitAndClearSharedSession, openExternalRecordsGuide } = useSharedDevice();
  const { triggerHaptic } = useAppMode();

  if (!isSharedDevice) {
    return null;
  }

  return (
    <aside
      aria-label="Aviso de sesión en dispositivo compartido"
      data-testid="shared-device-banner"
      className="sticky top-[88px] z-30 w-full border-b border-cyan-500/60 bg-[#0B1628]/95 px-4 py-2.5 text-slate-100 shadow-md backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
            <ShieldAlert size={18} aria-hidden="true" />
          </span>
          <div className="text-xs sm:text-sm leading-snug">
            <strong className="block font-bold text-white">
              Sesión en dispositivo compartido activa
            </strong>
            <span className="text-cyan-100/90">
              No se guardan borradores ni claves en este navegador.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(30);
              openExternalRecordsGuide();
            }}
            data-testid="open-shared-device-info-button"
            className="inline-flex min-h-14 min-w-14 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/50 bg-[#111827] px-3.5 py-2 text-xs sm:text-sm font-semibold text-cyan-100 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-safe:active:scale-95"
          >
            <Info size={16} aria-hidden="true" />
            <span>Registros externos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(40);
              exitAndClearSharedSession();
            }}
            data-testid="exit-shared-session-button"
            aria-label="Salir de la sesión compartida y limpiar borradores locales"
            className="inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-xl border border-cyan-300/70 bg-cyan-950 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-cyan-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-safe:active:scale-95"
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>Salir y limpiar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export function SharedDeviceToggle({ className = '' }: { className?: string }) {
  const { isSharedDevice, enableSharedDevice, exitAndClearSharedSession } = useSharedDevice();
  const { triggerHaptic } = useAppMode();

  const handleClick = () => {
    triggerHaptic(40);
    if (isSharedDevice) {
      exitAndClearSharedSession();
    } else {
      enableSharedDevice();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="toggle-shared-device-button"
      aria-pressed={isSharedDevice}
      className={`inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-safe:active:scale-95 ${
        isSharedDevice
          ? 'border-cyan-400 bg-cyan-950/90 text-white hover:bg-cyan-900'
          : 'border-gray-600 bg-[#111827] text-gray-100 hover:bg-gray-800'
      } ${className}`}
    >
      {isSharedDevice ? (
        <Trash2 size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
      ) : (
        <ShieldCheck size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
      )}
      <span>
        {isSharedDevice ? 'Salir y limpiar sesión compartida' : 'Sesión en dispositivo compartido'}
      </span>
    </button>
  );
}

export function SharedDeviceExitModal() {
  const { isExitModalOpen, exitModalMode, closeExitModal } = useSharedDevice();
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isExitModalOpen) return;
    confirmButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeExitModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExitModalOpen, closeExitModal]);

  if (!isExitModalOpen) {
    return null;
  }

  const isExited = exitModalMode === 'exited';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-device-modal-title"
      data-testid="shared-device-exit-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 p-4 pb-24 sm:pb-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl border-2 border-cyan-500/70 bg-[#111827] p-5 sm:p-6 text-gray-100 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-gray-700 pb-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
              {isExited ? (
                <ShieldCheck size={22} aria-hidden="true" />
              ) : (
                <Info size={22} aria-hidden="true" />
              )}
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                {isExited
                  ? 'Sesión compartida cerrada y limpia'
                  : 'Teléfono o navegador compartido'}
              </span>
              <h2 id="shared-device-modal-title" className="text-lg sm:text-xl font-bold text-white">
                {isExited
                  ? 'Borradores eliminados de esta aplicación'
                  : 'Qué no se guarda y qué puede quedar fuera'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={closeExitModal}
            aria-label="Cerrar aviso de sesión compartida"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div
          data-testid="shared-exit-cleared-list"
          className="rounded-xl border border-emerald-500/40 bg-[#0B0F19] p-4 space-y-2"
        >
          <h3 className="text-sm font-bold text-emerald-300">
            {isExited
              ? 'Lo que AlzaVoz borró de este dispositivo:'
              : 'Lo que AlzaVoz evita recordar durante la sesión:'}
          </h3>
          <ul className="list-disc pl-5 text-xs sm:text-sm leading-relaxed text-gray-200 space-y-1">
            <li>
              Relato de los hechos, referencia barrial, fecha, datos de contacto seguro y consulta de expediente en pantalla.
            </li>
            <li>
              Archivos adjuntos cargados en memoria temporal y sus vistas previas del navegador.
            </li>
            <li>
              Claves de almacenamiento local del navegador (<code>sessionStorage</code> y <code>localStorage</code> para borradores y claves de grabación).
            </li>
          </ul>
        </div>

        <div
          data-testid="shared-exit-external-records-list"
          className="rounded-xl border border-amber-400/50 bg-[#0B0F19] p-4 space-y-2"
        >
          <h3 className="text-sm font-bold text-amber-200">
            Registros externos que podrían permanecer fuera de AlzaVoz:
          </h3>
          <ul className="list-disc pl-5 text-xs sm:text-sm leading-relaxed text-gray-200 space-y-1.5">
            <li>
              <strong>Historial y pestañas del navegador:</strong> el teléfono prestado puede conservar la página visitada o pestañas abiertas si no usas navegación privada o borras el historial manualmente.
            </li>
            <li>
              <strong>Descargas y galería:</strong> si descargaste copias limpias de fotos, audios WAV, clips WebM o afiches QR, esos archivos siguen guardados en la carpeta de Descargas del teléfono.
            </li>
            <li>
              <strong>Portapapeles y teclado:</strong> si copiaste una clave privada (<code>ALZ-...</code>) o escribiste nombres, puede quedar en el portapapeles o historial de sugerencias del teclado.
            </li>
            <li>
              <strong>WhatsApp y llamadas telefónicas:</strong> llamadas al <code>123</code>/<code>155</code> o mensajes abiertos en WhatsApp permanecen en esas aplicaciones y en el registro del operador.
            </li>
            <li>
              <strong>Expedientes ya enviados a la bóveda (D1/R2):</strong> si radicaste un caso o grabaste clips confirmados, la información enviada permanece resguardada en el servidor con tu clave privada; salir solo limpia este dispositivo.
            </li>
          </ul>
        </div>

        <div className="space-y-3 pt-1">
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={closeExitModal}
            data-testid="close-shared-exit-modal-button"
            className="w-full min-h-14 inline-flex items-center justify-center rounded-xl bg-cyan-400 hover:bg-cyan-300 px-4 py-3 text-sm sm:text-base font-bold text-[#0B0F19] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-safe:active:scale-95"
          >
            Entendido, cerrar aviso
          </button>
          <QuickEscapeButton variant="full" />
        </div>
      </div>
    </div>
  );
}
