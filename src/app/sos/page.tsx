import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { SosEmergencyPanel } from "@/components/sos/SosEmergencyPanel";

export const metadata: Metadata = {
  title: "SOS Emergencia 123 | AlzaVoz Medellín",
  description:
    "Módulo de pánico inteligente con geolocalización en vivo, lectura de dirección para el 123 y alerta silenciosa a contactos de confianza en Medellín.",
};

export default function SosPage() {
  return (
    <AppShell>
      <div className="py-2">
        <SosEmergencyPanel />
      </div>
    </AppShell>
  );
}
