import type { WorldId } from "../explore/content";
import type { CatalogItem } from "./catalog";
export const canonicalDestination = (place: string, id: string) => (place === "exhibit" ? `lab-${id}` : id);
export function exhibitWorld(record: CatalogItem | undefined): WorldId | undefined {
  if (record?.item?.type !== "exhibit") return undefined;
  const engines: Record<string, WorldId> = {
    "reef-food-web": "oceans",
    "food-chain": "oceans",
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
