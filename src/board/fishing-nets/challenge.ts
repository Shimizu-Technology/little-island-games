import authored from "./chains.json";
import { legal, move } from "./engine";
import type { Position } from "../types";
import { defend, positionOf, tableFor, validDescriptor, type Descriptor, type Theme } from "./chains";
import type { Puzzle, RegisteredDare, ReplayEngine } from "../../challenge/types";
import { sha256Hex } from "../../puzzles/sha256";
import { exactKeys, plain } from "../../state/saveBits";

/** Tie a rope, undo the last rope, start again, or ask for help. */
export type Action = ["r", number] | ["u"] | ["z"] | ["h"];
export type Initial = { version: 1 };
/** One circle rope and Ray's ropes after it, if the turn passed. */
export type Step = { rope: number; replies: number[]; after: Position };
export type State = {
  descriptor: Descriptor;
  start: Position;
  line: Step[];
  position: Position;
  /** True once circle can't win from here: undo or start again. */
  missed: boolean;
  /** The rope Help pointed to, or null when no win is left. Undefined until asked. */
  hint?: number | null;
};
export type Payload = { version: 1; initial: Initial; options: { supportOff: boolean; ownRead: boolean }; firstSolutions: string[]; actions: Action[] };

/** The idea each ending teaches, in words a child can follow. Tests check every claim. */
export const ideas: Record<Theme, string> = {
  "leave-two":
    "Don't take the last two boxes of this chain. Tie the rope that leaves them as a pair for Ray. Ray takes the two, then has to open the next chain of boxes for you.",
  "middle-two":
    "Every rope gives Ray something. Give Ray two boxes by tying the rope between them, so Ray can't hand them back. Ray takes both, then has to open the next chain of boxes for you.",
};
const validAction = (v: unknown): v is Action =>
  Array.isArray(v) &&
  ((v.length === 2 && v[0] === "r" && Number.isInteger(v[1]) && v[1] >= 0 && v[1] <= 39) ||
    (v.length === 1 && (v[0] === "u" || v[0] === "z" || v[0] === "h")));
export const netsChainsEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  initial: () => ({ version: 1 }),
  create: (d) => {
    const start = positionOf(d);
    return { descriptor: d, start, line: [], position: start, missed: false };
  },
  validAction,
  step: (s, a, d) => {
    if (a[0] === "r") {
      const p = s.position;
      if (s.missed || p.turn !== 0 || p.outcome !== null || !legal(p).includes(a[1])) return null;
      const tied = move(p, a[1]),
        table = tableFor(d),
        { position, replies } = tied.turn === 1 ? defend(tied, table) : { position: tied, replies: [] };
      const missed = position.outcome !== null ? position.outcome !== 0 : table.margin(position) <= 0;
      const state: State = { ...s, line: [...s.line, { rope: a[1], replies, after: position }], position, missed, hint: undefined };
      return position.outcome === 0 ? { state, event: "check", correct: true } : missed ? { state, event: "check", correct: false } : { state, event: "edit" };
    }
    if (a[0] === "u") {
      if (!s.line.length) return null;
      const line = s.line.slice(0, -1);
      return { state: { ...s, line, position: line.length ? line[line.length - 1].after : s.start, missed: false, hint: undefined }, event: "edit" };
    }
    if (a[0] === "z") {
      if (!s.line.length && s.hint === undefined) return null;
      return { state: { ...s, line: [], position: s.start, missed: false, hint: undefined }, event: "reset" };
    }
    return { state: { ...s, hint: s.missed ? null : (tableFor(d).best(s.position)[0] ?? null) }, event: "help" };
  },
  inspect: (s, d) => {
    const solved = s.position.outcome === 0;
    return {
      solved,
      metrics: { steps: s.line.length },
      edits: s.line.length,
      solution: solved ? sha256Hex(JSON.stringify(s.line.map((x) => x.rope))) : null,
      objectives: solved && s.position.scores[0] === tableFor(d).bestBoxes(s.start) ? ["most"] : [],
    };
  },
};

const names = [
  "Two by the shore",
  "The corner pair",
  "Hand it over",
  "Keep the long net",
  "A gift of two",
  "The wide net",
  "The quiet pair",
  "Last two stay",
  "Through the middle",
  "Patient fisher",
  "Two for one",
  "The long chain",
];
export const netsTier = (d: Descriptor, open: number): 1 | 2 | 3 | 4 => (d.size === 3 ? (open <= 7 ? 1 : 2) : open <= 8 ? 3 : 4);
/** Facts the generator certified beside each ending; tests work every one out again. */
export type EndingFacts = { theme: Theme; best: number; short: boolean };
const entries = (authored as { ending: unknown; theme: Theme; best: number; short: boolean }[]).map(({ ending, ...facts }) => {
  if (!validDescriptor(ending) || !(facts.theme in ideas)) throw new Error("Invalid Fishing Nets ending.");
  return { d: ending, facts: facts as EndingFacts };
});
const descriptors = entries.map((e) => e.d);
export const netsFacts: readonly EndingFacts[] = entries.map((e) => e.facts);
/** Bank slot 462 and dare slots 3312-3335, two per ending. Ordinals and slots never move. */
export const NETS_BANK = 462;
export const NETS_DARES = [3312, 3335] as const;
export const netsPuzzles: readonly Puzzle<Descriptor>[] = descriptors.map((d, i) => {
  const facts = netsFacts[i];
  const dares: RegisteredDare[] = [
    { slot: 3312 + i * 2, id: `nets-${i + 1}-clean`, label: "No help and no lost tries", rule: { kind: "clean" }, help: "independent" },
  ];
  if (facts.short)
    dares.push({ slot: 3313 + i * 2, id: `nets-${i + 1}-most`, label: `Win with all ${facts.best} boxes you can`, rule: { kind: "pick-up", objective: "most" }, help: "allowed" });
  return {
    ref: { bank: NETS_BANK, puzzle: i, engine: "fishing-nets", rules: 1, hash: sha256Hex(JSON.stringify(d)) },
    source: { kind: "play", game: "fishing-nets", content: `nets-chain-${i + 1}`, rules: 1 },
    path: "deep-water",
    tier: netsTier(d, legal(positionOf(d)).length),
    title: `Chain ${i + 1} · ${names[i]}`,
    descriptor: d,
    dares,
    awards: [{ rule: { kind: "clean" }, help: "independent" }, facts.short ? { rule: { kind: "pick-up", objective: "most" }, help: "allowed" } : null],
  };
});
