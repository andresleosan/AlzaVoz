"use client";

import { useState } from "react";
import {
  ShieldAlert,
  MessageCircle,
  Share2,
  Volume2,
  Check,
} from "lucide-react";
import { useEmergencyLocation } from "@/hooks/useEmergencyLocation";
import { useTrustedContacts } from "@/hooks/useTrustedContacts";
import { GiantLocationCard } from "@/components/sos/GiantLocationCard";
import { EmergencyDialerGrid } from "@/components/sos/EmergencyDialerGrid";
import { TrustedContactsCard } from "@/components/sos/TrustedContactsCard";
import { useAppMode } from "@/context/AppModeContext";

export function SosEmergencyPanel() {
  const { triggerHaptic } = useAppMode();
  const {
    location,
    refreshLocation,
    setManualZone,
    copyLocationText,
    copied,
  } = useEmergencyLocation();

  const {
    contacts,
    addContact,
    removeContact,
    getWhatsAppLink,
    formatWhatsAppMessage,
  } = useTrustedContacts();

  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  // Formato para mensaje de WhatsApp
  const rawLocationText = `${location.neighborhood} (${location.address})`;
  const officialWaUrl = getWhatsAppLink(
    "+573234306794",
    rawLocationText,
    location.latitude,
    location.longitude
  );

  const handleShareBroadcast = async () => {
    triggerHaptic(50);
    const textMsg = formatWhatsAppMessage(
      rawLocationText,
      location.latitude,
      location.longitude,
      Date.now()
    );

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "🚨 ALERTA SOS ALZAVOZ MEDELLÍN",
          text: textMsg,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
        return;
      } catch {
        // Usuario canceló compartir o no soportado
      }
    }

    // Fallback: abrir WhatsApp directo al canal oficial
    window.open(officialWaUrl, "_blank", "noopener,noreferrer");
  };

  const handleMainSosCall = () => {
    triggerHaptic(100);
  };

  return (
    <div className="grid w-full items-start gap-8 pb-8 lg:grid-cols-2">
      <div className="min-w-0 space-y-6">
        {/* 1. BOTÓN DE PÁNICO HERO (UX BAJO ESTRÉS - FITTS' LAW) */}
        <section
          aria-label="Botón de Pánico Principal"
          className="flex flex-col items-center justify-center rounded-2xl border border-red-900 bg-red-950/30 p-6 text-center"
        >
          <div className="flex flex-col items-center">
            <h1 className="mb-4 text-2xl font-semibold text-white">Emergencia SOS</h1>

            {/* Gran Pulsador Circular de Pánico (Touch Target > 140px) */}
            <div className="relative my-2">
              <a
                href="tel:123"
                onClick={handleMainSosCall}
                aria-label="Llamar a Emergencias Policía 123 ahora"
                className="touch-target-min flex h-36 w-36 flex-col items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:bg-red-700"
              >
                <ShieldAlert className="h-10 w-10 text-white" />
                <span className="text-2xl font-bold text-white">
                  SOS 123
                </span>
                <span className="text-xs font-medium text-red-100">
                  Tocar para Llamar
                </span>
              </a>
            </div>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-red-100">
              Marca sin costo a la Policía y Central de Emergencias de Medellín.
            </p>
          </div>
        </section>

        {/* 2. BOTONES DE ACCIÓN RÁPIDA: ALERTA SILENCIOSA WHATSAPP */}
        <section
          aria-label="Alerta Silenciosa por WhatsApp"
          className="grid gap-3"
        >
          <a
            href={officialWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => triggerHaptic(50)}
            className="touch-target-min flex items-center justify-center gap-2.5 rounded-xl bg-emerald-800 p-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="w-5 h-5 text-white" />
            <span>Alerta Silenciosa WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={handleShareBroadcast}
            aria-label="Compartir alerta de ubicación a todas las redes"
            className="touch-target-min flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-900 p-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
          >
            {shareSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">¡Alerta Difundida!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-gray-300" />
                <span>Difundir a Contactos</span>
              </>
            )}
          </button>
        </section>

        {/* 3. LECTURA GIGANTE PARA EL 123 (DIRECCIÓN, BARRIO & GPS) */}
        <GiantLocationCard
          location={location}
          onRefresh={refreshLocation}
          onSelectZone={setManualZone}
          onCopyText={copyLocationText}
          copied={copied}
        />
      </div>

      <div className="min-w-0 space-y-6">
        {/* 4. MARCADOR DIRECTO DE EMERGENCIAS (POLICÍA, PÚRPURA, CRUE, BOMBEROS, TRÁNSITO) */}
        <EmergencyDialerGrid />

        {/* 5. GESTOR DE CONTACTOS DE CONFIANZA */}
        <TrustedContactsCard
          contacts={contacts}
          onAddContact={addContact}
          onRemoveContact={removeContact}
          getWhatsAppLink={(phone) =>
            getWhatsAppLink(
              phone,
              rawLocationText,
              location.latitude,
              location.longitude
            )
          }
        />

        {/* 6. GUÍA TÁCTICA DE ALZA BOT DEFENSOR BAJO ESTRÉS */}
        <section
          aria-label="Guía Legal y Táctica de Alza Bot Defensor"
          className="border-t border-gray-800 pt-6"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="mb-3 flex items-center gap-2">
              <Volume2 className="h-5 w-5 shrink-0 text-gray-400" />
              <h3 className="text-base font-semibold text-white">
                Guía Táctica Alza Bot (Al llamar al 123)
              </h3>
            </div>

            <ul className="space-y-3 text-sm leading-relaxed text-gray-300">
              <li>
                <strong className="text-amber-300">1. Dicta primero la dirección:</strong> Si la llamada se corta, la patrulla ya sabrá a dónde dirigirse.
              </li>
              <li>
                <strong className="text-red-300">2. Derecho a Grabar:</strong> El Art. 21 del Código de Policía (Ley 1801) te autoriza expresamente a filmar el procedimiento policial.
              </li>
              <li>
                <strong className="text-white">3. Mantén la calma:</strong> Responde si hay personas lesionadas o presencia de armas. No cuelgues.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
