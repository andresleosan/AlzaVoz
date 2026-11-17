"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type GeoLocationState,
  type ManualLocationCorrection,
} from "@/types/sos";
import {
  type MedellinZone,
  reverseGeocodeMedellin,
} from "@/utils/medellinGeo";
import {
  assessLocation,
  formatColombiaClockTime,
  normalizeAccuracy,
  normalizeTimestamp,
} from "@/lib/location/metadata";
import { SHARED_SESSION_CLEAR_EVENT } from "@/context/SharedDeviceContext";

const UNKNOWN_LOCATION: GeoLocationState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  neighborhood: "Ubicación sin confirmar",
  address: "Dirección exacta sin confirmar",
  comunaName: "",
  comunaNumber: null,
  timestamp: null,
  source: null,
  status: "idle",
  errorMessage: null,
};

function sanitizeManualText(value: string, maxLength: number = 160): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function useEmergencyLocation() {
  const [state, setState] = useState<GeoLocationState>(UNKNOWN_LOCATION);

  const [copied, setCopied] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const requestIdRef = useRef(0);
  const invalidatePendingRequest = useCallback(() => {
    ++requestIdRef.current;
  }, []);

  const applyCoordinates = useCallback(
    async (
      lat: number,
      lon: number,
      accuracy: number | null,
      rawTimestamp: number | undefined,
      requestId: number
    ) => {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      const safeAccuracy = normalizeAccuracy(accuracy);
      const safeTimestamp = normalizeTimestamp(rawTimestamp);
      setState({
        ...UNKNOWN_LOCATION,
        latitude: lat,
        longitude: lon,
        accuracy: safeAccuracy,
        timestamp: safeTimestamp,
        source: "gps",
        status: "success",
      });

      // La dirección del mapa llega después de las coordenadas del dispositivo.
      try {
        const enriched = await reverseGeocodeMedellin(lat, lon);
        if (isMountedRef.current && requestId === requestIdRef.current) {
          setState((prev) => ({
            ...prev,
            neighborhood: enriched.neighborhood,
            address: enriched.address,
            comunaName: enriched.comunaName,
            comunaNumber: enriched.comunaNumber,
          }));
        }
      } catch {
        // Conserva las coordenadas medidas, sin inventar una dirección.
      }
    },
    []
  );

  const refreshLocation = useCallback(() => {
    const requestId = ++requestIdRef.current;
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({
        ...UNKNOWN_LOCATION,
        status: "error",
        errorMessage: "Geolocalización no soportada en este dispositivo",
      });
      return;
    }

    setState({ ...UNKNOWN_LOCATION, status: "loading" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoordinates(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
          pos.timestamp,
          requestId
        );
      },
      (err) => {
        if (!isMountedRef.current || requestId !== requestIdRef.current) return;
        let msg = "No se pudo obtener la ubicación GPS";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Permiso de GPS no concedido";
        } else if (err.code === err.TIMEOUT) {
          msg = "Tiempo de espera agotado buscando señal GPS";
        }

        setState({
          ...UNKNOWN_LOCATION,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          errorMessage: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, [applyCoordinates]);

  // Selección manual rápida de Comuna (ideal para sótanos, túneles o fallas de GPS)
  const setManualZone = useCallback((zone: MedellinZone) => {
    ++requestIdRef.current;
    setState({
      ...UNKNOWN_LOCATION,
      neighborhood: zone.popularName,
      comunaName: zone.name,
      comunaNumber: zone.number,
      timestamp: Date.now(),
      source: "manual",
      manualKind: "zone",
      status: "success",
    });
  }, []);

  // Corrección manual completa de dirección, barrio o comuna (invalida GPS en curso y limpia lat/lon previas)
  const setManualCorrection = useCallback((correction: ManualLocationCorrection) => {
    ++requestIdRef.current;
    const cleanCommune = sanitizeManualText(correction.communeName, 80);
    const cleanNeighborhood = sanitizeManualText(correction.neighborhood, 120);
    const cleanAddress = sanitizeManualText(correction.address, 160);

    setState({
      ...UNKNOWN_LOCATION,
      neighborhood: cleanNeighborhood || cleanCommune || "Referencia manual",
      address: cleanAddress || "Dirección exacta sin confirmar",
      comunaName: cleanCommune,
      comunaNumber: correction.communeNumber,
      timestamp: Date.now(),
      source: "manual",
      manualKind: "corrected",
      status: "success",
      errorMessage: null,
    });
  }, []);

  // Formato para dictar al 123 o compartir
  const getDictationText = useCallback(
    (overrideNow?: number | null) => {
      if (state.source === "manual") {
        if (state.manualKind === "corrected") {
          const timePart = state.timestamp
            ? ` (corregida a las ${formatColombiaClockTime(state.timestamp)})`
            : "";
          const sectorPart = [state.comunaName, state.neighborhood]
            .filter(Boolean)
            .join(" · ");
          return `Ubicación corregida manualmente${timePart}: ${state.address}${
            sectorPart ? `, ${sectorPart}` : ""
          }. Sin coordenadas GPS; confirmar referencia con el operador.`;
        }
        return `Zona elegida manualmente: ${state.comunaName} (${state.neighborhood}). Dirección exacta sin confirmar; indicar un punto de referencia al operador.`;
      }
      if (state.source === "gps" && state.latitude !== null && state.longitude !== null) {
        const assessment = assessLocation({
          source: "gps",
          status: state.status,
          timestamp: state.timestamp,
          accuracy: state.accuracy,
          now: overrideNow === undefined ? Date.now() : overrideNow,
        });
        const precision =
          assessment.accuracyShort === null
            ? " Precisión no reportada por el dispositivo."
            : ` Precisión reportada: ${assessment.accuracyShort}${
                assessment.isImprecise ? " (baja / imprecisa)" : ""
              }.`;
        const agePart =
          assessment.obtainedAtLabel && assessment.relativeAgeLabel
            ? ` Obtenida: ${assessment.obtainedAtLabel} (${assessment.relativeAgeLabel}${
                assessment.isStale ? ", lectura antigua" : ""
              }).`
            : "";
        return `Ubicación GPS aproximada: ${state.latitude.toFixed(4)}, ${state.longitude.toFixed(
          4
        )}.${precision}${agePart} Referencia del mapa: ${
          state.address
        }. Confirma la dirección con el operador.`;
      }
      return "Ubicación sin confirmar. Indicar la dirección o un punto de referencia al operador.";
    },
    [state]
  );

  const copyLocationText = useCallback(async () => {
    const text = getDictationText();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return true;
      }
    } catch {
      // Fallback con execCommand si navigator.clipboard está bloqueado por permisos
    }

    try {
      if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
          return true;
        }
      }
    } catch {
      // Ignorar fallback
    }

    return false;
  }, [getDictationText]);

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      refreshLocation();
    }, 0);

    const handleClear = () => {
      invalidatePendingRequest();
      setState(UNKNOWN_LOCATION);
      setCopied(false);
    };

    window.addEventListener("alzavoz:escape", handleClear);
    window.addEventListener(SHARED_SESSION_CLEAR_EVENT, handleClear);

    return () => {
      isMountedRef.current = false;
      invalidatePendingRequest();
      clearTimeout(timer);
      window.removeEventListener("alzavoz:escape", handleClear);
      window.removeEventListener(SHARED_SESSION_CLEAR_EVENT, handleClear);
    };
  }, [refreshLocation, invalidatePendingRequest]);

  return {
    location: state,
    refreshLocation,
    setManualZone,
    setManualCorrection,
    getDictationText,
    copyLocationText,
    copied,
  };
}
