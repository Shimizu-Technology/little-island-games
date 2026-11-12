import authored from "./memory-deals.json";
import { closeMismatch, flipCard, memoryDone, memoryKey, type MemoryState, type MemoryPack } from "../memory";
import { defaultOptions } from "../types";
import { exactKeys, plain } from "../../state/saveBits";
import type { ReplayEngine } from "../../challenge/types";

export type Descriptor = { version: 1; cards: string[]; pack: MemoryPack; preview: boolean; suggested: number };
export type Initial = { version: 1 };
export type Action = ["f", number] | ["n"] | ["p"] | ["g"] | ["h"] | ["u"] | ["z"];
export type State = { round: MemoryState; phase: "offer" | "preview" | "play"; previewed: boolean; flips: number; spent: number; seen: number[]; hint: number[] | null };
/** Authored offline; these exact cards are supplied by the immutable bank, never shuffled on device. */
export const memoryDareDescriptors: readonly Descriptor[] = authored as Descriptor[];
export function seenPair(s: State): number[] {
  const known = s.seen.filter(i => !s.round.matched.includes(i));
  for (const i of known) for (const j of known) if (i < j && memoryKey(s.round.cards[i]) === memoryKey(s.round.cards[j])) return [i, j];
  return [];
}
const freshRound = (d: Descriptor): MemoryState => ({ game: "memory", id: "memory-dare", options: { ...defaultOptions, difficulty: d.cards.length === 12 ? "easy" : d.cards.length === 16 ? "medium" : "hard" }, pack: d.pack, cards: [...d.cards], matched: [], open: [], turns: 0, player: 0, scores: [0, 0], history: [] });
export const memoryDareEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  validAction: (v): v is Action => Array.isArray(v) && (v.length === 2 && v[0] === "f" && Number.isInteger(v[1]) && v[1] >= 0 && v[1] < 24 || v.length === 1 && ["n", "p", "g", "h", "u", "z"].includes(v[0])),
  create: d => ({ round: freshRound(d), phase: d.preview ? "offer" : "play", previewed: false, flips: 0, spent: 0, seen: [], hint: null }),
  step: (s, a, d) => {
    if (a[0] === "p") return s.phase !== "offer" ? null : { state: { ...s, phase: "preview", previewed: true, seen: d.cards.map((_, i) => i) }, event: "edit" };
    if (a[0] === "g") return s.phase === "play" ? null : { state: { ...s, phase: "play" }, event: "edit" };
    if (a[0] === "z") return { state: { ...s, round: freshRound(d), phase: "play", hint: null }, event: "reset" };
    if (s.phase !== "play") return null;
    if (a[0] === "h") return { state: { ...s, hint: seenPair(s) }, event: "help" };
    if (a[0] === "n") { const round = closeMismatch(s.round); return round === s.round ? null : { state: { ...s, round, hint: null }, event: "edit" }; }
    if (a[0] === "u") {
      const history = s.round.history ?? [], last = history.at(-1);
      if (!last) return null;
      return { state: { ...s, round: { ...s.round, ...last, history: history.slice(0, -1) }, hint: null }, event: "edit" };
    }
    const round = flipCard(s.round, a[1]);
    if (round === s.round) return null;
    const flips = s.flips + 1, spent = Math.ceil(flips / 2), seen = [...new Set([...s.seen, a[1]])];
    return { state: { ...s, round, flips, spent, seen, hint: null }, event: memoryDone(round) ? "check" : "edit", ...(memoryDone(round) ? { correct: true } : {}) };
  },
  inspect: (s, d) => ({ solved: memoryDone(s.round), metrics: { turns: s.spent }, edits: s.spent, solution: null, objectives: s.spent <= d.suggested && (!d.preview || s.previewed) ? ["suggested-target"] : [] }),
};
