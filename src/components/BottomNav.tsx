"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShieldAlert, Scale, Video } from "lucide-react";
import { QuickEscapeButton } from "@/components/QuickEscapeButton";
import { useAppMode } from "@/context/AppModeContext";

const destinations = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/sos", label: "SOS", icon: ShieldAlert },
  { href: "/defender", label: "Retén", icon: Scale },
  { href: "/record", label: "Grabar", icon: Video },
];

export function BottomNav({ placement = "bottom" }: { placement?: "bottom" | "sidebar" }) {
  const pathname = usePathname();
  const { isNavigationLocked } = useAppMode();

  return (
    <nav
      aria-label={placement === "sidebar" ? "Navegación principal" : "Navegación móvil"}
      className={placement === "sidebar" ? "sidebar-nav" : "bottom-nav"}
    >
      {destinations.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} prefetch={false} aria-current={pathname === href ? "page" : undefined}
          aria-disabled={isNavigationLocked || undefined}
          onNavigate={event => { if (isNavigationLocked) event.preventDefault(); }} className="nav-link">
          <Icon size={20} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
      {placement === "bottom" && <QuickEscapeButton variant="icon" className="nav-escape" />}
    </nav>
  );
}
