import { Match, newMatch, nextStarter, Seat, settle, validMatch } from "../games/match";
import * as coconut from "./coconut-drop/engine";
import * as nets from "./fishing-nets/engine";
import * as canoes from "./hidden-canoes/engine";
import * as pits from "./shell-pits/engine";
import * as reef from "./reef-sweep/engine";
import { Edge, Engine, integer, object, Position, Strength, strengths } from "./types";
import { archivedPolicy, currentPolicy, policyById } from "../playPolicies/policies";
import type { BoardPolicy, PolicyId } from "../playPolicies/types";
export * from "./types";
export const boardIds = ["coconut-drop", "fishing-nets", "hidden-canoes", "shell-pits", "reef-sweep"] as const;
export type BoardId = (typeof boardIds)[number];
export const isBoardId = (id: unknown): id is BoardId =>
  typeof id === "string" && (boardIds as readonly string[]).includes(id);
export const engines: Record<BoardId, Engine> = {
  "coconut-drop": coconut,
  "fishing-nets": nets,
  "hidden-canoes": canoes,
  "shell-pits": pits,
  "reef-sweep": reef,
};
export const catalog: Record<
  BoardId,
  { name: string; description: string; surface: string; sizes: number[]; rule: string; lesson: string }
> = {
  "coconut-drop": {
    name: "Coconut Drop",
    description: "Drop a coconut. Connect four in a row.",
    surface: "#E6EED7",
    sizes: [7],
    rule: "Take turns dropping into a column. Four matching coconuts in a straight line wins: across, up, or diagonally.",
    lesson:
      "Watch the middle column. A coconut falls to the lowest open spot. Four coconut circles connect across this little example.",
  },
  "fishing-nets": {
    name: "Fishing Nets",
    description: "Tie the last rope. Gather a little reef.",
    surface: "#DEEDEF",
    sizes: [3, 4, 5],
    rule: "Tap a rope between two dots. Close the fourth side of a box to claim it and go again. Most boxes wins after every rope is tied.",
    lesson:
      "These three ropes leave one side open. Tie the glowing fourth rope to make a net. Closing a net earns another turn.",
  },
  "hidden-canoes": {
    name: "Hidden Canoes",
    description: "Search the lagoon, one coordinate at a time.",
    surface: "#DCECF2",
    sizes: [6],
    rule: "Each lagoon has three hidden canoes: lengths 3, 2 and 2. Charts are arranged for you. Take turns searching one coordinate, even after a find. Find all seven canoe spaces first. Keep your own chart private!",
    lesson:
      "A letter names a column and a number names a row. C3 is column C, row 3. A little canoe means a find; a ripple means open water.",
  },
  "shell-pits": {
    name: "Shell Pits",
    description: "Sow, count, and collect your shells.",
    surface: "#F3E6CF",
    sizes: [6],
    rule: "Kalah: each of six pits starts with four shells. Choose a pit on your side and sow one shell into each next pit, counterclockwise. Skip the other store. Finish in your store to go again. Finish in your own empty pit, opposite a nonempty pit, to capture both. When either side empties, sweep each side into its store. Most shells wins.",
    lesson:
      "Choose a pit to preview the path. Four shells go one, two, three, four. The ring shows where the last shell lands. Tap Sow shells when you are ready.",
  },
  "reef-sweep": {
    name: "Reef Sweep",
    description: "Find pearls. Give sea urchins room.",
    surface: "#E0EFE9",
    sizes: [5, 6, 7],
    rule: "Open every pearl space without touching a sea urchin. Your first opening and its neighbors are safe, and every new reef can be solved by thinking with no guessing. A number counts urchins in the eight touching spaces, including diagonals. Switch to Flag urchins or press and hold a tile to mark a suspected urchin. Flags are reminders, not proof.",
    lesson:
      "This 1 touches one sea urchin, including diagonal neighbors. Mark the urchin with a flag, then open the other pearl spaces. Empty spaces open their neighbors for you.",
  },
};
export type BoardSession = {
  /** Version 1 rounds were saved before policies were recorded; they finish on revision 1. */
  version: 1 | 2;
  id: string;
  game: BoardId;
  mode: "solo" | "together";
  strength: Strength;
  position: Position;
  match: Match;
  taught: boolean;
  /** Version 2: the computer's policy, frozen for this round. Null when no computer plays. */
  policy?: PolicyId | null;
  /** Version 2: a public tie-break salt for the computer, never derived from the seed. */
  salt?: number;
};
export type BoardSessions = Partial<Record<BoardId, BoardSession>>;
export function createSession(
  game: BoardId,
  config: {
    mode?: "solo" | "together";
    strength?: Strength;
    size?: number;
    seed?: number;
    starter?: Seat;
    names?: [string, string];
    alternate?: boolean;
    /** A declared head start for seat 0 or seat 1, in the game's own units. */
    edge?: Edge;
    salt?: number;
  } = {}
): BoardSession {
  const seed = config.seed ?? Date.now() >>> 0,
    mode = game === "reef-sweep" ? "solo" : (config.mode ?? "solo"),
    strength = config.strength ?? "gentle";
  return {
    version: 2,
    id: `board-${seed}-${Math.random().toString(36).slice(2, 10)}`,
    game,
    mode,
    strength,
    position: engines[game].create(seed, config.size, config.starter, engines[game].maxEdge ? config.edge : undefined),
    match: newMatch(config.names, config.alternate),
    taught: false,
    policy: computerPlays(game, mode) ? currentPolicy(game as PolicyBoard, strength).id : null,
    salt: (config.salt ?? Math.floor(Math.random() * 0x100000000)) >>> 0,
  };
}
type PolicyBoard = Exclude<BoardId, "reef-sweep">;
const computerPlays = (game: BoardId, mode: BoardSession["mode"]) => game !== "reef-sweep" && mode === "solo";
/** The policy this round plays with: recorded in version 2, implied for version 1. */
export function sessionPolicy(s: BoardSession): BoardPolicy | null {
  if (!computerPlays(s.game, s.mode)) return null;
  return s.version === 1 ? archivedPolicy(s.game as PolicyBoard, s.strength) : (policyById(s.policy) ?? null);
}
/** A new round takes the current policy revision and keeps the declared head start. */
export function playAgain(s: BoardSession, seed: number, salt = Math.floor(Math.random() * 0x100000000)): BoardSession {
  const position = engines[s.game].create(
    seed,
    s.position.size,
    s.game === "reef-sweep" ? 0 : nextStarter(s.match, s.position.starter),
    s.position.edge
  );
  return {
    ...s,
    version: 2,
    id: `board-${seed}-${Math.random().toString(36).slice(2, 10)}`,
    position,
    match: s.game === "reef-sweep" ? s.match : settle(s.match, s.position.outcome),
    policy: computerPlays(s.game, s.mode) ? currentPolicy(s.game as PolicyBoard, s.strength).id : null,
    salt: salt >>> 0,
  };
}
export function validBoardSession(v: unknown): v is BoardSession {
  if (!object(v)) return false;
  const keys = Object.keys(v).sort().join();
  if (v.version === 1) {
    if (keys !== "game,id,match,mode,position,strength,taught,version" || (object(v.position) && "edge" in v.position))
      return false;
  } else if (v.version === 2) {
    if (keys !== "game,id,match,mode,policy,position,salt,strength,taught,version" || !integer(v.salt, 0, 0xffffffff))
      return false;
    const policy = policyById(v.policy);
    if (
      computerPlays(v.game as BoardId, v.mode as BoardSession["mode"])
        ? !policy || policy.game !== v.game || policy.strength !== v.strength || !policy.publicOnly
        : v.policy !== null
    )
      return false;
  } else return false;
  return (
    typeof v.id === "string" &&
    v.id.length > 0 &&
    v.id.length <= 100 &&
    isBoardId(v.game) &&
    (v.mode === "solo" || v.mode === "together") &&
    (v.game !== "reef-sweep" || v.mode === "solo") &&
    strengths.includes(v.strength as Strength) &&
    typeof v.taught === "boolean" &&
    validMatch(v.match) &&
    engines[v.game].validate(v.position)
  );
}
export function validBoardSessions(v: unknown): v is BoardSessions {
  return object(v) && Object.entries(v).every(([id, s]) => isBoardId(id) && validBoardSession(s) && s.game === id);
}
export function undo(s: BoardSession): BoardSession {
  if (!s.position.moves.length || s.game === "hidden-canoes" || (s.mode === "together" && s.game !== "reef-sweep"))
    return s;
  const engine = engines[s.game],
    initial =
      s.game === "reef-sweep"
        ? reef.initialFrom(s.position)
        : engine.create(s.position.seed, s.position.size, s.position.starter, s.position.edge),
    states = [initial];
  for (const m of s.position.moves) states.push(engine.move(states[states.length - 1], m));
  for (let i = states.length - 2; i >= 0; i--) if (states[i].turn === 0) return { ...s, position: states[i] };
  return s;
}
/** Compare-and-swap plus restore generation prevents delayed AI or old screens overwriting a new save. */
export function applyBoardSave<
  T extends {
    board?: BoardSessions;
    recentBoard?: BoardId | null;
    recentLearn?: unknown;
    recentActivity?: unknown;
    recent?: unknown;
  },
>(
  save: T,
  game: BoardId,
  next: BoardSession,
  expected: BoardSession | undefined,
  expectedEpoch: number,
  epoch: number
): T {
  if (epoch !== expectedEpoch || save.board?.[game] !== expected || next.game !== game || !validBoardSession(next))
    return save;
  return {
    ...save,
    board: { ...save.board, [game]: next },
    recentBoard: game,
    recentLearn: null,
    recentActivity: null,
    recent: null,
  };
}
