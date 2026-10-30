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
const entry = (name: string, category: MoreItemSpec["category"], footprint: readonly [number, number] = [1, 1], options: Partial<MoreItemSpec> = {}): MoreItemSpec => ({
  name, category, footprint, layer: "furniture", rotations: [0, 180], mirror: true,
  free: true, tintable: true, rooms: ["home", "treehouse", "beach"], ...options,
});
export const moreCatalog: Record<string, MoreItemSpec> = {
  "sofa": entry("Sofa", "beds-seats", [2, 1], {}),
  "armchair": entry("Armchair", "beds-seats", [1, 1], {}),
  "bunk-bed": entry("Bunk bed", "beds-seats", [2, 2], {}),
  "hammock": entry("Hammock", "beds-seats", [2, 1], {interactive: "A gentle sway"}),
  "floor-cushion": entry("Floor cushion", "beds-seats", [1, 1], {}),
  "rocking-chair": entry("Rocking chair", "beds-seats", [1, 1], {}),
  "stool": entry("Stool", "beds-seats", [1, 1], {}),
  "desk": entry("Desk", "tables-storage", [2, 1], {surface: true}),
  "dresser": entry("Dresser", "tables-storage", [2, 1], {surface: true}),
  "bookcase": entry("Bookcase", "tables-storage", [2, 1], {surface: true}),
  "side-table": entry("Side table", "tables-storage", [1, 1], {surface: true}),
  "coffee-table": entry("Coffee table", "tables-storage", [2, 1], {surface: true}),
  "fridge": entry("Fridge", "kitchen", [1, 1], {rooms: ["kitchen"]}),
  "stove": entry("Stove", "kitchen", [1, 1], {rooms: ["kitchen"], interactive: "The pot is steaming"}),
  "sink-counter": entry("Sink counter", "kitchen", [2, 1], {surface: true, rooms: ["kitchen"]}),
  "kitchen-table": entry("Kitchen table", "kitchen", [2, 1], {surface: true, rooms: ["kitchen"]}),
  "cake-stand": entry("Cake stand", "kitchen", [1, 1], {small: true, rooms: ["kitchen"]}),
  "fruit-bowl": entry("Fruit bowl", "kitchen", [1, 1], {small: true, rooms: ["kitchen"]}),
  "teapot": entry("Teapot", "kitchen", [1, 1], {small: true, rooms: ["kitchen"], interactive: "Tea is ready"}),
  "potted-fern": entry("Potted fern", "plants-nature", [1, 1], {small: true}),
  "cactus": entry("Cactus", "plants-nature", [1, 1], {small: true}),
  "flower-vase": entry("Flower vase", "plants-nature", [1, 1], {small: true}),
  "banana-plant": entry("Banana plant", "plants-nature", [1, 1], {}),
  "shell-pile": entry("Shell pile", "plants-nature", [1, 1], {small: true}),
  "table-lamp": entry("Table lamp", "lights", [1, 1], {small: true, interactive: "The light is on"}),
  "string-lights": entry("String lights", "lights", [1, 1], {layer: "wall", rotations: [0], mirror: false, interactive: "The lights twinkle"}),
  "lantern": entry("Lantern", "lights", [1, 1], {small: true, interactive: "A warm glow"}),
  "floor-lamp": entry("Floor lamp", "lights", [1, 1], {interactive: "A warm reading light"}),
  "teddy": entry("Teddy", "toys-fun", [1, 1], {small: true, interactive: "A friendly wave"}),
  "ball": entry("Ball", "toys-fun", [1, 1], {small: true, interactive: "Bounce!"}),
  "dollhouse": entry("Dollhouse", "toys-fun", [2, 1], {}),
  "easel": entry("Easel", "toys-fun", [1, 1], {}),
  "guitar": entry("Guitar", "toys-fun", [1, 1], {interactive: "A little island strum"}),
  "kite": entry("Kite", "toys-fun", [1, 1], {layer: "wall", rotations: [0], mirror: false}),
  "round-rug": entry("Round rug", "rugs-floor", [2, 2], {layer: "ground"}),
  "striped-rug": entry("Striped rug", "rugs-floor", [2, 2], {layer: "ground"}),
  "star-rug": entry("Star rug", "rugs-floor", [2, 2], {layer: "ground"}),
  "sea-picture": entry("Sea picture", "wall-art", [1, 1], {layer: "wall", rotations: [0], mirror: false}),
  "clock": entry("Clock", "wall-art", [1, 1], {layer: "wall", rotations: [0], mirror: false, interactive: "Tick tock"}),
  "mirror": entry("Mirror", "wall-art", [1, 1], {layer: "wall", rotations: [0], mirror: false}),
  "world-map": entry("World map", "wall-art", [1, 1], {layer: "wall", rotations: [0], mirror: false}),
};
export type MoreItemId = keyof typeof moreCatalog;
