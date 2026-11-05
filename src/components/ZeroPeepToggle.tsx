"use client";

import { Eye, EyeOff } from "lucide-react";
import { useAppMode } from "@/context/AppModeContext";

interface ZeroPeepToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ZeroPeepToggle({
  className = "",
  showLabel = true,
}: ZeroPeepToggleProps) {
  const { isCamouflaged, toggleCamouflage } = useAppMode();

  return (
    <button
      type="button"
      onClick={toggleCamouflage}
      className={`touch-target-min min-h-[56px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95 border ${
        isCamouflaged
          ? "bg-amber-950/70 border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
          : "bg-gray-900/90 border-gray-800 text-gray-400 hover:text-white"
      } ${className}`}
      aria-pressed={isCamouflaged}
      aria-label={
        isCamouflaged
          ? "Desactivar modo antiespía (datos desenfocados)"
          : "Activar modo antiespía (desenfoca datos personales de miradas curiosas)"
      }
      title="Modo Antiespía: desenfoca datos sensibles"
    >
      {isCamouflaged ? (
        <EyeOff className="w-5 h-5 text-amber-400" />
      ) : (
        <Eye className="w-5 h-5 text-gray-400" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">
          {isCamouflaged ? "Antiespía ON" : "Antiespía"}
        </span>
      )}
    </button>
  );
}

