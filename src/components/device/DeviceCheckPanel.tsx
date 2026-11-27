"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  Mic,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Square,
  Volume2,
  WifiOff,
} from "lucide-react";
import { LocationStatusPanel } from "@/components/location/LocationStatusPanel";
import { useDeviceCheck, type SensorMessage } from "@/hooks/useDeviceCheck";
import {
  isSensorFailureStatus,
  type AlternativeAction,
  type PermissionHint,
  type SensorCheckStatus,
  type ToolReadinessItem,
} from "@/lib/device/check";

function statusBadgeLabel(
  status: SensorCheckStatus,
  kind: "camera" | "microphone" | "location"
): string {
  switch (status) {
    case "idle":
      return "Sin probar";
    case "requesting":
      return "Esperando permiso…";
    case "active":
      return kind === "camera" ? "Cámara activa (local)" : "Micrófono activo (local)";
    case "verified":
      return kind === "location"
        ? "Ubicación leída (local)"
        : kind === "camera"
          ? "Lista y liberada"
          : "Listo y liberado";
    case "denied":
      return "Permiso denegado";
    case "missing":
      return kind === "microphone" ? "No detectado" : "No detectada";
    case "busy":
      return kind === "camera" ? "Ocupada en otra app" : "Ocupado en otra app";
    case "unsupported":
      return "Sin soporte";
    case "insecure":
      return "Requiere HTTPS";
    case "timeout":
      return "Tiempo agotado";
    case "interrupted":
      return kind === "camera" ? "Interrumpida" : "Interrumpido";
    case "error":
      return "No disponible";
  }
}

function statusBadgeClass(status: SensorCheckStatus): string {
  if (status === "verified") {
    return "border-emerald-500/60 bg-emerald-950/70 text-emerald-100";
  }
  if (status === "active") {
    return "border-cyan-400/70 bg-cyan-950/80 text-cyan-100";
  }
  if (status === "requesting" || isSensorFailureStatus(status)) {
    return "border-amber-500/70 bg-amber-950/80 text-amber-100";
  }
  return "border-gray-600 bg-gray-900 text-gray-200";
}

function permissionHintLabel(hint: PermissionHint): string {
  switch (hint) {
    case "granted":
      return "Permitido en este sitio";
    case "denied":
      return "Bloqueado en el navegador";
    case "prompt":
      return "Pedirá confirmación al probar";
    case "unknown":
      return "Se verifica al pulsar probar";
  }
}

function readinessBadgeInfo(status: ToolReadinessItem["status"]): {
  label: string;
  classes: string;
} {
  switch (status) {
    case "ready":
      return {
        label: "Disponible",
        classes: "border-emerald-500/60 bg-emerald-950/70 text-emerald-100",
      };
    case "fallback":
      return {
        label: "Con alternativa",
        classes: "border-cyan-500/60 bg-cyan-950/70 text-cyan-100",
      };
    case "limited":
      return {
        label: "Uso parcial",
        classes: "border-amber-500/70 bg-amber-950/80 text-amber-100",
      };
    case "unavailable":
      return {
        label: "No compatible aquí",
        classes: "border-red-500/60 bg-red-950/70 text-red-100",
      };
    case "untested":
      return {
        label: "Pendiente de probar",
        classes: "border-gray-600 bg-gray-900 text-gray-200",
      };
  }
}

function dbfsToPercent(dbfs: number | null): number {
  if (dbfs === null) return 0;
  const clamped = Math.max(-72, Math.min(0, dbfs));
  return Math.round(((clamped + 72) / 72) * 100);
}

function SensorHeader({
  icon,
  titleId,
  title,
  status,
  kind,
  badgeTestId,
}: {
  icon: ReactNode;
  titleId: string;
  title: string;
  status: SensorCheckStatus;
  kind: "camera" | "microphone" | "location";
  badgeTestId: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-center gap-2.5">
        {icon}
        <h2 id={titleId} className="text-lg font-bold text-white">
          {title}
        </h2>
      </div>
      <span
        data-testid={badgeTestId}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
          status
        )}`}
      >
        {status === "verified" ? (
          <CheckCircle2 size={14} aria-hidden="true" />
        ) : isSensorFailureStatus(status) ? (
          <AlertTriangle size={14} aria-hidden="true" />
        ) : (
          <Clock size={14} aria-hidden="true" />
        )}
        <span>{statusBadgeLabel(status, kind)}</span>
      </span>
    </div>
  );
}

function SensorMessageBox({
  status,
  message,
  children,
}: {
  status: SensorCheckStatus;
  message: SensorMessage | null;
  children?: ReactNode;
}) {
  if (!message) return null;

  return (
    <div
      role={isSensorFailureStatus(status) ? "alert" : "status"}
      className="space-y-1 rounded-xl border border-gray-700 bg-[#0B0F19] p-3 text-xs leading-relaxed"
    >
      <p className="font-bold text-white">{message.headline}</p>
      <p className="text-gray-300">{message.detail}</p>
      {children}
    </div>
  );
}

function AlternativesBox({
  alternatives,
  testId,
}: {
  alternatives: AlternativeAction[];
  testId: string;
}) {
  if (alternatives.length === 0) return null;

  return (
    <div
      data-testid={testId}
      className="space-y-2.5 rounded-xl border border-amber-500/50 bg-[#0B0F19] p-3.5"
    >
      <p className="text-xs font-semibold text-amber-200">
        Alternativas disponibles en AlzaVoz:
      </p>
      <ul className="space-y-2.5">
        {alternatives.map((alt) => (
          <li key={alt.id} className="space-y-1 text-xs leading-relaxed text-gray-200">
            <p className="font-semibold text-white">{alt.title}</p>
            <p className="text-gray-300">{alt.description}</p>
            {alt.href && alt.actionLabel && (
              <Link
                href={alt.href}
                prefetch={false}
                className="touch-target-min mt-1 inline-flex min-h-14 items-center gap-2 rounded-xl border border-cyan-500/50 bg-[#111827] px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                <span>{alt.actionLabel}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeviceCheckPanel() {
  const {
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
  } = useDeviceCheck();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-20 text-gray-100">
      <header className="flex flex-col gap-4 rounded-2xl border border-gray-700 bg-[#111827] p-[16px] sm:p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap sm:flex-nowrap items-start gap-4">
          <Image
            src="/assets/alzabot/bot-standard.png"
            alt="Alza Bot Cívico"
            width={56}
            height={56}
            className="h-[56px] w-[56px] shrink-0 rounded-xl border border-cyan-500/40 bg-[#0B0F19]"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl break-words">
              Comprobación previa del dispositivo
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-gray-200">
              Prueba cámara, micrófono y ubicación antes de necesitarlos. Cada prueba pide permiso
              solo cuando la inicias, se ejecuta únicamente en este navegador y libera el hardware al terminar.
            </p>
          </div>
        </div>
      </header>

      <section
        aria-label="Garantía de prueba local y controles generales"
        className="space-y-4 rounded-2xl border border-cyan-500/40 bg-[#111827] p-[16px] sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-cyan-100">
          <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-[#0B0F19] px-3 py-1.5 font-semibold">
            <WifiOff size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
            <span>0 bytes enviados · Sin conexión a servidor</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-[#0B0F19] px-3 py-1.5 text-gray-200">
            <Lock size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
            <span>No guarda grabaciones ni coordenadas; Salir rápido apaga todo</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {isRunningSequence ? (
            <button
              type="button"
              onClick={stopSequence}
              data-testid="device-check-stop-sequence"
              className="touch-target-min inline-flex min-h-[56px] min-w-[56px] flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/60 bg-red-800 px-5 py-3 text-center text-sm font-bold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200 motion-safe:active:scale-95"
            >
              <Square size={18} className="shrink-0" aria-hidden="true" />
              <span>Detener secuencia</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void runSequentialCheck()}
              data-testid="device-check-run-all"
              className="touch-target-min inline-flex min-h-[56px] min-w-[56px] flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-center text-sm font-bold text-[#0B0F19] hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-safe:active:scale-95"
            >
              <Play size={18} className="shrink-0" aria-hidden="true" />
              <span>Comprobar los tres en secuencia</span>
            </button>
          )}

          {hasAnyResult && (
            <button
              type="button"
              onClick={resetAllChecks}
              data-testid="device-check-reset"
              className="touch-target-min inline-flex min-h-[56px] min-w-[56px] items-center justify-center gap-2 rounded-xl border border-gray-600 bg-[#0B0F19] px-4 py-3 text-center text-sm font-semibold text-gray-100 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-safe:active:scale-95"
            >
              <RotateCcw size={17} className="shrink-0" aria-hidden="true" />
              <span>Limpiar resultados</span>
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* 1. CÁMARA */}
        <section
          aria-labelledby="camera-check-title"
          data-testid="sensor-card-camera"
          className="flex min-w-0 flex-col justify-between gap-4 rounded-2xl border border-gray-700 bg-[#111827] p-[16px] sm:p-5"
        >
          <div className="space-y-4">
            <SensorHeader
              icon={<Camera size={22} className="shrink-0 text-cyan-300" aria-hidden="true" />}
              titleId="camera-check-title"
              title="Cámara"
              status={cameraStatus}
              kind="camera"
              badgeTestId="camera-status-badge"
            />

            <dl className="grid grid-cols-1 gap-2 rounded-xl border border-gray-800 bg-[#0B0F19] p-3 text-xs text-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">Video WebM (grabar)</dt>
                <dd className="font-semibold text-white break-words">
                  {!capabilitiesReady
                    ? "Verificando…"
                    : capabilities.supportsVideoWebm
                      ? "Compatible (VP8/Opus)"
                      : capabilities.supportsVideoWebmFallback
                        ? "WebM básico"
                        : "No compatible"}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">Cámaras detectadas</dt>
                <dd className="font-tabular font-semibold text-white break-words">
                  {!capabilitiesReady
                    ? "…"
                    : capabilities.cameraDeviceCount === null
                      ? "Se confirma al probar"
                      : `${capabilities.cameraDeviceCount}`}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">Permiso previo</dt>
                <dd className="font-semibold text-white break-words">
                  {permissionHintLabel(capabilities.permissionHints.camera)}
                </dd>
              </div>
            </dl>

            {cameraStatus === "active" && (
              <div className="space-y-2.5">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  data-sensitive="true"
                  aria-label="Vista previa local de la cámara"
                  className="aspect-video w-full rounded-xl border border-cyan-500/50 bg-black object-contain"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-100 font-tabular">
                  <span>
                    {cameraDetails.width && cameraDetails.height
                      ? `${cameraDetails.width} × ${cameraDetails.height}`
                      : "Resolución activa"}
                    {cameraDetails.frameRate ? ` · ${cameraDetails.frameRate} fps` : ""}
                    {cameraDetails.facingMode ? ` · ${cameraDetails.facingMode}` : ""}
                  </span>
                  {cameraCountdownSec !== null && <span>Se apaga en {cameraCountdownSec} s</span>}
                </div>
              </div>
            )}

            <SensorMessageBox status={cameraStatus} message={cameraMessage}>
              {cameraDetails.deviceLabel && (
                <p className="text-gray-300">
                  Sensor: <strong className="text-white">{cameraDetails.deviceLabel}</strong>
                </p>
              )}
              {cameraStatus === "verified" && cameraDetails.width && cameraDetails.height && (
                <p className="font-tabular text-gray-300">
                  Resolución observada:{" "}
                  <strong className="text-white">
                    {cameraDetails.width} × {cameraDetails.height}
                  </strong>
                  {cameraDetails.facingMode ? ` (${cameraDetails.facingMode})` : ""}
                </p>
              )}
              {cameraDetails.released && (
                <p
                  data-testid="camera-release-status"
                  className="font-tabular font-semibold text-emerald-300"
                >
                  Cámara liberada · {cameraDetails.remainingLiveTracks} pistas activas
                </p>
              )}
            </SensorMessageBox>

            <AlternativesBox alternatives={cameraAlternatives} testId="camera-alternatives" />
          </div>

          <div className="pt-1">
            {cameraStatus === "active" ? (
              <button
                type="button"
                onClick={() => releaseCamera("verified")}
                data-testid="camera-stop-btn"
                className="touch-target-min inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-red-400/60 bg-red-800 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200 motion-safe:active:scale-95"
              >
                <Square size={17} aria-hidden="true" />
                <span>Apagar y liberar cámara</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={cameraStatus === "requesting" || isRunningSequence}
                onClick={() => void runCameraCheck()}
                data-testid="camera-test-btn"
                className="touch-target-min inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-[#0B0F19] px-4 py-3 text-sm font-bold text-cyan-100 hover:bg-gray-800 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-safe:active:scale-95"
              >
                {cameraStatus === "idle" ? (
                  <Camera size={18} aria-hidden="true" />
                ) : (
                  <RefreshCw size={18} aria-hidden="true" />
                )}
                <span>
                  {cameraStatus === "requesting"
                    ? "Solicitando cámara…"
                    : cameraStatus === "idle"
                      ? "Probar cámara"
                      : "Probar cámara de nuevo"}
                </span>
              </button>
            )}
          </div>
        </section>

        {/* 2. MICRÓFONO */}
        <section
          aria-labelledby="mic-check-title"
          data-testid="sensor-card-microphone"
          className="flex min-w-0 flex-col justify-between gap-4 rounded-2xl border border-gray-700 bg-[#111827] p-[16px] sm:p-5"
        >
          <div className="space-y-4">
            <SensorHeader
              icon={<Mic size={22} className="shrink-0 text-cyan-300" aria-hidden="true" />}
              titleId="mic-check-title"
              title="Micrófono"
              status={micStatus}
              kind="microphone"
              badgeTestId="microphone-status-badge"
            />

            <dl className="grid grid-cols-1 gap-2 rounded-xl border border-gray-800 bg-[#0B0F19] p-3 text-xs text-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">Audio WebM (Opus)</dt>
                <dd className="font-semibold text-white break-words">
                  {!capabilitiesReady
                    ? "Verificando…"
                    : capabilities.supportsAudioWebm
                      ? "Compatible"
                      : capabilities.hasMediaRecorder
                        ? "Limitado"
                        : "No compatible"}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">Sonómetro (AudioWorklet)</dt>
                <dd className="font-semibold text-white break-words">
                  {!capabilitiesReady
                    ? "…"
                    : capabilities.supportsAudioContext && capabilities.supportsAudioWorklet
                      ? "Compatible"
                      : "No disponible"}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">Micrófonos detectados</dt>
                <dd className="font-tabular font-semibold text-white break-words">
                  {!capabilitiesReady
                    ? "…"
                    : capabilities.microphoneDeviceCount === null
                      ? "Se confirma al probar"
                      : `${capabilities.microphoneDeviceCount}`}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">Permiso previo</dt>
                <dd className="font-semibold text-white break-words">
                  {permissionHintLabel(capabilities.permissionHints.microphone)}
                </dd>
              </div>
            </dl>

            {micStatus === "active" && (
              <div className="space-y-2.5 rounded-xl border border-cyan-500/50 bg-[#0B0F19] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-100">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Volume2 size={15} className="text-cyan-300" aria-hidden="true" />
                    <span>Nivel local de entrada</span>
                  </span>
                  <span className="font-tabular font-bold text-white">
                    {micDetails.liveLevelDbfs !== null
                      ? `${micDetails.liveLevelDbfs.toFixed(1)} dBFS`
                      : "Midiendo…"}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={dbfsToPercent(micDetails.liveLevelDbfs)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Nivel de audio captado localmente por el micrófono"
                  className="h-3 w-full overflow-hidden rounded-full border border-gray-700 bg-[#111827]"
                >
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-[width] duration-100"
                    style={{ width: `${dbfsToPercent(micDetails.liveLevelDbfs)}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300 font-tabular">
                  <span>
                    {micDetails.signalDetected
                      ? "Señal recibida"
                      : "Escuchando señal en memoria…"}
                  </span>
                  {micCountdownSec !== null && <span>Se apaga en {micCountdownSec} s</span>}
                </div>
              </div>
            )}

            <SensorMessageBox status={micStatus} message={micMessage}>
              {micDetails.deviceLabel && (
                <p className="text-gray-300">
                  Entrada: <strong className="text-white">{micDetails.deviceLabel}</strong>
                </p>
              )}
              {micStatus === "verified" && (micDetails.sampleRate || micDetails.peakLevelDbfs !== null) && (
                <p className="font-tabular text-gray-300">
                  {micDetails.sampleRate ? `${micDetails.sampleRate} Hz` : "Audio listo"}
                  {micDetails.peakLevelDbfs !== null
                    ? ` · Pico ${micDetails.peakLevelDbfs.toFixed(1)} dBFS`
                    : ""}
                </p>
              )}
              {micDetails.released && (
                <p
                  data-testid="microphone-release-status"
                  className="font-tabular font-semibold text-emerald-300"
                >
                  Micrófono liberado · {micDetails.remainingLiveTracks} pistas activas
                  {micDetails.audioContextClosed ? " · Audio cerrado" : ""}
                </p>
              )}
            </SensorMessageBox>

            <AlternativesBox alternatives={micAlternatives} testId="microphone-alternatives" />
          </div>

          <div className="pt-1">
            {micStatus === "active" ? (
              <button
                type="button"
                onClick={() => releaseMicrophone("verified")}
                data-testid="microphone-stop-btn"
                className="touch-target-min inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-red-400/60 bg-red-800 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200 motion-safe:active:scale-95"
              >
                <Square size={17} aria-hidden="true" />
                <span>Apagar y liberar micrófono</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={micStatus === "requesting" || isRunningSequence}
                onClick={() => void runMicrophoneCheck()}
                data-testid="microphone-test-btn"
                className="touch-target-min inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-[#0B0F19] px-4 py-3 text-sm font-bold text-cyan-100 hover:bg-gray-800 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-safe:active:scale-95"
              >
                {micStatus === "idle" ? (
                  <Mic size={18} aria-hidden="true" />
                ) : (
                  <RefreshCw size={18} aria-hidden="true" />
                )}
                <span>
                  {micStatus === "requesting"
                    ? "Solicitando micrófono…"
                    : micStatus === "idle"
                      ? "Probar micrófono"
                      : "Probar micrófono de nuevo"}
                </span>
              </button>
            )}
          </div>
        </section>

        {/* 3. UBICACIÓN */}
        <section
          aria-labelledby="location-check-title"
          data-testid="sensor-card-location"
          className="flex min-w-0 flex-col justify-between gap-4 rounded-2xl border border-gray-700 bg-[#111827] p-[16px] sm:p-5"
        >
          <div className="space-y-4">
            <SensorHeader
              icon={<MapPin size={22} className="shrink-0 text-cyan-300" aria-hidden="true" />}
              titleId="location-check-title"
              title="Ubicación (GPS)"
              status={locationStatus}
              kind="location"
              badgeTestId="location-status-badge"
            />

            <dl className="grid grid-cols-1 gap-2 rounded-xl border border-gray-800 bg-[#0B0F19] p-3 text-xs text-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">Contexto seguro</dt>
                <dd className="font-semibold text-white break-words">
                  {!capabilitiesReady
                    ? "Verificando…"
                    : capabilities.isSecureContext
                      ? "HTTPS / local seguro"
                      : "Sin HTTPS"}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">API de geolocalización</dt>
                <dd className="font-semibold text-white break-words">
                  {!capabilitiesReady
                    ? "…"
                    : capabilities.hasGeolocation
                      ? "Disponible"
                      : "No disponible"}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-gray-300">Permiso previo</dt>
                <dd className="font-semibold text-white break-words">
                  {permissionHintLabel(capabilities.permissionHints.location)}
                </dd>
              </div>
            </dl>

            {locationAssessment &&
              locationDetails.latitude !== null &&
              locationDetails.longitude !== null && (
                <LocationStatusPanel
                  assessment={locationAssessment}
                  isLoading={false}
                  showCoordinates={{
                    latitude: locationDetails.latitude,
                    longitude: locationDetails.longitude,
                  }}
                  testIdPrefix="device-location"
                />
              )}

            <SensorMessageBox status={locationStatus} message={locationMessage} />

            <AlternativesBox
              alternatives={locationAlternatives}
              testId="location-alternatives"
            />
          </div>

          <div className="pt-1">
            {locationStatus === "requesting" ? (
              <button
                type="button"
                onClick={() => cancelLocationWait(false)}
                data-testid="location-cancel-btn"
                className="touch-target-min inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-amber-400/60 bg-amber-950/60 px-4 py-3 text-sm font-bold text-amber-100 hover:bg-amber-900/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 motion-safe:active:scale-95"
              >
                <Square size={17} aria-hidden="true" />
                <span>Cancelar espera</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isRunningSequence}
                onClick={() => void runLocationCheck()}
                data-testid="location-test-btn"
                className="touch-target-min inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-[#0B0F19] px-4 py-3 text-sm font-bold text-cyan-100 hover:bg-gray-800 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-safe:active:scale-95"
              >
                {locationStatus === "idle" ? (
                  <MapPin size={18} aria-hidden="true" />
                ) : (
                  <RefreshCw size={18} aria-hidden="true" />
                )}
                <span>
                  {locationStatus === "idle" ? "Probar ubicación" : "Probar ubicación de nuevo"}
                </span>
              </button>
            )}
          </div>
        </section>
      </div>

      {/* RESUMEN DE CAPACIDADES EN ALZAVOZ */}
      <section
        aria-labelledby="readiness-title"
        data-testid="tool-readiness-summary"
        className="space-y-4 rounded-2xl border border-gray-700 bg-[#111827] p-[16px] sm:p-5"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={22} className="shrink-0 text-cyan-300" aria-hidden="true" />
          <h2 id="readiness-title" className="text-lg font-bold text-white">
            Qué puedes usar en este dispositivo
          </h2>
        </div>

        <ul className="divide-y divide-gray-800 border-t border-gray-800">
          {toolReadiness.map((item) => {
            const badge = readinessBadgeInfo(item.status);
            return (
              <li
                key={item.id}
                data-testid={item.id}
                className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{item.toolName}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-300">{item.summary}</p>
                </div>

                <Link
                  href={item.href}
                  prefetch={false}
                  aria-label={`Abrir ${item.toolName}`}
                  className="touch-target-min inline-flex min-h-[56px] shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-600 bg-[#0B0F19] px-4 py-2.5 text-xs font-semibold text-gray-100 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  <span>Abrir</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
