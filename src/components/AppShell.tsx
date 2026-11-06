"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { MapPin } from "lucide-react";
import { useAppMode } from "@/context/AppModeContext";
import { BottomNav } from "@/components/BottomNav";
import { ZeroPeepToggle } from "@/components/ZeroPeepToggle";
import { QuickEscapeButton } from "@/components/QuickEscapeButton";

const pageNames: Record<string, string> = {
  "/": "Inicio",
  "/sos": "Emergencia SOS",
  "/defender": "Defensor en retén",
  "/record": "Grabar evidencia",
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
        <div className="sidebar-note"><MapPin size={16} aria-hidden="true" /><span>Medellín, Colombia</span></div>
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
        <main id="contenido" tabIndex={-1} className={`app-main ${pathname === "/" ? "app-main-home" : ""}`}>{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
