"use client";

import { useState, useCallback, useTransition } from "react";
import {
  Scale,
  Car,
  Search,
  Camera,
  ShieldAlert,
  Wine,
  UserCheck,
  FileText,
  Loader2,
  HelpCircle,
  X,
} from "lucide-react";
import { LegalConsultationCard } from "@/components/defender/LegalConsultationCard";
import { SoloLatasAssistant } from "@/components/defender/SoloLatasAssistant";
import { LEGAL_PRESETS, LEGAL_RESPONSES_REPOSITORY, findLocalLegalResponse } from "@/data/legalKnowledgeBase";
import { type LegalResponse, type LegalPreset } from "@/types/defender";
import { useAppMode } from "@/context/AppModeContext";

interface LegalDefenderPanelProps {
  initialPresetId?: string;
  className?: string;
}

export function LegalDefenderPanel({
  initialPresetId = "preset-grabar-policia",
  className = "",
}: LegalDefenderPanelProps) {
  const { triggerHaptic } = useAppMode();
  const [activeTab, setActiveTab] = useState<"consultor" | "sololatas">("consultor");
  const [userQuery, setUserQuery] = useState("");
  const [activeResponse, setActiveResponse] = useState<LegalResponse>(
    LEGAL_RESPONSES_REPOSITORY[initialPresetId] || LEGAL_RESPONSES_REPOSITORY["preset-grabar-policia"]
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId);
  const [prevPresetId, setPrevPresetId] = useState(initialPresetId);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Sincronizar preset inicial si cambia por navegación externa
  if (initialPresetId !== prevPresetId) {
    setPrevPresetId(initialPresetId);
    if (initialPresetId && LEGAL_RESPONSES_REPOSITORY[initialPresetId]) {
      setActiveResponse(LEGAL_RESPONSES_REPOSITORY[initialPresetId]);
      setSelectedPresetId(initialPresetId);
    }
  }

  // Mapeo dinámico de iconos para los presets
  const renderPresetIcon = (iconName: LegalPreset["iconName"]) => {
    switch (iconName) {
      case "Camera":
        return <Camera className="w-5 h-5 text-amber-400 shrink-0" />;
      case "Car":
        return <Car className="w-5 h-5 text-red-400 shrink-0" />;
      case "FileText":
        return <FileText className="w-5 h-5 text-emerald-400 shrink-0" />;
      case "Wine":
        return <Wine className="w-5 h-5 text-purple-400 shrink-0" />;
      case "UserCheck":
        return <UserCheck className="w-5 h-5 text-cyan-400 shrink-0" />;
      case "ShieldAlert":
      default:
        return <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />;
    }
  };

  const handleSelectPreset = useCallback(
    async (preset: LegalPreset) => {
      triggerHaptic(30);
      setSelectedPresetId(preset.id);
      setUserQuery("");

      // Cargar de inmediato desde repositorio local certificado (0ms de latencia bajo estrés)
      const localDirect = LEGAL_RESPONSES_REPOSITORY[preset.id];
      if (localDirect) {
        setActiveResponse(localDirect);
        return;
      }

      // Si no existe, invocar la API
      setIsLoading(true);
      try {
        const res = await fetch("/api/defender/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presetId: preset.id }),
        });
        if (res.ok) {
          const data = (await res.json()) as LegalResponse;
          startTransition(() => setActiveResponse(data));
        } else {
          setActiveResponse(findLocalLegalResponse(preset.query));
        }
      } catch {
        setActiveResponse(findLocalLegalResponse(preset.query));
      } finally {
        setIsLoading(false);
      }
    },
    [triggerHaptic]
  );

  const handleCustomSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = userQuery.trim();
      if (!trimmed) return;

      triggerHaptic(40);
      setSelectedPresetId("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/defender/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });

        if (res.ok) {
          const data = (await res.json()) as LegalResponse;
          startTransition(() => setActiveResponse(data));
        } else {
          setActiveResponse(findLocalLegalResponse(trimmed));
        }
      } catch {
        setActiveResponse(findLocalLegalResponse(trimmed));
      } finally {
        setIsLoading(false);
      }
    },
    [userQuery, triggerHaptic]
  );



  return (
    <section
      aria-label="Defensor Legal en Vivo y Choques Solo Latas"
      className={`space-y-6 ${className}`}
    >
      {/* Banner Principal del Defensor Legal */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Asistencia Jurídica en Vía Pública
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
          Ley 769 (Tránsito), Ley 1801 (Policía - Art. 21) y Ley 2251 (Solo Latas).
        </p>
      </div>

      {/* Selector Táctil de Pestañas (Fitts' Law >= 56px) */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-gray-900/50 p-1.5 sm:max-w-lg">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(30);
            setActiveTab("consultor");
          }}
          aria-pressed={activeTab === "consultor"}
          className={`touch-target-min flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            activeTab === "consultor"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Consultor Retenes</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(30);
            setActiveTab("sololatas");
          }}
          aria-pressed={activeTab === "sololatas"}
          className={`touch-target-min flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            activeTab === "sololatas"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Choques &quot;Solo Latas&quot;</span>
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: CONSULTOR DE RETENES Y LEYES */}
      {activeTab === "consultor" && (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="min-w-0 space-y-6">
            {/* Buscador Rápido con IA DeepSeek */}
            <form
              onSubmit={handleCustomSearch}
              className="flex gap-2"
              aria-label="Buscar asesoría jurídica rápida"
            >
              <div className="relative min-w-0 flex-1">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="¿Qué te dice el policía o agente de tránsito?"
                  aria-label="Pregunta sobre retén o procedimiento policial"
                  className="min-h-14 w-full rounded-xl border border-gray-700 bg-gray-900 px-3.5 pr-12 text-base text-white placeholder-gray-400 focus:border-red-400 focus:outline-none"
                />
                {userQuery && (
                  <button
                    type="button"
                    onClick={() => setUserQuery("")}
                    aria-label="Borrar la pregunta"
                    className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !userQuery.trim()}
                aria-label="Consultar a Alza Bot Defensor"
                className={`touch-target-min flex items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors ${
                  isLoading || !userQuery.trim()
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                    : "bg-red-700 text-white hover:bg-red-600"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </form>

            {/* Presets Rápidos de 1 Toque (Ergonomía de Alto Estrés) */}
            <section aria-label="Casos Rápidos de Retén">
              <div className="mb-3">
                <h3 className="text-base font-semibold text-white">
                  Casos Frecuentes en Vía Pública
                </h3>
              </div>

              <div className="grid gap-2">
                {LEGAL_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      aria-pressed={isSelected}
                      className={`touch-target-min flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-red-500/70 bg-red-950/30 text-white"
                          : "bg-gray-900/50 border-gray-800 text-gray-300 hover:bg-gray-800/60"
                      }`}
                    >
                      <div className="flex w-6 shrink-0 items-center justify-center">
                        {renderPresetIcon(preset.iconName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">
                          {preset.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-400">
                          {preset.shortDescription}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="min-w-0 space-y-6">
            {/* Renderizado de Asesoría en los 3 Bloques Obligatorios */}
            {isLoading ? (
              <div className="rounded-2xl border border-red-500/40 bg-gray-900/60 p-8 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                <p className="text-sm font-bold text-white">
                  Alza Bot analizando legislación colombiana...
                </p>
                <p className="text-sm leading-relaxed text-gray-400">
                  Estructurando Cita de Norma, Guion de Lectura y Checklist de Grabación.
                </p>
              </div>
            ) : (
              <LegalConsultationCard response={activeResponse} />
            )}

            {/* Tip de Contacto Directo */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 pt-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                ¿Arbitrariedad grave en retén? Documenta y solicita personero.
              </span>
              <button
                type="button"
                onClick={() => handleSelectPreset(LEGAL_PRESETS[0])}
                className="min-h-14 shrink-0 rounded-lg px-3 font-semibold text-red-400 hover:bg-gray-900 hover:text-red-300"
              >
                Ver Art. 21
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: ASISTENTE CHOQUES SOLO LATAS */}
      {activeTab === "sololatas" && <SoloLatasAssistant />}
    </section>
  );
}
