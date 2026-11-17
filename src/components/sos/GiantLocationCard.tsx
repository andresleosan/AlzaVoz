"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  PencilLine,
} from "lucide-react";
import {
  type GeoLocationState,
  type ManualLocationCorrection,
} from "@/types/sos";
import { MEDELLIN_COMUNAS, type MedellinZone } from "@/utils/medellinGeo";
import { REPORT_COMMUNES, RESERVED_COMMUNE } from "@/lib/report/contracts";
import { assessLocation } from "@/lib/location/metadata";
import { useNowTicker } from "@/hooks/useNowTicker";
import { LocationStatusPanel } from "@/components/location/LocationStatusPanel";
import { useAppMode } from "@/context/AppModeContext";
import { SHARED_SESSION_CLEAR_EVENT } from "@/context/SharedDeviceContext";

interface GiantLocationCardProps {
  location: GeoLocationState;
  onRefresh: () => void;
  onSelectZone: (zone: MedellinZone) => void;
  onManualCorrection: (correction: ManualLocationCorrection) => void;
  onCopyText: () => Promise<boolean>;
  copied: boolean;
}

const SOS_COMMUNE_OPTIONS = REPORT_COMMUNES.filter((c) => c !== RESERVED_COMMUNE);

export function GiantLocationCard({
  location,
  onRefresh,
  onSelectZone,
  onManualCorrection,
  onCopyText,
  copied,
}: GiantLocationCardProps) {
  const { triggerHaptic } = useAppMode();
  const [showZonePicker, setShowZonePicker] = useState<boolean>(false);
  const [showManualEditor, setShowManualEditor] = useState<boolean>(false);
  const [manualCommune, setManualCommune] = useState<string>("");
  const [manualNeighborhood, setManualNeighborhood] = useState<string>("");
  const [manualAddress, setManualAddress] = useState<string>("");
  const [manualError, setManualError] = useState<string | null>(null);

  const now = useNowTicker(location.timestamp !== null);
  const assessment = assessLocation({
    source: location.source,
    manualKind: location.manualKind,
    status: location.status,
    timestamp: location.timestamp,
    accuracy: location.accuracy,
    now,
  });

  useEffect(() => {
    const clearEditor = () => {
      setShowZonePicker(false);
      setShowManualEditor(false);
      setManualCommune("");
      setManualNeighborhood("");
      setManualAddress("");
      setManualError(null);
    };
    window.addEventListener("alzavoz:escape", clearEditor);
    window.addEventListener(SHARED_SESSION_CLEAR_EVENT, clearEditor);
    return () => {
      window.removeEventListener("alzavoz:escape", clearEditor);
      window.removeEventListener(SHARED_SESSION_CLEAR_EVENT, clearEditor);
    };
  }, []);

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
    setShowManualEditor(false);
  };

  const openManualEditor = () => {
    triggerHaptic(25);
    setShowZonePicker(false);
    setManualCommune(location.comunaName || "");
    setManualNeighborhood(
      location.neighborhood !== "Ubicación sin confirmar" &&
        location.neighborhood !== "Barrio sin confirmar" &&
        location.neighborhood !== "Referencia manual"
        ? location.neighborhood
        : ""
    );
    setManualAddress(
      location.address !== "Dirección exacta sin confirmar"
        ? location.address
        : ""
    );
    setManualError(null);
    setShowManualEditor(true);
  };

  const handleSaveManualCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCommune && !manualNeighborhood.trim() && !manualAddress.trim()) {
      setManualError(
        "Escribe una dirección, un barrio o elige una comuna para corregir tu ubicación."
      );
      return;
    }
    const matchedZone = MEDELLIN_COMUNAS.find((z) => z.name === manualCommune);
    triggerHaptic(40);
    onManualCorrection({
      communeName: manualCommune,
      communeNumber: matchedZone?.number ?? null,
      neighborhood: manualNeighborhood,
      address: manualAddress,
    });
    setManualError(null);
    setShowManualEditor(false);
  };

  const hasGps =
    location.source === "gps" &&
    location.latitude !== null &&
    location.longitude !== null;
  const statusText =
    location.status === "loading"
      ? "Sincronizando GPS..."
      : location.source === "manual" && location.manualKind === "corrected"
      ? "Ubicación corregida manualmente"
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
                  : hasGps && !assessment.isStale && !assessment.isImprecise
                  ? "bg-emerald-500"
                  : location.source === "manual"
                  ? "bg-cyan-400"
                  : "bg-amber-500"
              }`}
            />
          </span>

          <span className="text-sm font-medium leading-relaxed text-gray-200">
            {statusText}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={location.status === "loading"}
          aria-label="Actualizar señal GPS"
          className="touch-target-min flex shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-200 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
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
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm font-medium leading-relaxed text-gray-200">
          Confirma tu dirección o un punto cercano con el operador del 123.
        </p>
      </div>

      {/* Estado de frescura, hora exacta, edad y precisión aproximada (T17 / I007) */}
      <LocationStatusPanel
        assessment={assessment}
        isLoading={location.status === "loading"}
        onOpenManualCorrection={openManualEditor}
        manualCorrectionButtonLabel="Corregir ubicación manualmente"
        showCoordinates={
          hasGps
            ? { latitude: location.latitude!, longitude: location.longitude! }
            : null
        }
        testIdPrefix="sos-location"
        hideManualActionWhenAlreadyHealthy
      />

      {/* BLOQUE GIGANTE DE LECTURA (HIGH CONTRAST & TABULAR) */}
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-sm text-gray-300">
              Barrio / Comuna
            </span>
            <p
              data-sensitive="true"
              className="mt-1 break-words text-2xl font-semibold leading-snug text-white"
            >
              {location.neighborhood}
            </p>
            {location.comunaName && (
              <p className="mt-0.5 text-xs text-gray-300">
                {location.comunaName}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <span className="text-sm text-gray-300">
            {location.source === "manual" && location.manualKind === "corrected"
              ? "Dirección o punto de referencia corregido"
              : hasGps
              ? "Dirección aproximada del mapa"
              : "Dirección"}
          </span>
          <p
            data-sensitive="true"
            className="mt-1 break-words text-xl font-semibold leading-relaxed text-white"
          >
            {location.address}
          </p>
        </div>

        {location.errorMessage && location.status === "error" && (
          <p className="text-sm leading-relaxed text-amber-200">
            {location.errorMessage}. Puedes corregir tu dirección o elegir una comuna como referencia.
          </p>
        )}
      </div>

      {/* Acciones: Copiar Dirección, Corregir Manualmente y Selector de Comuna */}
      <div className="grid gap-2.5 pt-1">
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            data-testid="sos-manual-correction-toggle"
            onClick={() => {
              if (showManualEditor) {
                setShowManualEditor(false);
              } else {
                openManualEditor();
              }
            }}
            aria-expanded={showManualEditor}
            aria-label="Corregir ubicación o dirección manualmente"
            className="touch-target-min flex items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-950/30 px-3 py-3 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-900/40"
          >
            <PencilLine className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Corregir ubicación</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              setShowManualEditor(false);
              setShowZonePicker(!showZonePicker);
            }}
            aria-expanded={showZonePicker}
            aria-label="Cambiar comuna manualmente"
            className="touch-target-min flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-3 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
          >
            <span>Elegir Comuna</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                showZonePicker ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Editor inline de corrección manual (T17 / I007) */}
      {showManualEditor && (
        <form
          onSubmit={handleSaveManualCorrection}
          data-testid="sos-manual-correction-form"
          aria-label="Corrección manual de ubicación"
          className="space-y-3.5 rounded-xl border border-amber-500/50 bg-[#0B0F19] p-4"
        >
          <div>
            <h3 className="text-sm font-bold text-white">
              Corregir ubicación manualmente
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-300">
              Reemplaza una señal GPS antigua, imprecisa o bloqueada. No enviaremos coordenadas GPS anteriores mientras uses esta referencia.
            </p>
          </div>

          {manualError && (
            <p role="alert" className="rounded-lg border border-red-500/60 bg-red-950/60 p-2.5 text-xs text-red-100">
              {manualError}
            </p>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="sos-manual-commune"
              className="block text-xs font-semibold text-gray-200"
            >
              Comuna o corregimiento (opcional)
            </label>
            <select
              id="sos-manual-commune"
              value={manualCommune}
              onChange={(e) => setManualCommune(e.target.value)}
              className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white"
            >
              <option value="">Sin especificar comuna</option>
              {SOS_COMMUNE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sos-manual-neighborhood"
              className="block text-xs font-semibold text-gray-200"
            >
              Barrio o sector (opcional)
            </label>
            <input
              id="sos-manual-neighborhood"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={120}
              value={manualNeighborhood}
              onChange={(e) => setManualNeighborhood(e.target.value)}
              placeholder="Ej: Provenza / Parque Lleras"
              className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white placeholder-gray-400"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sos-manual-address"
              className="block text-xs font-semibold text-gray-200"
            >
              Dirección exacta o punto de referencia
            </label>
            <input
              id="sos-manual-address"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={160}
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Ej: Calle 10 con Cra 43A, frente a estación o CAI"
              className="min-h-14 w-full rounded-xl border border-gray-600 bg-gray-950 px-3 text-sm text-white placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              data-testid="sos-manual-correction-cancel"
              onClick={() => setShowManualEditor(false)}
              className="min-h-14 rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm font-semibold text-gray-200 hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="sos-manual-correction-save"
              className="min-h-14 rounded-xl bg-amber-500 px-3 text-sm font-bold text-gray-950 hover:bg-amber-400"
            >
              Guardar corrección
            </button>
          </div>
        </form>
      )}

      {/* Selector Rápido de las 16 Comunas de Medellín (Desplegable si falla GPS) */}
      {showZonePicker && (
        <div
          role="region"
          aria-label="Listado de Comunas de Medellín"
          className="max-h-72 space-y-3 overflow-y-auto border-t border-gray-700 pt-4"
        >
          <p className="text-sm leading-relaxed text-gray-300">
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
                      : "bg-gray-900/80 text-gray-200 hover:bg-gray-800 border border-gray-800/80"
                  }`}
                >
                  <p>{zone.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-300">
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

