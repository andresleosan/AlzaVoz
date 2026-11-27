"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Camera,
  Car,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Share2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShieldAlert,
  MapPin,
} from "lucide-react";
import { VoluntarySpeechControl } from "@/components/speech/VoluntarySpeechControl";
import { buildSoloLatasStepSegments } from "@/lib/speech/readAloud";
import { useAppMode } from "@/context/AppModeContext";
import { type SoloLatasCrashData } from "@/types/defender";

export function SoloLatasAssistant() {
  const { triggerHaptic } = useAppMode();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [copiedActa, setCopiedActa] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const stepSpeechSegments = useMemo(
    () => buildSoloLatasStepSegments(currentStep),
    [currentStep]
  );

  // Estado de Fotos Obligatorias (Paso 1)
  const [photos, setPhotos] = useState<{
    panoramic: boolean;
    roadPosition: boolean;
    damageDetail: boolean;
    platesAndDocs: boolean;
  }>({
    panoramic: false,
    roadPosition: false,
    damageDetail: false,
    platesAndDocs: false,
  });

  // Estado de Datos de los Conductores (Paso 2)
  const [crashData, setCrashData] = useState<SoloLatasCrashData>({
    locationStreet: "Calle 50 (Colombia) con Carrera 65",
    locationNeighborhood: "La Candelaria / Suramericana",
    dateTime: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    driverA: {
      fullName: "",
      idNumber: "",
      vehiclePlate: "",
      phoneNumber: "",
      insurerName: "Seguros SURA / SOAT",
      policyOrSoatNumber: "",
    },
    driverB: {
      fullName: "",
      idNumber: "",
      vehiclePlate: "",
      phoneNumber: "",
      insurerName: "Seguros Bolívar / Segura",
      policyOrSoatNumber: "",
    },
    damageDescription: "Raspón lateral en guardabarro y bomper delantero.",
    photosTaken: {
      panoramic: false,
      roadPosition: false,
      damageDetail: false,
      platesAndDocs: false,
    },
    agreementNotes: "Ambas partes acuerdan retirar los vehículos inmediatamente de la vía pública conforme al Art. 16 Ley 2251 para evitar la sanción C.03 y remitir las fotos digitales a sus respectivas compañías aseguradoras.",
    clearedRoad: true,
  });

  const togglePhoto = useCallback(
    (key: keyof typeof photos) => {
      triggerHaptic(40);
      setPhotos((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        setCrashData((cd) => ({
          ...cd,
          photosTaken: updated,
        }));
        return updated;
      });
    },
    [triggerHaptic]
  );

  const allPhotosTaken =
    photos.panoramic &&
    photos.roadPosition &&
    photos.damageDetail &&
    photos.platesAndDocs;

  // Generador del Acta de Retiro Amistoso en Formato Estándar
  const generateActaText = useCallback(() => {
    return `================================================
ACTA RÁPIDA DE RETIRO DE VÍA Y CONCILIACIÓN "SOLO LATAS"
Marco Legal: Ley 2251 de 2022 (Art. 16 - Ley Julián Esteban)
Ciudad: Medellín, Colombia
================================================
FECHA Y HORA: ${crashData.dateTime}
LUGAR: ${crashData.locationStreet}, ${crashData.locationNeighborhood}

CONDUCTOR A:
- Nombre: ${crashData.driverA.fullName || "Conductor A"}
- Cédula: ${crashData.driverA.idNumber || "Por definir"}
- Placa Vehículo: ${crashData.driverA.vehiclePlate || "XXX-000"}
- Teléfono: ${crashData.driverA.phoneNumber || "No registrado"}
- Aseguradora/SOAT: ${crashData.driverA.insurerName}

CONDUCTOR B:
- Nombre: ${crashData.driverB.fullName || "Conductor B"}
- Cédula: ${crashData.driverB.idNumber || "Por definir"}
- Placa Vehículo: ${crashData.driverB.vehiclePlate || "YYY-111"}
- Teléfono: ${crashData.driverB.phoneNumber || "No registrado"}
- Aseguradora/SOAT: ${crashData.driverB.insurerName}

DAÑOS MATERIALES REGISTRADOS:
${crashData.damageDescription}

DECLARACIÓN LEGAL DE RETIRO INMEDIATO (LEY 2251 ART. 16):
1. Se certifica que en este incidente solo se produjeron daños materiales ("solo latas") y ninguna de las partes sufrió lesiones corporales.
2. Ambas partes tomaron el set de 4 evidencias fotográficas reglamentarias (panorámica, posición en calzada, daños y placas) con antelación a mover los vehículos.
3. Se procede al retiro inmediato de los vehículos de la vía para evitar obstrucción del flujo vehicular y la imposición de orden de comparendo por infracción C.03 (bloqueo de calzada).
4. Las pruebas fotográficas y este documento digital serán radicados directamente ante las compañías aseguradoras correspondientes.
================================================
Generado con AlzaVoz & Alza Bot Medellín
https://alzavoz.pages.dev`;
  }, [crashData]);

  const handleCopyActa = useCallback(async () => {
    triggerHaptic(50);
    try {
      await navigator.clipboard.writeText(generateActaText());
      setCopiedActa(true);
      setLiveAnnouncement("Acta rápida copiada al portapapeles.");
      setTimeout(() => setCopiedActa(false), 2500);
    } catch {
      // Manejar error silenciosamente
    }
  }, [generateActaText, triggerHaptic]);

  const handleShareWhatsApp = useCallback(() => {
    triggerHaptic(40);
    const text = encodeURIComponent(generateActaText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, [generateActaText, triggerHaptic]);

  const handleRestart = useCallback(() => {
    triggerHaptic(30);
    setPhotos({
      panoramic: false,
      roadPosition: false,
      damageDetail: false,
      platesAndDocs: false,
    });
    setCurrentStep(1);
    setLiveAnnouncement("Asistente reiniciado al Paso 1 de 3: Fotos Obligatorias.");
  }, [triggerHaptic]);

  return (
    <div
      aria-label="Asistente de Choques Solo Latas"
      className="rounded-2xl border border-amber-500/40 bg-gray-900/90 shadow-[0_0_25px_rgba(245,158,11,0.2)] p-[16px] sm:p-5 pb-8 space-y-4 text-white mb-6"
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="sololatas-live-status"
      >
        {liveAnnouncement}
      </div>
      {/* Cabecera y Alerta Legal */}
      <div className="border-b border-gray-800 pb-3">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-950/90 text-amber-300 border border-amber-600/60 font-mono">
            Ley 2251 de 2022 • Art. 16
          </span>
          <span className="text-xs text-gray-400">Sin Heridos</span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <Car className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <span>Asistente Choques &quot;Solo Latas&quot;</span>
        </h2>
        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
          Toma las 4 fotos obligatorias, mueve los carros de la vía inmediatamente para evitar la multa de tránsito <strong>C.03 ($650.000 COP)</strong> y genera el acta para las aseguradoras.
        </p>
      </div>

      {/* Indicador de 3 Pasos */}
      <ol
        aria-label="Pasos del asistente Choques Solo Latas"
        className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs font-bold"
      >
        <li
          aria-current={currentStep === 1 ? "step" : undefined}
          className={`py-2 px-2 rounded-lg text-center transition ${
            currentStep === 1
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
              : "bg-black/30 text-gray-400"
          }`}
        >
          1. Fotos Obligatorias
        </li>
        <li
          aria-current={currentStep === 2 ? "step" : undefined}
          className={`py-2 px-2 rounded-lg text-center transition ${
            currentStep === 2
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
              : "bg-black/30 text-gray-400"
          }`}
        >
          2. Datos Conductores
        </li>
        <li
          aria-current={currentStep === 3 ? "step" : undefined}
          className={`py-2 px-2 rounded-lg text-center transition ${
            currentStep === 3
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
              : "bg-black/30 text-gray-400"
          }`}
        >
          3. Acta Amistosa
        </li>
      </ol>

      {/* Lectura voluntaria de pasos sin pronunciar datos personales (T20) */}
      <VoluntarySpeechControl
        contextLabel={`Choques Solo Latas · Paso ${currentStep}`}
        contentKey={`sololatas-step-${currentStep}`}
        segments={stepSpeechSegments}
      />

      {/* PASO 1: 4 FOTOS OBLIGATORIAS */}
      {currentStep === 1 && (
        <section
          aria-label="Paso 1: Fotos Obligatorias"
          className="space-y-3"
        >
          <div className="bg-amber-950/30 rounded-xl p-3 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold">Regla de Oro Ley 2251:</p>
              <p className="text-xs text-gray-300">
                Las aseguradoras están obligadas por ley a recibir estas 4 fotos digitales. Una vez tomadas, ¡muevan los vehículos al costado ya!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Foto 1 */}
            <button
              type="button"
              onClick={() => togglePhoto("panoramic")}
              aria-pressed={photos.panoramic}
              className={`touch-target-min min-h-[56px] flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border text-left transition active:scale-95 ${
                photos.panoramic
                  ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200"
                  : "bg-black/40 border-gray-800 text-gray-300 hover:bg-gray-800/60"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0 flex-1">
                <Camera
                  aria-hidden="true"
                  className={`w-5 h-5 shrink-0 ${
                    photos.panoramic ? "text-emerald-400" : "text-amber-400"
                  }`}
                />
                <span className="block min-w-0">
                  <span className="block text-xs font-bold break-words">1. Panorámica 360°</span>
                  <span className="block text-xs text-gray-400 break-words">Vía, carril y entorno</span>
                </span>
              </span>
              {photos.panoramic ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <span className="text-xs font-bold px-2 py-1 bg-amber-950/80 text-amber-300 rounded border border-amber-700/60 shrink-0">
                  Tomar
                </span>
              )}
            </button>

            {/* Foto 2 */}
            <button
              type="button"
              onClick={() => togglePhoto("roadPosition")}
              aria-pressed={photos.roadPosition}
              className={`touch-target-min min-h-[56px] flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border text-left transition active:scale-95 ${
                photos.roadPosition
                  ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200"
                  : "bg-black/40 border-gray-800 text-gray-300 hover:bg-gray-800/60"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0 flex-1">
                <Car
                  aria-hidden="true"
                  className={`w-5 h-5 shrink-0 ${
                    photos.roadPosition ? "text-emerald-400" : "text-amber-400"
                  }`}
                />
                <span className="block min-w-0">
                  <span className="block text-xs font-bold break-words">2. Posición en Calzada</span>
                  <span className="block text-xs text-gray-400 break-words">Ubicación relativa</span>
                </span>
              </span>
              {photos.roadPosition ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <span className="text-xs font-bold px-2 py-1 bg-amber-950/80 text-amber-300 rounded border border-amber-700/60 shrink-0">
                  Tomar
                </span>
              )}
            </button>

            {/* Foto 3 */}
            <button
              type="button"
              onClick={() => togglePhoto("damageDetail")}
              aria-pressed={photos.damageDetail}
              className={`touch-target-min min-h-[56px] flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border text-left transition active:scale-95 ${
                photos.damageDetail
                  ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200"
                  : "bg-black/40 border-gray-800 text-gray-300 hover:bg-gray-800/60"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0 flex-1">
                <ShieldAlert
                  aria-hidden="true"
                  className={`w-5 h-5 shrink-0 ${
                    photos.damageDetail ? "text-emerald-400" : "text-amber-400"
                  }`}
                />
                <span className="block min-w-0">
                  <span className="block text-xs font-bold break-words">3. Detalle de Daños</span>
                  <span className="block text-xs text-gray-400 break-words">Golpes y raspaduras</span>
                </span>
              </span>
              {photos.damageDetail ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <span className="text-xs font-bold px-2 py-1 bg-amber-950/80 text-amber-300 rounded border border-amber-700/60 shrink-0">
                  Tomar
                </span>
              )}
            </button>

            {/* Foto 4 */}
            <button
              type="button"
              onClick={() => togglePhoto("platesAndDocs")}
              aria-pressed={photos.platesAndDocs}
              className={`touch-target-min min-h-[56px] flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border text-left transition active:scale-95 ${
                photos.platesAndDocs
                  ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200"
                  : "bg-black/40 border-gray-800 text-gray-300 hover:bg-gray-800/60"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0 flex-1">
                <FileCheck2
                  aria-hidden="true"
                  className={`w-5 h-5 shrink-0 ${
                    photos.platesAndDocs ? "text-emerald-400" : "text-amber-400"
                  }`}
                />
                <span className="block min-w-0">
                  <span className="block text-xs font-bold break-words">4. Placas y SOAT</span>
                  <span className="block text-xs text-gray-400 break-words">Ambos automotores</span>
                </span>
              </span>
              {photos.platesAndDocs ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <span className="text-xs font-bold px-2 py-1 bg-amber-950/80 text-amber-300 rounded border border-amber-700/60 shrink-0">
                  Tomar
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(40);
              setCurrentStep(2);
              setLiveAnnouncement("Paso 2 de 3: Datos de Conductores.");
            }}
            disabled={!allPhotosTaken}
            className={`touch-target-min min-h-[56px] w-full flex items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-lg transition active:scale-95 ${
              allPhotosTaken
                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30"
                : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
            }`}
          >
            <span>
              {allPhotosTaken
                ? "¡Fotos Listas! Despejar Vía y Llenar Datos"
                : `Faltan ${
                    4 -
                    [
                      photos.panoramic,
                      photos.roadPosition,
                      photos.damageDetail,
                      photos.platesAndDocs,
                    ].filter(Boolean).length
                  } Fotos Obligatorias`}
            </span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </section>
      )}

      {/* PASO 2: FORMULARIO RÁPIDO DE DATOS DE LAS PARTES */}
      {currentStep === 2 && (
        <section
          aria-label="Paso 2: Datos de Conductores"
          className="space-y-3"
        >
          <div className="bg-black/40 rounded-xl p-3 border border-gray-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <MapPin className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Lugar del Siniestro</span>
            </div>
            <input
              type="text"
              value={crashData.locationStreet}
              onChange={(e) =>
                setCrashData((prev) => ({ ...prev, locationStreet: e.target.value }))
              }
              aria-label="Dirección o vía del siniestro"
              placeholder="Ej: Calle 50 con Cra 65"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            />
          </div>

          {/* Datos Vehículo A */}
          <div className="bg-black/40 rounded-xl p-3 border border-gray-800 space-y-2">
            <h3 className="text-xs font-bold text-amber-300">Vehículo A (Tu Vehículo)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={crashData.driverA.fullName}
                onChange={(e) =>
                  setCrashData((prev) => ({
                    ...prev,
                    driverA: { ...prev.driverA, fullName: e.target.value },
                  }))
                }
                aria-label="Nombre Conductor A"
                placeholder="Nombre completo"
                className="min-h-[48px] bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              />
              <input
                type="text"
                value={crashData.driverA.vehiclePlate}
                onChange={(e) =>
                  setCrashData((prev) => ({
                    ...prev,
                    driverA: { ...prev.driverA, vehiclePlate: e.target.value.toUpperCase() },
                  }))
                }
                aria-label="Placa Vehículo A"
                placeholder="Placa (ej: ABC-123)"
                className="min-h-[48px] bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-amber-300 font-mono font-bold focus:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="tel"
                value={crashData.driverA.phoneNumber}
                onChange={(e) =>
                  setCrashData((prev) => ({
                    ...prev,
                    driverA: { ...prev.driverA, phoneNumber: e.target.value },
                  }))
                }
                aria-label="Teléfono Conductor A"
                placeholder="Celular"
                className="min-h-[48px] bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              />
              <input
                type="text"
                value={crashData.driverA.insurerName}
                onChange={(e) =>
                  setCrashData((prev) => ({
                    ...prev,
                    driverA: { ...prev.driverA, insurerName: e.target.value },
                  }))
                }
                aria-label="Aseguradora Conductor A"
                placeholder="Aseguradora / SOAT"
                className="min-h-[48px] bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              />
            </div>
          </div>

          {/* Datos Vehículo B */}
          <div className="bg-black/40 rounded-xl p-3 border border-gray-800 space-y-2">
            <h3 className="text-xs font-bold text-amber-300">Vehículo B (Contraparte)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={crashData.driverB.fullName}
                onChange={(e) =>
                  setCrashData((prev) => ({
                    ...prev,
                    driverB: { ...prev.driverB, fullName: e.target.value },
                  }))
                }
                aria-label="Nombre Conductor B"
                placeholder="Nombre conductor contraparte"
                className="min-h-[48px] bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              />
              <input
                type="text"
                value={crashData.driverB.vehiclePlate}
                onChange={(e) =>
                  setCrashData((prev) => ({
                    ...prev,
                    driverB: { ...prev.driverB, vehiclePlate: e.target.value.toUpperCase() },
                  }))
                }
                aria-label="Placa Vehículo B"
                placeholder="Placa (ej: XYZ-789)"
                className="min-h-[48px] bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-amber-300 font-mono font-bold focus:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="tel"
                value={crashData.driverB.phoneNumber}
                onChange={(e) =>
                  setCrashData((prev) => ({
                    ...prev,
                    driverB: { ...prev.driverB, phoneNumber: e.target.value },
                  }))
                }
                aria-label="Teléfono Conductor B"
                placeholder="Celular contraparte"
                className="min-h-[48px] bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              />
              <input
                type="text"
                value={crashData.driverB.insurerName}
                onChange={(e) =>
                  setCrashData((prev) => ({
                    ...prev,
                    driverB: { ...prev.driverB, insurerName: e.target.value },
                  }))
                }
                aria-label="Aseguradora Conductor B"
                placeholder="Aseguradora / SOAT"
                className="min-h-[48px] bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setLiveAnnouncement("Paso 1 de 3: Fotos Obligatorias.");
              }}
              className="touch-target-min min-h-[56px] px-4 py-2 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-bold active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-1 shrink-0" aria-hidden="true" />
              <span>Atrás</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(40);
                setCurrentStep(3);
                setLiveAnnouncement("Paso 3 de 3: Acta Amistosa generada.");
              }}
              className="touch-target-min min-h-[56px] px-4 py-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 active:scale-95 transition"
            >
              <span>Generar Acta Rápida</span>
              <FileCheck2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* PASO 3: ACTA DE RETIRO AMISTOSO LISTA */}
      {currentStep === 3 && (
        <section
          aria-label="Paso 3: Acta Rápida de Conciliación"
          className="space-y-3"
        >
          <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-500/40 flex items-start gap-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold">¡Acta Digital Generada Exitosamente!</p>
              <p className="text-xs text-gray-300">
                Documento respaldado por el Art. 16 de la Ley 2251 de 2022. Válido para radicación ante SURA, Bolívar, AXA, Equidad, Mapfre y demás aseguradoras.
              </p>
            </div>
          </div>

          {/* Vista previa del documento */}
          <div className="bg-black/70 rounded-xl p-3 border border-gray-800 max-h-60 overflow-y-auto text-left font-mono text-xs text-gray-300 whitespace-pre-wrap break-words leading-relaxed select-all">
            {generateActaText()}
          </div>

          {/* Acciones de 1 Pulgar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyActa}
              aria-label="Copiar acta al portapapeles"
              className="touch-target-min min-h-[56px] flex items-center justify-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-2 text-white text-xs font-bold active:scale-95 transition"
            >
              {copiedActa ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="text-emerald-300">¡Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>Copiar Acta</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              aria-label="Compartir acta por WhatsApp"
              className="touch-target-min min-h-[56px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-white text-xs font-bold active:scale-95 transition shadow-lg shadow-emerald-900/40"
            >
              <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Enviar WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRestart}
            aria-label="Iniciar nuevo reporte de choque"
            className="touch-target-min min-h-[56px] w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Nuevo Reporte de Choque</span>
          </button>
        </section>
      )}
    </div>
  );
}

