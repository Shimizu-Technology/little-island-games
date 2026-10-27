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
export const palmWorlds: readonly ArcadeWorld[] = [
  { id: "w1", name: "Coconut Cove", detail: "A sunny grove. A gentle first toss.", stars: 0 },
  { id: "w2", name: "Breezy Palms", detail: "Swooping visitors in the sea breeze.", stars: 12 },
  { id: "w3", name: "Moonlit Grove", detail: "More nets. A big beetle friend.", stars: 30 },
  { id: "learn", name: "Number Grove", detail: "Find the beetle with the matching answer.", stars: 0, learning: true },
];
export const beachWorlds: readonly ArcadeWorld[] = [
  { id: "w1", name: "Sunny Sands", detail: "A ball. A buddy. A sunny rally.", stars: 0 },
  { id: "w2", name: "Turtle Breeze", detail: "Catch the wind. Let the turtle nap.", stars: 12 },
  { id: "w3", name: "Sunset Splash", detail: "Two balls under a violet sky.", stars: 30 },
  { id: "learn", name: "Counting Coast", detail: "Every splash counts by 2s or 5s.", stars: 0, learning: true },
];
/** Add a finished descriptor here when integrating the next game; IDs are reserved in types.ts. */
export const arcadeGames: readonly ArcadeGame[] = [
  { id: "palm-patrol", name: "Palm Patrol", tagline: "Coconut tosses. Dizzy beetles. Happy palms!", color: "#28684B", surface: "#DBEABD", subject: "math", twoPlayer: false, worlds: palmWorlds, hero: "Coco the grove keeper" },
  { id: "beach-ball", name: "Beach Ball", tagline: "One beach. Two buddies. A whole lot of splash.", color: "#24667E", surface: "#FFE3B5", subject: "math", twoPlayer: true, worlds: beachWorlds, hero: "Bibi the beach ball" },
  { id: "reef-builder", name: "Reef Builder", tagline: "A little coral. A whole ocean of possibilities.", color: "#246858", surface: "#DAEEE7", subject: "math", twoPlayer: false, worlds: reefWorlds, hero: "Pip the reef fish" },
  { id: "shell-song", name: "Shell Song", tagline: "Listen to the lagoon. Play its song back.", color: "#53568B", surface: "#E9E6F5", subject: "reading", twoPlayer: false, worlds: songWorlds, hero: "Mina the singing shell" },
];
export const arcadeGame = (id: ArcadeId) => arcadeGames.find(g => g.id === id);
