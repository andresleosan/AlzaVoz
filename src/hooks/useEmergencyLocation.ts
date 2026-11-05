"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type GeoLocationState } from "@/types/sos";
import {
  MEDELLIN_COMUNAS,
  type MedellinZone,
  resolveMedellinComunaOffline,
  reverseGeocodeMedellin,
} from "@/utils/medellinGeo";

const DEFAULT_MEDELLIN_ZONE = MEDELLIN_COMUNAS[9]; // Comuna 10 - La Candelaria

export function useEmergencyLocation() {
  const [state, setState] = useState<GeoLocationState>({
    latitude: DEFAULT_MEDELLIN_ZONE.centerLat,
    longitude: DEFAULT_MEDELLIN_ZONE.centerLon,
    accuracy: 15,
    neighborhood: DEFAULT_MEDELLIN_ZONE.popularName,
    address: DEFAULT_MEDELLIN_ZONE.defaultReference,
    comunaName: DEFAULT_MEDELLIN_ZONE.name,
    comunaNumber: DEFAULT_MEDELLIN_ZONE.number,
    timestamp: null,
    status: "idle",
    errorMessage: null,
  });

  const [copied, setCopied] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const applyCoordinates = useCallback(
    async (lat: number, lon: number, accuracy: number | null) => {
      // 1. Inmediata resolución offline para no retrasar la UI ni 1 milisegundo
      const offline = resolveMedellinComunaOffline(lat, lon);

      if (!isMountedRef.current) return;
      setState((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lon,
        accuracy: accuracy ?? 20,
        neighborhood: offline.zone.popularName,
        address: offline.zone.defaultReference,
        comunaName: offline.zone.name,
        comunaNumber: offline.zone.number,
        timestamp: Date.now(),
        status: "success",
        errorMessage: null,
      }));

      // 2. Enriquecimiento asíncrono con reverse geocoding
      try {
        const enriched = await reverseGeocodeMedellin(lat, lon);
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            neighborhood: enriched.neighborhood,
            address: enriched.address,
            comunaName: enriched.comunaName,
            comunaNumber: enriched.comunaNumber,
          }));
        }
      } catch {
        // Mantiene la resolución offline
      }
    },
    []
  );

  const refreshLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: "Geolocalización no soportada en este dispositivo",
      }));
      return;
    }

    setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoordinates(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy
        );
      },
      (err) => {
        if (!isMountedRef.current) return;
        let msg = "No se pudo obtener la ubicación GPS";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Permiso de GPS no concedido";
        } else if (err.code === err.TIMEOUT) {
          msg = "Tiempo de espera agotado buscando señal GPS";
        }

        setState((prev) => ({
          ...prev,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          errorMessage: msg,
        }));
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
    setState({
      latitude: zone.centerLat,
      longitude: zone.centerLon,
      accuracy: 50,
      neighborhood: zone.popularName,
      address: zone.defaultReference,
      comunaName: zone.name,
      comunaNumber: zone.number,
      timestamp: Date.now(),
      status: "success",
      errorMessage: null,
    });
  }, []);

  // Formato para dictar al 123 o compartir
  const getDictationText = useCallback(() => {
    const latStr = state.latitude ? state.latitude.toFixed(4) : "6.2486";
    const lonStr = state.longitude ? state.longitude.toFixed(4) : "-75.5670";
    return `Estoy en Medellín: ${state.neighborhood}. Referencia: ${state.address}. Coordenadas: ${latStr}, ${lonStr}.`;
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
      clearTimeout(timer);
    };
  }, [refreshLocation]);

  return {
    location: state,
    refreshLocation,
    setManualZone,
    getDictationText,
    copyLocationText,
    copied,
  };
}
