"use client";

import { useState } from "react";
import Image from "next/image";
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
    <div className="flex flex-col gap-5 max-w-md mx-auto w-full pb-8">
      {/* 1. BOTÓN DE PÁNICO HERO (UX BAJO ESTRÉS - FITTS' LAW) */}
      <section
        aria-label="Botón de Pánico Principal"
        className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-red-950/60 via-black to-gray-950 border-2 border-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.35)] overflow-hidden text-center"
      >
        {/* Fondo sutil con imagen de escena Alza Bot Defensor */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <Image
            src="/assets/alzabot/bot-defender-scene.jpg"
            alt=""
            fill
            className="object-cover"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <span className="text-[11px] font-black tracking-widest uppercase text-red-400 bg-red-950/80 border border-red-600/60 px-3 py-1 rounded-full mb-3 flex items-center gap-1.5 shadow-sm">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            Alerta Inmediata 123
          </span>

          {/* Gran Pulsador Circular de Pánico (Touch Target > 140px) */}
          <div className="relative my-2">
            <span className="absolute -inset-2 rounded-full bg-red-600/30 blur-xl animate-pulse" />
            <a
              href="tel:123"
              onClick={handleMainSosCall}
              aria-label="Llamar a Emergencias Policía 123 ahora"
              className="touch-target-min relative w-36 h-36 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-800 border-4 border-white/90 text-white shadow-[0_0_35px_rgba(239,68,68,0.8)] flex flex-col items-center justify-center transition-transform active:scale-90 select-none group"
            >
              <ShieldAlert className="w-12 h-12 text-white stroke-[2.5] drop-shadow-md group-hover:scale-110 transition-transform" />
              <span className="text-2xl font-black tracking-tight text-white drop-shadow">
                SOS 123
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-100">
                Tocar para Llamar
              </span>
            </a>
          </div>

          <p className="text-xs text-gray-300 font-medium max-w-xs mt-3 leading-tight">
            Marca sin costo a la Policía y Central de Emergencias de Medellín.
          </p>
        </div>
      </section>

      {/* 2. BOTONES DE ACCIÓN RÁPIDA: ALERTA SILENCIOSA WHATSAPP */}
      <section
        aria-label="Alerta Silenciosa por WhatsApp"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      >
        <a
          href={officialWaUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => triggerHaptic(50)}
          className="touch-target-min min-h-[56px] flex items-center justify-center gap-2.5 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm active:scale-95 transition shadow-lg shadow-emerald-950/60"
        >
          <MessageCircle className="w-5 h-5 text-white" />
          <span>Alerta Silenciosa WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleShareBroadcast}
          aria-label="Compartir alerta de ubicación a todas las redes"
          className="touch-target-min min-h-[56px] flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-bold text-xs active:scale-95 transition"
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
        className="rounded-2xl border border-red-900/60 bg-gradient-to-br from-red-950/30 to-black p-4 flex gap-3.5 items-start"
      >
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-red-500/40 bg-gray-900">
          <Image
            src="/assets/alzabot/bot-defender.png"
            alt="Alza Bot Defensor"
            fill
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Guía Táctica Alza Bot (Al llamar al 123)
            </h3>
          </div>

          <ul className="text-[11px] text-gray-300 space-y-1 leading-relaxed">
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
  );
}
