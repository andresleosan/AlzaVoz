"use client";

import { Phone, ShieldAlert, HeartHandshake, Flame, Stethoscope, Car } from "lucide-react";
import { EMERGENCY_SERVICES } from "@/data/emergencyServices";
import { type EmergencyCategory } from "@/types/sos";
import { useAppMode } from "@/context/AppModeContext";

export function EmergencyDialerGrid() {
  const { triggerHaptic } = useAppMode();

  const getCategoryIcon = (category: EmergencyCategory) => {
    switch (category) {
      case "police":
        return ShieldAlert;
      case "gender":
        return HeartHandshake;
      case "medical":
        return Stethoscope;
      case "fire":
        return Flame;
      case "transit":
        return Car;
      default:
        return Phone;
    }
  };

  return (
    <section aria-label="Marcación Telefónica Directa de Emergencia" className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
          Marcado Directo de Emergencia (Medellín)
        </h2>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded">
          Llamada Gratuita
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {EMERGENCY_SERVICES.map((service) => {
          const Icon = getCategoryIcon(service.category);
          return (
            <a
              key={service.id}
              href={`tel:${service.phone}`}
              onClick={() => triggerHaptic(60)}
              aria-label={`Llamar a ${service.name} al ${service.phone}`}
              className={`touch-target-min min-h-[64px] flex items-center justify-between p-3 rounded-xl border text-white transition-all active:scale-95 shadow-md ${service.bgTint} ${service.borderTint}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${service.accentColor}25`,
                    border: `1px solid ${service.accentColor}66`,
                  }}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{ color: service.accentColor }}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-black leading-tight text-white truncate">
                      {service.shortName}
                    </p>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${service.accentColor}33`,
                        color: service.accentColor,
                      }}
                    >
                      {service.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 truncate mt-0.5">
                    {service.description}
                  </p>
                </div>
              </div>

              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-2 shadow-inner"
                style={{
                  backgroundColor: service.accentColor,
                }}
              >
                <Phone className="w-5 h-5 text-black stroke-[2.5]" />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
