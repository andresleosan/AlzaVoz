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
      className={`min-w-0 space-y-6 rounded-2xl border border-gray-800 bg-gray-900/40 p-4 text-white sm:p-6 ${className}`}
    >
      {/* Cabecera del Caso */}
      <div className="space-y-3">
        <h3 className="text-xl font-semibold leading-snug text-white">
          {response.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
          <span>{response.category.toUpperCase()}</span>
          <span>
            {response.source === "deepseek-ai" ? "Orientación con IA" : "Guía cívica de referencia"}
          </span>
        </div>
      </div>

      {/* BLOQUE 1: CITA DE NORMA EXACTA */}
      <section
        aria-label="Bloque 1: Cita de Norma Exacta"
        className="space-y-4 border-t border-gray-800 pt-6"
      >
        <div className="flex items-start gap-2 text-base font-semibold leading-relaxed text-white">
          <Scale className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
          <span>1. Cita de Norma Exacta (Sustento Jurídico)</span>
        </div>

        <div className="space-y-3">
          <p className="text-base font-semibold leading-relaxed text-amber-200">
            {response.lawCitation.lawNumber}
          </p>
          <p className="text-sm font-medium leading-relaxed text-gray-200">
            {response.lawCitation.article}
          </p>
          <p className="text-sm leading-relaxed text-gray-300">
            {response.lawCitation.summary}
          </p>
          {response.lawCitation.officialTextExcerpt && (
            <p className="text-sm italic leading-relaxed text-gray-400">
              {response.lawCitation.officialTextExcerpt}
            </p>
          )}
        </div>
      </section>

      {/* BLOQUE 2: GUION RESPETUOSO Y FIRME PARA LEER AL AGENTE */}
      <section
        aria-label="Bloque 2: Guion para Leer al Agente"
        className="space-y-4 border-t border-gray-800 pt-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-base font-semibold leading-relaxed text-white">
            <MessageSquareQuote className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
            <span>2. Guion para Leer al Agente / Policía</span>
          </div>
          <button
            type="button"
            onClick={handleCopyScript}
            aria-label="Copiar guion al portapapeles"
            className="touch-target-min flex shrink-0 items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            {copiedScript ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-gray-300" />
                <span>Copiar Guion</span>
              </>
            )}
          </button>
        </div>

        {/* Caja de Texto Gigante de Alta Legibilidad */}
        <div className="text-white">
          <p
            data-testid="agent-script-text"
            className="text-base font-medium leading-relaxed text-gray-100"
          >
            {response.agentScript.scriptText}
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm leading-relaxed text-gray-400">
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
        className="space-y-4 border-t border-gray-800 pt-6"
      >
        <div className="flex items-start gap-2 text-base font-semibold leading-relaxed text-white">
          <CheckSquare className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
          <span>3. Checklist de Pruebas a Grabar en Vivo</span>
        </div>

        <ul className="divide-y divide-gray-800">
          {response.evidenceChecklist.map((item) => {
            const isChecked = !!checkedItems[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleCheck(item.id)}
                  aria-pressed={isChecked}
                  className={`touch-target-min flex w-full items-start gap-3 rounded-lg px-1 py-4 text-left transition-colors ${
                    isChecked
                      ? "bg-emerald-950/30 text-emerald-200"
                      : "text-gray-300 hover:bg-gray-800/50"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 text-sm leading-relaxed">
                    <span className={isChecked ? "line-through opacity-80" : ""}>
                      {item.instruction}
                    </span>
                    {item.isMandatory && (
                      <span className="ml-2 text-xs font-semibold text-amber-300">
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
        <div className="flex items-start gap-3 border-t border-red-900 pt-6 text-sm leading-relaxed text-red-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div>
            <span className="font-semibold text-red-300">
              Advertencia Crucial:{" "}
            </span>
            {response.keyWarning}
          </div>
        </div>
      )}
    </article>
  );
}

