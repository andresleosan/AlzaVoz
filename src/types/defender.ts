export type LegalCategory =
  | "transito"
  | "policia"
  | "choque"
  | "alcoholemia"
  | "derechos";

export interface LegalResponse {
  id: string;
  category: LegalCategory;
  title: string;
  query: string;
  // Bloque 1: Cita de norma exacta
  lawCitation: {
    lawNumber: string;
    article: string;
    summary: string;
    officialTextExcerpt?: string;
  };
  // Bloque 2: Guion respetuoso y firme para leer al agente
  agentScript: {
    scriptText: string;
    toneAdvice: string;
    pronunciationNote?: string;
  };
  // Bloque 3: Checklist de pruebas a grabar
  evidenceChecklist: Array<{
    id: string;
    instruction: string;
    isMandatory: boolean;
  }>;
  keyWarning?: string;
  source: "local-instant" | "deepseek-ai";
}

export interface LegalPreset {
  id: string;
  label: string;
  shortDescription: string;
  category: LegalCategory;
  iconName: "Car" | "ShieldAlert" | "Camera" | "Wine" | "FileText" | "UserCheck";
  query: string;
}

export interface DriverData {
  fullName: string;
  idNumber: string;
  vehiclePlate: string;
  phoneNumber: string;
  insurerName: string;
  policyOrSoatNumber?: string;
}

export interface SoloLatasCrashData {
  locationStreet: string;
  locationNeighborhood: string;
  dateTime: string;
  driverA: DriverData;
  driverB: DriverData;
  damageDescription: string;
  photosTaken: {
    panoramic: boolean;
    roadPosition: boolean;
    damageDetail: boolean;
    platesAndDocs: boolean;
  };
  agreementNotes: string;
  clearedRoad: boolean;
}

