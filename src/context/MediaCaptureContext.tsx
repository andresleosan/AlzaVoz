'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

export type CaptureSource = 'recording' | 'voice-note' | 'community';
export type CapturePhase = 'idle' | 'requesting' | 'recording' | 'stopping' | 'stopped';

export interface MediaCaptureState {
  activeStream: MediaStream | null;
  hasActiveVideo: boolean;
  hasActiveAudio: boolean;
  capturePhase: CapturePhase;
  captureSource: CaptureSource | null;
  statusLabel: string;
}

export interface MediaCaptureContextValue extends MediaCaptureState {
  registerCapture: (
    stream: MediaStream,
    source: CaptureSource,
    onStopRequest?: () => void
  ) => () => void;
  updateCapturePhase: (phase: CapturePhase, source?: CaptureSource | null) => void;
  stopActiveCapture: () => void;
  clearCapture: () => void;
}

const MediaCaptureContext = createContext<MediaCaptureContextValue | null>(null);

function computeStatusLabel(
  phase: CapturePhase,
  hasVideo: boolean,
  hasAudio: boolean
): string {
  if (phase === 'requesting') {
    return 'Esperando permiso del dispositivo…';
  }
  if (phase === 'stopping') {
    return 'Cerrando la captura…';
  }
  if (phase === 'stopped') {
    return 'Captura detenida';
  }
  if (hasVideo && hasAudio) {
    return 'Cámara y micrófono activos';
  }
  if (hasVideo) {
    return 'Cámara activa';
  }
  if (hasAudio) {
    return 'Micrófono activo';
  }
  return 'Cámara y micrófono apagados';
}

export function MediaCaptureProvider({ children }: { children: ReactNode }) {
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [hasActiveVideo, setHasActiveVideo] = useState(false);
  const [hasActiveAudio, setHasActiveAudio] = useState(false);
  const [capturePhase, setCapturePhase] = useState<CapturePhase>('idle');
  const [captureSource, setCaptureSource] = useState<CaptureSource | null>(null);

  const onStopCallbackRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const inspectStreamTracks = useCallback((stream: MediaStream | null) => {
    if (!stream) {
      setHasActiveVideo(false);
      setHasActiveAudio(false);
      return { video: false, audio: false };
    }
    const videoActive = stream
      .getVideoTracks()
      .some((t) => t.readyState === 'live' && t.enabled);
    const audioActive = stream
      .getAudioTracks()
      .some((t) => t.readyState === 'live' && t.enabled);

    setHasActiveVideo(videoActive);
    setHasActiveAudio(audioActive);
    return { video: videoActive, audio: audioActive };
  }, []);

  const registerCapture = useCallback(
    (
      stream: MediaStream,
      source: CaptureSource,
      onStopRequest?: () => void
    ) => {
      streamRef.current = stream;
      onStopCallbackRef.current = onStopRequest ?? null;
      setActiveStream(stream);
      setCaptureSource(source);
      setCapturePhase('recording');

      const updateTracks = () => {
        const { video, audio } = inspectStreamTracks(stream);
        if (!video && !audio) {
          setCapturePhase('stopped');
        }
      };

      updateTracks();

      const listeners: Array<{ track: MediaStreamTrack; event: string; fn: () => void }> = [];
      const tracks = stream.getTracks();
      for (const track of tracks) {
        const onEnded = () => updateTracks();
        const onMute = () => updateTracks();
        const onUnmute = () => updateTracks();
        track.addEventListener('ended', onEnded);
        track.addEventListener('mute', onMute);
        track.addEventListener('unmute', onUnmute);
        listeners.push(
          { track, event: 'ended', fn: onEnded },
          { track, event: 'mute', fn: onMute },
          { track, event: 'unmute', fn: onUnmute }
        );
      }

      return () => {
        for (const { track, event, fn } of listeners) {
          try {
            track.removeEventListener(event, fn);
          } catch {
            // Ignorar si el track ya fue liberado
          }
        }
      };
    },
    [inspectStreamTracks]
  );

  const updateCapturePhase = useCallback(
    (phase: CapturePhase, source: CaptureSource | null = null) => {
      setCapturePhase(phase);
      if (source !== undefined) {
        setCaptureSource(source);
      }
      if (phase === 'stopped' || phase === 'idle') {
        inspectStreamTracks(streamRef.current);
      }
    },
    [inspectStreamTracks]
  );

  const stopActiveCapture = useCallback(() => {
    // 1. Notificar al grabador/controlador si hay callback registrado
    try {
      onStopCallbackRef.current?.();
    } catch {
      // Ignorar errores del callback de parada
    }

    // 2. Liberar físicamente todos los tracks del stream activo
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        for (const track of tracks) {
          if (track.readyState === 'live') {
            track.stop();
          }
        }
      } catch {
        // Ignorar fallos de liberación de tracks individuales
      }
    }

    setHasActiveVideo(false);
    setHasActiveAudio(false);
    setCapturePhase('stopped');

    // Retroalimentación háptica
    if (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'vibrate' in navigator &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      try {
        navigator.vibrate(40);
      } catch {
        // Ignorar si el navegador bloquea la vibración
      }
    }
  }, []);

  const clearCapture = useCallback(() => {
    streamRef.current = null;
    onStopCallbackRef.current = null;
    setActiveStream(null);
    setHasActiveVideo(false);
    setHasActiveAudio(false);
    setCapturePhase('idle');
    setCaptureSource(null);
  }, []);

  const statusLabel = computeStatusLabel(
    capturePhase,
    hasActiveVideo,
    hasActiveAudio
  );

  return (
    <MediaCaptureContext.Provider
      value={{
        activeStream,
        hasActiveVideo,
        hasActiveAudio,
        capturePhase,
        captureSource,
        statusLabel,
        registerCapture,
        updateCapturePhase,
        stopActiveCapture,
        clearCapture,
      }}
    >
      {children}
    </MediaCaptureContext.Provider>
  );
}

export function useMediaCapture(): MediaCaptureContextValue {
  const context = useContext(MediaCaptureContext);
  if (!context) {
    throw new Error('useMediaCapture debe ser utilizado dentro de un MediaCaptureProvider');
  }
  return context;
}
