"use client";

import { type ReactNode } from "react";
import { useAppMode } from "@/context/AppModeContext";
import { BottomNav } from "@/components/BottomNav";
import { ZeroPeepToggle } from "@/components/ZeroPeepToggle";
import { QuickEscapeButton } from "@/components/QuickEscapeButton";
import { AlzaBotAvatar } from "@/components/AlzaBotAvatar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { modeConfig, isCamouflaged } = useAppMode();

  return (
    <div
      className={`min-h-dvh flex flex-col justify-between transition-colors duration-500 pb-24 ${
        isCamouflaged ? "privacy-peep-active" : ""
      }`}
      style={{
        // Acento perimetral sutil según el modo activo
        boxShadow: `inset 0 1px 0 0 ${modeConfig.accentColor}33`,
      }}
    >
      {/* Barra de Estado Cívico Superior */}
      <header className="sticky top-0 z-40 w-full bg-[#0B0F19]/90 backdrop-blur-md border-b border-gray-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlzaBotAvatar size="sm" interactive showLivePulse />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">
                AlzaVoz
              </span>
              <span
                className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border font-semibold tracking-wider"
                style={{
                  color: modeConfig.accentColor,
                  borderColor: `${modeConfig.accentColor}55`,
                  backgroundColor: `${modeConfig.accentColor}15`,
                }}
              >
                Medellín
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium truncate max-w-[170px]">
              {modeConfig.name}
            </p>
          </div>
        </div>

        {/* Controles de Seguridad y Privacidad */}
        <div className="flex items-center gap-1.5">
          <ZeroPeepToggle showLabel={false} />
          <QuickEscapeButton variant="icon" />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 w-full px-4 py-4 flex flex-col">{children}</main>

      {/* Navegación Inferior Mobile-First Fija al Alcance del Pulgar */}
      <BottomNav />
    </div>
  );
}

