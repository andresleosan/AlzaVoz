import { LocationPrecision } from '@/types/sharing';

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
}

export function formatSosMessageWithPrecision(options: FormatSosMessageOptions): string {
  const { locationText, neighborhood, comunaName, lat, lon, precision, timestamp } = options;

  let timeStr = '';
  if (timestamp) {
    try {
      const dateObj = new Date(timestamp);
      const time = dateObj.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const date = dateObj.toLocaleDateString('es-CO');
      timeStr = `\n🕒 *Hora del reporte:* ${time} (${date})`;
    } catch {
      // Fallback
    }
  }

  let locationBlock = '';
  if (precision === 'exact') {
    const mapLink =
      lat !== null && lon !== null
        ? `\n🗺️ Ver en Google Maps: https://maps.google.com/?q=${lat.toFixed(5)},${lon.toFixed(5)}`
        : '';
    locationBlock = `📍 *Ubicación:* ${locationText || 'Medellín'}${mapLink}`;
  } else if (precision === 'approximate') {
    const approx = [comunaName, neighborhood].filter(Boolean).join(' - ') || 'Zona de Medellín';
    locationBlock = `📍 *Ubicación aproximada (sector):* ${approx}\n⚠️ *Coordenadas exactas GPS omitidas por protección del ciudadano.*`;
  } else {
    locationBlock = `📍 *Ubicación:* Omitida por seguridad personal del ciudadano.`;
  }

  return (
    `🚨 *¡ALERTA DE EMERGENCIA ALZAVOZ MEDELLÍN!* 🚨\n\n` +
    `Necesito auxilio urgente.\n` +
    `${locationBlock}${timeStr}\n\n` +
    `Por favor envía apoyo o comunícate con la Policía 123 indicando esta información.`
  );
}

export function buildSosWhatsAppLink(phone: string, text: string): string {
  const clean = cleanPhoneForWhatsApp(phone);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}
