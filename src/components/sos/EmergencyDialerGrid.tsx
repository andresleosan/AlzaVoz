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
    <section aria-label="Marcación Telefónica Directa de Emergencia" className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-white">
          Marcado Directo de Emergencia (Medellín)
        </h2>
        <p className="text-sm text-gray-400">
          Llamada Gratuita
        </p>
      </div>

      <div className="grid gap-2">
        {EMERGENCY_SERVICES.map((service) => {
          const Icon = getCategoryIcon(service.category);
          return (
            <a
              key={service.id}
              href={`tel:${service.phone}`}
              onClick={() => triggerHaptic(60)}
              aria-label={`Llamar a ${service.name} al ${service.phone}`}
              className="touch-target-min flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-white transition-colors hover:bg-gray-800"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex w-6 shrink-0 items-center justify-center">
                  <Icon
                    className="w-6 h-6"
                    style={{ color: service.accentColor }}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-base font-semibold leading-snug text-white">
                    {service.shortName}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-400">
                    {service.description}
                  </p>
                </div>
              </div>

              <Phone className="h-5 w-5 shrink-0 text-gray-400" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

