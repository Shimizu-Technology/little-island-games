/**
 * Little Island 2.1 contract: the free furniture catalogue, tint palette and extra rooms.
 * Owned by the art slice (fills entries and art); read by the Island Home engine slice.
 * Shapes here are the contract between them — change only by agreement.
 */
import type { ItemSpec } from "./catalog";

/** Free colours any tintable item can be painted. Index 0 is each item's own default colours. */
export const tintPalette = {
  original: null,
  coral: "#F08069",
  sunshine: "#F4C96C",
  lagoon: "#58B9B1",
  sky: "#8CC4E8",
  lilac: "#B59BD6",
  leaf: "#7DB37A",
  cocoa: "#8A6450",
  cloud: "#F4F0E6",
  night: "#3E4A6B",
} as const;
export type TintId = keyof typeof tintPalette;
export const tintIds = Object.keys(tintPalette) as TintId[];

export type MoreItemSpec = ItemSpec & {
  /** Free for everyone (no track/badge). */
  free: true;
  /** Can be painted with tintPalette. */
  tintable: boolean;
  /** A surface other small items may sit on (table, shelf, counter, desk, dresser). */
  surface?: boolean;
  /** Small enough to sit on a surface (lamp, plant, vase, books, toy, cake…). */
  small?: boolean;
  /** Category for the Decorate tray. */
  category: "beds-seats" | "tables-storage" | "kitchen" | "plants-nature" | "lights" | "toys-fun" | "rugs-floor" | "wall-art";
  /** Rooms where this fits best (all items may go anywhere). */
  rooms?: readonly RoomId[];
};

/** Room scenes. "home" is the original room-1 (kept for save compatibility). */
export const roomIds = ["home", "kitchen", "treehouse", "beach"] as const;
export type RoomId = (typeof roomIds)[number];
export const roomNames: Record<RoomId, string> = { home: "My room", kitchen: "Kitchen", treehouse: "Tree house", beach: "Beach hut" };

/** Filled by the art slice: about 30 free items. Keys are stable item IDs (kebab-case, no clash with catalog.ts). */
export const moreCatalog: Record<string, MoreItemSpec> = {
  "sofa": { name: "Cosy sofa", footprint: [2, 1], layer: "furniture", rotations: [0, 180], mirror: true, free: true, tintable: true, category: "beds-seats" },
};
export type MoreItemId = keyof typeof moreCatalog;
