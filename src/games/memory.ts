import { Base, Options, base, shuffle } from "./types";
import { Match, Seat, RoundResult, newMatch, settle, nextStarter } from "./match";
export const memorySymbols = [
  "shell",
  "fish",
  "star",
  "boat",
  "sun",
  "leaf",
  "moon",
  "flower",
  "crab",
  "heart",
  "kite",
  "tree",
];
export type MemoryState = Base & {
  game: "memory";
  cards: string[];
  matched: number[];
  open: number[];
  turns: number;
  player: 0 | 1;
  scores: [number, number];
  history?: Pick<MemoryState, "matched" | "open" | "turns" | "player" | "scores">[];
  match?: Match;
  starter?: Seat;
};
export function createMemory(options: Options, starter: Seat = 0): MemoryState {
  const count = options.difficulty === "easy" ? 6 : options.difficulty === "medium" ? 8 : 12;
  const symbols = shuffle(memorySymbols).slice(0, count);
  return {
    ...base("memory", options),
    game: "memory",
    cards: shuffle([...symbols, ...symbols]),
    matched: [],
    open: [],
    turns: 0,
    player: starter,
    starter,
    scores: [0, 0],
  };
}
export const memoryDone = (s: MemoryState) => s.matched.length === s.cards.length;
export function flipCard(s: MemoryState, index: number): MemoryState {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= s.cards.length ||
    s.open.length === 2 ||
    s.matched.includes(index) ||
    s.open.includes(index)
  )
    return s;
  if (!s.open.length) {
    const { matched, open, turns, player, scores } = s;
    return {
      ...s,
      open: [index],
      history: [...(s.history ?? []).slice(-39), { matched, open, turns, player, scores }],
    };
  }
  const first = s.open[0];
  const turns = s.turns + 1;
  if (s.cards[first] === s.cards[index]) {
    const scores: [number, number] = [...s.scores];
    scores[s.player]++;
    return { ...s, turns, open: [], matched: [...s.matched, first, index], scores };
  }
  return { ...s, turns, open: [first, index] };
}
export function closeMismatch(s: MemoryState): MemoryState {
  return s.open.length === 2
    ? { ...s, open: [], player: s.options.mode === "together" ? (s.player === 0 ? 1 : 0) : 0 }
    : s;
}

export function memoryResult(s: MemoryState): RoundResult {
  return !memoryDone(s) ? null : s.scores[0] === s.scores[1] ? "draw" : s.scores[0] > s.scores[1] ? 0 : 1;
}
export function replayMemory(s: MemoryState): MemoryState {
  const match = settle(s.match ?? newMatch(), memoryResult(s)),
    starter = s.options.mode === "together" ? nextStarter(match, s.starter ?? 0) : 0;
  return { ...createMemory(s.options, starter), match };
}

export function memoryUndo(s: MemoryState): MemoryState {
  if (!s.history?.length) return s;
  return { ...s, ...s.history[s.history.length - 1], history: s.history.slice(0, -1) };
}
