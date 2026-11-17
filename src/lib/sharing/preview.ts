import { LocationPrecision } from '@/types/sharing';
import {
  assessLocation,
  formatColombiaDateTime,
  type LocationSourceKind,
  type LocationStatusKind,
  type ManualLocationKind,
} from '@/lib/location/metadata';

export function cleanPhoneForWhatsApp(raw: string): string {
  const cleaned = raw.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+57')) {
    return cleaned.replace('+', '');
  }
  if (cleaned.startsWith('57') && cleaned.length === 12) {
    return cleaned;
  }
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `57${digitsOnly}`;
  }
  return cleaned.replace('+', '');
}

export interface FormatSosMessageOptions {
  locationText: string;
  neighborhood?: string;
  comunaName?: string;
  lat: number | null;
  lon: number | null;
  precision: LocationPrecision;
  timestamp?: number;
  accuracy?: number | null;
  source?: LocationSourceKind;
  manualKind?: ManualLocationKind;
  status?: LocationStatusKind;
  now?: number | null;
}

export function formatSosMessageWithPrecision(options: FormatSosMessageOptions): string {
  const {
    locationText,
    neighborhood,
    comunaName,
    lat,
    lon,
    precision,
    timestamp,
    accuracy = null,
    source,
    manualKind,
    status = 'success',
    now = null,
  } = options;

  if (precision === 'none') {
    return (
      `🚨 *¡ALERTA DE EMERGENCIA ALZAVOZ MEDELLÍN!* 🚨\n\n` +
      `Necesito auxilio urgente.\n` +
      `📍 *Ubicación:* Omitida por seguridad personal del ciudadano.\n\n` +
      `Por favor envía apoyo o comunícate con la Policía 123 indicando esta información.`
    );
  }

  const effectiveSource: LocationSourceKind =
    source !== undefined ? source : lat !== null && lon !== null ? 'gps' : null;
  const effectiveNow = now ?? (timestamp !== undefined ? Date.now() : null);

  let timeStr = '';
  if (timestamp) {
    timeStr = `\n🕒 *Hora de ubicación:* ${formatColombiaDateTime(timestamp)}`;
  }

  if (precision === 'approximate') {
    const approx = [comunaName, neighborhood].filter(Boolean).join(' - ') || 'Zona de Medellín';
    const locationBlock = `📍 *Ubicación aproximada (sector):* ${approx}\n⚠️ *Coordenadas exactas GPS omitidas por protección del ciudadano.*`;
    return (
      `🚨 *¡ALERTA DE EMERGENCIA ALZAVOZ MEDELLÍN!* 🚨\n\n` +
      `Necesito auxilio urgente.\n` +
      `${locationBlock}${timeStr}\n\n` +
      `Por favor envía apoyo o comunícate con la Policía 123 indicando esta información.`
    );
  }

  const assessment = assessLocation({
    source: effectiveSource,
    manualKind,
    status,
    timestamp: timestamp ?? null,
    accuracy,
    now: effectiveNow,
  });

  const mapLink =
    effectiveSource !== 'manual' && lat !== null && lon !== null
      ? `\n🗺️ Ver en Google Maps: https://maps.google.com/?q=${lat.toFixed(5)},${lon.toFixed(5)}`
      : '';

  const metadataLines: string[] = [];
  if (effectiveSource === 'gps') {
    metadataLines.push(`🎯 *Precisión reportada:* ${assessment.precisionLabel}`);
    if (timestamp && assessment.relativeAgeLabel) {
      metadataLines.push(
        `🕒 *Ubicación obtenida:* ${formatColombiaDateTime(timestamp)} (${assessment.relativeAgeLabel})`
      );
    }
    if (assessment.isStale || assessment.isImprecise) {
      metadataLines.push(`⚠️ *Aviso de señal:* ${assessment.warningMessages.join(' ')}`);
    }
  } else if (effectiveSource === 'manual') {
    metadataLines.push(
      `✏️ *Origen:* ${
        manualKind === 'corrected'
          ? 'Ubicación corregida manualmente (sin GPS).'
          : 'Zona elegida manualmente (sin GPS).'
      }`
    );
    if (timestamp) {
      metadataLines.push(`🕒 *Hora de registro manual:* ${formatColombiaDateTime(timestamp)}`);
    }
  } else if (timeStr) {
    metadataLines.push(timeStr.trimStart());
  }

  const metadataBlock = metadataLines.length > 0 ? `\n${metadataLines.join('\n')}` : '';
  const locationBlock = `📍 *Ubicación:* ${locationText || 'Medellín'}${mapLink}${metadataBlock}`;

  return (
    `🚨 *¡ALERTA DE EMERGENCIA ALZAVOZ MEDELLÍN!* 🚨\n\n` +
    `Necesito auxilio urgente.\n` +
    `${locationBlock}\n\n` +
    `Por favor envía apoyo o comunícate con la Policía 123 indicando esta información.`
  );
}

export function buildSosWhatsAppLink(phone: string, text: string): string {
  const clean = cleanPhoneForWhatsApp(phone);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}
