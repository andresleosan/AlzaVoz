export interface MedellinZone {
  number: number;
  name: string;
  popularName: string;
  centerLat: number;
  centerLon: number;
  defaultReference: string;
}

export const MEDELLIN_COMUNAS: MedellinZone[] = [
  {
    number: 1,
    name: "Comuna 1 - Popular",
    popularName: "Popular / Santo Domingo",
    centerLat: 6.299,
    centerLon: -75.548,
    defaultReference: "Cra 43B con Calle 107 (Metrocable Santo Domingo)",
  },
  {
    number: 2,
    name: "Comuna 2 - Santa Cruz",
    popularName: "Santa Cruz / Playón de los Comuneros",
    centerLat: 6.293,
    centerLon: -75.56,
    defaultReference: "Cra 51A con Calle 100",
  },
  {
    number: 3,
    name: "Comuna 3 - Manrique",
    popularName: "Manrique / Campo Valdés",
    centerLat: 6.275,
    centerLon: -75.545,
    defaultReference: "Cra 45 con Calle 72 (Metroplús Manrique)",
  },
  {
    number: 4,
    name: "Comuna 4 - Aranjuez",
    popularName: "Aranjuez / Moravia",
    centerLat: 6.28,
    centerLon: -75.565,
    defaultReference: "Cra 52 con Calle 92 (Parque Aranjuez)",
  },
  {
    number: 5,
    name: "Comuna 5 - Castilla",
    popularName: "Castilla / Alfonso López",
    centerLat: 6.3,
    centerLon: -75.578,
    defaultReference: "Cra 68 con Calle 94 (Bulevar de Castilla)",
  },
  {
    number: 6,
    name: "Comuna 6 - Doce de Octubre",
    popularName: "Doce de Octubre / Kennedy",
    centerLat: 6.31,
    centerLon: -75.589,
    defaultReference: "Cra 80 con Calle 104",
  },
  {
    number: 7,
    name: "Comuna 7 - Robledo",
    popularName: "Robledo / Pilarica",
    centerLat: 6.278,
    centerLon: -75.595,
    defaultReference: "Calle 65 con Cra 80 (Parque de Robledo)",
  },
  {
    number: 8,
    name: "Comuna 8 - Villa Hermosa",
    popularName: "Villa Hermosa / Enciso",
    centerLat: 6.25,
    centerLon: -75.545,
    defaultReference: "Calle 56 con Cra 36 (Parque de Villa Hermosa)",
  },
  {
    number: 9,
    name: "Comuna 9 - Buenos Aires",
    popularName: "Buenos Aires / Miraflores",
    centerLat: 6.235,
    centerLon: -75.545,
    defaultReference: "Calle 49 con Cra 35 (Tranvía de Ayacucho)",
  },
  {
    number: 10,
    name: "Comuna 10 - La Candelaria",
    popularName: "Centro / La Candelaria",
    centerLat: 6.2486,
    centerLon: -75.567,
    defaultReference: "Calle 53 con Cra 50 (Parque Berrío)",
  },
  {
    number: 11,
    name: "Comuna 11 - Laureles Estadio",
    popularName: "Laureles / Carlos E. Restrepo",
    centerLat: 6.245,
    centerLon: -75.592,
    defaultReference: "Av. Nutibara con Circular 73 (Primer Parque de Laureles)",
  },
  {
    number: 12,
    name: "Comuna 12 - La América",
    popularName: "La América / San Juan",
    centerLat: 6.252,
    centerLon: -75.604,
    defaultReference: "Calle 44 (San Juan) con Cra 84 (Iglesia de La América)",
  },
  {
    number: 13,
    name: "Comuna 13 - San Javier",
    popularName: "San Javier / Escaleras Eléctricas",
    centerLat: 6.255,
    centerLon: -75.62,
    defaultReference: "Calle 44 con Cra 99 (Estación San Javier)",
  },
  {
    number: 14,
    name: "Comuna 14 - El Poblado",
    popularName: "El Poblado / Provenza",
    centerLat: 6.208,
    centerLon: -75.57,
    defaultReference: "Cra 43A con Calle 10 (Parque de El Poblado)",
  },
  {
    number: 15,
    name: "Comuna 15 - Guayabal",
    popularName: "Guayabal / Campo Amor",
    centerLat: 6.215,
    centerLon: -75.588,
    defaultReference: "Cra 65 con Calle 10 (Terminal del Sur)",
  },
  {
    number: 16,
    name: "Comuna 16 - Belén",
    popularName: "Belén / Parque de Belén",
    centerLat: 6.225,
    centerLon: -75.602,
    defaultReference: "Cra 76 con Calle 30 (Parque de Belén)",
  },
];

/**
 * Calcula la distancia aproximada en metros (Haversine simple)
 */
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Resuelve la comuna de Medellín más cercana de forma 100% offline y determinística.
 */
export function resolveMedellinComunaOffline(
  lat: number,
  lon: number
): {
  zone: MedellinZone;
  distanceMeters: number;
} {
  let closestZone = MEDELLIN_COMUNAS[9]; // Por defecto Centro / La Candelaria
  let minDistance = Infinity;

  for (const zone of MEDELLIN_COMUNAS) {
    const dist = getDistanceMeters(lat, lon, zone.centerLat, zone.centerLon);
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = zone;
    }
  }

  return {
    zone: closestZone,
    distanceMeters: minDistance,
  };
}

/**
 * Intenta geocodificación inversa con timeout estricto de 2.5s y fallback instantáneo.
 */
export async function reverseGeocodeMedellin(
  lat: number,
  lon: number
): Promise<{
  neighborhood: string;
  address: string;
  comunaName: string;
  comunaNumber: number;
}> {
  const offlineMatch = resolveMedellinComunaOffline(lat, lon);

  // Fallback base
  const result = {
    neighborhood: offlineMatch.zone.popularName,
    address: offlineMatch.zone.defaultReference,
    comunaName: offlineMatch.zone.name,
    comunaNumber: offlineMatch.zone.number,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as {
        display_name?: string;
        address?: {
          road?: string;
          suburb?: string;
          neighbourhood?: string;
          city_district?: string;
          city?: string;
        };
      };

      if (data.address) {
        const road = data.address.road || "";
        const suburb =
          data.address.suburb ||
          data.address.neighbourhood ||
          offlineMatch.zone.popularName;
        const district = data.address.city_district || offlineMatch.zone.name;

        result.neighborhood = `${suburb}, ${district}`;
        if (road) {
          result.address = `${road} (${suburb})`;
        }
      }
    }
  } catch {
    // Si falla o se agota el timeout, usamos de inmediato la resolución offline sin bloquear al usuario
  }

  return result;
}
