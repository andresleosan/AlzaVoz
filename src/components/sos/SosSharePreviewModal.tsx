"use client";

import { useState, useMemo, useRef } from "react";
import {
  X,
  Send,
  MapPin,
  Users,
  Eye,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import { type GeoLocationState, type TrustedContact } from "@/types/sos";
import { LocationPrecision, RecipientInfo } from "@/types/sharing";
import {
  formatSosMessageWithPrecision,
} from "@/lib/sharing/preview";
import { assessLocation } from "@/lib/location/metadata";
import { useNowTicker } from "@/hooks/useNowTicker";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { CIVIC_SUPPORT_CONTACT } from "@/hooks/useTrustedContacts";

interface SosSharePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: {
    text: string;
    recipients: RecipientInfo[];
    precision: LocationPrecision;
  }) => void;
  location: GeoLocationState;
  dictationText: string;
  contacts: TrustedContact[];
  mode: "whatsapp" | "broadcast";
}

export function SosSharePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  location,
  dictationText,
  contacts,
  mode,
}: SosSharePreviewModalProps) {
  const [precision, setPrecision] = useState<LocationPrecision>("exact");
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useDialogFocusTrap({
    isOpen,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  // Initial recipients
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      [CIVIC_SUPPORT_CONTACT.id]: true,
    };
    for (const c of contacts) {
      initial[c.id] = true;
    }
    if (mode === "broadcast") {
      initial["broadcast-all"] = true;
    }
    return initial;
  });

  const availableRecipients: RecipientInfo[] = useMemo(() => {
    const list: RecipientInfo[] = [
      {
        id: CIVIC_SUPPORT_CONTACT.id,
        name: CIVIC_SUPPORT_CONTACT.name,
        detail: CIVIC_SUPPORT_CONTACT.phone,
        category: "official",
        selected: Boolean(selectedRecipientIds[CIVIC_SUPPORT_CONTACT.id]),
      },
    ];

    for (const c of contacts) {
      list.push({
        id: c.id,
        name: c.name,
        detail: `${c.phone} (${c.relationship})`,
        category: "trusted",
        selected: Boolean(selectedRecipientIds[c.id]),
      });
    }

    if (mode === "broadcast") {
      list.push({
        id: "broadcast-all",
        name: "Difusión general (Redes y aplicaciones instaladas)",
        detail: "Compartir mediante el selector del sistema (Web Share API)",
        category: "broadcast",
        selected: Boolean(selectedRecipientIds["broadcast-all"]),
      });
    }

    return list;
  }, [contacts, mode, selectedRecipientIds]);

  const toggleRecipient = (rec: RecipientInfo) => {
    const nextSelected = !rec.selected;
    setSelectedRecipientIds((prev) => ({
      ...prev,
      [rec.id]: nextSelected,
    }));
    setLiveAnnouncement(
      nextSelected
        ? `${rec.name} incluido en la alerta.`
        : `${rec.name} retirado de la alerta.`
    );
  };

  const selectPrecision = (value: LocationPrecision, label: string) => {
    setPrecision(value);
    setLiveAnnouncement(`Precisión de ubicación cambiada a ${label}.`);
  };

  const now = useNowTicker(isOpen && location.timestamp !== null);
  const locationAssessment = useMemo(() => {
    return assessLocation({
      source: location.source,
      manualKind: location.manualKind,
      status: location.status,
      timestamp: location.timestamp,
      accuracy: location.accuracy,
      now,
    });
  }, [location, now]);

  const previewMessage = useMemo(() => {
    return formatSosMessageWithPrecision({
      locationText: dictationText,
      neighborhood: location.neighborhood,
      comunaName: location.comunaName,
      lat: location.latitude,
      lon: location.longitude,
      precision,
      timestamp: location.timestamp || undefined,
      accuracy: location.accuracy,
      source: location.source,
      manualKind: location.manualKind,
      status: location.status,
      now,
    });
  }, [dictationText, location, precision, now]);

  if (!isOpen) return null;

  const selectedCount = availableRecipients.filter((r) => r.selected).length;

  const handleConfirm = () => {
    const activeRecipients = availableRecipients.filter((r) => r.selected);
    onConfirm({
      text: previewMessage,
      recipients: activeRecipients,
      precision,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-preview-title"
      aria-describedby="share-preview-subtitle"
      data-testid="sos-share-preview-dialog"
      className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-2 sm:p-4"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-red-900/60 bg-[#111827] text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
      >
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-testid="sos-preview-live-status"
        >
          {liveAnnouncement}
        </div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-gray-800 bg-[#0B0F19] p-[16px]">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl bg-red-950/60 border border-red-800 text-red-400">
              <Eye className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="share-preview-title" className="text-base font-bold text-white leading-tight break-words">
                Vista previa de lo que se comparte
              </h2>
              <p id="share-preview-subtitle" className="text-xs text-gray-300">
                Verifica destinatarios y precisión antes de enviar
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa sin enviar"
            className="touch-target-min flex min-h-[56px] min-w-[56px] shrink-0 items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-[16px] space-y-4">
          {/* 1. Destinatarios */}
          <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <Users className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                <span>Destinatarios seleccionados ({selectedCount})</span>
              </span>
              <span className="text-xs text-gray-400">Toca para incluir o retirar</span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {availableRecipients.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  data-testid={`recipient-toggle-${rec.id}`}
                  aria-pressed={rec.selected}
                  onClick={() => toggleRecipient(rec)}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-lg border p-2.5 text-left transition ${
                    rec.selected
                      ? "border-amber-400/50 bg-amber-950/20 text-amber-100"
                      : "border-gray-800 bg-gray-900/50 text-gray-400 line-through opacity-70"
                  }`}
                >
                  <span className="block min-w-0 flex-1">
                    <span className="block text-xs font-semibold break-words text-white">{rec.name}</span>
                    <span className="block text-xs text-gray-400 break-words">{rec.detail}</span>
                  </span>
                  {rec.selected ? (
                    <CheckSquare className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-gray-600" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
            {selectedCount === 0 && (
              <p
                id="sos-preview-no-recipients-error"
                role="alert"
                className="text-xs text-red-400 flex items-center gap-1"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Debes seleccionar al menos un destinatario para confirmar.</span>
              </p>
            )}
          </div>

          {/* 2. Precisión de ubicación */}
          <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <MapPin className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                <span>Precisión de ubicación a compartir</span>
              </span>
            </div>

            <div
              data-testid="sos-preview-location-assessment"
              className={`rounded-lg border p-2.5 text-xs space-y-1 ${
                locationAssessment.needsAttention
                  ? "border-amber-500/60 bg-amber-950/30 text-amber-100"
                  : "border-gray-800 bg-gray-900/70 text-gray-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  {locationAssessment.freshnessLabel}
                </span>
                {locationAssessment.obtainedAtLabel && (
                  <span className="font-tabular text-gray-200">
                    {locationAssessment.obtainedAtLabel}
                    {locationAssessment.relativeAgeLabel
                      ? ` (${locationAssessment.relativeAgeLabel})`
                      : ""}
                  </span>
                )}
              </div>
              <p className="font-tabular text-gray-300">
                {locationAssessment.precisionLabel}
              </p>
              {locationAssessment.needsAttention && (
                <p className="text-xs leading-relaxed text-amber-200">
                  Si la señal es antigua, imprecisa o denegada, puedes cancelar y actualizar GPS o corregir la dirección manualmente antes de compartir.
                </p>
              )}
            </div>

            <div
              role="group"
              aria-label="Precisión de ubicación a compartir"
              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
            >
              <button
                type="button"
                data-testid="precision-exact-btn"
                aria-pressed={precision === "exact"}
                onClick={() => selectPrecision("exact", "GPS Exacto")}
                className={`min-h-[56px] rounded-xl border p-2 text-center flex flex-col items-center justify-center transition ${
                  precision === "exact"
                    ? "border-red-500 bg-red-950/40 text-red-200"
                    : "border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                <span className="text-xs font-bold">GPS Exacto</span>
                <span className="text-xs text-gray-300">Coordenadas y Maps</span>
              </button>

              <button
                type="button"
                data-testid="precision-approximate-btn"
                aria-pressed={precision === "approximate"}
                onClick={() => selectPrecision("approximate", "Solo Barrio")}
                className={`min-h-[56px] rounded-xl border p-2 text-center flex flex-col items-center justify-center transition ${
                  precision === "approximate"
                    ? "border-amber-400 bg-amber-950/40 text-amber-200"
                    : "border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                <span className="text-xs font-bold">Solo Barrio</span>
                <span className="text-xs text-gray-300">Sin coordenadas GPS</span>
              </button>

              <button
                type="button"
                data-testid="precision-none-btn"
                aria-pressed={precision === "none"}
                onClick={() => selectPrecision("none", "Sin Ubicación")}
                className={`min-h-[56px] rounded-xl border p-2 text-center flex flex-col items-center justify-center transition ${
                  precision === "none"
                    ? "border-violet-500 bg-violet-950/40 text-violet-200"
                    : "border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                <span className="text-xs font-bold">Sin Ubicación</span>
                <span className="text-xs text-gray-300">Omitir paradero</span>
              </button>
            </div>
          </div>

          {/* 3. Vista previa del mensaje (Payload en tiempo real) */}
          <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-3.5 space-y-1.5">
            <span className="text-xs font-semibold text-gray-300">
              Texto exacto que se preparará en el mensaje:
            </span>
            <pre
              data-testid="sos-preview-payload-text"
              data-sensitive="true"
              className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-gray-800 bg-black/60 p-2.5 font-sans text-xs text-gray-200 leading-relaxed"
            >
              {previewMessage}
            </pre>
          </div>
        </div>

        {/* Footer / Acciones tercio inferior (56px) */}
        <div className="border-t border-gray-800 bg-[#0B0F19] p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            data-testid="sos-preview-cancel-btn"
            onClick={onClose}
            className="touch-target-min min-h-[56px] flex items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800 active:scale-95 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            data-testid="sos-preview-confirm-btn"
            disabled={selectedCount === 0}
            aria-describedby={selectedCount === 0 ? "sos-preview-no-recipients-error" : undefined}
            onClick={handleConfirm}
            className="touch-target-min min-h-[56px] flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition shadow-lg shadow-red-950/50"
          >
            <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Confirmar y Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
