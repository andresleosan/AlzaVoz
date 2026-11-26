'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseDialogFocusTrapOptions {
  isOpen: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  closeDisabled?: boolean;
}

function getVisibleFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      el.isConnected &&
      el.getClientRects().length > 0 &&
      window.getComputedStyle(el).visibility !== 'hidden' &&
      !el.closest('[aria-hidden="true"]')
  );
}

/**
 * Gestiona el ciclo de foco accesible para diálogos modales:
 * guarda el disparador previo, enfoca el control inicial, atrapa Tab/Shift+Tab,
 * maneja Escape y restaura el foco síncronamente al cerrar o desmontar.
 */
export function useDialogFocusTrap({
  isOpen,
  dialogRef,
  initialFocusRef,
  fallbackFocusRef,
  onClose,
  closeDisabled = false,
}: UseDialogFocusTrapOptions): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);
  const fallbackRef = useRef(fallbackFocusRef);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeDisabledRef.current = closeDisabled;
  }, [closeDisabled]);

  useEffect(() => {
    fallbackRef.current = fallbackFocusRef;
  }, [fallbackFocusRef]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      const dialogEl = dialogRef.current;
      if (!dialogEl) return;

      const preferred = initialFocusRef?.current;
      if (
        preferred &&
        preferred.isConnected &&
        !preferred.hasAttribute('disabled') &&
        preferred.getClientRects().length > 0
      ) {
        preferred.focus();
        return;
      }

      const focusables = getVisibleFocusables(dialogEl);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else if (dialogEl.tabIndex >= -1) {
        dialogEl.focus();
      }
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!closeDisabledRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      const dialogEl = dialogRef.current;
      if (!dialogEl) return;

      const focusables = getVisibleFocusables(dialogEl);
      if (focusables.length === 0) {
        event.preventDefault();
        if (dialogEl.tabIndex >= -1) {
          dialogEl.focus();
        }
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (!(active instanceof HTMLElement) || !dialogEl.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      if (prev && prev.isConnected) {
        prev.focus();
        return;
      }
      const fallback = fallbackRef.current?.current;
      if (fallback && fallback.isConnected) {
        fallback.focus();
        return;
      }
      document.querySelector<HTMLElement>('main[tabindex="-1"]')?.focus();
    };
  }, [isOpen, dialogRef, initialFocusRef]);
}
