import type {
  LocationSourceKind,
  LocationStatusKind,
  ManualLocationKind,
} from "@/lib/location/metadata";

export interface GeoLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  neighborhood: string;
  address: string;
  comunaName: string;
  comunaNumber: number | null;
  timestamp: number | null;
  source: LocationSourceKind;
  manualKind?: ManualLocationKind;
  status: LocationStatusKind;
  errorMessage: string | null;
}

export interface ManualLocationCorrection {
  communeName: string;
  communeNumber: number | null;
  neighborhood: string;
  address: string;
}

export type EmergencyCategory = "police" | "medical" | "fire" | "gender" | "transit";

export interface EmergencyService {
  id: string;
  name: string;
  shortName: string;
  phone: string;
  description: string;
  badge: string;
  category: EmergencyCategory;
  accentColor: string;
  bgTint: string;
  borderTint: string;
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  createdAt: number;
  isAppSupport?: boolean;
}

