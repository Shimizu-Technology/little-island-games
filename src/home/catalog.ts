import { stickerIds, type StickerId } from "../arcade/progress";
export type Track = "Math" | "Reading" | "Science & Thinking" | "CHamoru words" | "Arcade" | "Classic" | "Island";
export type ItemSpec = {
  name: string;
  footprint: readonly [number, number];
  layer: "ground" | "furniture" | "wall";
  rotations: readonly (0 | 90 | 180 | 270)[];
  mirror: boolean;
  interactive?: string;
  track?: Track;
};
const furniture = (
  name: string,
  footprint: readonly [number, number] = [1, 1],
  track?: Track,
  interactive?: string
): ItemSpec => ({ name, footprint, layer: "furniture", rotations: [0, 180], mirror: true, track, interactive });
export const catalog = {
  bed: furniture("Cloud bed", [2, 2]),
  rug: { ...furniture("Lagoon rug", [3, 2]), layer: "ground" as const },
  table: furniture("Pebble table", [2, 1]),
  chair: furniture("Coral chair"),
  shelf: furniture("Little treasures shelf", [2, 1]),
  plant: furniture("Happy palm"),
  lamp: furniture("Sunshine lamp", [1, 1], undefined, "The light is on"),
  "toy-box": furniture("Toy chest", [2, 1], undefined, "The toys are out"),
  blocks: furniture("Number blocks", [1, 1], "Math"),
  abacus: furniture("Rainbow abacus", [2, 1], "Math"),
  books: furniture("Storybook library", [2, 1], "Reading"),
  beanbag: furniture("Reading cloud", [2, 1], "Reading"),
  aquarium: furniture("Pip’s reef", [2, 1], "Science & Thinking", "Pip swims hello"),
  telescope: furniture("Stargazer telescope", [1, 1], "Science & Thinking"),
  globe: furniture("Little blue planet", [1, 1], "Science & Thinking"),
  mat: { ...furniture("Woven island mat", [2, 2], "CHamoru words"), layer: "ground" as const },
  "island-lamp": furniture("Woven glow lamp", [1, 1], "CHamoru words", "A warm island glow"),
  trophies: furniture("Good times shelf", [2, 1], "Arcade"),
  arcade: furniture("Pocket arcade", [1, 1], "Arcade", "Ready for pretend play"),
  checkers: furniture("Checkers for two", [2, 1], "Classic"),
  chime: {
    ...furniture("Shell wind chime", [1, 1], "Island", "Ting! A sea-breeze song"),
    layer: "wall" as const,
    rotations: [0] as const,
    mirror: false,
  },
  surfboard: furniture("Lagoon surfboard", [1, 1], "Island"),
} satisfies Record<string, ItemSpec>;
export type FurnitureId = keyof typeof catalog;
export type ItemId = FurnitureId | `sticker:${StickerId}`;
export const furnitureIds = Object.keys(catalog) as FurnitureId[];
export const starterItems = furnitureIds.filter((id) => !catalog[id].track);
export const itemIds: readonly string[] = [...furnitureIds, ...stickerIds.map((id) => `sticker:${id}`)];
export function itemSpec(id: ItemId): ItemSpec {
  if (id.startsWith("sticker:"))
    return { name: id.slice(8).replaceAll("-", " "), footprint: [1, 1], layer: "wall", rotations: [0], mirror: false };
  return catalog[id as FurnitureId];
}
export const wallThemes = ["cream", "lagoon", "night", "peach"] as const;
export const floorThemes = ["sand", "honey", "seafoam", "rose"] as const;
export const badgeIds = ["math", "reading", "science", "chamoru", "arcade", "classic"] as const;
export type BadgeId = (typeof badgeIds)[number];

/** Reuse the existing arcade sticker ownership; no grants or copies. */
export const homeStickerItems = (stickers: readonly StickerId[]): ItemId[] => stickers.map(id => `sticker:${id}` as ItemId);
