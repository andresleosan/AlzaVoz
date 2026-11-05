import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { LegalDefenderPanel } from "@/components/defender/LegalDefenderPanel";

export const metadata: Metadata = {
  title: "Defensor Legal en Vivo & Choques Solo Latas | AlzaVoz Medellín",
  description:
    "Asistencia jurídica en retenes policiales (Ley 1801 Art. 21) y de tránsito (Ley 769). Asistente guiado de choques simples Solo Latas bajo la Ley 2251 de 2022 en Medellín.",
};

export default function DefenderPage() {
  return (
    <AppShell>
      <div className="py-2">
        <LegalDefenderPanel />
      </div>
    </AppShell>
  );
}

