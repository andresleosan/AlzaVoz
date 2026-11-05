"use client";

import Image from "next/image";
import { type AppMode, MODES_CONFIG } from "@/types/mode";
import { useAppMode } from "@/context/AppModeContext";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AlzaBotAvatarProps {
  mode?: AppMode;
  size?: AvatarSize;
  showLivePulse?: boolean;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP: Record<
  AvatarSize,
  {
    container: string;
    px: number;
    badge: string;
    glowRadius: string;
  }
> = {
  sm: {
    container: "w-10 h-10 rounded-xl",
    px: 40,
    badge: "w-2.5 h-2.5 -top-0.5 -right-0.5 ring-1",
    glowRadius: "0 0 12px",
  },
  md: {
    container: "w-14 h-14 rounded-2xl touch-target-min",
    px: 56,
    badge: "w-3 h-3 top-0 right-0 ring-2",
    glowRadius: "0 0 20px",
  },
  lg: {
    container: "w-24 h-24 rounded-3xl",
    px: 96,
    badge: "w-3.5 h-3.5 top-1 right-1 ring-2",
    glowRadius: "0 0 30px",
  },
  xl: {
    container: "w-36 h-36 rounded-3xl",
    px: 144,
    badge: "w-4 h-4 top-1.5 right-1.5 ring-2",
    glowRadius: "0 0 45px",
  },
};

const MODE_THEMES: Record<
  AppMode,
  {
    ring: string;
    pulseColor: string;
    glowStyle: (radius: string) => React.CSSProperties;
    badgeBg: string;
  }
> = {
  standard: {
    ring: "ring-cyan-500/50 hover:ring-cyan-400",
    pulseColor: "bg-cyan-400",
    badgeBg: "bg-cyan-400",
    glowStyle: (radius) => ({
      boxShadow: `${radius} rgba(6, 182, 212, 0.45)`,
    }),
  },
  defender: {
    ring: "ring-red-500/70 hover:ring-red-400",
    pulseColor: "bg-red-500",
    badgeBg: "bg-red-500",
    glowStyle: (radius) => ({
      boxShadow: `${radius} rgba(239, 68, 68, 0.55)`,
    }),
  },
  violet: {
    ring: "ring-purple-500/60 hover:ring-purple-400",
    pulseColor: "bg-purple-400",
    badgeBg: "bg-purple-400",
    glowStyle: (radius) => ({
      boxShadow: `${radius} rgba(139, 92, 246, 0.50)`,
    }),
  },
  radar: {
    ring: "ring-emerald-500/60 hover:ring-emerald-400",
    pulseColor: "bg-emerald-400",
    badgeBg: "bg-emerald-400",
    glowStyle: (radius) => ({
      boxShadow: `${radius} rgba(16, 185, 129, 0.45)`,
    }),
  },
};

export function AlzaBotAvatar({
  mode,
  size = "md",
  showLivePulse = true,
  interactive = false,
  className = "",
  onClick,
}: AlzaBotAvatarProps) {
  const context = useAppMode();
  const effectiveMode: AppMode = mode ?? context.mode;
  const config = MODES_CONFIG[effectiveMode];
  const sizeConfig = SIZE_MAP[size];
  const theme = MODE_THEMES[effectiveMode];

  const handleClick = () => {
    if (interactive) {
      context.triggerHaptic(30);
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      role={interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${config.ariaLabel} (${config.name})`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      style={theme.glowStyle(sizeConfig.glowRadius)}
      className={`relative inline-flex items-center justify-center overflow-visible bg-gray-950 transition-all duration-300 ring-2 ${
        theme.ring
      } ${sizeConfig.container} ${
        interactive ? "cursor-pointer active:scale-95 focus:outline-none focus:ring-4" : ""
      } ${className}`}
    >
      {/* Contenedor de la imagen con esquinas redondeadas */}
      <div className="relative w-full h-full rounded-[inherit] overflow-hidden">
        <Image
          src={config.imageSrc}
          alt={config.name}
          width={sizeConfig.px}
          height={sizeConfig.px}
          className="w-full h-full object-cover select-none transition-transform duration-500 hover:scale-105"
          priority={size === "xl" || size === "lg"}
        />
        {/* Filtro sutil de gradiente interior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Halo perimetral animado (breathing effect) */}
      <div
        aria-hidden="true"
        className="absolute -inset-1 rounded-[inherit] opacity-20 blur-sm pointer-events-none animate-pulse"
        style={{ backgroundColor: config.accentColor }}
      />

      {/* Indicador de estado en vivo */}
      {showLivePulse && (
        <span
          className={`absolute flex items-center justify-center rounded-full ring-gray-950 ${sizeConfig.badge} ${theme.badgeBg}`}
          aria-hidden="true"
        >
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${theme.pulseColor}`}
          />
        </span>
      )}
    </div>
  );
}

