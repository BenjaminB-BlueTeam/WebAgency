export const VILLES_NORD = [
  "Lille",
  "Roubaix",
  "Tourcoing",
  "Valenciennes",
  "Dunkerque",
  "Maubeuge",
  "Lens",
  "Douai",
  "Hazebrouck",
  "Armentières",
  "Cambrai",
  "Grande-Synthe",
] as const

export const VILLES_HAUTS_DE_FRANCE = Array.from(
  new Set([
    ...VILLES_NORD,
    "Amiens",
    "Compiègne",
    "Beauvais",
    "Creil",
    "Saint-Quentin",
    "Laon",
    "Soissons",
    "Arras",
    "Boulogne-sur-Mer",
    "Calais",
    "Dunkerque",
    "Béthune",
    "Abbeville",
    "Maubeuge",
  ])
) as string[]

export type ZoneMode = "ville" | "departement" | "region"
