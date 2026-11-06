"use client";

import { useSyncExternalStore, useCallback, useMemo } from "react";
import { type TrustedContact } from "@/types/sos";

const STORAGE_KEY = "alzavoz_trusted_contacts";

export const CIVIC_SUPPORT_CONTACT: TrustedContact = {
  id: "official-concejal",
  name: "Apoyo AlzaVoz",
  phone: "+573234306794",
  relationship: "Contacto de apoyo de la app",
  isAppSupport: true,
  createdAt: 0,
};

export function cleanPhoneNumber(raw: string): string {
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+57")) {
    return cleaned;
  }
  if (cleaned.startsWith("57") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+57${digitsOnly}`;
  }
  return cleaned;
}

export function formatWhatsAppMessage(
  locationText: string,
  lat: number | null,
  lon: number | null,
  timestamp?: number
): string {
  let timeStr = "";
  if (timestamp) {
    try {
      const dateObj = new Date(timestamp);
      const time = dateObj.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const date = dateObj.toLocaleDateString("es-CO");
      timeStr = `\n🕒 *Hora del reporte:* ${time} (${date})`;
    } catch {
      // Fallback
    }
  }

  const mapLink =
    lat !== null && lon !== null
      ? `\n🗺️ Ver en Google Maps: https://maps.google.com/?q=${lat.toFixed(5)},${lon.toFixed(5)}`
      : "";

  return (
    `🚨 *¡ALERTA DE EMERGENCIA ALZAVOZ MEDELLÍN!* 🚨\n\n` +
    `Necesito auxilio urgente.\n` +
    `📍 *Ubicación:* ${locationText}${mapLink}${timeStr}\n\n` +
    `Por favor envía apoyo o comunícate con la Policía 123 indicando esta dirección.`
  );
}

// React 19 external store helpers para sincronización con localStorage
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void) {
  listeners.push(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  return () => {
    listeners = listeners.filter((l) => l !== callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function getSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  try {
    return localStorage.getItem(STORAGE_KEY) || "[]";
  } catch {
    return "[]";
  }
}

function getServerSnapshot(): string {
  return "[]";
}

export function useTrustedContacts() {
  const rawStored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const contacts = useMemo<TrustedContact[]>(() => {
    try {
      const parsed = JSON.parse(rawStored) as TrustedContact[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasSupport = parsed.some((c) => c.id === CIVIC_SUPPORT_CONTACT.id);
        return hasSupport
          ? parsed.map((c) => c.id === CIVIC_SUPPORT_CONTACT.id ? CIVIC_SUPPORT_CONTACT : c)
          : [CIVIC_SUPPORT_CONTACT, ...parsed];
      }
    } catch {
      // Mantener el contacto de apoyo si el almacenamiento no está disponible.
    }
    return [CIVIC_SUPPORT_CONTACT];
  }, [rawStored]);

  const saveContacts = useCallback((updated: TrustedContact[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      emitChange();
    } catch {
      // Error silencioso en almacenamiento
    }
  }, []);

  const addContact = useCallback(
    (name: string, rawPhone: string, relationship: string = "Contacto de Confianza"): boolean => {
      const cleanPhone = cleanPhoneNumber(rawPhone);
      const trimmedName = name.trim().replace(/[<>]/g, "");

      if (!trimmedName || cleanPhone.length < 10) {
        return false;
      }

      const newContact: TrustedContact = {
        id: `contact-${Date.now()}`,
        name: trimmedName,
        phone: cleanPhone,
        relationship: relationship.trim().replace(/[<>]/g, "") || "Familiar / Amigo",
        createdAt: Date.now(),
        isAppSupport: false,
      };

      const updated = [...contacts, newContact];
      saveContacts(updated);
      return true;
    },
    [contacts, saveContacts]
  );

  const removeContact = useCallback(
    (id: string) => {
      if (id === CIVIC_SUPPORT_CONTACT.id) return;
      const updated = contacts.filter((c) => c.id !== id);
      saveContacts(updated);
    },
    [contacts, saveContacts]
  );

  const getWhatsAppLink = useCallback(
    (
      phone: string,
      locationText: string,
      lat: number | null,
      lon: number | null,
      timestamp?: number
    ) => {
      const cleanDigits = phone.replace(/\D/g, "");
      const message = formatWhatsAppMessage(locationText, lat, lon, timestamp);
      return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`;
    },
    []
  );

  return {
    contacts,
    isLoaded: true,
    addContact,
    removeContact,
    getWhatsAppLink,
    formatWhatsAppMessage,
  };
}
