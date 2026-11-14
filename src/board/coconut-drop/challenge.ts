import authored from "./puzzles.json";
import { choose, legal, move } from "./engine";
import type { Position } from "../types";
import { defend, goalMet, positionOf, Solver, validDescriptor, winsNow, type Descriptor, type Kind } from "./tactics";
import type { Puzzle, RegisteredDare, ReplayEngine } from "../../challenge/types";
import { sha256Hex } from "../../puzzles/sha256";
import { exactKeys, plain } from "../../state/saveBits";

/** Drop in a column, undo the last drop, start again, or ask for help. */
export type Action = ["d", number] | ["u"] | ["z"] | ["h"];
export type Initial = { version: 1 };
/** One circle drop and Ray's answer, or null when the drop ended the puzzle. */
export type Step = { drop: number; reply: number | null; after: Position };
export type State = {
  descriptor: Descriptor;
  start: Position;
  line: Step[];
  position: Position;
  /** True once the goal can't be met from here: undo or start again. */
  missed: boolean;
  /** The column Help pointed to, or null when no sure answer is left. Undefined until asked. */
  hint?: number | null;
};
export type Payload = { version: 1; initial: Initial; options: { supportOff: boolean; ownRead: boolean }; firstSolutions: string[]; actions: Action[] };

/**
 * Circle drops a try may use: exactly par. A drop that isn't an answer is a lost try even
 * if a slower win is still there, so a mark always means the puzzle's own drop was found.
 */
export const allowance = (d: Descriptor) => d.par;
const solvers = new Map<string, Solver>();
export function solverFor(d: Descriptor): Solver {
  const id = d.moves.join("");
  let s = solvers.get(id);
  if (!s) solvers.set(id, (s = new Solver(allowance(d))));
  return s;
}
/**
 * Ray, the Challenge rival, when nothing can stop circle any more. Saved tries are replayed
 * in full on every move, so each board's answer is kept (a few hundred at most).
 */
const replies = new Map<string, number | null>();
export function ray(p: Position): number | null {
  const id = `${p.turn}${p.board.join(",")}`;
  if (replies.has(id)) return replies.get(id)!;
  const m = choose(p, "challenge");
  if (replies.size >= 512) replies.delete(replies.keys().next().value!);
  replies.set(id, m);
  return m;
}
const solved = (d: Descriptor, s: Pick<State, "line" | "position">) => s.line.length > 0 && goalMet(d, s.position);
/** The drop Help shows: the block, or the quickest sure win from here. */
export function helpDrop(s: State): number | null {
  const d = s.descriptor,
    p = s.position;
  if (d.kind === "block") return legal(p).find((c) => goalMet(d, move(p, c))) ?? null;
  return solverFor(d).bestDrops(p).find((c) => solverFor(d).wins(move(p, c), allowance(d) - s.line.length - 1)) ?? null;
}
const validAction = (v: unknown): v is Action =>
  Array.isArray(v) &&
  ((v.length === 2 && v[0] === "d" && Number.isInteger(v[1]) && v[1] >= 0 && v[1] <= 6) ||
    (v.length === 1 && (v[0] === "u" || v[0] === "z" || v[0] === "h")));
export const coconutTacticsEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  initial: () => ({ version: 1 }),
  create: (d) => {
    const start = positionOf(d);
    return { descriptor: d, start, line: [], position: start, missed: false };
  },
  validAction,
  step: (s, a, d) => {
    if (a[0] === "d") {
      const p = s.position;
      if (s.missed || p.turn !== 0 || p.outcome !== null || s.line.length >= allowance(d) || !legal(p).includes(a[1])) return null;
      const dropped = move(p, a[1]);
      if (goalMet(d, dropped)) {
        const state: State = { ...s, line: [...s.line, { drop: a[1], reply: null, after: dropped }], position: dropped, hint: undefined };
        return { state, event: "check", correct: true };
      }
      // Ray answers. A block puzzle is lost to Ray's four; otherwise the try is over once no sure win is left.
      const reply = dropped.outcome === null ? (d.kind === "block" ? (winsNow(dropped)[0] ?? ray(dropped)) : defend(dropped, solverFor(d), ray)) : null,
        after = reply === null ? dropped : move(dropped, reply!),
        line = [...s.line, { drop: a[1], reply, after }],
        missed = d.kind === "block" || after.outcome !== null || !solverFor(d).wins(after, allowance(d) - line.length);
      const state: State = { ...s, line, position: after, missed, hint: undefined };
      return missed ? { state, event: "check", correct: false } : { state, event: "edit" };
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
    return { state: { ...s, hint: s.missed ? null : helpDrop(s) }, event: "help" };
  },
  inspect: (s, d) => {
    const done = solved(d, s);
    return {
      solved: done,
      metrics: { steps: s.line.length },
      edits: s.line.length,
      solution: done ? sha256Hex(JSON.stringify(s.line.map((x) => x.drop))) : null,
      objectives: [],
    };
  },
};

/** Each title names the puzzle's own line, checked against the board when they were written. */
const names: Record<Kind, string[]> = {
  win: ["Three in a row", "Finish the row", "Along the sand", "Up the slope", "Down the slope", "Across the beach", "Slide down", "Late in the game"],
  block: ["Stop the stack", "Cap the tall stack", "Close the gap", "Along the row", "Low row", "Leaf tower", "Watch the slope", "Down the slope"],
  fork: ["Two at once", "Double trouble", "Fork in the path", "Both ways", "Two chances", "Split the reef", "A clever pair", "The last fork"],
};
const kindTier: Record<Kind, 1 | 2 | 3> = { win: 1, block: 2, fork: 3 };
const descriptors = (authored as unknown[]).map((d) => {
  if (!validDescriptor(d)) throw new Error("Invalid Coconut Drop puzzle.");
  return d;
});
/** Bank slot 461 and dare slots 3264-3311, two per puzzle. Ordinals and slots never move. */
export const COCONUT_BANK = 461;
export const COCONUT_DARES = [3264, 3311] as const;
const seen: Record<Kind, number> = { win: 0, block: 0, fork: 0 };
export const coconutPuzzles: readonly Puzzle<Descriptor>[] = descriptors.map((d, i) => {
  const dares: RegisteredDare[] = [
    { slot: 3264 + i * 2, id: `coconut-${i + 1}-clean`, label: "No help and no lost tries", rule: { kind: "clean" }, help: "independent" },
  ];
  if (d.kind === "fork")
    dares.push({ slot: 3265 + i * 2, id: `coconut-${i + 1}-par`, label: `Win in ${d.par} drops`, rule: { kind: "par", metric: "steps", max: d.par }, help: "allowed" });
  const name = names[d.kind][seen[d.kind]++];
  return {
    ref: { bank: COCONUT_BANK, puzzle: i, engine: "drop-puzzles", rules: 1, hash: sha256Hex(JSON.stringify(d)) },
    source: { kind: "play", game: "drop-puzzles", content: `coconut-puzzle-${i + 1}`, rules: 1 },
    path: "deep-water",
    tier: kindTier[d.kind],
    title: `${d.kind === "win" ? "Win" : d.kind === "block" ? "Block" : "Fork"} ${seen[d.kind]} · ${name}`,
    descriptor: d,
    dares,
    awards: [
      { rule: { kind: "clean" }, help: "independent" },
      d.kind === "fork" ? { rule: { kind: "par", metric: "steps", max: d.par }, help: "allowed" } : null,
    ],
    par: { metric: "steps", lower: d.par, upper: d.par },
  };
});
