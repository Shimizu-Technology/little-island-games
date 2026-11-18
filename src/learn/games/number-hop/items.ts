import {
  JUMP_SETS, fewestJumps, fewestStraight, greedyJumps, smallestJumpsBot, type Hop, type Level, type Op, type OpChoice, type Step,
} from "../../../math/kit";

/**
 * Number Hop puzzles (SC-15). Each is a short array so a saved round stays small:
 *   [0, op, a, b]              hop by ones from a, b times, then say where you landed (Levels 1 and 2)
 *   [1, start, target, set]    reach the target with the jumps of a set; par is the fewest jumps, by search (Levels 3 to 5)
 *   [2, start, j1, j2, …]      the frog made these jumps and landed; where did it start? (Level 5)
 *
 * Levels rise by strategy:
 *   1  hop on by ones to 10
 *   2  hop across ten, to 20
 *   3  choose jumps of 1 and 2 (both ways): bigger jumps make fewer
 *   4  jumps of 2, 5 and 10 forward to 100: tens first, and the biggest jump is not always right
 *   5  jumps of 1 and 10 both ways: go past and come back; then work back to an unknown start
 */
export type HopItem = readonly number[];
export const ROUND_LENGTH = 5;
export const LEVEL_SKILL = ["num.hop-ones", "num.hop-ten", "num.hop-choose", "num.hop-skip", "num.hop-back"] as const;
/** The jump set each level offers to reach puzzles. */
export const levelSet = (level: Level): number => (level === 3 ? 0 : level === 4 ? 1 : 2);
export const lineMax = (level: Level): number => (level === 1 ? 10 : level <= 3 ? 20 : 100);
/** Jumps an unknown-start puzzle may be made of. */
export const START_JUMPS = [-10, -5, -2, -1, 1, 2, 5, 10];

const whole = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
export const kindOf = (i: HopItem): 0 | 1 | 2 => i[0] as 0 | 1 | 2;
export const countOp = (i: HopItem): Op => (i[1] === 0 ? "add" : "subtract");
export const countResult = (i: HopItem): number => (i[1] === 0 ? i[2] + i[3] : i[2] - i[3]);
export const hopOf = (i: HopItem, level: Level): Hop => ({ start: i[1], target: i[2], jumps: JUMP_SETS[i[3]] ?? [], lo: 0, hi: lineMax(level) });
export const startJumps = (i: HopItem): number[] => i.slice(2);
export const landingOf = (i: HopItem): number => i[1] + startJumps(i).reduce((s, j) => s + j, 0);

/** Kit plans for the two kinds a child answers with a number: count hops then name the landing, or name the start. */
export function planOf(i: HopItem): Step[] | null {
  if (i[0] === 0) return [{ kind: "count", times: i[3], dir: i[1] === 0 ? 1 : -1 }, { kind: "number", value: countResult(i), role: "final" }];
  if (i[0] === 2) return [{ kind: "number", value: i[1], role: "final" }];
  return null;
}
/** The fewest jumps for a reach puzzle: its par, proved by a breadth-first search. */
export const parOf = (i: HopItem, level: Level): number | null => (i[0] === 1 ? fewestJumps(hopOf(i, level)) : null);

const dirFor = (rung: number, choice: OpChoice): Op => (choice === "mixed" ? (rung % 2 === 0 ? "add" : "subtract") : choice);

/** Whether a puzzle belongs at a level's rung. The generator and the save check use the same rules. */
export function fitsRung(level: Level, rung: number, choice: OpChoice, i: HopItem): boolean {
  if (!Array.isArray(i) || !i.every((n) => Number.isInteger(n))) return false;
  if (level <= 2) {
    if (i.length !== 4 || i[0] !== 0 || (i[1] !== 0 && i[1] !== 1) || countOp(i) !== dirFor(rung, choice)) return false;
    const a = i[2], b = i[3], r = countResult(i), top = lineMax(level);
    if (!whole(a, 0, top) || !whole(b, 1, top) || !whole(r, 0, top)) return false;
    if (level === 1) return rung <= 1 ? b <= 3 && Math.max(a, r) <= 6 : b >= 2 && b <= 5 && Math.max(a, r) >= 5;
    // Level 2 crosses ten every time: 8 + 5, 13 − 6.
    const crosses = countOp(i) === "add" ? a <= 9 && r >= 11 : a >= 11 && r <= 9;
    return crosses && b <= 8 && (rung <= 1 ? b <= 4 : b >= 4);
  }
  if (level === 5 && rung >= 3) return fitsStart(rung, i);
  if (i.length !== 4 || i[0] !== 1 || i[3] !== levelSet(level)) return false;
  const h = hopOf(i, level);
  if (!whole(h.start, h.lo, h.hi) || !whole(h.target, h.lo, h.hi) || h.start === h.target) return false;
  const par = fewestJumps(h), d = Math.abs(h.target - h.start), up = h.target > h.start;
  if (par === null) return false;
  if (level === 3) {
    if (up !== (dirFor(rung, choice) === "add")) return false;
    return d >= [3, 5, 7, 9, 11][rung] && d <= [4, 6, 8, 10, 14][rung];
  }
  if (level === 4) {
    if (!up) return false;
    const greedy = greedyJumps(h);
    if (rung === 0) return par >= 3 && par <= 4 && greedy === par;
    if (rung === 1) return par >= 4 && par <= 6 && greedy === par && d % 5 === 0;
    if (rung === 2) return par >= 5 && par <= 7 && greedy === par && d % 5 !== 0;
    // The top rungs are the trap: the biggest jump that fits leaves a gap no jump can close, or takes longer.
    return par >= 5 && par <= 9 && (greedy === null || greedy > par);
  }
  // Level 5, rungs 0 to 2: going past and coming back is strictly shorter than jumping straight.
  const straight = fewestStraight(h);
  if (straight === null || par >= straight) return false;
  return rung === 0 ? up && d <= 20 : rung === 1 ? up && d > 20 && d <= 60 : !up && d >= 15 && d <= 60;
}
/** Unknown starts: two forward jumps at rung 3; three or four jumps with one back at rung 4. The start and every landing on the line. */
function fitsStart(rung: number, i: HopItem): boolean {
  if (i[0] !== 2 || i.length < 4 || i.length > 6) return false;
  const js = startJumps(i);
  if (!js.every((j) => START_JUMPS.indexOf(j) >= 0)) return false;
  let at = i[1];
  if (!whole(at, 1, 100)) return false;
  for (const j of js) { at += j; if (!whole(at, 1, 100)) return false; }
  const back = js.filter((j) => j < 0).length;
  if (rung === 3) return js.length === 2 && back === 0 && i[1] >= 5;
  return js.length >= 3 && back === 1 && i[1] >= 5 && js[0] > 0;
}

const pick = (rng: () => number, n: number) => {
  const r = rng();
  return Math.min(n - 1, Math.max(0, Math.floor(Number.isFinite(r) ? r * n : 0)));
};
const between = (rng: () => number, lo: number, hi: number) => lo + pick(rng, Math.max(1, hi - lo + 1));

function candidate(level: Level, rung: number, choice: OpChoice, rng: () => number): HopItem {
  if (level <= 2) {
    const op = dirFor(rung, choice), top = lineMax(level), b = between(rng, 1, level === 1 ? 5 : 8);
    const a = op === "add" ? between(rng, 0, top - b) : between(rng, b, top);
    return [0, op === "add" ? 0 : 1, a, b];
  }
  if (level === 5 && rung >= 3) {
    const n = rung === 3 ? 2 : 3 + pick(rng, 2), js: number[] = [];
    const forward = START_JUMPS.filter((j) => j > 0), backward = START_JUMPS.filter((j) => j < 0);
    const backAt = rung === 3 ? -1 : 1 + pick(rng, n - 1);
    for (let k = 0; k < n; k++) js.push(k === backAt ? backward[pick(rng, backward.length)] : forward[pick(rng, forward.length)]);
    return [2, between(rng, 5, 80), ...js];
  }
  const top = lineMax(level);
  return [1, between(rng, 0, top), between(rng, 0, top), levelSet(level)];
}

const keyOf = (i: HopItem) => i.join(",");
/** One puzzle for a rung, not a repeat of any in `avoid`. Falls back to fixed seeds, so it always returns. */
export function freshHop(level: Level, rung: number, choice: OpChoice, rng: () => number, avoid: readonly HopItem[], seeded: (n: number) => () => number): HopItem {
  const keys = avoid.map(keyOf);
  const tryFrom = (r: () => number) => {
    for (let k = 0; k < 2000; k++) {
      const i = candidate(level, rung, choice, r);
      if (fitsRung(level, rung, choice, i) && keys.indexOf(keyOf(i)) < 0) return i;
    }
    return null;
  };
  const hit = tryFrom(rng);
  if (hit) return hit;
  for (let s = 1; s < 64; s++) {
    const again = tryFrom(seeded(s));
    if (again) return again;
  }
  throw new Error(`No Number Hop puzzle for level ${level}, rung ${rung}`);
}

/** What the dumb player does with a reach puzzle: the smallest jump again and again. Jumps taken, or null if it never lands. */
export const dumbJumps = (i: HopItem, level: Level): number | null => (i[0] === 1 ? smallestJumpsBot(hopOf(i, level)) : null);
