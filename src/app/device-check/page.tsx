import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DeviceCheckPanel } from "@/components/device/DeviceCheckPanel";

export const metadata: Metadata = {
  title: "Comprobar dispositivo | AlzaVoz",
  description:
    "Comprobación previa local de cámara, micrófono y ubicación en tu navegador sin enviar capturas ni posiciones.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function DeviceCheckPage() {
  return (
    <AppShell>
      <DeviceCheckPanel />
    </AppShell>
  );
}
