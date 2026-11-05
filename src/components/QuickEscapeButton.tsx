"use client";

import { LogOut } from "lucide-react";
import { useCallback } from "react";

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
    // 1. Limpieza de datos volátiles de sesión para no dejar rastros
    if (typeof window !== "undefined") {
      try {
        sessionStorage.clear();
        // Limpieza de posibles borradores temporales
        const keysToRemove = ["alzavoz_draft", "alzavoz_temp_audio", "alzavoz_sos_active"];
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // En caso de modo incógnito o storage deshabilitado
      }

      // 2. Sustitución inmediata del historial del navegador (invalida el botón 'Atrás')
      window.location.replace(targetUrl);
    }
  }, [targetUrl]);

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleEscape}
        className={`touch-target-min min-w-[56px] min-h-[56px] inline-flex items-center justify-center rounded-xl bg-gray-900/90 text-gray-400 hover:text-white hover:bg-red-950/80 border border-gray-800 hover:border-red-500/50 transition-all active:scale-95 ${className}`}
        aria-label="Salida de Pánico Inmediata (Cierra esta aplicación y abre Google sin dejar historial)"
        title="Salida Rápida de Pánico (Abre Google)"
      >
        <LogOut className="w-5 h-5 text-red-400" />
      </button>
    );
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleEscape}
        className={`touch-target-min min-h-[56px] w-full flex items-center justify-center gap-2.5 px-4 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/40 text-xs font-semibold tracking-wide uppercase transition active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)] ${className}`}
        aria-label="Salida Rápida de Pánico: redirige inmediatamente a Google sin dejar rastro en historial"
      >
        <LogOut className="w-4 h-4 text-red-400" />
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
      aria-label="Salida Rápida de Pánico: Salir a Google inmediatamente"
      title="Salida rápida sin historial"
    >
      <LogOut className="w-4 h-4 text-red-400" />
      <span>Salir Rápido</span>
    </button>
  );
}

