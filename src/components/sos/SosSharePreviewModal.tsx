"use client";

import { useState, useMemo } from "react";
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

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const previewMessage = useMemo(() => {
    return formatSosMessageWithPrecision({
      locationText: dictationText,
      neighborhood: location.neighborhood,
      comunaName: location.comunaName,
      lat: location.latitude,
      lon: location.longitude,
      precision,
      timestamp: location.timestamp || undefined,
    });
  }, [dictationText, location, precision]);

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
      data-testid="sos-share-preview-dialog"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl border border-red-900/60 bg-[#111827] text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-[#0B0F19] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/60 border border-red-800 text-red-400">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h2 id="share-preview-title" className="text-base font-bold text-white leading-tight">
                Vista previa de lo que se comparte
              </h2>
              <p className="text-xs text-gray-300">
                Verifica destinatarios y precisión antes de enviar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa sin enviar"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. Destinatarios */}
          <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <Users className="h-4 w-4 text-amber-400" />
                Destinatarios seleccionados ({selectedCount})
              </span>
              <span className="text-[11px] text-gray-400">Toca para incluir o retirar</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {availableRecipients.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  data-testid={`recipient-toggle-${rec.id}`}
                  onClick={() => toggleRecipient(rec.id)}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-lg border p-2.5 text-left transition ${
                    rec.selected
                      ? "border-amber-400/50 bg-amber-950/20 text-amber-100"
                      : "border-gray-800 bg-gray-900/50 text-gray-400 line-through opacity-70"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate text-white">{rec.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{rec.detail}</p>
                  </div>
                  {rec.selected ? (
                    <CheckSquare className="h-4 w-4 shrink-0 text-amber-400" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-gray-600" />
                  )}
                </button>
              ))}
            </div>
            {selectedCount === 0 && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Debes seleccionar al menos un destinatario para confirmar.
              </p>
            )}
          </div>

          {/* 2. Precisión de ubicación */}
          <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <MapPin className="h-4 w-4 text-red-400" />
                Precisión de ubicación a compartir
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                data-testid="precision-exact-btn"
                onClick={() => setPrecision("exact")}
                className={`min-h-14 rounded-xl border p-2 text-center flex flex-col items-center justify-center transition ${
                  precision === "exact"
                    ? "border-red-500 bg-red-950/40 text-red-200"
                    : "border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                <span className="text-xs font-bold">GPS Exacto</span>
                <span className="text-[10px] text-gray-300">Coordenadas y Maps</span>
              </button>

              <button
                type="button"
                data-testid="precision-approximate-btn"
                onClick={() => setPrecision("approximate")}
                className={`min-h-14 rounded-xl border p-2 text-center flex flex-col items-center justify-center transition ${
                  precision === "approximate"
                    ? "border-amber-400 bg-amber-950/40 text-amber-200"
                    : "border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                <span className="text-xs font-bold">Solo Barrio</span>
                <span className="text-[10px] text-gray-300">Sin coordenadas GPS</span>
              </button>

              <button
                type="button"
                data-testid="precision-none-btn"
                onClick={() => setPrecision("none")}
                className={`min-h-14 rounded-xl border p-2 text-center flex flex-col items-center justify-center transition ${
                  precision === "none"
                    ? "border-violet-500 bg-violet-950/40 text-violet-200"
                    : "border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                <span className="text-xs font-bold">Sin Ubicación</span>
                <span className="text-[10px] text-gray-300">Omitir paradero</span>
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
              className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-800 bg-black/60 p-2.5 font-sans text-xs text-gray-200 leading-relaxed"
            >
              {previewMessage}
            </pre>
          </div>
        </div>

        {/* Footer / Acciones tercio inferior (56px) */}
        <div className="border-t border-gray-800 bg-[#0B0F19] p-3.5 grid grid-cols-2 gap-3">
          <button
            type="button"
            data-testid="sos-preview-cancel-btn"
            onClick={onClose}
            className="min-h-14 flex items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm font-semibold text-gray-300 hover:bg-gray-800 active:scale-95 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            data-testid="sos-preview-confirm-btn"
            disabled={selectedCount === 0}
            onClick={handleConfirm}
            className="min-h-14 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition shadow-lg shadow-red-950/50"
          >
            <Send className="h-4 w-4" />
            <span>Confirmar y Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
