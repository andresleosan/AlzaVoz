"use client";

import { Home, ShieldAlert, HeartHandshake, Radar, LogOut } from "lucide-react";
import { type AppMode, MODES_CONFIG } from "@/types/mode";
import { useAppMode } from "@/context/AppModeContext";
import { useCallback } from "react";

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className = "" }: BottomNavProps) {
  const { mode, setMode, triggerHaptic } = useAppMode();

  const handleEscape = useCallback(() => {
    triggerHaptic(50);
    try {
      sessionStorage.clear();
      localStorage.removeItem("alzavoz_draft");
    } catch {
      // Ignorar restricciones en sandbox
    }
    window.location.replace("https://www.google.com");
  }, [triggerHaptic]);

  const navItems: Array<{
    id: AppMode;
    label: string;
    icon: typeof Home;
    activeColor: string;
    glowClass: string;
  }> = [
    {
      id: "standard",
      label: MODES_CONFIG.standard.shortLabel,
      icon: Home,
      activeColor: "text-cyan-400",
      glowClass: "shadow-[0_0_15px_rgba(6,182,212,0.35)]",
    },
    {
      id: "defender",
      label: MODES_CONFIG.defender.shortLabel,
      icon: ShieldAlert,
      activeColor: "text-red-400",
      glowClass: "shadow-[0_0_15px_rgba(239,68,68,0.45)]",
    },
    {
      id: "violet",
      label: MODES_CONFIG.violet.shortLabel,
      icon: HeartHandshake,
      activeColor: "text-purple-400",
      glowClass: "shadow-[0_0_15px_rgba(139,92,246,0.4)]",
    },
    {
      id: "radar",
      label: MODES_CONFIG.radar.shortLabel,
      icon: Radar,
      activeColor: "text-emerald-400",
      glowClass: "shadow-[0_0_15px_rgba(16,185,129,0.35)]",
    },
  ];

  return (
    <nav
      aria-label="Navegación Ergonómica Principal"
      className={`fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#111827]/95 backdrop-blur-xl border-t border-gray-800/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 px-2 shadow-2xl ${className}`}
    >
      <div className="flex items-center justify-around gap-1">
        {navItems.map((item) => {
          const isActive = mode === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Cambiar a modo ${item.label}`}
              className={`touch-target-min min-w-[56px] min-h-[56px] flex-1 flex flex-col items-center justify-center rounded-xl py-1 px-1 transition-all duration-200 active:scale-95 ${
                isActive
                  ? `bg-gray-800/90 ${item.activeColor} ${item.glowClass} font-bold ring-1 ring-white/10`
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-1 ${isActive ? item.activeColor : "text-gray-400"}`} />
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: MODES_CONFIG[item.id].accentColor }}
                  />
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Botón de Pánico Ergonómico al Alcance del Pulgar */}
        <button
          type="button"
          onClick={handleEscape}
          aria-label="Salida Rápida de Pánico (Abre Google)"
          title="Salida Rápida (Abre Google y borra rastro)"
          className="touch-target-min min-w-[56px] min-h-[56px] flex flex-col items-center justify-center rounded-xl py-1 px-1 text-red-400/90 hover:text-red-300 hover:bg-red-950/40 border border-red-950 transition-all duration-200 active:scale-95"
        >
          <LogOut className="w-5 h-5 mb-1 text-red-400" />
          <span className="text-[10px] leading-tight font-semibold text-red-300">
            Salir
          </span>
        </button>
      </div>
    </nav>
  );
}

