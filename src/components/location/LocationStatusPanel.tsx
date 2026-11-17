"use client";

import {
  AlertTriangle,
  Clock,
  Crosshair,
  PencilLine,
  ShieldCheck,
} from "lucide-react";
import type { LocationAssessment } from "@/lib/location/metadata";

interface LocationStatusPanelProps {
  assessment: LocationAssessment;
  isLoading: boolean;
  onOpenManualCorrection?: () => void;
  manualCorrectionButtonLabel?: string;
  showCoordinates?: { latitude: number; longitude: number } | null;
  testIdPrefix?: string;
  hideManualActionWhenAlreadyHealthy?: boolean;
}

export function LocationStatusPanel({
  assessment,
  isLoading,
  onOpenManualCorrection,
  manualCorrectionButtonLabel = "Corregir ubicación manualmente",
  showCoordinates = null,
  testIdPrefix = "location",
  hideManualActionWhenAlreadyHealthy = false,
}: LocationStatusPanelProps) {
  const badgeToneClass =
    isLoading
      ? "border-amber-500/60 bg-amber-950/70 text-amber-100"
      : assessment.freshness === "recent" && !assessment.isImprecise
      ? "border-emerald-500/60 bg-emerald-950/70 text-emerald-100"
      : assessment.freshness === "manual"
      ? "border-cyan-500/60 bg-cyan-950/70 text-cyan-100"
      : assessment.freshness === "stale" || assessment.isImprecise
      ? "border-amber-500/70 bg-amber-950/80 text-amber-100"
      : "border-red-500/60 bg-red-950/70 text-red-100";

  const showManualShortcut =
    Boolean(onOpenManualCorrection) &&
    (!hideManualActionWhenAlreadyHealthy || assessment.needsAttention);

  return (
    <div
      data-testid={`${testIdPrefix}-status-panel`}
      className="space-y-2.5 rounded-xl border border-gray-700 bg-[#0B0F19] p-3.5 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          data-testid={`${testIdPrefix}-freshness-badge`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeToneClass}`}
        >
          {assessment.freshness === "manual" ? (
            <PencilLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : assessment.freshness === "recent" && !assessment.isImprecise ? (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : assessment.needsAttention ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{isLoading ? "Consultando señal" : assessment.freshnessLabel}</span>
        </span>

        {assessment.obtainedAtLabel && (
          <span
            data-testid={`${testIdPrefix}-obtained-time`}
            className="font-tabular text-xs text-gray-200"
          >
            {assessment.freshness === "manual" ? "Actualizada:" : "Obtenida:"}{" "}
            <strong className="font-semibold text-white">
              {assessment.obtainedAtLabel}
            </strong>
            {assessment.relativeAgeLabel ? ` (${assessment.relativeAgeLabel})` : ""}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span
          data-testid={`${testIdPrefix}-precision-label`}
          className={`inline-flex items-center gap-1.5 font-medium ${
            assessment.isImprecise || assessment.isStale
              ? "text-amber-200"
              : "text-gray-200"
          }`}
        >
          <Crosshair className="h-3.5 w-3.5 shrink-0 text-gray-300" aria-hidden="true" />
          <span className="font-tabular">{assessment.precisionLabel}</span>
        </span>

        {showCoordinates && (
          <span className="text-xs text-gray-300">
            GPS:{" "}
            <span
              data-sensitive="true"
              className="font-tabular font-semibold text-white"
            >
              {showCoordinates.latitude.toFixed(4)}, {showCoordinates.longitude.toFixed(4)}
            </span>
          </span>
        )}
      </div>

      {assessment.warningMessages.length > 0 && (
        <div
          role="status"
          data-testid={`${testIdPrefix}-warnings`}
          className="space-y-1.5 rounded-lg border border-amber-500/60 bg-amber-950/40 p-2.5 text-xs leading-relaxed text-amber-100"
        >
          {assessment.warningMessages.map((msg) => (
            <p key={msg} className="flex items-start gap-2">
              <AlertTriangle
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300"
                aria-hidden="true"
              />
              <span>{msg}</span>
            </p>
          ))}
        </div>
      )}

      {showManualShortcut && onOpenManualCorrection && (
        <button
          type="button"
          data-testid={`${testIdPrefix}-shortcut-manual-btn`}
          onClick={onOpenManualCorrection}
          className="min-h-14 w-full rounded-xl border border-amber-400/60 bg-amber-950/40 px-3 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-900/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
        >
          {manualCorrectionButtonLabel}
        </button>
      )}
    </div>
  );
}
