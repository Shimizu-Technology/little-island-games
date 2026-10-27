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
export const flightWorlds: readonly ArcadeWorld[] = [
  { id: "w1", name: "Sunset Forest", detail: "First flutter", stars: 0 },
  { id: "w2", name: "Moonlit Palms", detail: "Follow the moon", stars: 12 },
  { id: "w3", name: "Firefly Grove", detail: "Glow into the breeze", stars: 30 },
  { id: "learn", name: "Number Canopy", detail: "Fly through the answer", stars: 0, learning: true },
];
export const runWorlds: readonly ArcadeWorld[] = [
  { id: "w1", name: "Morning Beach", detail: "To the water", stars: 0 },
  { id: "w2", name: "Village Festival", detail: "Follow the flags", stars: 12 },
  { id: "w3", name: "Sunset Lagoon", detail: "Chase the sea breeze", stars: 30 },
  { id: "learn", name: "Number Boardwalk", detail: "Run into the answer lane", stars: 0, learning: true },
];
export const railWorlds: readonly ArcadeWorld[] = [
  { id: "w1", name: "Garden Parade", detail: "Little chicks. A big adventure.", stars: 0 },
  { id: "w2", name: "Fern Valley", detail: "Find a path around the ferns.", stars: 12 },
  { id: "w3", name: "Firefly Grove", detail: "A moonlit parade through the grove.", stars: 30 },
  { id: "learn", name: "Clever Chicks", detail: "Count and spell. One swipe, one step.", stars: 0, learning: true },
];
export const crabWorlds: readonly ArcadeWorld[] = [
  { id: "w1", name: "Sunny Coast", detail: "Look, hop, ride. Home by the sea.", stars: 0 },
  { id: "w2", name: "Canoe Lagoon", detail: "Catch a ride across the blue.", stars: 12 },
  { id: "w3", name: "Moonlit Tide", detail: "Follow the moon to your burrow.", stars: 30 },
  { id: "learn", name: "Number Lagoon", detail: "A number path that waits for you.", stars: 0, learning: true },
];
/** Add a finished descriptor here when integrating the next game; IDs are reserved in types.ts. */
export const arcadeGames: readonly ArcadeGame[] = [
  { id: "fruit-bat-flight", name: "Fruit Bat Flight", tagline: "Little wings. A glowing forest adventure.", color: "#51456F", surface: "#E7DCEF", subject: "math", twoPlayer: false, worlds: flightWorlds, hero: "Tavi the fruit bat" },
  { id: "lagoon-run", name: "Lagoon Run", tagline: "A shell trail, a sea breeze, and you.", color: "#326C83", surface: "#D9ECEB", subject: "math", twoPlayer: false, worlds: runWorlds, hero: "Kai the lagoon runner" },
  { id: "rail-parade", name: "Rail Parade", tagline: "Tiny chicks. One grand island parade.", color: "#365D45", surface: "#DBEAC3", subject: "reading", twoPlayer: false, worlds: railWorlds, hero: "Rilla the Guam rail" },
  { id: "crab-crossing", name: "Crab Crossing", tagline: "A little hop. A big coastal adventure.", color: "#27637B", surface: "#D6EBEB", subject: "math", twoPlayer: false, worlds: crabWorlds, hero: "Kiko the land crab" },
  { id: "reef-builder", name: "Reef Builder", tagline: "A little coral. A whole ocean of possibilities.", color: "#246858", surface: "#DAEEE7", subject: "math", twoPlayer: false, worlds: reefWorlds, hero: "Pip the reef fish" },
  { id: "canoe-cargo", name: "Canoe Cargo", tagline: "Pack the hold. Catch the tide!", color: "#315D73", surface: "#D6E5DF", subject: "math", twoPlayer: false, worlds: cargoWorlds, hero: "Poko the cargo captain" },
  { id: "shell-song", name: "Shell Song", tagline: "Listen to the lagoon. Play its song back.", color: "#53568B", surface: "#E9E6F5", subject: "reading", twoPlayer: false, worlds: songWorlds, hero: "Mina the singing shell" },
];
export const arcadeGame = (id: ArcadeId) => arcadeGames.find(g => g.id === id);

/** Stable play shelf, independent of parallel registration order; new games remain visible. */
export const arcadeShelfOrder: readonly ArcadeId[] = ["fruit-bat-flight", "lagoon-run", "canoe-cargo", "reef-builder", "shell-song", "rail-parade", "crab-crossing", "palm-patrol", "beach-ball"];
export const arcadeShelfGames = () => [...arcadeGames].sort((a, b) => arcadeShelfOrder.indexOf(a.id) - arcadeShelfOrder.indexOf(b.id));
