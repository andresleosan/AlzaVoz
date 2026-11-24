"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import { useAppMode } from "@/context/AppModeContext";
import { SHARED_SESSION_CLEAR_EVENT } from "@/context/SharedDeviceContext";
import {
  buildSpeechQueue,
  cancelBrowserSpeech,
  isSpeechSynthesisAvailable,
  selectSpanishVoice,
  type SpeechPlaybackStatus,
  type SpeechSegment,
  type SpeechSupportStatus,
} from "@/lib/speech/readAloud";

export interface ActiveSpeechBannerState {
  ownerId: string;
  contextLabel: string;
  currentPosition: number;
  totalSegments: number;
  segmentLabel: string;
  onStop: () => void;
}

let activeStopCallback: (() => void) | null = null;
let activeSpeechBanner: ActiveSpeechBannerState | null = null;
let bannerListeners: Array<() => void> = [];

function emitBannerChange(): void {
  for (const listener of bannerListeners) {
    listener();
  }
}

function subscribeBanner(listener: () => void): () => void {
  bannerListeners.push(listener);
  return () => {
    bannerListeners = bannerListeners.filter((item) => item !== listener);
  };
}

function getBannerSnapshot(): ActiveSpeechBannerState | null {
  return activeSpeechBanner;
}

function getServerBannerSnapshot(): ActiveSpeechBannerState | null {
  return null;
}

function setActiveSpeechBanner(next: ActiveSpeechBannerState): void {
  activeSpeechBanner = next;
  emitBannerChange();
}

function clearActiveSpeechBanner(ownerId: string): void {
  if (activeSpeechBanner && activeSpeechBanner.ownerId === ownerId) {
    activeSpeechBanner = null;
    emitBannerChange();
  }
}

/**
 * Expone el estado activo de lectura voluntaria para renderizar la barra
 * flotante de parada fuera de contenedores <Activity mode="hidden">.
 */
export function useActiveSpeechBanner(): ActiveSpeechBannerState | null {
  return useSyncExternalStore(
    subscribeBanner,
    getBannerSnapshot,
    getServerBannerSnapshot
  );
}

function subscribeNoop(): () => void {
  return () => {};
}

function getSpeechSupportSnapshot(): SpeechSupportStatus {
  return isSpeechSynthesisAvailable() ? "supported" : "unsupported";
}

function getServerSpeechSupportSnapshot(): SpeechSupportStatus {
  return "checking";
}

export interface UseVoluntarySpeechOptions {
  segments: readonly SpeechSegment[];
  contentKey: string;
  contextLabel: string;
}

export interface UseVoluntarySpeechResult {
  support: SpeechSupportStatus;
  status: SpeechPlaybackStatus;
  activeSegmentIndex: number;
  errorMessage: string | null;
  isSilentOpen: boolean;
  isCamouflaged: boolean;
  start: () => void;
  stop: () => void;
  toggleSilentMode: () => void;
}

export function useVoluntarySpeech({
  segments,
  contentKey,
  contextLabel,
}: UseVoluntarySpeechOptions): UseVoluntarySpeechResult {
  const ownerId = useId();
  const pathname = usePathname();
  const { isCamouflaged } = useAppMode();
  const support = useSyncExternalStore(
    subscribeNoop,
    getSpeechSupportSnapshot,
    getServerSpeechSupportSnapshot
  );
  const activeBanner = useActiveSpeechBanner();

  const [status, setStatus] = useState<SpeechPlaybackStatus>("idle");
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [silentModeUserOpen, setSilentModeUserOpen] = useState<boolean | null>(null);
  const [prevContentKey, setPrevContentKey] = useState<string>(contentKey);
  const [prevCamouflaged, setPrevCamouflaged] = useState<boolean>(isCamouflaged);

  const runIdRef = useRef<number>(0);
  const hasActiveSpeechRef = useRef<boolean>(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const stopCallbackRef = useRef<() => void>(() => {});

  // Reiniciar estado de reproducción cuando cambian caso, pestaña, paso o alcance
  if (contentKey !== prevContentKey) {
    setPrevContentKey(contentKey);
    if (status !== "idle") {
      setStatus("idle");
    }
    if (activeSegmentIndex !== -1) {
      setActiveSegmentIndex(-1);
    }
    if (errorMessage !== null) {
      setErrorMessage(null);
    }
  }

  // Silenciar en pantalla al activar Modo Antiespía
  if (isCamouflaged !== prevCamouflaged) {
    setPrevCamouflaged(isCamouflaged);
    if (isCamouflaged && status === "speaking") {
      setStatus("stopped");
      setActiveSegmentIndex(-1);
    }
  }

  const stop = useCallback(() => {
    const wasSpeaking = hasActiveSpeechRef.current;
    runIdRef.current += 1;
    hasActiveSpeechRef.current = false;
    activeUtteranceRef.current = null;
    if (activeStopCallback === stopCallbackRef.current) {
      activeStopCallback = null;
    }
    clearActiveSpeechBanner(ownerId);
    cancelBrowserSpeech();
    setActiveSegmentIndex(-1);
    setStatus((prev) =>
      wasSpeaking || prev === "speaking" || prev === "error" ? "stopped" : prev
    );
  }, [ownerId]);

  useEffect(() => {
    stopCallbackRef.current = stop;
  }, [stop]);

  const start = useCallback(() => {
    if (!isSpeechSynthesisAvailable()) {
      clearActiveSpeechBanner(ownerId);
      setStatus("unavailable");
      setErrorMessage(
        "Este navegador no ofrece síntesis de voz local. Usa el resumen silencioso o el texto completo sin perder ninguna indicación."
      );
      setSilentModeUserOpen(true);
      return;
    }

    const queue = buildSpeechQueue(segments);
    if (queue.length === 0) {
      return;
    }

    if (activeStopCallback && activeStopCallback !== stopCallbackRef.current) {
      activeStopCallback();
    }

    runIdRef.current += 1;
    const currentRun = runIdRef.current;
    const synth = window.speechSynthesis;

    if (synth.speaking || synth.pending || hasActiveSpeechRef.current) {
      cancelBrowserSpeech();
    }

    const voices = typeof synth.getVoices === "function" ? synth.getVoices() : [];
    const selectedVoice = selectSpanishVoice(voices);

    const firstChunk = queue[0];
    hasActiveSpeechRef.current = true;
    activeStopCallback = stopCallbackRef.current;
    setErrorMessage(null);
    setActiveSegmentIndex(firstChunk.segmentIndex);
    setStatus("speaking");
    setActiveSpeechBanner({
      ownerId,
      contextLabel,
      currentPosition: firstChunk.segmentIndex + 1,
      totalSegments: segments.length,
      segmentLabel: firstChunk.segmentLabel,
      onStop: () => stopCallbackRef.current(),
    });

    const finishSuccessfully = () => {
      if (runIdRef.current !== currentRun) return;
      hasActiveSpeechRef.current = false;
      activeUtteranceRef.current = null;
      if (activeStopCallback === stopCallbackRef.current) {
        activeStopCallback = null;
      }
      clearActiveSpeechBanner(ownerId);
      setActiveSegmentIndex(-1);
      setStatus("completed");
    };

    const failPlayback = (unavailable: boolean, message: string) => {
      if (runIdRef.current !== currentRun) return;
      hasActiveSpeechRef.current = false;
      activeUtteranceRef.current = null;
      if (activeStopCallback === stopCallbackRef.current) {
        activeStopCallback = null;
      }
      clearActiveSpeechBanner(ownerId);
      setActiveSegmentIndex(-1);
      setStatus(unavailable ? "unavailable" : "error");
      setErrorMessage(message);
      setSilentModeUserOpen(true);
    };

    const speakChunk = (index: number) => {
      if (runIdRef.current !== currentRun) return;
      const chunk = queue[index];
      if (!chunk) {
        finishSuccessfully();
        return;
      }

      try {
        const utterance = new window.SpeechSynthesisUtterance(chunk.text);
        utterance.lang = selectedVoice?.lang || "es-CO";
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        utterance.rate = 0.96;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
          if (runIdRef.current !== currentRun) return;
          setActiveSegmentIndex(chunk.segmentIndex);
          setStatus("speaking");
          setActiveSpeechBanner({
            ownerId,
            contextLabel,
            currentPosition: chunk.segmentIndex + 1,
            totalSegments: segments.length,
            segmentLabel: chunk.segmentLabel,
            onStop: () => stopCallbackRef.current(),
          });
        };

        utterance.onend = () => {
          if (runIdRef.current !== currentRun) return;
          if (index + 1 < queue.length) {
            speakChunk(index + 1);
          } else {
            finishSuccessfully();
          }
        };

        utterance.onerror = (event) => {
          if (runIdRef.current !== currentRun) return;
          const errCode = typeof event?.error === "string" ? event.error : "";
          if (errCode === "canceled" || errCode === "interrupted") {
            return;
          }
          const isUnavailable =
            errCode === "synthesis-unavailable" ||
            errCode === "voice-unavailable" ||
            errCode === "language-unavailable";
          failPlayback(
            isUnavailable,
            isUnavailable
              ? "Este navegador no ofrece síntesis de voz local. Se abrió el resumen silencioso equivalente."
              : "No se pudo completar la lectura en voz alta. Usa el resumen silencioso o el texto completo en pantalla."
          );
        };

        activeUtteranceRef.current = utterance;
        synth.speak(utterance);
      } catch {
        failPlayback(
          false,
          "No fue posible iniciar la síntesis de voz local. Se abrió el resumen silencioso equivalente."
        );
      }
    };

    // Ejecutar síncronamente dentro del gesto de usuario
    speakChunk(0);
  }, [contextLabel, ownerId, segments]);

  const effectiveStatus: SpeechPlaybackStatus =
    status === "speaking" && activeBanner?.ownerId !== ownerId
      ? "stopped"
      : status;
  const effectiveSegmentIndex: number =
    effectiveStatus === "speaking" ? activeSegmentIndex : -1;

  const isSilentOpen =
    silentModeUserOpen ??
    (support === "unsupported" ||
      effectiveStatus === "unavailable" ||
      effectiveStatus === "error");

  const toggleSilentMode = useCallback(() => {
    if (hasActiveSpeechRef.current) {
      stop();
    }
    setSilentModeUserOpen((prev) => {
      const currentlyOpen =
        prev ??
        (support === "unsupported" ||
          effectiveStatus === "unavailable" ||
          effectiveStatus === "error");
      return !currentlyOpen;
    });
  }, [effectiveStatus, stop, support]);

  // Cancelar síntesis externa si cambia el contenido mientras había audio activo
  useEffect(() => {
    if (hasActiveSpeechRef.current) {
      runIdRef.current += 1;
      hasActiveSpeechRef.current = false;
      activeUtteranceRef.current = null;
      if (activeStopCallback === stopCallbackRef.current) {
        activeStopCallback = null;
      }
      clearActiveSpeechBanner(ownerId);
      cancelBrowserSpeech();
    }
  }, [contentKey, ownerId]);

  // Cancelar síntesis externa al activar Modo Antiespía
  useEffect(() => {
    if (isCamouflaged && hasActiveSpeechRef.current) {
      runIdRef.current += 1;
      hasActiveSpeechRef.current = false;
      activeUtteranceRef.current = null;
      if (activeStopCallback === stopCallbackRef.current) {
        activeStopCallback = null;
      }
      clearActiveSpeechBanner(ownerId);
      cancelBrowserSpeech();
    }
  }, [isCamouflaged, ownerId]);

  // Cancelar al cambiar de ruta o al ocultarse/desmontarse en <Activity>
  useEffect(() => {
    return () => {
      if (hasActiveSpeechRef.current) {
        runIdRef.current += 1;
        hasActiveSpeechRef.current = false;
        activeUtteranceRef.current = null;
        if (activeStopCallback === stopCallbackRef.current) {
          activeStopCallback = null;
        }
        clearActiveSpeechBanner(ownerId);
        cancelBrowserSpeech();
      }
    };
  }, [ownerId, pathname]);

  // Cancelar ante Salida Rápida, limpieza de sesión compartida y salida de página
  useEffect(() => {
    const handleInterruptEvent = () => {
      const wasActive = hasActiveSpeechRef.current;
      runIdRef.current += 1;
      hasActiveSpeechRef.current = false;
      activeUtteranceRef.current = null;
      if (activeStopCallback === stopCallbackRef.current) {
        activeStopCallback = null;
      }
      clearActiveSpeechBanner(ownerId);
      if (wasActive) {
        cancelBrowserSpeech();
        setActiveSegmentIndex(-1);
        setStatus("stopped");
      }
    };

    window.addEventListener("alzavoz:escape", handleInterruptEvent);
    window.addEventListener(SHARED_SESSION_CLEAR_EVENT, handleInterruptEvent);
    window.addEventListener("pagehide", handleInterruptEvent);
    return () => {
      window.removeEventListener("alzavoz:escape", handleInterruptEvent);
      window.removeEventListener(SHARED_SESSION_CLEAR_EVENT, handleInterruptEvent);
      window.removeEventListener("pagehide", handleInterruptEvent);
    };
  }, [ownerId]);

  return {
    support,
    status: effectiveStatus,
    activeSegmentIndex: effectiveSegmentIndex,
    errorMessage,
    isSilentOpen,
    isCamouflaged,
    start,
    stop,
    toggleSilentMode,
  };
}
