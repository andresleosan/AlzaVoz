"use client";

import { useState } from "react";
import {
  MapPin,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { type GeoLocationState } from "@/types/sos";
import { MEDELLIN_COMUNAS, type MedellinZone } from "@/utils/medellinGeo";
import { useAppMode } from "@/context/AppModeContext";

interface GiantLocationCardProps {
  location: GeoLocationState;
  onRefresh: () => void;
  onSelectZone: (zone: MedellinZone) => void;
  onCopyText: () => Promise<boolean>;
  copied: boolean;
}

export function GiantLocationCard({
  location,
  onRefresh,
  onSelectZone,
  onCopyText,
  copied,
}: GiantLocationCardProps) {
  const { triggerHaptic } = useAppMode();
  const [showZonePicker, setShowZonePicker] = useState<boolean>(false);

  const handleCopy = async () => {
    triggerHaptic(40);
    await onCopyText();
  };

  const handleRefresh = () => {
    triggerHaptic(30);
    onRefresh();
  };

  const handleZoneSelect = (zone: MedellinZone) => {
    triggerHaptic(35);
    onSelectZone(zone);
    setShowZonePicker(false);
  };

  const latStr = location.latitude ? location.latitude.toFixed(4) : "6.2486";
  const lonStr = location.longitude ? location.longitude.toFixed(4) : "-75.5670";

  return (
    <section
      aria-label="Ubicación GPS de Emergencia para el 123"
      className="relative rounded-2xl border-2 border-amber-500/80 bg-gradient-to-b from-gray-900 via-gray-950 to-black p-4 shadow-[0_0_25px_rgba(245,158,11,0.25)] space-y-3"
    >
      {/* Cabecera de Estado con Botón Refrescar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                location.status === "loading"
                  ? "bg-amber-400"
                  : location.status === "denied"
                  ? "bg-red-400"
                  : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                location.status === "loading"
                  ? "bg-amber-500"
                  : location.status === "denied"
                  ? "bg-red-500"
                  : "bg-emerald-500"
              }`}
            />
          </span>

          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            {location.status === "loading"
              ? "Sincronizando GPS..."
              : location.status === "denied"
              ? "GPS Denegado (Usando Comuna)"
              : "Ubicación en Tiempo Real"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={location.status === "loading"}
          aria-label="Actualizar señal GPS"
          className="touch-target-min min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-700 active:scale-95 transition"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              location.status === "loading" ? "animate-spin text-amber-400" : ""
            }`}
          />
        </button>
      </div>

      {/* Título de Instrucción Directa al Ciudadano Bajo Estrés */}
      <div className="bg-amber-950/40 border border-amber-600/40 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs font-semibold text-amber-200">
          Lee esto directamente al operador cuando marque el 123:
        </p>
      </div>

      {/* BLOQUE GIGANTE DE LECTURA (HIGH CONTRAST & TABULAR) */}
      <div className="bg-black/80 rounded-xl p-3.5 border border-gray-800 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Barrio / Comuna
            </span>
            <p
              data-sensitive="true"
              className="text-xl sm:text-2xl font-black text-white leading-tight transition-all"
            >
              {location.neighborhood}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-800/80">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            Dirección o Punto de Referencia
          </span>
          <p
            data-sensitive="true"
            className="text-lg sm:text-xl font-mono font-bold text-amber-300 leading-tight transition-all font-tabular"
          >
            {location.address}
          </p>
        </div>

        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs font-mono text-gray-400">
          <span>
            GPS:{" "}
            <span
              data-sensitive="true"
              className="text-gray-200 font-semibold font-tabular"
            >
              {latStr}, {lonStr}
            </span>
          </span>
          <span className="text-[11px] text-gray-500">
            Precisión: ±{location.accuracy ?? 15}m
          </span>
        </div>
      </div>

      {/* Acciones: Copiar Dirección y Selector de Comuna */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar dirección para dictar o enviar"
          className="touch-target-min min-h-[56px] flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm active:scale-95 transition shadow-lg shadow-amber-500/20"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-black stroke-[3]" />
              <span>¡Copiado al Portapapeles!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 text-black" />
              <span>Copiar Ubicación Exacta</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setShowZonePicker(!showZonePicker);
          }}
          aria-expanded={showZonePicker}
          aria-label="Cambiar comuna manualmente"
          className="touch-target-min min-h-[56px] px-3 flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-200 text-xs font-semibold active:scale-95 transition"
        >
          <span>Elegir Comuna</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              showZonePicker ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Selector Rápido de las 16 Comunas de Medellín (Desplegable si falla GPS) */}
      {showZonePicker && (
        <div
          role="region"
          aria-label="Listado de Comunas de Medellín"
          className="mt-2 rounded-xl border border-gray-800 bg-gray-950 p-2.5 space-y-2 max-h-56 overflow-y-auto"
        >
          <p className="text-[11px] text-gray-400 px-1 font-medium">
            Toca tu comuna si estás en un sótano o sin señal GPS:
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {MEDELLIN_COMUNAS.map((zone) => {
              const isCurrent = location.comunaNumber === zone.number;
              return (
                <button
                  key={zone.number}
                  type="button"
                  onClick={() => handleZoneSelect(zone)}
                  className={`touch-target-min min-h-[44px] p-2 text-left rounded-lg text-xs font-medium transition active:scale-95 ${
                    isCurrent
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/60 font-bold"
                      : "bg-gray-900/80 text-gray-300 hover:bg-gray-800 border border-gray-800/80"
                  }`}
                >
                  <p className="truncate">{zone.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {zone.popularName}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

