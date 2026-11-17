"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppMode } from "@/context/AppModeContext";
import { useMediaCapture } from "@/context/MediaCaptureContext";
import { SHARED_SESSION_CLEAR_EVENT } from "@/context/SharedDeviceContext";
import { useNowTicker } from "@/hooks/useNowTicker";
import {
  assessLocation,
  normalizeAccuracy,
  normalizeTimestamp,
} from "@/lib/location/metadata";
import {
  classifyGeolocationError,
  classifyMediaError,
  computeToolReadiness,
  DEVICE_PREVIEW_TIMEOUT_MS,
  getAlternativesForSensor,
  isSensorFailureStatus,
  MIC_SIGNAL_THRESHOLD_DBFS,
  probePassivePermissionsAndDevices,
  readPassiveCapabilities,
  sanitizeDeviceLabel,
  SEQUENCE_CAMERA_SAMPLE_MS,
  SEQUENCE_MIC_SAMPLE_MS,
  type BrowserCapabilitiesSnapshot,
  type CameraDetails,
  type LocationDetails,
  type MicrophoneDetails,
  type SensorCheckStatus,
} from "@/lib/device/check";

export interface SensorMessage {
  headline: string;
  detail: string;
}

const INITIAL_CAPABILITIES: BrowserCapabilitiesSnapshot = {
  isSecureContext: true,
  hasMediaDevices: false,
  hasEnumerateDevices: false,
  hasMediaRecorder: false,
  supportsVideoWebm: false,
  supportsVideoWebmFallback: false,
  supportsAudioWebm: false,
  supportsAudioContext: false,
  supportsAudioWorklet: false,
  hasGeolocation: false,
  cameraDeviceCount: null,
  microphoneDeviceCount: null,
  permissionHints: {
    camera: "unknown",
    microphone: "unknown",
    location: "unknown",
  },
};

const EMPTY_CAMERA_DETAILS: CameraDetails = {
  width: null,
  height: null,
  frameRate: null,
  facingMode: null,
  deviceLabel: null,
  liveTracksAtPeak: 0,
  released: false,
  remainingLiveTracks: 0,
};

const EMPTY_MIC_DETAILS: MicrophoneDetails = {
  sampleRate: null,
  channelCount: null,
  deviceLabel: null,
  peakLevelDbfs: null,
  liveLevelDbfs: null,
  signalDetected: false,
  audioContextClosed: true,
  released: false,
  remainingLiveTracks: 0,
};

const EMPTY_LOCATION_DETAILS: LocationDetails = {
  latitude: null,
  longitude: null,
  accuracy: null,
  timestamp: null,
};

function formatFacingMode(raw: string | undefined): string | null {
  if (raw === "environment") return "cámara trasera";
  if (raw === "user") return "cámara frontal";
  return raw ? sanitizeDeviceLabel(raw) : null;
}

function stopStreamTracksSafely(stream: MediaStream | null): number {
  if (!stream) return 0;
  const tracks = stream.getTracks();
  for (const track of tracks) {
    try {
      if (track.readyState === "live") {
        track.stop();
      }
    } catch {
      // Ignorar si la pista ya estaba detenida por el navegador
    }
  }
  return tracks.filter((track) => track.readyState === "live").length;
}

function getErrorName(err: unknown): string {
  if (err instanceof DOMException) return err.name;
  if (err && typeof err === "object" && "name" in err && typeof err.name === "string") {
    return err.name;
  }
  return "";
}

export function useDeviceCheck() {
  const { triggerHaptic } = useAppMode();
  const { registerCapture, updateCapturePhase, clearCapture } = useMediaCapture();

  const [capabilities, setCapabilities] =
    useState<BrowserCapabilitiesSnapshot>(INITIAL_CAPABILITIES);
  const [capabilitiesReady, setCapabilitiesReady] = useState(false);

  const [cameraStatus, setCameraStatus] = useState<SensorCheckStatus>("idle");
  const [cameraMessage, setCameraMessage] = useState<SensorMessage | null>(null);
  const [cameraDetails, setCameraDetails] = useState<CameraDetails>(EMPTY_CAMERA_DETAILS);
  const [cameraCountdownSec, setCameraCountdownSec] = useState<number | null>(null);

  const [micStatus, setMicStatus] = useState<SensorCheckStatus>("idle");
  const [micMessage, setMicMessage] = useState<SensorMessage | null>(null);
  const [micDetails, setMicDetails] = useState<MicrophoneDetails>(EMPTY_MIC_DETAILS);
  const [micCountdownSec, setMicCountdownSec] = useState<number | null>(null);

  const [locationStatus, setLocationStatus] = useState<SensorCheckStatus>("idle");
  const [locationMessage, setLocationMessage] = useState<SensorMessage | null>(null);
  const [locationDetails, setLocationDetails] =
    useState<LocationDetails>(EMPTY_LOCATION_DETAILS);

  const [isRunningSequence, setIsRunningSequence] = useState(false);

  const mountedRef = useRef(true);
  const sequenceIdRef = useRef(0);
  const registeredCaptureRef = useRef(false);
  const hasShownBannerRef = useRef(false);
  const cameraStatusRef = useRef<SensorCheckStatus>("idle");
  const micStatusRef = useRef<SensorCheckStatus>("idle");
  const locationStatusRef = useRef<SensorCheckStatus>("idle");

  const updateCameraStatus = useCallback((next: SensorCheckStatus) => {
    cameraStatusRef.current = next;
    setCameraStatus(next);
  }, []);

  const updateMicStatus = useCallback((next: SensorCheckStatus) => {
    micStatusRef.current = next;
    setMicStatus(next);
  }, []);

  const updateLocationStatus = useCallback((next: SensorCheckStatus) => {
    locationStatusRef.current = next;
    setLocationStatus(next);
  }, []);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraTrackCleanupsRef = useRef<Array<() => void>>([]);
  const cameraRequestIdRef = useRef(0);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micSampleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const micCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const micTrackCleanupsRef = useRef<Array<() => void>>([]);
  const micRequestIdRef = useRef(0);
  const micPeakRef = useRef<number | null>(null);

  const locationRequestIdRef = useRef(0);
  const locationResolveRef = useRef<(() => void) | null>(null);

  const liveNow = useNowTicker(locationDetails.timestamp !== null, 15_000);

  const safeHaptic = useCallback(
    (ms: number) => {
      if (
        typeof window !== "undefined" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        triggerHaptic(ms);
      }
    },
    [triggerHaptic]
  );

  const refreshPassiveInfo = useCallback(async () => {
    const syncSnapshot = readPassiveCapabilities();
    if (!mountedRef.current) return;
    setCapabilities(syncSnapshot);
    setCapabilitiesReady(true);

    const asyncProbe = await probePassivePermissionsAndDevices();
    if (!mountedRef.current) return;
    setCapabilities((prev) => ({
      ...prev,
      ...asyncProbe,
      permissionHints: asyncProbe.permissionHints ?? prev.permissionHints,
    }));
  }, []);

  const releaseCamera = useCallback(
    (reason: "verified" | "interrupted" | "reset" | "unmount") => {
      if (cameraTimerRef.current) {
        clearTimeout(cameraTimerRef.current);
        cameraTimerRef.current = null;
      }
      if (cameraIntervalRef.current) {
        clearInterval(cameraIntervalRef.current);
        cameraIntervalRef.current = null;
      }
      for (const cleanup of cameraTrackCleanupsRef.current) {
        cleanup();
      }
      cameraTrackCleanupsRef.current = [];

      const stream = cameraStreamRef.current;
      cameraStreamRef.current = null;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = null;
      }

      const remaining = stopStreamTracksSafely(stream);

      if (reason === "unmount") {
        if (registeredCaptureRef.current || hasShownBannerRef.current) {
          registeredCaptureRef.current = false;
          hasShownBannerRef.current = false;
          clearCapture();
        }
        return;
      }

      if (registeredCaptureRef.current && stream) {
        registeredCaptureRef.current = false;
        updateCapturePhase("stopped", "device-check");
      }

      if (!mountedRef.current) return;
      setCameraCountdownSec(null);

      if (reason === "reset") {
        updateCameraStatus("idle");
        setCameraMessage(null);
        setCameraDetails(EMPTY_CAMERA_DETAILS);
        return;
      }

      setCameraDetails((prev) => ({
        ...prev,
        released: true,
        remainingLiveTracks: remaining,
      }));

      if (reason === "interrupted") {
        updateCameraStatus("interrupted");
        setCameraMessage({
          headline: "La cámara se detuvo inesperadamente",
          detail:
            "El navegador o el sistema cerró la pista de video. Las pistas fueron liberadas.",
        });
      } else {
        updateCameraStatus("verified");
        setCameraMessage({
          headline: "Cámara verificada y apagada",
          detail:
            "Respondió en tu navegador sin enviar imágenes. Todas las pistas quedaron liberadas.",
        });
      }
    },
    [clearCapture, updateCameraStatus, updateCapturePhase]
  );

  const releaseMicrophone = useCallback(
    (reason: "verified" | "interrupted" | "reset" | "unmount") => {
      if (micTimerRef.current) {
        clearTimeout(micTimerRef.current);
        micTimerRef.current = null;
      }
      if (micSampleIntervalRef.current) {
        clearInterval(micSampleIntervalRef.current);
        micSampleIntervalRef.current = null;
      }
      if (micCountdownIntervalRef.current) {
        clearInterval(micCountdownIntervalRef.current);
        micCountdownIntervalRef.current = null;
      }
      for (const cleanup of micTrackCleanupsRef.current) {
        cleanup();
      }
      micTrackCleanupsRef.current = [];

      const stream = micStreamRef.current;
      micStreamRef.current = null;
      const remaining = stopStreamTracksSafely(stream);

      const audioCtx = micAudioContextRef.current;
      micAudioContextRef.current = null;
      if (audioCtx) {
        void audioCtx.close().catch(() => {});
      }

      if (reason === "unmount") {
        if (registeredCaptureRef.current || hasShownBannerRef.current) {
          registeredCaptureRef.current = false;
          hasShownBannerRef.current = false;
          clearCapture();
        }
        return;
      }

      if (registeredCaptureRef.current && stream) {
        registeredCaptureRef.current = false;
        updateCapturePhase("stopped", "device-check");
      }

      if (!mountedRef.current) return;
      setMicCountdownSec(null);

      if (reason === "reset") {
        micPeakRef.current = null;
        updateMicStatus("idle");
        setMicMessage(null);
        setMicDetails(EMPTY_MIC_DETAILS);
        return;
      }

      const peak = micPeakRef.current;
      const detected = peak !== null && peak > MIC_SIGNAL_THRESHOLD_DBFS;
      setMicDetails((prev) => ({
        ...prev,
        liveLevelDbfs: null,
        peakLevelDbfs: peak,
        signalDetected: prev.signalDetected || detected,
        audioContextClosed: true,
        released: true,
        remainingLiveTracks: remaining,
      }));

      if (reason === "interrupted") {
        updateMicStatus("interrupted");
        setMicMessage({
          headline: "El micrófono se interrumpió",
          detail:
            "El navegador o el sistema desconectó el micrófono durante la prueba. Recursos liberados.",
        });
      } else {
        updateMicStatus("verified");
        setMicMessage({
          headline: "Micrófono verificado y apagado",
          detail: detected
            ? "Se detectó señal de entrada en memoria local y el micrófono quedó liberado."
            : "El micrófono abrió y liberó sus pistas. Si no viste señal, revisa si está silenciado en el sistema.",
        });
      }
    },
    [clearCapture, updateCapturePhase, updateMicStatus]
  );

  const cancelLocationWait = useCallback(
    (resetData: boolean) => {
      ++locationRequestIdRef.current;
      const resolver = locationResolveRef.current;
      locationResolveRef.current = null;
      resolver?.();
      if (!mountedRef.current) return;
      updateLocationStatus("idle");
      if (resetData) {
        setLocationMessage(null);
        setLocationDetails(EMPTY_LOCATION_DETAILS);
      }
    },
    [updateLocationStatus]
  );

  const invalidateAllPending = useCallback(() => {
    ++sequenceIdRef.current;
    ++cameraRequestIdRef.current;
    ++micRequestIdRef.current;
    ++locationRequestIdRef.current;
    locationResolveRef.current?.();
    locationResolveRef.current = null;
  }, []);

  const resetAllChecks = useCallback(() => {
    invalidateAllPending();
    setIsRunningSequence(false);
    releaseCamera("reset");
    releaseMicrophone("reset");
    cancelLocationWait(true);
    clearCapture();
    registeredCaptureRef.current = false;
    hasShownBannerRef.current = false;
  }, [cancelLocationWait, clearCapture, invalidateAllPending, releaseCamera, releaseMicrophone]);

  useEffect(() => {
    mountedRef.current = true;
    const initTimer = setTimeout(() => {
      void refreshPassiveInfo();
    }, 0);

    const handleGlobalClear = () => {
      resetAllChecks();
    };
    const handlePageHide = () => {
      invalidateAllPending();
      releaseCamera("unmount");
      releaseMicrophone("unmount");
    };

    window.addEventListener("alzavoz:escape", handleGlobalClear);
    window.addEventListener(SHARED_SESSION_CLEAR_EVENT, handleGlobalClear);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);
      invalidateAllPending();
      releaseCamera("unmount");
      releaseMicrophone("unmount");
      window.removeEventListener("alzavoz:escape", handleGlobalClear);
      window.removeEventListener(SHARED_SESSION_CLEAR_EVENT, handleGlobalClear);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [invalidateAllPending, refreshPassiveInfo, releaseCamera, releaseMicrophone, resetAllChecks]);

  useEffect(() => {
    if (cameraStatus === "active" && cameraVideoRef.current && cameraStreamRef.current) {
      if (cameraVideoRef.current.srcObject !== cameraStreamRef.current) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
      }
    }
  }, [cameraStatus]);

  const runCameraCheck = useCallback(
    async (autoReleaseAfterMs: number = DEVICE_PREVIEW_TIMEOUT_MS): Promise<void> => {
      const requestId = ++cameraRequestIdRef.current;
      if (
        micStreamRef.current ||
        micStatusRef.current === "active" ||
        micStatusRef.current === "requesting"
      ) {
        ++micRequestIdRef.current;
        releaseMicrophone(micStreamRef.current ? "verified" : "reset");
      }
      if (cameraStreamRef.current) {
        releaseCamera("reset");
      }

      const freshCaps = readPassiveCapabilities();
      setCapabilities((prev) => ({ ...prev, ...freshCaps }));

      if (!freshCaps.isSecureContext || !freshCaps.hasMediaDevices) {
        const classified = classifyMediaError("camera", null, freshCaps);
        updateCameraStatus(classified.status);
        setCameraMessage({ headline: classified.headline, detail: classified.detail });
        setCameraDetails({ ...EMPTY_CAMERA_DETAILS, released: true, remainingLiveTracks: 0 });
        return;
      }

      updateCameraStatus("requesting");
      setCameraMessage({
        headline: "Esperando permiso de cámara…",
        detail: "Acepta el aviso del navegador para comprobar la imagen localmente.",
      });
      setCameraDetails(EMPTY_CAMERA_DETAILS);
      safeHaptic(25);

      let stream: MediaStream | null = null;
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: { ideal: "environment" },
            },
            audio: false,
          });
        } catch (firstErr) {
          const errName = getErrorName(firstErr);
          if (errName === "OverconstrainedError" || errName === "ConstraintNotSatisfiedError") {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw firstErr;
          }
        }
      } catch (err) {
        if (!mountedRef.current || requestId !== cameraRequestIdRef.current) return;
        const classified = classifyMediaError("camera", err, freshCaps);
        updateCameraStatus(classified.status);
        setCameraMessage({ headline: classified.headline, detail: classified.detail });
        setCameraDetails({ ...EMPTY_CAMERA_DETAILS, released: true, remainingLiveTracks: 0 });
        void refreshPassiveInfo();
        return;
      }

      if (!mountedRef.current || requestId !== cameraRequestIdRef.current) {
        stopStreamTracksSafely(stream);
        return;
      }

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        stopStreamTracksSafely(stream);
        updateCameraStatus("missing");
        setCameraMessage({
          headline: "No se recibió pista de video",
          detail: "El navegador concedió permiso pero no entregó ninguna cámara activa.",
        });
        setCameraDetails({ ...EMPTY_CAMERA_DETAILS, released: true, remainingLiveTracks: 0 });
        return;
      }

      const primaryTrack = videoTracks[0];
      const settings = primaryTrack.getSettings ? primaryTrack.getSettings() : {};
      const liveCount = stream.getTracks().filter((t) => t.readyState === "live").length;

      cameraStreamRef.current = stream;
      registeredCaptureRef.current = true;
      hasShownBannerRef.current = true;
      const unregister = registerCapture(stream, "device-check", () => {
        if (cameraStreamRef.current === stream) {
          releaseCamera("verified");
        }
      });

      const trackEndHandler = () => {
        if (cameraStreamRef.current === stream) {
          releaseCamera("interrupted");
        }
      };
      for (const track of stream.getTracks()) {
        track.addEventListener("ended", trackEndHandler, { once: true });
      }
      cameraTrackCleanupsRef.current = [
        unregister,
        () => {
          for (const track of stream.getTracks()) {
            track.removeEventListener("ended", trackEndHandler);
          }
        },
      ];

      setCameraDetails({
        width: typeof settings.width === "number" ? settings.width : null,
        height: typeof settings.height === "number" ? settings.height : null,
        frameRate: typeof settings.frameRate === "number" ? Math.round(settings.frameRate) : null,
        facingMode: formatFacingMode(settings.facingMode),
        deviceLabel: sanitizeDeviceLabel(primaryTrack.label),
        liveTracksAtPeak: liveCount,
        released: false,
        remainingLiveTracks: liveCount,
      });
      updateCameraStatus("active");
      setCameraMessage({
        headline: "Cámara activa solo en tu pantalla",
        detail: "Vista previa local. Se apagará automáticamente o al pulsar Detener.",
      });
      void refreshPassiveInfo();

      const totalSeconds = Math.max(1, Math.ceil(autoReleaseAfterMs / 1000));
      setCameraCountdownSec(totalSeconds);

      if (autoReleaseAfterMs >= 2_000) {
        let remainingSec = totalSeconds;
        cameraIntervalRef.current = setInterval(() => {
          remainingSec = Math.max(0, remainingSec - 1);
          if (mountedRef.current) {
            setCameraCountdownSec(remainingSec);
          }
        }, 1_000);
      }

      await new Promise<void>((resolve) => {
        cameraTimerRef.current = setTimeout(() => {
          if (cameraStreamRef.current === stream) {
            releaseCamera("verified");
          }
          resolve();
        }, autoReleaseAfterMs);
        cameraTrackCleanupsRef.current = [...cameraTrackCleanupsRef.current, () => resolve()];
      });
    },
    [refreshPassiveInfo, registerCapture, releaseCamera, releaseMicrophone, safeHaptic, updateCameraStatus]
  );

  const runMicrophoneCheck = useCallback(
    async (autoReleaseAfterMs: number = DEVICE_PREVIEW_TIMEOUT_MS): Promise<void> => {
      const requestId = ++micRequestIdRef.current;
      if (
        cameraStreamRef.current ||
        cameraStatusRef.current === "active" ||
        cameraStatusRef.current === "requesting"
      ) {
        ++cameraRequestIdRef.current;
        releaseCamera(cameraStreamRef.current ? "verified" : "reset");
      }
      if (micStreamRef.current) {
        releaseMicrophone("reset");
      }

      const freshCaps = readPassiveCapabilities();
      setCapabilities((prev) => ({ ...prev, ...freshCaps }));

      if (!freshCaps.isSecureContext || !freshCaps.hasMediaDevices) {
        const classified = classifyMediaError("microphone", null, freshCaps);
        updateMicStatus(classified.status);
        setMicMessage({ headline: classified.headline, detail: classified.detail });
        setMicDetails({ ...EMPTY_MIC_DETAILS, released: true, remainingLiveTracks: 0 });
        return;
      }

      updateMicStatus("requesting");
      setMicMessage({
        headline: "Esperando permiso de micrófono…",
        detail: "Acepta el aviso del navegador para comprobar el nivel de audio localmente.",
      });
      micPeakRef.current = null;
      setMicDetails(EMPTY_MIC_DETAILS);
      safeHaptic(25);

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err) {
        if (!mountedRef.current || requestId !== micRequestIdRef.current) return;
        const classified = classifyMediaError("microphone", err, freshCaps);
        updateMicStatus(classified.status);
        setMicMessage({ headline: classified.headline, detail: classified.detail });
        setMicDetails({ ...EMPTY_MIC_DETAILS, released: true, remainingLiveTracks: 0 });
        void refreshPassiveInfo();
        return;
      }

      if (!mountedRef.current || requestId !== micRequestIdRef.current) {
        stopStreamTracksSafely(stream);
        return;
      }

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stopStreamTracksSafely(stream);
        updateMicStatus("missing");
        setMicMessage({
          headline: "No se recibió pista de audio",
          detail: "El navegador concedió permiso pero no entregó ningún micrófono activo.",
        });
        setMicDetails({ ...EMPTY_MIC_DETAILS, released: true, remainingLiveTracks: 0 });
        return;
      }

      const primaryTrack = audioTracks[0];
      const settings = primaryTrack.getSettings ? primaryTrack.getSettings() : {};
      const liveCount = stream.getTracks().filter((t) => t.readyState === "live").length;

      micStreamRef.current = stream;
      registeredCaptureRef.current = true;
      hasShownBannerRef.current = true;
      const unregister = registerCapture(stream, "device-check", () => {
        if (micStreamRef.current === stream) {
          releaseMicrophone("verified");
        }
      });

      const trackEndHandler = () => {
        if (micStreamRef.current === stream) {
          releaseMicrophone("interrupted");
        }
      };
      for (const track of stream.getTracks()) {
        track.addEventListener("ended", trackEndHandler, { once: true });
      }
      micTrackCleanupsRef.current = [
        unregister,
        () => {
          for (const track of stream.getTracks()) {
            track.removeEventListener("ended", trackEndHandler);
          }
        },
      ];

      let sampleRate: number | null =
        typeof settings.sampleRate === "number" ? settings.sampleRate : null;
      const win = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtor =
        typeof window.AudioContext === "function" ? window.AudioContext : win.webkitAudioContext;

      let analyser: AnalyserNode | null = null;
      let audioCtx: AudioContext | null = null;
      let sourceNode: MediaStreamAudioSourceNode | null = null;

      if (AudioCtor) {
        try {
          audioCtx = new AudioCtor();
          micAudioContextRef.current = audioCtx;
          await audioCtx.resume().catch(() => {});
          if (micStreamRef.current !== stream) {
            void audioCtx.close().catch(() => {});
            return;
          }
          sampleRate = sampleRate ?? audioCtx.sampleRate;
          sourceNode = audioCtx.createMediaStreamSource(stream);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 1024;
          sourceNode.connect(analyser);
        } catch {
          if (audioCtx) {
            void audioCtx.close().catch(() => {});
            micAudioContextRef.current = null;
          }
          analyser = null;
        }
      }

      setMicDetails({
        sampleRate,
        channelCount: typeof settings.channelCount === "number" ? settings.channelCount : null,
        deviceLabel: sanitizeDeviceLabel(primaryTrack.label),
        peakLevelDbfs: null,
        liveLevelDbfs: null,
        signalDetected: false,
        audioContextClosed: audioCtx === null,
        released: false,
        remainingLiveTracks: liveCount,
      });
      updateMicStatus("active");
      setMicMessage({
        headline: "Micrófono activo solo en memoria local",
        detail:
          analyser !== null
            ? "Habla cerca del micrófono para confirmar señal. No se graba ni se envía."
            : "Pista de micrófono activa en tu navegador. No se graba ni se envía.",
      });
      void refreshPassiveInfo();

      if (analyser) {
        const buffer = new Float32Array(analyser.fftSize);
        const currentAnalyser = analyser;
        micSampleIntervalRef.current = setInterval(() => {
          if (!mountedRef.current || micStreamRef.current !== stream) return;
          try {
            currentAnalyser.getFloatTimeDomainData(buffer);
            let sum = 0;
            for (let i = 0; i < buffer.length; i += 1) {
              sum += buffer[i] * buffer[i];
            }
            const rms = Math.sqrt(sum / buffer.length);
            const dbfs = rms > 0 ? Math.max(-96, 20 * Math.log10(rms)) : null;
            if (dbfs !== null && (micPeakRef.current === null || dbfs > micPeakRef.current)) {
              micPeakRef.current = dbfs;
            }
            const detected =
              (dbfs !== null && dbfs > MIC_SIGNAL_THRESHOLD_DBFS) ||
              (micPeakRef.current !== null && micPeakRef.current > MIC_SIGNAL_THRESHOLD_DBFS);

            setMicDetails((prev) => ({
              ...prev,
              liveLevelDbfs: dbfs,
              peakLevelDbfs: micPeakRef.current,
              signalDetected: prev.signalDetected || detected,
            }));
          } catch {
            // Ignorar error puntual de muestreo si el contexto cerró
          }
        }, 120);
      }

      micTrackCleanupsRef.current.push(() => {
        try {
          sourceNode?.disconnect();
          analyser?.disconnect();
        } catch {
          // Ignorar
        }
      });

      const totalSeconds = Math.max(1, Math.ceil(autoReleaseAfterMs / 1000));
      setMicCountdownSec(totalSeconds);

      if (autoReleaseAfterMs >= 2_000) {
        let remainingSec = totalSeconds;
        micCountdownIntervalRef.current = setInterval(() => {
          remainingSec = Math.max(0, remainingSec - 1);
          if (mountedRef.current) {
            setMicCountdownSec(remainingSec);
          }
        }, 1_000);
      }

      await new Promise<void>((resolve) => {
        micTimerRef.current = setTimeout(() => {
          if (micStreamRef.current === stream) {
            releaseMicrophone("verified");
          }
          resolve();
        }, autoReleaseAfterMs);
        micTrackCleanupsRef.current.push(() => resolve());
      });
    },
    [refreshPassiveInfo, registerCapture, releaseCamera, releaseMicrophone, safeHaptic, updateMicStatus]
  );

  const runLocationCheck = useCallback(async (): Promise<void> => {
    const requestId = ++locationRequestIdRef.current;
    locationResolveRef.current?.();
    locationResolveRef.current = null;

    const freshCaps = readPassiveCapabilities();
    setCapabilities((prev) => ({ ...prev, ...freshCaps }));

    if (!freshCaps.isSecureContext || !freshCaps.hasGeolocation) {
      const classified = classifyGeolocationError(undefined, freshCaps);
      updateLocationStatus(classified.status);
      setLocationMessage({ headline: classified.headline, detail: classified.detail });
      setLocationDetails(EMPTY_LOCATION_DETAILS);
      return;
    }

    updateLocationStatus("requesting");
    setLocationMessage({
      headline: "Esperando permiso o señal GPS…",
      detail: "La posición se evaluará solo en tu navegador, sin consultar mapas externos.",
    });
    setLocationDetails(EMPTY_LOCATION_DETAILS);
    safeHaptic(25);

    await new Promise<void>((resolve) => {
      locationResolveRef.current = resolve;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mountedRef.current || requestId !== locationRequestIdRef.current) {
            resolve();
            return;
          }
          locationResolveRef.current = null;
          setLocationDetails({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: normalizeAccuracy(pos.coords.accuracy),
            timestamp: normalizeTimestamp(pos.timestamp),
          });
          updateLocationStatus("verified");
          setLocationMessage({
            headline: "Ubicación leída localmente",
            detail: "Solo se mostró en tu pantalla; no se envió por red ni se consultaron servidores.",
          });
          safeHaptic(35);
          void refreshPassiveInfo();
          resolve();
        },
        (err) => {
          if (!mountedRef.current || requestId !== locationRequestIdRef.current) {
            resolve();
            return;
          }
          locationResolveRef.current = null;
          const classified = classifyGeolocationError(err.code, freshCaps);
          updateLocationStatus(classified.status);
          setLocationMessage({ headline: classified.headline, detail: classified.detail });
          setLocationDetails(EMPTY_LOCATION_DETAILS);
          void refreshPassiveInfo();
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 5_000,
        }
      );
    });
  }, [refreshPassiveInfo, safeHaptic, updateLocationStatus]);

  const runSequentialCheck = useCallback(async () => {
    const seqId = ++sequenceIdRef.current;
    setIsRunningSequence(true);

    try {
      await runCameraCheck(SEQUENCE_CAMERA_SAMPLE_MS);
      if (!mountedRef.current || seqId !== sequenceIdRef.current) return;

      await runMicrophoneCheck(SEQUENCE_MIC_SAMPLE_MS);
      if (!mountedRef.current || seqId !== sequenceIdRef.current) return;

      await runLocationCheck();
    } finally {
      if (mountedRef.current && seqId === sequenceIdRef.current) {
        setIsRunningSequence(false);
      }
    }
  }, [runCameraCheck, runLocationCheck, runMicrophoneCheck]);

  const stopSequence = useCallback(() => {
    ++sequenceIdRef.current;
    setIsRunningSequence(false);
    if (cameraStreamRef.current) {
      releaseCamera("verified");
    } else if (cameraStatusRef.current === "requesting") {
      ++cameraRequestIdRef.current;
      releaseCamera("reset");
    }
    if (micStreamRef.current) {
      releaseMicrophone("verified");
    } else if (micStatusRef.current === "requesting") {
      ++micRequestIdRef.current;
      releaseMicrophone("reset");
    }
    if (locationStatusRef.current === "requesting") {
      cancelLocationWait(false);
    }
  }, [cancelLocationWait, releaseCamera, releaseMicrophone]);

  const locationAssessment =
    locationStatus === "verified" && locationDetails.timestamp !== null
      ? assessLocation({
          source: "gps",
          status: "success",
          timestamp: locationDetails.timestamp,
          accuracy: locationDetails.accuracy,
          now: liveNow,
        })
      : null;

  const statusGroup = {
    camera: cameraStatus,
    microphone: micStatus,
    location: locationStatus,
  };

  const cameraAlternatives =
    isSensorFailureStatus(cameraStatus) ||
    (capabilitiesReady && capabilities.cameraDeviceCount === 0 && cameraStatus === "idle")
      ? getAlternativesForSensor("camera", cameraStatus, statusGroup)
      : [];

  const micAlternatives =
    isSensorFailureStatus(micStatus) ||
    (capabilitiesReady && capabilities.microphoneDeviceCount === 0 && micStatus === "idle")
      ? getAlternativesForSensor("microphone", micStatus, statusGroup)
      : [];

  const locationAlternatives =
    isSensorFailureStatus(locationStatus) || (locationAssessment?.needsAttention ?? false)
      ? getAlternativesForSensor("location", locationStatus, statusGroup)
      : [];

  const toolReadiness = computeToolReadiness(capabilities, statusGroup);
  const hasAnyResult =
    cameraStatus !== "idle" || micStatus !== "idle" || locationStatus !== "idle";

  return {
    capabilities,
    capabilitiesReady,
    cameraStatus,
    cameraMessage,
    cameraDetails,
    cameraCountdownSec,
    cameraVideoRef,
    micStatus,
    micMessage,
    micDetails,
    micCountdownSec,
    locationStatus,
    locationMessage,
    locationDetails,
    locationAssessment,
    isRunningSequence,
    hasAnyResult,
    cameraAlternatives,
    micAlternatives,
    locationAlternatives,
    toolReadiness,
    runCameraCheck,
    releaseCamera,
    runMicrophoneCheck,
    releaseMicrophone,
    runLocationCheck,
    cancelLocationWait,
    runSequentialCheck,
    stopSequence,
    resetAllChecks,
  };
}
