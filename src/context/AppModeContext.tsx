"use client";

import {
  createContext,
  useContext,
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
  const mode: AppMode = pathname === "/sos" || pathname === "/defender" ? "defender" : initialMode;
  const [isCamouflaged, setIsCamouflaged] = useState<boolean>(false);
  const [isNavigationLocked, setNavigationLocked] = useState(false);

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

