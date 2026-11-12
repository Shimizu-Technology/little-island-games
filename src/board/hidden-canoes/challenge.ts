import authored from "./scenarios.json";
import { coordinate } from "./engine";
import { factsFor, validDescriptor, type Ask, type Descriptor } from "./scenarios";
import type { Puzzle, RegisteredDare, ReplayEngine } from "../../challenge/types";
import { sha256Hex } from "../../puzzles/sha256";
import { exactKeys, plain } from "../../state/saveBits";

/** Tap a space, undo the last tap, start again, or ask for help. */
export type Action = ["t", number] | ["u"] | ["z"] | ["h"];
export type Initial = { version: 1 };
/** A tapped space and whether it answers the question. Wrong taps stay in the line until undone. */
export type Pick = { cell: number; right: boolean };
export type State = {
  descriptor: Descriptor;
  picks: Pick[];
  /** The space Help pointed to. Undefined until asked. */
  hint?: number;
};
export type Payload = { version: 1; initial: Initial; options: { supportOff: boolean; ownRead: boolean }; firstSolutions: string[]; actions: Action[] };

const found = (s: State) => new Set(s.picks.filter((p) => p.right).map((p) => p.cell));
export const solvedState = (s: State) => {
  const answers = factsFor(s.descriptor).answers,
    got = found(s);
  return answers.length > 0 && answers.every((c) => got.has(c));
};
/**
 * Why a space is or isn't an answer, from the chart's heatmap alone. Plain words: "a way"
 * is one way the three canoes could lie that fits every search on the chart.
 */
export function reason(d: Descriptor, cell: number): string {
  const { layouts, cover } = factsFor(d),
    at = coordinate(cell),
    n = cover[cell];
  if (d.ask === "sure")
    return n === layouts ? `${at} must hold a canoe: there's no way to fit the canoes without it.` : `${at} might be open water: the canoes can fit without it.`;
  if (d.ask === "water") return n === 0 ? `${at} can't hold a canoe: no canoe fits there.` : `${at} could hold a canoe: a canoe can fit there.`;
  const top = Math.max(...cover.filter((_, c) => !d.chart[c]));
  return n === top
    ? `${at} has the best chance: the canoes fit over it in more ways than any other space.`
    : `${at} could hold a canoe, but another space has a better chance.`;
}
const validAction = (v: unknown): v is Action =>
  Array.isArray(v) &&
  ((v.length === 2 && v[0] === "t" && Number.isInteger(v[1]) && v[1] >= 0 && v[1] <= 35) ||
    (v.length === 1 && (v[0] === "u" || v[0] === "z" || v[0] === "h")));
export const canoesScenarioEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  initial: () => ({ version: 1 }),
  create: (d) => ({ descriptor: d, picks: [] }),
  validAction,
  step: (s, a, d) => {
    if (a[0] === "t") {
      const cell = a[1];
      if (d.chart[cell] || found(s).has(cell) || s.picks[s.picks.length - 1]?.cell === cell) return null;
      const right = factsFor(d).answers.includes(cell),
        state: State = { ...s, picks: [...s.picks, { cell, right }], hint: undefined };
      if (!right) return { state, event: "check", correct: false };
      return solvedState(state) ? { state, event: "check", correct: true } : { state, event: "edit" };
    }
    if (a[0] === "u") {
      if (!s.picks.length) return null;
      return { state: { ...s, picks: s.picks.slice(0, -1), hint: undefined }, event: "edit" };
    }
    if (a[0] === "z") {
      if (!s.picks.length && s.hint === undefined) return null;
      return { state: { ...s, picks: [], hint: undefined }, event: "reset" };
    }
    const next = factsFor(d).answers.find((c) => !found(s).has(c));
    return next === undefined ? null : { state: { ...s, hint: next }, event: "help" };
  },
  inspect: (s) => {
    const solved = solvedState(s);
    return {
      solved,
      metrics: { steps: s.picks.length },
      edits: s.picks.length,
      solution: solved ? sha256Hex(JSON.stringify([...found(s)].sort((a, b) => a - b))) : null,
      objectives: [],
    };
  },
};

export const askText: Record<Ask, (n: number) => string> = {
  sure: (n) => (n === 1 ? "Find the space that must hold a canoe." : `Find the ${n} spaces that must hold a canoe.`),
  water: (n) => (n === 1 ? "Find the space that can't hold a canoe." : `Find the ${n} spaces that can't hold a canoe.`),
  best: () => "Find the space most likely to hold a canoe.",
};
const names = [
  "Boxed in",
  "Only one way",
  "Along the edge",
  "Too small",
  "The lonely gap",
  "The far corner",
  "Best chance",
  "Where it fits",
  "Most ways",
  "Two for sure",
  "The long canoe",
  "Three sure spaces",
];
const tierOf = (i: number): 1 | 2 | 3 | 4 => ((Math.floor(i / 3) + 1) as 1 | 2 | 3 | 4);
const descriptors = (authored as unknown[]).map((d) => {
  if (!validDescriptor(d)) throw new Error("Invalid Hidden Canoes scenario.");
  return d;
});
/** Bank slot 463 and dare slots 3336-3347, one per scenario. Ordinals and slots never move. */
export const CANOES_BANK = 463;
export const CANOES_DARES = [3336, 3347] as const;
export const canoesPuzzles: readonly Puzzle<Descriptor>[] = descriptors.map((d, i) => {
  const dares: RegisteredDare[] = [
    { slot: 3336 + i, id: `canoes-${i + 1}-clean`, label: "No help and no wrong taps", rule: { kind: "clean" }, help: "independent" },
  ];
  return {
    ref: { bank: CANOES_BANK, puzzle: i, engine: "hidden-canoes", rules: 1, hash: sha256Hex(JSON.stringify(d)) },
    source: { kind: "play", game: "hidden-canoes", content: `canoes-scenario-${i + 1}`, rules: 1 },
    path: "deep-water",
    tier: tierOf(i),
    title: `Chart ${i + 1} · ${names[i]}`,
    descriptor: d,
    dares,
    awards: [{ rule: { kind: "clean" }, help: "independent" }, null],
    par: { metric: "steps", lower: d.count, upper: d.count },
  };
});
