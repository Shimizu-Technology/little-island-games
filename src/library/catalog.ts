import generated from "./catalog.generated.json";
import { TOPICS, WORLDS, topicSpeechKey, type ExploreTopic, type WorldId } from "../explore/content";
import type { LibraryItem, Sentence } from "./schema";
import type { IndexedEntry } from "./search";
import categoryData from "../../content/library/categories.json";
export const categories = categoryData;
export const worldCategory: Record<WorldId, string> = {
  oceans: "ocean",
  world: "guam",
  animals: "animals",
  space: "space",
  weather: "weather",
};
export interface CatalogItem {
  id: string;
  title: string;
  category: string;
  motif: string;
  item?: LibraryItem;
  legacy?: ExploreTopic;
}
export const authored = generated.items as LibraryItem[];
const currentIds = new Set(authored.map((item) => item.id));
export const catalog: CatalogItem[] = [
  ...authored
    .filter((item) => item.type !== "collection")
    .map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      motif: categories.find((c) => c.id === item.category)?.motif ?? "globe",
      item,
    })),
  ...TOPICS.filter((topic) => !currentIds.has(topic.id)).map((topic) => ({
    id: topic.id,
    title: topic.title,
    category: worldCategory[topic.world],
    motif: topic.illustration,
    legacy: topic,
  })),
];
export const itemById = (id?: string) => catalog.find((item) => item.id === id);
export const searchIndex = generated.index as IndexedEntry[];
export const exhibits = WORLDS.map((world) => ({
  world: world.id,
  category: worldCategory[world.id],
  title: {
    oceans: "Reef food web",
    weather: "Water workshop",
    space: "Our night sky",
    animals: world.activity,
    world: world.activity,
  }[world.id],
  motif: categories.find((c) => c.id === worldCategory[world.id])!.motif,
}));
export function recordSpeech(record: CatalogItem): { key: string; sentence?: Sentence } {
  return { key: record.item?.label.speechKey ?? topicSpeechKey(record.id), sentence: record.item?.label };
}
export function availableItems(collections: readonly string[]) {
  return catalog.filter((record) => collections.includes(record.category));
}
export function canOpen(id: string, collections: readonly string[]) {
  if (id.startsWith("lab-")) return collections.includes(worldCategory[id.slice(4) as WorldId]);
  return !!itemById(id) && collections.includes(itemById(id)!.category);
}
