"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import { useAppMode } from "@/context/AppModeContext";
import { usePracticeMode } from "@/context/PracticeModeContext";
import { useSharedDevice } from "@/context/SharedDeviceContext";
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
  const { isPracticeMode } = usePracticeMode();
  const { isSharedDevice } = useSharedDevice();
  const pathname = usePathname();
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const prevStateRef = useRef<{
    pathname: string;
    isCamouflaged: boolean;
    isPracticeMode: boolean;
    isSharedDevice: boolean;
  } | null>(null);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = {
      pathname,
      isCamouflaged,
      isPracticeMode,
      isSharedDevice,
    };
    if (!prev) return;

    const messages: string[] = [];
    if (prev.pathname !== pathname) {
      messages.push(`Sección cargada: ${pageNames[pathname] ?? "AlzaVoz"}.`);
    }
    if (prev.isCamouflaged !== isCamouflaged) {
      messages.push(
        isCamouflaged
          ? "Modo antiespía activado: datos sensibles desenfocados visualmente."
          : "Modo antiespía desactivado: datos sensibles visibles."
      );
    }
    if (prev.isPracticeMode !== isPracticeMode) {
      messages.push(
        isPracticeMode
          ? "Modo de práctica activado: ensayos sin envíos reales."
          : "Modo de práctica desactivado: modo operativo activo."
      );
    }
    if (prev.isSharedDevice !== isSharedDevice) {
      messages.push(
        isSharedDevice
          ? "Sesión en dispositivo compartido activada: sin guardar borradores locales."
          : "Sesión compartida cerrada y borradores locales limpiados."
      );
    }

    if (messages.length === 0) return;
    const nextMessage = messages.join(" ");
    const timer = window.setTimeout(() => {
      setLiveAnnouncement(nextMessage);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, isCamouflaged, isPracticeMode, isSharedDevice]);

  return (
    <div className={`app-shell min-h-dvh ${isCamouflaged ? "privacy-peep-active" : ""}`}>
      <a href="#contenido" className="skip-link">Ir al contenido</a>
      <div
        data-testid="app-live-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>
      <aside className="app-sidebar" aria-label="Navegación lateral">
        <Brand />
        <BottomNav placement="sidebar" />
        <div className="sidebar-footer">
          <Link
            href="/device-check"
            prefetch={false}
            data-testid="sidebar-device-check-link"
            aria-current={pathname === "/device-check" ? "page" : undefined}
            className="touch-target-min inline-flex min-h-[56px] w-full items-center gap-2 rounded-xl border border-gray-700 bg-[#0B0F19] px-3.5 py-2.5 text-left text-xs font-semibold leading-snug text-gray-100 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            <ShieldCheck size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
            <span className="min-w-0 break-words">Comprobar dispositivo</span>
          </Link>
          <EscapeLimitsButton variant="sidebar" />
          <div className="sidebar-note"><MapPin size={16} aria-hidden="true" /><span>Medellín, Colombia</span></div>
        </div>
      </aside>

      <div className="app-workspace">
        <div className="app-sticky-chrome">
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
        </div>
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
