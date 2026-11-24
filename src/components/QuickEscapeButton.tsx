"use client";

import { LogOut } from "lucide-react";
import { useCallback } from "react";
import { purgeSensitiveClientStorage } from "@/context/SharedDeviceContext";
import { cancelBrowserSpeech } from "@/lib/speech/readAloud";

interface QuickEscapeButtonProps {
  className?: string;
  variant?: "badge" | "full" | "icon";
  targetUrl?: string;
}

export function QuickEscapeButton({
  className = "",
  variant = "badge",
  targetUrl = "https://www.google.com",
}: QuickEscapeButtonProps) {
  const handleEscape = useCallback(() => {
    // 1. Detener captura, síntesis de voz, limpiar estado en memoria y almacenamiento local
    if (typeof window !== "undefined") {
      cancelBrowserSpeech();
      try {
        window.dispatchEvent(new Event("alzavoz:escape"));
      } catch {
        // Ignorar fallos de despacho en entornos restrictivos
      }
      try {
        sessionStorage.clear();
      } catch {
        // En caso de modo incógnito o storage deshabilitado
      }
      purgeSensitiveClientStorage(true);

      // 2. Sustituye únicamente la entrada actual del historial por la página de salida
      window.location.replace(targetUrl);
    }
  }, [targetUrl]);

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleEscape}
        className={`touch-target-min min-w-[56px] min-h-[56px] inline-flex items-center justify-center rounded-xl bg-gray-900/90 text-gray-400 hover:text-white hover:bg-red-950/80 border border-gray-800 hover:border-red-500/50 transition-all active:scale-95 ${className}`}
        aria-label="Salida Rápida de Pánico (Abre Google)"
        title="Salida Rápida de Pánico (Abre Google)"
      >
        <LogOut className="w-5 h-5 text-red-400" aria-hidden="true" />
      </button>
    );
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleEscape}
        className={`touch-target-min min-h-[56px] w-full flex items-center justify-center gap-2.5 px-4 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/40 text-xs font-semibold tracking-wide uppercase transition active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)] ${className}`}
        aria-label="Salida Rápida de Pánico: limpia borradores locales, detiene captura y abre Google reemplazando la página actual"
      >
        <LogOut className="w-4 h-4 text-red-400" aria-hidden="true" />
        <span>Salida Rápida de Pánico (Abrir Google)</span>
      </button>
    );
  }

  // Variant "badge" por defecto
  return (
    <button
      type="button"
      onClick={handleEscape}
      className={`touch-target-min min-h-[56px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900/90 hover:bg-red-950 text-red-300 hover:text-red-200 border border-gray-800 hover:border-red-500/50 text-[11px] font-semibold transition active:scale-95 ${className}`}
      aria-label="Salida Rápida de Pánico: limpia esta pestaña y abre Google"
      title="Salida Rápida (Abre Google)"
    >
      <LogOut className="w-4 h-4 text-red-400" aria-hidden="true" />
      <span className="escape-label">Salir Rápido</span>
    </button>
  );
}

