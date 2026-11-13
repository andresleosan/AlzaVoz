'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export const SHARED_DEVICE_STORAGE_KEY = 'alzavoz_shared_device';
export const SHARED_SESSION_CLEAR_EVENT = 'alzavoz:shared-session-clear';

export const SENSITIVE_SESSION_KEYS = [
  'alzavoz_report_draft',
  'alzavoz_recording_key',
  'alzavoz_draft',
  'alzavoz_temp_audio',
  'alzavoz_sos_active',
] as const;

export const SENSITIVE_LOCAL_KEYS = [
  'alzavoz_report_draft',
  'alzavoz_draft',
  'alzavoz_temp_audio',
  'alzavoz_sos_active',
] as const;

export type SharedExitModalMode = 'exited' | 'info';

export interface SharedDeviceContextValue {
  isSharedDevice: boolean;
  enableSharedDevice: () => void;
  exitAndClearSharedSession: () => void;
  isExitModalOpen: boolean;
  exitModalMode: SharedExitModalMode;
  openExternalRecordsGuide: () => void;
  closeExitModal: () => void;
}

export function purgeSensitiveClientStorage(removeSharedFlag: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of SENSITIVE_SESSION_KEYS) {
      sessionStorage.removeItem(key);
    }
    if (removeSharedFlag) {
      sessionStorage.removeItem(SHARED_DEVICE_STORAGE_KEY);
    }
  } catch {
    // Ignorar restricciones de sessionStorage en navegadores restrictivos
  }

  try {
    for (const key of SENSITIVE_LOCAL_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignorar restricciones de localStorage en navegadores restrictivos
  }
}

let listeners: Array<() => void> = [];
let clientHydrated = false;

function emitSharedDeviceChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void): () => void {
  listeners.push(callback);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SHARED_DEVICE_STORAGE_KEY || event.key === null) {
      callback();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }
  return () => {
    listeners = listeners.filter((l) => l !== callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

function getSnapshot(): boolean {
  if (!clientHydrated || typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SHARED_DEVICE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

const SharedDeviceContext = createContext<SharedDeviceContextValue | null>(null);

export function SharedDeviceProvider({ children }: { children: ReactNode }) {
  const isSharedDevice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitModalMode, setExitModalMode] = useState<SharedExitModalMode>('exited');

  useEffect(() => {
    if (!clientHydrated) {
      clientHydrated = true;
      emitSharedDeviceChange();
    }
  }, []);

  useEffect(() => {
    if (isSharedDevice) {
      purgeSensitiveClientStorage(false);
    }
  }, [isSharedDevice]);

  const enableSharedDevice = useCallback(() => {
    clientHydrated = true;
    purgeSensitiveClientStorage(false);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SHARED_DEVICE_STORAGE_KEY, 'true');
      } catch {
        // Ignorar restricciones de almacenamiento
      }
    }
    emitSharedDeviceChange();
  }, []);

  const exitAndClearSharedSession = useCallback(() => {
    purgeSensitiveClientStorage(true);
    emitSharedDeviceChange();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SHARED_SESSION_CLEAR_EVENT));
    }
    setExitModalMode('exited');
    setIsExitModalOpen(true);
  }, []);

  const openExternalRecordsGuide = useCallback(() => {
    setExitModalMode('info');
    setIsExitModalOpen(true);
  }, []);

  const closeExitModal = useCallback(() => {
    setIsExitModalOpen(false);
  }, []);

  return (
    <SharedDeviceContext.Provider
      value={{
        isSharedDevice,
        enableSharedDevice,
        exitAndClearSharedSession,
        isExitModalOpen,
        exitModalMode,
        openExternalRecordsGuide,
        closeExitModal,
      }}
    >
      {children}
    </SharedDeviceContext.Provider>
  );
}

export function useSharedDevice(): SharedDeviceContextValue {
  const context = useContext(SharedDeviceContext);
  if (!context) {
    throw new Error('useSharedDevice debe ser utilizado dentro de un SharedDeviceProvider');
  }
  return context;
}
