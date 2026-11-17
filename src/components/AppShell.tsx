"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import { useAppMode } from "@/context/AppModeContext";
import { BottomNav } from "@/components/BottomNav";
import { ZeroPeepToggle } from "@/components/ZeroPeepToggle";
import { QuickEscapeButton } from "@/components/QuickEscapeButton";
import { EscapeLimitsButton } from "@/components/QuickEscapeLimits";
import { MediaCaptureIndicator } from "@/components/recording/MediaCaptureIndicator";
import { PracticeModeBanner } from "@/components/practice/PracticeModeBanner";
import { PracticeSimulationModal } from "@/components/practice/PracticeSimulationModal";
import {
  SharedDeviceBanner,
  SharedDeviceExitModal,
} from "@/components/shared-device/SharedDeviceBanner";

const pageNames: Record<string, string> = {
  "/": "Inicio",
  "/sos": "Emergencia SOS",
  "/defender": "Defensor en retén",
  "/record": "Grabar evidencia",
  "/report": "Denuncia confidencial",
  "/community": "Convivencia barrial",
  "/search": "Tableros de búsqueda",
  "/device-check": "Comprobar dispositivo",
  "/admin": "Panel de gestión",
};

function Brand() {
  const { isNavigationLocked } = useAppMode();
  return <Link href="/" className="app-brand" aria-label="AlzaVoz · Inicio"
    aria-disabled={isNavigationLocked || undefined}
    onNavigate={event => { if (isNavigationLocked) event.preventDefault(); }}>
    <Image src="/assets/alzabot/bot-standard.png" alt="" width={40} height={40} className="brand-image" />
    <span><strong>AlzaVoz</strong><small>Protección ciudadana</small></span>
  </Link>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { isCamouflaged } = useAppMode();
  const pathname = usePathname();

  return (
    <div className={`app-shell min-h-dvh ${isCamouflaged ? "privacy-peep-active" : ""}`}>
      <a href="#contenido" className="skip-link">Ir al contenido</a>
      <aside className="app-sidebar">
        <Brand />
        <BottomNav placement="sidebar" />
        <div className="sidebar-footer">
          <Link
            href="/device-check"
            prefetch={false}
            data-testid="sidebar-device-check-link"
            aria-current={pathname === "/device-check" ? "page" : undefined}
            className="touch-target-min inline-flex min-h-14 w-full items-center gap-2 rounded-xl border border-gray-700 bg-[#0B0F19] px-3.5 py-2.5 text-xs font-semibold text-gray-100 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            <ShieldCheck size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
            <span>Comprobar dispositivo</span>
          </Link>
          <EscapeLimitsButton variant="sidebar" />
          <div className="sidebar-note"><MapPin size={16} aria-hidden="true" /><span>Medellín, Colombia</span></div>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <div className="mobile-brand"><Brand /></div>
          <div className="desktop-page-name">{pageNames[pathname] ?? "AlzaVoz"}</div>
          <div className="header-controls">
            <span className="header-city"><MapPin size={15} aria-hidden="true" />Medellín</span>
            <ZeroPeepToggle showLabel={false} />
            <QuickEscapeButton variant="badge" />
          </div>
        </header>
        <MediaCaptureIndicator />
        <PracticeModeBanner />
        <SharedDeviceBanner />
        <main id="contenido" tabIndex={-1} className={`app-main ${pathname === "/" ? "app-main-home" : ""}`}>{children}</main>
        <footer className="app-privacy-footer">
          <EscapeLimitsButton variant="footer" />
        </footer>
      </div>
      <BottomNav />
      <PracticeSimulationModal />
      <SharedDeviceExitModal />
    </div>
  );
}
