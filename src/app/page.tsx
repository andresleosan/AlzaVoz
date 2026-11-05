"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ShieldAlert,
  Scale,
  HeartHandshake,
  Radar,
  MapPin,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AlzaBotAvatar } from "@/components/AlzaBotAvatar";
import { useAppMode } from "@/context/AppModeContext";
import { MODES_CONFIG, type AppMode } from "@/types/mode";

export default function HomePage() {
  const { mode, modeConfig, setMode } = useAppMode();

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        {/* Banner Hero Central con Avatar Dinámico */}
        <section
          aria-label="Estado Central de Alza Bot"
          className="relative rounded-2xl overflow-hidden border p-4 transition-all duration-300"
          style={{
            borderColor: `${modeConfig.accentColor}55`,
            backgroundColor: "#111827",
            boxShadow: `0 0 25px ${modeConfig.glowColor}`,
          }}
        >
          {/* Fondo de Escena Difuminado */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <Image
              src={modeConfig.sceneImageSrc}
              alt=""
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <AlzaBotAvatar size="lg" interactive showLivePulse />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles
                  className="w-4 h-4 animate-spin-slow"
                  style={{ color: modeConfig.accentColor }}
                />
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: modeConfig.accentColor }}
                >
                  Modo Activo
                </span>
              </div>

              <h1 className="text-lg font-black text-white leading-tight truncate">
                {modeConfig.name}
              </h1>

              <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                {modeConfig.tagline}
              </p>
            </div>
          </div>

          {/* Cita de Respaldo Jurídico */}
          <div className="relative z-10 mt-3 pt-2.5 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
            <span className="text-gray-400 font-mono truncate max-w-[260px]">
              {modeConfig.legalContext}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
              style={{
                backgroundColor: `${modeConfig.accentColor}20`,
                color: modeConfig.accentColor,
              }}
            >
              100% Cívico
            </span>
          </div>
        </section>

        {/* Selector Táctil de los 4 Modos (Ergonomía de 1 Pulgar) */}
        <section aria-label="Cambio Rápido de Modo">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Modos de Respuesta Inmediata
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MODES_CONFIG) as AppMode[]).map((key) => {
              const item = MODES_CONFIG[key];
              const isSelected = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  aria-pressed={isSelected}
                  className={`touch-target-min min-h-[56px] flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                    isSelected
                      ? "bg-gray-800/90 text-white font-bold ring-2 shadow-lg"
                      : "bg-gray-900/50 text-gray-300 hover:bg-gray-800/60 border-gray-800"
                  }`}
                  style={{
                    borderColor: isSelected ? item.accentColor : undefined,
                    boxShadow: isSelected ? `0 0 15px ${item.glowColor}` : undefined,
                  }}
                >
                  <AlzaBotAvatar mode={key} size="sm" showLivePulse={false} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-tight truncate">
                      {item.shortLabel}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {key === "standard"
                        ? "Cívico"
                        : key === "defender"
                        ? "Retén & SOS"
                        : key === "violet"
                        ? "Protección"
                        : "Comunitario"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Panel de Estado Cívico & Datos Antiespía (Demostración Zero-Peeping) */}
        <section
          aria-label="Datos de Ubicación y Protección"
          className="rounded-xl border border-gray-800 bg-gray-900/40 p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
            <span className="flex items-center gap-1.5 text-gray-200">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Ubicación Detectada (Medellín)
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded">
              GPS Listo
            </span>
          </div>

          <div className="bg-black/40 rounded-lg p-2.5 border border-gray-800/70 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Barrio / Comuna:</span>
              <span
                data-sensitive="true"
                className="font-bold text-white transition-all"
              >
                La Candelaria, Comuna 10
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Dirección Referencia:</span>
              <span
                data-sensitive="true"
                className="font-mono text-cyan-300 transition-all font-tabular"
              >
                Calle 53 # 50-20 (Parque Berrío)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Expediente AlzaVoz:</span>
              <span
                data-sensitive="true"
                className="font-mono text-amber-300 font-semibold"
              >
                ALZ-2026-MED-042
              </span>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 leading-tight">
            💡 <em>Modo Antiespía:</em> Activa el botón de ojo arriba para desenfocar estos datos en transporte público o lugares concurridos.
          </p>
        </section>

        {/* 4 Acciones de Alta Frecuencia / Alto Estrés (Fitts' Law >= 56px) */}
        <section
          aria-label="Acciones Directas de Urgencia"
          className="space-y-2"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1">
            Herramientas Rápidas
          </h2>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="#sos-panico"
              className="touch-target-min min-h-[64px] flex items-center gap-3 p-3 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/50 text-white transition active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <div className="w-10 h-10 rounded-lg bg-red-900/80 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-red-300 animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">SOS Policía 123</p>
                <p className="text-[10px] text-red-200">Alerta GPS en vivo</p>
              </div>
            </Link>

            <Link
              href="#defensor-reten"
              className="touch-target-min min-h-[64px] flex items-center gap-3 p-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/50 text-white transition active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-900/80 flex items-center justify-center shrink-0">
                <Scale className="w-6 h-6 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">Defensor Retén</p>
                <p className="text-[10px] text-amber-200">Art. 21 Ley 1801</p>
              </div>
            </Link>

            <Link
              href="#escudo-violeta"
              className="touch-target-min min-h-[64px] flex items-center gap-3 p-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/50 text-white transition active:scale-95 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-900/80 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6 text-purple-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">Escudo Violeta</p>
                <p className="text-[10px] text-purple-200">Línea 155 confidencial</p>
              </div>
            </Link>

            <Link
              href="#radar-comunitario"
              className="touch-target-min min-h-[64px] flex items-center gap-3 p-3 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/50 text-white transition active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-900/80 flex items-center justify-center shrink-0">
                <Radar className="w-6 h-6 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">Radar & Ruido</p>
                <p className="text-[10px] text-emerald-200">Sonómetro y alertas</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Línea Directa WhatsApp Concejal */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-900/60 border border-emerald-600/60 flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Canal WhatsApp Oficial</p>
              <p className="text-[11px] text-emerald-400 font-mono font-medium">
                +57 3234306794
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/573234306794?text=Hola%20AlzaBot%20necesito%20apoyo%20en%20Medellin"
            target="_blank"
            rel="noopener noreferrer"
            className="touch-target-min min-h-[44px] px-3 inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95"
          >
            Chatear
          </a>
        </section>
      </div>
    </AppShell>
  );
}
