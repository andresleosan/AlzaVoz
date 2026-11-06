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

  const hasGps = location.source === "gps" && location.latitude !== null && location.longitude !== null;
  const statusText = location.status === "loading"
    ? "Sincronizando GPS..."
    : location.source === "manual"
    ? "Zona elegida manualmente"
    : hasGps
    ? "Ubicación GPS aproximada"
    : location.status === "denied"
    ? "Permiso de ubicación denegado"
    : "Ubicación sin confirmar";

  return (
    <section
      aria-label="Ubicación GPS de Emergencia para el 123"
      className="min-w-0 space-y-5 rounded-2xl border border-gray-700 bg-gray-900/50 p-4 sm:p-5"
    >
      {/* Cabecera de Estado con Botón Refrescar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-2 w-2 shrink-0">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                location.status === "loading"
                  ? "bg-amber-500"
                  : hasGps
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }`}
            />
          </span>

          <span className="text-sm font-medium leading-relaxed text-gray-300">
            {statusText}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={location.status === "loading"}
          aria-label="Actualizar señal GPS"
          className="touch-target-min flex shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              location.status === "loading" ? "animate-spin text-amber-400" : ""
            }`}
          />
        </button>
      </div>

      {/* Título de Instrucción Directa al Ciudadano Bajo Estrés */}
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-sm font-medium leading-relaxed text-gray-300">
          Confirma tu dirección o un punto cercano con el operador del 123.
        </p>
      </div>

      {/* BLOQUE GIGANTE DE LECTURA (HIGH CONTRAST & TABULAR) */}
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-sm text-gray-400">
              Barrio / Comuna
            </span>
            <p
              data-sensitive="true"
              className="mt-1 break-words text-2xl font-semibold leading-snug text-white"
            >
              {location.neighborhood}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <span className="text-sm text-gray-400">
            {hasGps ? "Dirección aproximada del mapa" : "Dirección"}
          </span>
          <p
            data-sensitive="true"
            className="mt-1 break-words text-xl font-semibold leading-relaxed text-white"
          >
            {location.address}
          </p>
        </div>

        {hasGps && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-4 text-sm text-gray-400">
          <span>
            GPS:{" "}
            <span
              data-sensitive="true"
              className="text-gray-200 font-semibold font-tabular"
            >
              {location.latitude!.toFixed(4)}, {location.longitude!.toFixed(4)}
            </span>
          </span>
          {location.accuracy !== null && <span className="text-sm text-gray-400">
            Precisión: ±{Math.round(location.accuracy)}m
          </span>}
        </div>}
        {location.errorMessage && <p className="text-sm leading-relaxed text-amber-300">{location.errorMessage}. Puedes elegir una comuna como referencia.</p>}
      </div>

      {/* Acciones: Copiar Dirección y Selector de Comuna */}
      <div className="grid gap-2 pt-1">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar dirección para dictar o enviar"
          className="touch-target-min flex items-center justify-center gap-2 rounded-xl bg-gray-200 px-3 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-white"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-black stroke-[3]" />
              <span>¡Copiado al Portapapeles!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 text-black" />
              <span>Copiar información de ubicación</span>
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
          className="touch-target-min flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
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
          className="max-h-72 space-y-3 overflow-y-auto border-t border-gray-700 pt-4"
        >
          <p className="text-sm leading-relaxed text-gray-400">
            Toca tu comuna si estás en un sótano o sin señal GPS:
          </p>
          <div className="grid gap-2">
            {MEDELLIN_COMUNAS.map((zone) => {
              const isCurrent = location.comunaNumber === zone.number;
              return (
                <button
                  key={zone.number}
                  type="button"
                  onClick={() => handleZoneSelect(zone)}
                  className={`touch-target-min rounded-lg p-3 text-left text-sm font-medium transition-colors ${
                    isCurrent
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/60 font-bold"
                      : "bg-gray-900/80 text-gray-300 hover:bg-gray-800 border border-gray-800/80"
                  }`}
                >
                  <p>{zone.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">
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

