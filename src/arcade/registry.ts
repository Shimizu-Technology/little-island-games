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
  { id: "rail-parade", name: "Rail Parade", tagline: "Tiny chicks. One grand island parade.", color: "#365D45", surface: "#DBEAC3", subject: "reading", twoPlayer: false, worlds: railWorlds, hero: "Rilla the Guam rail" },
  { id: "crab-crossing", name: "Crab Crossing", tagline: "A little hop. A big coastal adventure.", color: "#27637B", surface: "#D6EBEB", subject: "math", twoPlayer: false, worlds: crabWorlds, hero: "Kiko the land crab" },
  { id: "reef-builder", name: "Reef Builder", tagline: "A little coral. A whole ocean of possibilities.", color: "#246858", surface: "#DAEEE7", subject: "math", twoPlayer: false, worlds: reefWorlds, hero: "Pip the reef fish" },
  { id: "shell-song", name: "Shell Song", tagline: "Listen to the lagoon. Play its song back.", color: "#53568B", surface: "#E9E6F5", subject: "reading", twoPlayer: false, worlds: songWorlds, hero: "Mina the singing shell" },
];
export const arcadeGame = (id: ArcadeId) => arcadeGames.find(g => g.id === id);
