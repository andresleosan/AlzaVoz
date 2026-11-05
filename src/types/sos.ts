export interface GeoLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  neighborhood: string;
  address: string;
  comunaName: string;
  comunaNumber: number | null;
  timestamp: number | null;
  status: "idle" | "loading" | "success" | "denied" | "error";
  errorMessage: string | null;
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
  isCivicOfficial?: boolean;
}
