import authored from "./tactics.json";
import { legal, move } from "./engine";
import type { Position } from "../types";
import { captures, defend, positionOf, Solver, validDescriptor, type Descriptor, type Objective } from "./tactics";
import type { Puzzle, RegisteredDare, ReplayEngine } from "../../challenge/types";
import { sha256Hex } from "../../puzzles/sha256";
import { exactKeys, plain } from "../../state/saveBits";

/** Sow a circle pit, undo the last sow, start again, or ask for help. */
export type Action = ["s", number] | ["u"] | ["z"] | ["h"];
export type Initial = { version: 1 };
export type Step = { sow: number; replies: number[]; captured: boolean; after: Position };
export type State = {
  descriptor: Descriptor;
  start: Position;
  line: Step[];
  position: Position;
  /** The sow Help pointed to, or null when Help found no sure win. Undefined until asked. */
  hint?: number | null;
};
export type Payload = { version: 1; initial: Initial; options: { supportOff: boolean; ownRead: boolean }; firstSolutions: string[]; actions: Action[] };

const solvers = new Map<string, Solver>();
/** One solver per puzzle. It looks a few sows past par so Help works after a detour. */
export function solverFor(d: Descriptor): Solver {
  const id = d.board.join(",");
  let s = solvers.get(id);
  if (!s) solvers.set(id, (s = new Solver(d.par + 3)));
  return s;
}
const validAction = (v: unknown): v is Action =>
  Array.isArray(v) &&
  ((v.length === 2 && v[0] === "s" && Number.isInteger(v[1]) && v[1] >= 0 && v[1] <= 5) ||
    (v.length === 1 && (v[0] === "u" || v[0] === "z" || v[0] === "h")));
export const pitsTacticsEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  initial: () => ({ version: 1 }),
  create: (d) => {
    const start = positionOf(d.board);
    return { descriptor: d, start, line: [], position: start };
  },
  validAction,
  step: (s, a, d) => {
    if (a[0] === "s") {
      const p = s.position;
      if (p.turn !== 0 || p.outcome !== null || !legal(p).includes(a[1])) return null;
      const sown = move(p, a[1]),
        { position, replies } = defend(sown, solverFor(d));
      const state: State = { ...s, line: [...s.line, { sow: a[1], replies, captured: captures(p, a[1]), after: position }], position, hint: undefined };
      return position.outcome === null ? { state, event: "edit" } : { state, event: "check", correct: position.outcome === 0 };
    }
    if (a[0] === "u") {
      if (!s.line.length) return null;
      const line = s.line.slice(0, -1);
      return { state: { ...s, line, position: line.length ? line[line.length - 1].after : s.start, hint: undefined }, event: "edit" };
    }
    if (a[0] === "z") {
      if (!s.line.length && s.hint === undefined) return null;
      return { state: { ...s, line: [], position: s.start, hint: undefined }, event: "reset" };
    }
    if (s.position.turn !== 0 || s.position.outcome !== null) return null;
    return { state: { ...s, hint: solverFor(d).bestSow(s.position) }, event: "help" };
  },
  inspect: (s) => {
    const solved = s.position.outcome === 0;
    const objectives: Objective[] = [];
    if (solved && s.line.some((x) => x.captured)) objectives.push("capture");
    if (solved && s.line.every((x) => !x.replies.length)) objectives.push("one-turn");
    return {
      solved,
      metrics: { steps: s.line.length },
      edits: s.line.length,
      solution: solved ? sha256Hex(JSON.stringify(s.line.map((x) => x.sow))) : null,
      objectives,
    };
  },
};

const names = [
  "Two little pits",
  "The quiet corner",
  "One more turn",
  "Across the sand",
  "Three shells home",
  "A patient sow",
  "Keep the turn",
  "The long way round",
  "Low tide",
  "Pick your moment",
  "Store and again",
  "The empty pit",
  "Deep pits",
  "Hold the line",
  "Shell by shell",
  "The last capture",
];
export const pitsTiers = (par: number): 1 | 2 | 3 | 4 => (par <= 2 ? 1 : par === 3 ? 2 : par === 4 ? 3 : 4);
const descriptors = (authored as unknown[]).map((d) => {
  if (!validDescriptor(d)) throw new Error("Invalid Shell Pits endgame.");
  return d;
});
/** Bank slot 460 and dare slots 3200 onward. Ordinals and slots never move. */
export const PITS_BANK = 460;
export const pitsPuzzles: readonly Puzzle<Descriptor>[] = descriptors.map((d, i) => {
  const dares: RegisteredDare[] = [
    { slot: 3200 + i * 4, id: `pits-${i + 1}-clean`, label: "No help and no lost tries", rule: { kind: "clean" }, help: "independent" },
    { slot: 3201 + i * 4, id: `pits-${i + 1}-par`, label: `Win in ${d.par} ${d.par === 1 ? "sow" : "sows"}`, rule: { kind: "par", metric: "steps", max: d.par }, help: "allowed" },
  ];
  if (d.objectives.includes("capture"))
    dares.push({ slot: 3202 + i * 4, id: `pits-${i + 1}-capture`, label: "Win with a capture across the pits", rule: { kind: "pick-up", objective: "capture" }, help: "allowed" });
  if (d.objectives.includes("one-turn"))
    dares.push({ slot: 3203 + i * 4, id: `pits-${i + 1}-one-turn`, label: "Win before Ray sows once", rule: { kind: "pick-up", objective: "one-turn" }, help: "allowed" });
  return {
    ref: { bank: PITS_BANK, puzzle: i, engine: "shell-pits", rules: 1, hash: sha256Hex(JSON.stringify(d)) },
    source: { kind: "play", game: "shell-pits", content: `pits-endgame-${i + 1}`, rules: 1 },
    path: "deep-water",
    tier: pitsTiers(d.par),
    title: `Endgame ${i + 1} · ${names[i]}`,
    descriptor: d,
    dares,
    awards: [{ rule: { kind: "clean" }, help: "independent" }, { rule: { kind: "par", metric: "steps", max: d.par }, help: "allowed" }],
    par: { metric: "steps", lower: d.par, upper: d.par },
  };
});
