import { type ArcadeGame, type ArcadeId, type ArcadeWorld } from "./types";
export const reefWorlds: readonly ArcadeWorld[] = [
  { id: "w1", name: "Little Lagoon", detail: "Make room for the first little fish.", stars: 0 },
  { id: "w2", name: "Coral Gardens", detail: "Turn corners. Open new channels.", stars: 12 },
  { id: "w3", name: "Deep Blue", detail: "Plan a reef with room to grow.", stars: 30 },
  { id: "learn", name: "Make Ten Reef", detail: "Number corals clear when a line makes 10.", stars: 0, learning: true },
];
export const songWorlds: readonly ArcadeWorld[] = [
  { id: "w1", name: "Singing Shore", detail: "Three shells. One little song.", stars: 0 },
  { id: "w2", name: "Tide Chorus", detail: "A new voice joins the shore.", stars: 12 },
  { id: "w3", name: "Moonlight Music", detail: "More shells and longer songs.", stars: 30 },
  { id: "learn", name: "Sound a Word", detail: "Hear the sounds. Find their picture. Take your time.", stars: 0, learning: true },
];
export const cargoWorlds: readonly ArcadeWorld[] = [
  { id: "w1", name: "Picnic Harbor", detail: "Pack a little. Sail a little.", stars: 0 },
  { id: "w2", name: "Trade Wind Bay", detail: "Busy boats and precious cargo.", stars: 12 },
  { id: "w3", name: "Moon Tide", detail: "Rising cargo. Keep the harbor open.", stars: 30 },
  { id: "learn", name: "Number Voyage", detail: "Match the sum. Send two canoes!", stars: 0, learning: true },
];
/** Add a finished descriptor here when integrating the next game; IDs are reserved in types.ts. */
export const arcadeGames: readonly ArcadeGame[] = [
  { id: "reef-builder", name: "Reef Builder", tagline: "A little coral. A whole ocean of possibilities.", color: "#246858", surface: "#DAEEE7", subject: "math", twoPlayer: false, worlds: reefWorlds, hero: "Pip the reef fish" },
  { id: "canoe-cargo", name: "Canoe Cargo", tagline: "Pack the hold. Catch the tide!", color: "#315D73", surface: "#D6E5DF", subject: "math", twoPlayer: false, worlds: cargoWorlds, hero: "Poko the cargo captain" },
  { id: "shell-song", name: "Shell Song", tagline: "Listen to the lagoon. Play its song back.", color: "#53568B", surface: "#E9E6F5", subject: "reading", twoPlayer: false, worlds: songWorlds, hero: "Mina the singing shell" },
];
export const arcadeGame = (id: ArcadeId) => arcadeGames.find(g => g.id === id);

/** Stable play shelf, independent of parallel registration order; new games remain visible. */
export const arcadeShelfOrder: readonly ArcadeId[] = ["fruit-bat-flight", "lagoon-run", "canoe-cargo", "reef-builder", "shell-song", "rail-parade", "crab-crossing", "palm-patrol", "beach-ball"];
export const arcadeShelfGames = () => [...arcadeGames].sort((a, b) => arcadeShelfOrder.indexOf(a.id) - arcadeShelfOrder.indexOf(b.id));
