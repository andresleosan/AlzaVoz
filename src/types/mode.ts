export type AppMode = "standard" | "defender" | "violet" | "radar";

export interface ModeConfig {
  id: AppMode;
  name: string;
  tagline: string;
  shortLabel: string;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  bgTint: string;
  imageSrc: string;
  sceneImageSrc: string;
  legalContext: string;
  ariaLabel: string;
}

export const MODES_CONFIG: Record<AppMode, ModeConfig> = {
  standard: {
    id: "standard",
    name: "Alza Bot Cívico",
    tagline: "Orientación ciudadana y radicación de quejas",
    shortLabel: "Inicio",
    accentColor: "#06B6D4", // Cian
    glowColor: "rgba(6, 182, 212, 0.4)",
    borderColor: "border-cyan-500/40",
    bgTint: "bg-cyan-950/20",
    imageSrc: "/assets/alzabot/bot-standard.png",
    sceneImageSrc: "/assets/alzabot/bot-standard-scene.jpg",
    legalContext: "Constitución Política de Colombia (Art. 23 - Derecho de Petición)",
    ariaLabel: "Modo Estándar: Alza Bot Cívico",
  },
  defender: {
    id: "defender",
    name: "Defensor SOS & Jurídico",
    tagline: "Protección en retenes policiales y choques viales",
    shortLabel: "SOS / Retén",
    accentColor: "#EF4444", // Rojo / Ámbar
    glowColor: "rgba(239, 68, 68, 0.45)",
    borderColor: "border-red-500/50",
    bgTint: "bg-red-950/25",
    imageSrc: "/assets/alzabot/bot-defender.png",
    sceneImageSrc: "/assets/alzabot/bot-defender-scene.jpg",
    legalContext: "Ley 1801 de 2016 (Art. 21 - Derecho a Grabar) y Ley 769 de 2002",
    ariaLabel: "Modo Defensor: Botón SOS y Asesoría Legal Inmediata",
  },
  violet: {
    id: "violet",
    name: "Escudo Violeta",
    tagline: "Protección en violencia intrafamiliar y género",
    shortLabel: "Violeta",
    accentColor: "#8B5CF6", // Púrpura / Magenta
    glowColor: "rgba(139, 92, 246, 0.40)",
    borderColor: "border-purple-500/50",
    bgTint: "bg-purple-950/25",
    imageSrc: "/assets/alzabot/bot-violet.png",
    sceneImageSrc: "/assets/alzabot/bot-violet-scene.jpg",
    legalContext: "Ley 1257 de 2008 (No Violencia Contra la Mujer) y Línea 155",
    ariaLabel: "Modo Escudo Violeta: Línea 155 y Refugio Confidencial",
  },
  radar: {
    id: "radar",
    name: "Radar Barrial",
    tagline: "Búsqueda comunitaria y control acústico nocturno",
    shortLabel: "Radar",
    accentColor: "#10B981", // Verde Esmeralda
    glowColor: "rgba(16, 185, 129, 0.35)",
    borderColor: "border-emerald-500/50",
    bgTint: "bg-emerald-950/25",
    imageSrc: "/assets/alzabot/bot-radar.png",
    sceneImageSrc: "/assets/alzabot/bot-radar-scene.jpg",
    legalContext: "Ley 1801 de 2016 (Art. 33 - Tranquilidad y Relaciones Respetuosas)",
    ariaLabel: "Modo Radar: Búsqueda de Personas, Mascotas y Mapa Barrial",
  },
};

