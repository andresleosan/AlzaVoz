"use client";

import { useState, useCallback } from "react";
import {
  Scale,
  MessageSquareQuote,
  CheckSquare,
  Square,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { type LegalResponse } from "@/types/defender";
import { useAppMode } from "@/context/AppModeContext";

interface LegalConsultationCardProps {
  response: LegalResponse;
  className?: string;
}

export function LegalConsultationCard({
  response,
  className = "",
}: LegalConsultationCardProps) {
  const { triggerHaptic } = useAppMode();
  const [copiedScript, setCopiedScript] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const handleCopyScript = useCallback(async () => {
    triggerHaptic(40);
    try {
      await navigator.clipboard.writeText(response.agentScript.scriptText);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      // Fallback si no hay clipboard api disponible
    }
  }, [response.agentScript.scriptText, triggerHaptic]);

  const toggleCheck = useCallback(
    (id: string) => {
      triggerHaptic(30);
      setCheckedItems((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    },
    [triggerHaptic]
  );

  return (
    <article
      aria-label={`Asesoría Jurídica: ${response.title}`}
      className={`rounded-2xl border border-red-500/40 bg-gray-900/90 shadow-[0_0_25px_rgba(239,68,68,0.25)] p-4 sm:p-5 space-y-4 text-white transition-all ${className}`}
    >
      {/* Cabecera del Caso */}
      <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-700/60">
              {response.category.toUpperCase()}
            </span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {response.source === "deepseek-ai" ? "IA DeepSeek Jurídica" : "Base Cívica Certificada"}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
            {response.title}
          </h3>
        </div>
      </div>

      {/* BLOQUE 1: CITA DE NORMA EXACTA */}
      <section
        aria-label="Bloque 1: Cita de Norma Exacta"
        className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-2"
      >
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
          <Scale className="w-4 h-4 shrink-0 text-amber-400" />
          <span>1. Cita de Norma Exacta (Sustento Jurídico)</span>
        </div>

        <div className="space-y-1.5 pl-6 border-l-2 border-amber-500/50">
          <p className="text-xs sm:text-sm font-bold text-amber-200">
            {response.lawCitation.lawNumber}
          </p>
          <p className="text-xs font-semibold text-amber-300/90 font-mono">
            {response.lawCitation.article}
          </p>
          <p className="text-xs text-gray-300 leading-relaxed">
            {response.lawCitation.summary}
          </p>
          {response.lawCitation.officialTextExcerpt && (
            <p className="text-[11px] text-gray-400 italic bg-black/40 p-2 rounded border border-gray-800/80">
              {response.lawCitation.officialTextExcerpt}
            </p>
          )}
        </div>
      </section>

      {/* BLOQUE 2: GUION RESPETUOSO Y FIRME PARA LEER AL AGENTE */}
      <section
        aria-label="Bloque 2: Guion para Leer al Agente"
        className="rounded-xl border border-red-500/40 bg-red-950/20 p-3.5 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wide">
            <MessageSquareQuote className="w-4 h-4 shrink-0 text-red-400" />
            <span>2. Guion para Leer al Agente / Policía</span>
          </div>
          <button
            type="button"
            onClick={handleCopyScript}
            aria-label="Copiar guion al portapapeles"
            className="touch-target-min min-h-[44px] px-3 flex items-center gap-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-500/50 text-white text-xs font-semibold active:scale-95 transition"
          >
            {copiedScript ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-red-300" />
                <span>Copiar Guion</span>
              </>
            )}
          </button>
        </div>

        {/* Caja de Texto Gigante de Alta Legibilidad */}
        <div className="bg-black/60 rounded-xl p-3.5 border border-red-500/30 text-white shadow-inner">
          <p
            data-testid="agent-script-text"
            className="text-sm sm:text-base font-semibold leading-relaxed text-gray-100 selection:bg-red-500"
          >
            {response.agentScript.scriptText}
          </p>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-gray-400 bg-gray-900/60 p-2 rounded-lg border border-gray-800">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-gray-300">Consejo de Tono: </span>
            {response.agentScript.toneAdvice}
          </div>
        </div>
      </section>

      {/* BLOQUE 3: CHECKLIST DE PRUEBAS A GRABAR */}
      <section
        aria-label="Bloque 3: Checklist de Pruebas a Grabar"
        className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 space-y-3"
      >
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
          <CheckSquare className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>3. Checklist de Pruebas a Grabar en Vivo</span>
        </div>

        <ul className="space-y-2">
          {response.evidenceChecklist.map((item) => {
            const isChecked = !!checkedItems[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleCheck(item.id)}
                  aria-pressed={isChecked}
                  className={`touch-target-min min-h-[48px] w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition active:scale-[0.99] border ${
                    isChecked
                      ? "bg-emerald-900/40 border-emerald-500/60 text-emerald-200"
                      : "bg-black/40 border-gray-800 text-gray-300 hover:bg-gray-800/50"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-500" />
                    )}
                  </span>
                  <div className="flex-1 text-xs sm:text-sm">
                    <span className={isChecked ? "line-through opacity-80" : ""}>
                      {item.instruction}
                    </span>
                    {item.isMandatory && (
                      <span className="ml-2 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        [Vital]
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Alerta Preventiva Clave */}
      {response.keyWarning && (
        <div className="rounded-xl bg-red-950/60 border border-red-600/70 p-3 flex items-start gap-2.5 text-xs text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <span className="font-bold uppercase tracking-wider text-red-300">
              Advertencia Crucial:{" "}
            </span>
            {response.keyWarning}
          </div>
        </div>
      )}
    </article>
  );
}

