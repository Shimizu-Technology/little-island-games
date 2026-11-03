import generated from "./catalog.generated.json";
import naming from "./naming.json";
import { canonicalLibraryId } from "./ids";
import { TOPICS, WORLDS, type ExploreTopic, type WorldId } from "../explore/content";
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
  ...TOPICS.filter((topic) => !currentIds.has(canonicalLibraryId(topic.id))).map((topic) => ({
    id: topic.id,
    title: topic.title,
    category: worldCategory[topic.world],
    motif: topic.illustration,
    legacy: topic,
  })),
];
export const itemById = (id?: string) => id ? catalog.find((item) => canonicalLibraryId(item.id) === canonicalLibraryId(id)) : undefined;
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
/** Questions and naming labels are different recordings; never substitute a whole article. */
export function recordSpeech(record: CatalogItem): { key: string; sentence?: Sentence } {
  const label = record.item?.label;
  if (label && label.text.replace(/[.!?]+$/g, "").toLowerCase() === record.title.replace(/[.!?]+$/g, "").toLowerCase())
    return { key: label.speechKey, sentence: label };
  return { key: `library-question-${record.id}` };
}
export const namingLabel = (record: CatalogItem) => (naming as Record<string, string>)[record.id] ?? record.item?.label.text ?? record.legacy?.illustration.replace(/-/g, " ") ?? "";
export function recordLabelSpeech(record: CatalogItem): { key: string; sentence?: Sentence } {
  if ((naming as Record<string, string>)[record.id] && record.item) return { key: `library-name-${record.id}` };
  return { key: record.item?.label.speechKey ?? `library-word-${record.motif}`, sentence: record.item?.label };
}
export function availableItems(collections: readonly string[]) {
  return catalog.filter((record) => collections.includes(record.category));
}
export function canOpen(id: string, collections: readonly string[]) {
  if (id.startsWith("lab-")) return collections.includes(worldCategory[id.slice(4) as WorldId]);
  return !!itemById(id) && collections.includes(itemById(id)!.category);
}
