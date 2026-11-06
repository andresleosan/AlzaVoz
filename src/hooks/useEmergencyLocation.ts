"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type GeoLocationState } from "@/types/sos";
import {
  type MedellinZone,
  reverseGeocodeMedellin,
} from "@/utils/medellinGeo";

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

export function useEmergencyLocation() {
  const [state, setState] = useState<GeoLocationState>(UNKNOWN_LOCATION);

  const [copied, setCopied] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const requestIdRef = useRef(0);
  const invalidatePendingRequest = useCallback(() => { ++requestIdRef.current; }, []);

  const applyCoordinates = useCallback(
    async (lat: number, lon: number, accuracy: number | null, requestId: number) => {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      setState({
        ...UNKNOWN_LOCATION,
        latitude: lat,
        longitude: lon,
        accuracy,
        timestamp: Date.now(),
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
      status: "success",
    });
  }, []);

  // Formato para dictar al 123 o compartir
  const getDictationText = useCallback(() => {
    if (state.source === "manual") {
      return `Zona elegida manualmente: ${state.comunaName} (${state.neighborhood}). Dirección exacta sin confirmar; indicar un punto de referencia al operador.`;
    }
    if (state.source === "gps" && state.latitude !== null && state.longitude !== null) {
      const precision = state.accuracy === null ? "" : ` Precisión reportada: ±${Math.round(state.accuracy)}m.`;
      return `Ubicación GPS aproximada: ${state.latitude.toFixed(4)}, ${state.longitude.toFixed(4)}.${precision} Referencia del mapa: ${state.address}. Confirma la dirección con el operador.`;
    }
    return "Ubicación sin confirmar. Indicar la dirección o un punto de referencia al operador.";
  }, [state]);

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

    return () => {
      isMountedRef.current = false;
      invalidatePendingRequest();
      clearTimeout(timer);
    };
  }, [refreshLocation, invalidatePendingRequest]);

  return {
    location: state,
    refreshLocation,
    setManualZone,
    getDictationText,
    copyLocationText,
    copied,
  };
}
