import { buildIndex, type IndexedEntry } from "../search";
import type { DiscoveryLabId, DiscoveryLabMeta } from "./types";

export const DISCOVERY_LABS: readonly DiscoveryLabMeta[] = [
  {
    id: "color-light-lab",
    destinationId: "dlab-color-light-lab",
    title: "Color & Light Mixing Studio",
    shortTitle: "Color & Light Studio",
    tagline: "Mix bright paints in a bowl or split sunlight into a glowing rainbow",
    category: "machines",
    playCue: "Tap to Mix",
    accentColor: "#C85A3F",
    tintColor: "#FDEEE4",
    borderColor: "#E8B79E",
    searchAliases: ["paint mixing bowl", "rainbow prism light"],
    searchTags: ["how colors mix in paint and rainbow sunlight"],
  },
  {
    id: "sound-rhythm-lab",
    destinationId: "dlab-sound-rhythm-lab",
    title: "Sound & Island Rhythm Waves",
    shortTitle: "Sound & Rhythm Waves",
    tagline: "Play bamboo bars, island drums, and strings while watching live sound waves",
    category: "machines",
    playCue: "Tap & Play",
    accentColor: "#1E6B66",
    tintColor: "#E1F3EE",
    borderColor: "#9BC7C2",
    searchAliases: ["bamboo xylophone drum", "island music wave"],
    searchTags: ["hear pitch waves loudness and build a 4 beat rhythm"],
  },
  {
    id: "volcano-island-lab",
    destinationId: "dlab-volcano-island-lab",
    title: "Volcano & Island Builder",
    shortTitle: "Volcano & Island",
    tagline: "Erupt an undersea volcano, grow a living coral reef, and sprout Guam palms",
    category: "guam",
    playCue: "Build & Erupt",
    accentColor: "#B75C49",
    tintColor: "#F9ECE3",
    borderColor: "#E3B89E",
    searchAliases: ["pacific ocean volcano", "guam coral lagoon"],
    searchTags: ["magma pressure eruption builds a tropical reef island"],
  },
  {
    id: "ramp-balance-lab",
    destinationId: "dlab-ramp-balance-lab",
    title: "Ramp & Balance Physics Lab",
    shortTitle: "Ramp & Balance Lab",
    tagline: "Balance island treasures on a seesaw and race down icy, wooden, or sandy ramps",
    category: "machines",
    playCue: "Test & Race",
    accentColor: "#9C6B21",
    tintColor: "#FDF4DF",
    borderColor: "#E2C68A",
    searchAliases: ["seesaw lever balance", "friction ramp race"],
    searchTags: ["test weight torque balance and sliding ramp friction"],
  },
  {
    id: "plant-growth-lab",
    destinationId: "dlab-plant-growth-lab",
    title: "Plant & Seed Growth Lab",
    shortTitle: "Plant & Seed Growth",
    tagline: "Give island seeds sunlight and rain to watch roots, blooms, and fruit grow",
    category: "plants",
    playCue: "Water & Grow",
    accentColor: "#3D7A47",
    tintColor: "#E8F3E4",
    borderColor: "#A9CCA1",
    searchAliases: ["coconut palm mango", "hibiscus seed sprout"],
    searchTags: ["grow roots shoots flowers and island fruit day by day"],
  },
  {
    id: "heartbeat-breath-lab",
    destinationId: "dlab-heartbeat-breath-lab",
    title: "Heartbeat & Calm Breath Lab",
    shortTitle: "Heartbeat & Breath",
    tagline: "Watch your heart and lungs speed up when running and slow down with calm breaths",
    category: "body",
    playCue: "Pulse & Breathe",
    accentColor: "#B5485D",
    tintColor: "#FBEAF0",
    borderColor: "#E6B4C4",
    searchAliases: ["heart bpm lungs", "calm breath bubble"],
    searchTags: ["see oxygen flow and follow a gentle breathing bubble"],
  },
] as const;

export const DISCOVERY_LAB_MAP: Readonly<Record<DiscoveryLabId, DiscoveryLabMeta>> = {
  "color-light-lab": DISCOVERY_LABS[0],
  "sound-rhythm-lab": DISCOVERY_LABS[1],
  "volcano-island-lab": DISCOVERY_LABS[2],
  "ramp-balance-lab": DISCOVERY_LABS[3],
  "plant-growth-lab": DISCOVERY_LABS[4],
  "heartbeat-breath-lab": DISCOVERY_LABS[5],
};

export function isDiscoveryLabId(id: string | undefined): id is DiscoveryLabId {
  return !!id && Object.prototype.hasOwnProperty.call(DISCOVERY_LAB_MAP, id);
}

export function discoveryLabById(id: string | undefined): DiscoveryLabMeta | undefined {
  if (!id) return undefined;
  const clean = id.startsWith("dlab-") ? id.slice(5) : id;
  return isDiscoveryLabId(clean) ? DISCOVERY_LAB_MAP[clean] : undefined;
}

export const discoveryLabSearchIndex: IndexedEntry[] = buildIndex(
  DISCOVERY_LABS.map((lab) => ({
    id: lab.destinationId,
    title: lab.title,
    category: lab.category,
    aliases: lab.searchAliases,
    tags: lab.searchTags,
  }))
);
