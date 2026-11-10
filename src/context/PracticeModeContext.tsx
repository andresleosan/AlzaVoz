'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface SimulationModalData {
  title: string;
  message: string;
  serviceName?: string;
  phoneNumber?: string;
  recipients?: string[];
  payloadText?: string;
  details?: string[];
}

export interface PracticeModeContextValue {
  isPracticeMode: boolean;
  enablePracticeMode: () => void;
  disablePracticeMode: () => void;
  togglePracticeMode: () => void;
  simulationModal: SimulationModalData | null;
  showSimulationModal: (data: SimulationModalData) => void;
  closeSimulationModal: () => void;
}

const STORAGE_KEY = 'alzavoz_practice_mode';

function getInitialPracticeMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

const PracticeModeContext = createContext<PracticeModeContextValue | null>(null);

export function PracticeModeProvider({ children }: { children: ReactNode }) {
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(getInitialPracticeMode);
  const [simulationModal, setSimulationModal] = useState<SimulationModalData | null>(null);

  const enablePracticeMode = useCallback(() => {
    setIsPracticeMode(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignorar restricciones de almacenamiento
    }
  }, []);

  const disablePracticeMode = useCallback(() => {
    setIsPracticeMode(false);
    setSimulationModal(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar restricciones de almacenamiento
    }
  }, []);

  const togglePracticeMode = useCallback(() => {
    setIsPracticeMode((prev) => {
      const next = !prev;
      try {
        if (next) {
          sessionStorage.setItem(STORAGE_KEY, 'true');
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Ignorar restricciones
      }
      return next;
    });
  }, []);

  const showSimulationModal = useCallback((data: SimulationModalData) => {
    setSimulationModal(data);
  }, []);

  const closeSimulationModal = useCallback(() => {
    setSimulationModal(null);
  }, []);

  return (
    <PracticeModeContext.Provider
      value={{
        isPracticeMode,
        enablePracticeMode,
        disablePracticeMode,
        togglePracticeMode,
        simulationModal,
        showSimulationModal,
        closeSimulationModal,
      }}
    >
      {children}
    </PracticeModeContext.Provider>
  );
}

export function usePracticeMode(): PracticeModeContextValue {
  const context = useContext(PracticeModeContext);
  if (!context) {
    throw new Error('usePracticeMode debe ser utilizado dentro de un PracticeModeProvider');
  }
  return context;
}
