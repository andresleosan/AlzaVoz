'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Globe, Trash2, X } from 'lucide-react';
import { useAppMode } from '@/context/AppModeContext';
import { SHARED_SESSION_CLEAR_EVENT } from '@/context/SharedDeviceContext';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

export interface ConfirmationDetailItem {
  label: string;
  value: string;
  sensitive?: boolean;
  tabular?: boolean;
}

export interface ConfirmationSecondaryAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}

export interface ActionConfirmationModalProps {
  isOpen: boolean;
  tone: 'danger' | 'publish';
  title: string;
  actionSummary: string;
  itemDetails: ConfirmationDetailItem[];
  consequence: string;
  cancelLabel?: string;
  confirmLabel: string;
  busy?: boolean;
  busyLabel?: string;
  secondaryAction?: ConfirmationSecondaryAction;
  statusNote?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ActionConfirmationModal({
  isOpen,
  tone,
  title,
  actionSummary,
  itemDetails,
  consequence,
  cancelLabel = 'Cancelar',
  confirmLabel,
  busy = false,
  busyLabel,
  secondaryAction,
  statusNote,
  onCancel,
  onConfirm,
}: ActionConfirmationModalProps) {
  const { isCamouflaged, triggerHaptic } = useAppMode();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useDialogFocusTrap({
    isOpen,
    dialogRef,
    initialFocusRef: cancelButtonRef,
    onClose: () => onCancelRef.current(),
    closeDisabled: busy,
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleSystemClear = () => {
      onCancelRef.current();
    };

    window.addEventListener('alzavoz:escape', handleSystemClear);
    window.addEventListener(SHARED_SESSION_CLEAR_EVENT, handleSystemClear);

    return () => {
      window.removeEventListener('alzavoz:escape', handleSystemClear);
      window.removeEventListener(SHARED_SESSION_CLEAR_EVENT, handleSystemClear);
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const isDanger = tone === 'danger';

  const modalContent = (
    <div
      className={isCamouflaged ? 'privacy-peep-active' : undefined}
      data-testid="confirm-action-portal"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-testid="confirm-action-dialog"
        data-tone={tone}
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) {
            onCancel();
          }
        }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center overflow-y-auto bg-black/85 p-3 sm:p-4 pb-24 sm:pb-4 backdrop-blur-sm"
      >
        <div
          ref={dialogRef}
          tabIndex={-1}
          className={`relative w-full max-w-lg max-h-[86vh] overflow-y-auto rounded-2xl border bg-[#111827] p-5 sm:p-6 text-[#F9FAFB] shadow-2xl space-y-4 focus:outline-none ${
            isDanger ? 'border-red-500/70' : 'border-emerald-400/70'
          }`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-gray-700 pb-3.5">
            <div className="flex items-start gap-3 min-w-0">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                  isDanger
                    ? 'border-red-500/40 bg-red-950/80 text-red-200'
                    : 'border-emerald-400/40 bg-emerald-950/80 text-emerald-200'
                }`}
              >
                {isDanger ? (
                  <Trash2 size={20} aria-hidden="true" />
                ) : (
                  <Globe size={20} aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="text-lg sm:text-xl font-bold leading-snug text-[#F9FAFB] break-words"
                >
                  {title}
                </h2>
                <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-gray-200">
                  {actionSummary}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              data-testid="confirm-action-close"
              aria-label="Cerrar revisión sin confirmar"
              className="touch-target-min inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gray-700 bg-[#0B0F19] text-gray-200 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <dl
            data-testid="confirm-action-details"
            className="rounded-xl border border-gray-700 bg-[#0B0F19] p-4 space-y-3"
          >
            {itemDetails.map((detail) => (
              <div key={detail.label} className="space-y-1">
                <dt className="text-xs font-semibold text-gray-300">{detail.label}</dt>
                <dd
                  data-sensitive={detail.sensitive ? 'true' : undefined}
                  className={`text-sm leading-relaxed text-[#F9FAFB] break-words ${
                    detail.tabular ? 'font-tabular' : ''
                  }`}
                >
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>

          <div
            data-testid="confirm-action-consequence"
            className={`flex items-start gap-2.5 rounded-xl border p-4 text-sm leading-relaxed ${
              isDanger
                ? 'border-red-500/45 bg-red-950/35 text-red-100'
                : 'border-amber-400/50 bg-amber-950/30 text-amber-100'
            }`}
          >
            <AlertTriangle
              size={18}
              className={`mt-0.5 shrink-0 ${isDanger ? 'text-red-300' : 'text-amber-300'}`}
              aria-hidden="true"
            />
            <p className="m-0">{consequence}</p>
          </div>

          {secondaryAction && (
            <button
              type="button"
              disabled={busy || secondaryAction.disabled}
              data-testid={secondaryAction.testId}
              onClick={() => {
                triggerHaptic(20);
                secondaryAction.onClick();
              }}
              className="touch-target-min min-h-14 w-full inline-flex items-center justify-center rounded-xl border border-cyan-400/60 bg-[#0B0F19] px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50 motion-safe:active:scale-95"
            >
              {secondaryAction.label}
            </button>
          )}

          {statusNote && (
            <p
              role="status"
              className="rounded-xl border border-gray-600 bg-[#0B0F19] px-4 py-3 text-xs sm:text-sm text-gray-100"
            >
              {statusNote}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <button
              ref={cancelButtonRef}
              type="button"
              disabled={busy}
              data-testid="confirm-action-cancel"
              onClick={() => {
                triggerHaptic(20);
                onCancel();
              }}
              className="touch-target-min min-h-14 w-full inline-flex items-center justify-center rounded-xl border border-gray-500 bg-gray-800 px-4 py-3 text-sm sm:text-base font-semibold text-[#F9FAFB] hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50 motion-safe:active:scale-95"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              disabled={busy}
              data-testid="confirm-action-submit"
              onClick={() => {
                triggerHaptic(40);
                onConfirm();
              }}
              className={`touch-target-min min-h-14 w-full inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm sm:text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 motion-safe:active:scale-95 ${
                isDanger
                  ? 'border-red-400/70 bg-red-800 text-white hover:bg-red-700 focus-visible:outline-red-200'
                  : 'border-emerald-200 bg-emerald-300 text-[#0B0F19] hover:bg-emerald-200 focus-visible:outline-emerald-200'
              }`}
            >
              {busy ? busyLabel ?? confirmLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
