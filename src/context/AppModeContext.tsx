"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { type AppMode, MODES_CONFIG, type ModeConfig } from "@/types/mode";
import { usePathname } from "next/navigation";

interface AppModeContextValue {
  mode: AppMode;
  modeConfig: ModeConfig;
  isNavigationLocked: boolean;
  setNavigationLocked: (locked: boolean) => void;
  isCamouflaged: boolean;
  toggleCamouflage: () => void;
  setCamouflage: (active: boolean) => void;
  isEscapeLimitsOpen: boolean;
  openEscapeLimits: () => void;
  closeEscapeLimits: () => void;
  triggerHaptic: (durationMs?: number) => void;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({
  children,
  initialMode = "standard",
}: {
  children: ReactNode;
  initialMode?: AppMode;
}) {
  const pathname = usePathname();
  const mode: AppMode =
    pathname === "/sos" || pathname === "/defender"
      ? "defender"
      : pathname === "/report"
        ? "violet"
        : pathname === "/community" || pathname === "/search"
          ? "radar"
        : initialMode;
  const [isCamouflaged, setIsCamouflaged] = useState<boolean>(false);
  const [isNavigationLocked, setNavigationLocked] = useState(false);
  const [isEscapeLimitsOpen, setIsEscapeLimitsOpen] = useState<boolean>(false);

  const triggerHaptic = useCallback((durationMs: number = 40) => {
    if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Ignorar si el navegador bloquea vibraciones sin interacción del usuario
      }
    }
  }, []);

  const toggleCamouflage = useCallback(() => {
    setIsCamouflaged((prev) => {
      const next = !prev;
      triggerHaptic(50);
      return next;
    });
  }, [triggerHaptic]);

  const setCamouflage = useCallback((active: boolean) => {
    setIsCamouflaged(active);
  }, []);

  const openEscapeLimits = useCallback(() => {
    triggerHaptic(30);
    setIsEscapeLimitsOpen(true);
  }, [triggerHaptic]);

  const closeEscapeLimits = useCallback(() => {
    setIsEscapeLimitsOpen(false);
  }, []);

  useEffect(() => {
    const onEscape = () => {
      setIsEscapeLimitsOpen(false);
    };
    window.addEventListener("alzavoz:escape", onEscape);
    return () => {
      window.removeEventListener("alzavoz:escape", onEscape);
    };
  }, []);

  const modeConfig = MODES_CONFIG[mode];

  return (
    <AppModeContext.Provider
      value={{
        mode,
        modeConfig,
        isNavigationLocked,
        setNavigationLocked,
        isCamouflaged,
        toggleCamouflage,
        setCamouflage,
        isEscapeLimitsOpen,
        openEscapeLimits,
        closeEscapeLimits,
        triggerHaptic,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode(): AppModeContextValue {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error("useAppMode debe ser utilizado dentro de un AppModeProvider");
  }
  return context;
}

