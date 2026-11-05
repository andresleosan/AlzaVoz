"use client";

import { useState, useCallback, useTransition } from "react";
import Image from "next/image";
import {
  Scale,
  Car,
  Search,
  Sparkles,
  Camera,
  ShieldAlert,
  Wine,
  UserCheck,
  FileText,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { AlzaBotAvatar } from "@/components/AlzaBotAvatar";
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
      className={`space-y-4 ${className}`}
    >
      {/* Banner Principal del Defensor Legal */}
      <div className="relative rounded-2xl overflow-hidden border border-red-500/40 bg-[#111827] p-4 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <Image
            src="/assets/alzabot/bot-defender-scene.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="relative z-10 flex items-center gap-3.5">
          <AlzaBotAvatar mode="defender" size="lg" interactive showLivePulse />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 font-mono">
                Alza Bot Defensor Legal
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white truncate">
              Asistencia Jurídica en Vía Pública
            </h2>
            <p className="text-[11px] text-gray-300 leading-tight">
              Ley 769 (Tránsito), Ley 1801 (Policía - Art. 21) y Ley 2251 (Solo Latas).
            </p>
          </div>
        </div>
      </div>

      {/* Selector Táctil de Pestañas (Fitts' Law >= 56px) */}
      <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-gray-800">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(30);
            setActiveTab("consultor");
          }}
          aria-pressed={activeTab === "consultor"}
          className={`touch-target-min min-h-[56px] flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-bold transition active:scale-95 ${
            activeTab === "consultor"
              ? "bg-red-600 text-white shadow-lg shadow-red-900/50"
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
          className={`touch-target-min min-h-[56px] flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-bold transition active:scale-95 ${
            activeTab === "sololatas"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-900/50"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Choques &quot;Solo Latas&quot;</span>
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: CONSULTOR DE RETENES Y LEYES */}
      {activeTab === "consultor" && (
        <div className="space-y-4">
          {/* Buscador Rápido con IA DeepSeek */}
          <form
            onSubmit={handleCustomSearch}
            className="flex gap-2"
            aria-label="Buscar asesoría jurídica rápida"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="¿Qué te dice el policía o agente de tránsito?"
                aria-label="Pregunta sobre retén o procedimiento policial"
                className="w-full min-h-[52px] bg-gray-900/90 border border-gray-700 focus:border-red-500 rounded-xl px-3.5 pr-9 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition"
              />
              {userQuery && (
                <button
                  type="button"
                  onClick={() => setUserQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !userQuery.trim()}
              aria-label="Consultar a Alza Bot Defensor"
              className={`touch-target-min min-h-[52px] px-4 flex items-center justify-center rounded-xl font-bold text-xs transition active:scale-95 ${
                isLoading || !userQuery.trim()
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                  : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40"
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
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Casos Frecuentes en Vía Pública
              </h3>
              <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3" />
                Respuesta 0ms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LEGAL_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    aria-pressed={isSelected}
                    className={`touch-target-min min-h-[58px] flex items-center gap-2.5 p-3 rounded-xl border text-left transition active:scale-95 ${
                      isSelected
                        ? "bg-red-950/60 border-red-500/80 text-white ring-1 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                        : "bg-gray-900/50 border-gray-800 text-gray-300 hover:bg-gray-800/60"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-black/60 border border-gray-800 flex items-center justify-center shrink-0">
                      {renderPresetIcon(preset.iconName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate leading-tight">
                        {preset.label}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {preset.shortDescription}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Renderizado de Asesoría en los 3 Bloques Obligatorios */}
          {isLoading ? (
            <div className="rounded-2xl border border-red-500/40 bg-gray-900/60 p-8 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-sm font-bold text-white">
                Alza Bot analizando legislación colombiana...
              </p>
              <p className="text-xs text-gray-400">
                Estructurando Cita de Norma, Guion de Lectura y Checklist de Grabación.
              </p>
            </div>
          ) : (
            <LegalConsultationCard response={activeResponse} />
          )}

          {/* Tip de Contacto Directo */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-3 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              ¿Arbitrariedad grave en retén? Documenta y solicita personero.
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset(LEGAL_PRESETS[0])}
              className="text-red-400 hover:text-red-300 font-bold shrink-0 ml-2"
            >
              Ver Art. 21
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: ASISTENTE CHOQUES SOLO LATAS */}
      {activeTab === "sololatas" && <SoloLatasAssistant />}
    </section>
  );
}
