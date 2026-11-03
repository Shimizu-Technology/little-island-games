import { canonicalLibraryId } from "./ids";
import type { WorldId } from "../explore/content";
import type { CatalogItem } from "./catalog";
export const canonicalDestination = (place: string, id: string) => (place === "exhibit" ? `lab-${id}` : canonicalLibraryId(id));
export function exhibitWorld(record: CatalogItem | undefined): WorldId | undefined {
  if (record?.item?.type !== "exhibit") return undefined;
  const engines: Record<string, WorldId> = {
    "reef-food-web": "oceans",
    "food-chain": "oceans",
    "food-web": "oceans",
    "ocean-food-chain": "oceans",
    "water-cycle": "weather",
    "water-journey": "weather",
    "weather-workshop": "weather",
    "night-sky": "space",
    "day-night": "space",
  };
  return engines[record.item.model.engine];
}
export const mayFinishPage = (place: string, enteredDuringOpenHours: boolean) =>
  enteredDuringOpenHours && ["topic", "reader", "make", "exhibit", "authored-exhibit"].includes(place);
/** Wonder, Books, Make and My Shelf are the Library's four tab roots. */
export const libraryTabs = ["wonder", "books", "make", "shelf"] as const;
export type LibraryBack = "island" | "history";
/**
 * Back on a tab root leaves the Library for the Island map, however many topics were
 * visited. Inside a topic, book, exhibit, page, or Grown-ups, Back returns to where the child came from.
 */
export function libraryBack(place: string, id = ""): LibraryBack {
  const root = (libraryTabs as readonly string[]).includes(place) && !(place === "make" && id);
  return root ? "island" : "history";
}
/** One label for every Library card's speaker; it speaks the title, not a question. */
export const hearTitleLabel = (title: string) => `Hear title: ${title}`;
