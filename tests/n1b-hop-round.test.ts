import { describe, expect, it } from "vitest";
import { random } from "../src/games/types";
import { optionsAtLevel } from "../src/learn/levelOptions";
import type { LearnOptions } from "../src/learn/types";
import { LEVELS, fewestJumps, fewestStraight, greedyJumps, solveActs, solveHop, type Level, type OpChoice } from "../src/math/kit";
import { ROUND_LENGTH, dumbJumps, fitsRung, hopOf, landingOf, parOf, planOf, type HopItem } from "../src/learn/games/number-hop/items";
import { HISTORY_CAP, createHop, hopFinishCost, hopMove, hopProgress, validHop2, type HopRound, type HopRoundAct } from "../src/learn/games/number-hop/round2";

const CHOICES: OpChoice[] = ["add", "subtract", "mixed"];
const opts = (level: Level, mathOperation: OpChoice = "add"): LearnOptions => ({ ...optionsAtLevel({ mode: "solo", pace: "easy" }, level), mathOperation });
const reload = (s: HopRound, o: LearnOptions) => {
  const copy = JSON.parse(JSON.stringify(s));
  expect(validHop2(copy, o), JSON.stringify(s.history)).toBe(true);
  return copy as HopRound;
};
/** The engine's own solution for the rest of the puzzle on screen, from where the child is now. */
function solution(s: HopRound): HopRoundAct[] {
  const p = hopProgress(s)!, i = p.item!, z = p.puzzle!;
  if (z.kind === 1) return solveHop({ ...hopOf(i, s.level), start: z.work.at });
  const plan = planOf(i)!, rest = solveActs(plan.slice(z.work.at));
  return plan[z.work.at]?.kind === "count" ? rest.slice(z.work.tapped) : rest;
}
function finish(s: HopRound): HopRound {
  while (s.index < ROUND_LENGTH) {
    for (const a of solution(s)) s = hopMove(s, a);
    s = hopMove(s, ["x"]);
  }
  return s;
}
/** The dumb player: on a reach puzzle, the smallest jump toward the target until it lands (or a fresh start once it passes). */
function dumbFinish(s: HopRound): HopRound {
  while (s.index < ROUND_LENGTH) {
    const p = hopProgress(s)!, i = p.item!;
    if (i[0] !== 1) { for (const a of solveActs(planOf(i)!)) s = hopMove(s, a); s = hopMove(s, ["x"]); continue; }
    const h = hopOf(i, s.level), up = h.target > h.start;
    const toward = h.jumps.map((j, k) => [j, k] as const).filter(([j]) => (up ? j > 0 : j < 0));
    const [, k] = toward.reduce((m, x) => (Math.abs(x[0]) < Math.abs(m[0]) ? x : m));
    for (let guard = 0; guard < 60 && !hopProgress(s)!.puzzle!.work.solved; guard++) {
      const next = hopMove(s, ["j", k]);
      if (next === s) break;
      s = next;
    }
    // Stuck: it starts again and lets Help show every jump.
    if (!hopProgress(s)!.puzzle!.work.solved) {
      s = hopMove(s, ["r"]);
      for (let guard = 0; guard < 30 && !s.solved; guard++) { s = hopMove(s, ["h"]); s = hopMove(s, solution(s)[0]); }
    }
    expect(hopProgress(s)!.puzzle!.work.solved).toBe(true);
    s = hopMove(s, ["x"]);
  }
  return s;
}

describe("Number Hop puzzles", () => {
  it("every level, choice and seed makes a valid round of five distinct puzzles on their rungs", () => {
    for (const level of LEVELS) for (const choice of CHOICES) for (let seed = 1; seed <= 60; seed++) {
      const o = opts(level, choice), s = createHop(o, random(seed));
      expect(validHop2(s, o), `L${level} ${choice} ${seed}`).toBe(true);
      s.items.forEach((i, r) => expect(fitsRung(level, r, choice, i)).toBe(true));
      expect(new Set(s.items.map((i) => i.join())).size).toBe(ROUND_LENGTH);
    }
  });
  it("a source that always says the same number still makes a full, valid round", () => {
    for (const level of LEVELS) for (const c of [0, 0.5, 0.999999]) {
      const o = opts(level, "mixed");
      expect(validHop2(createHop(o, () => c), o)).toBe(true);
    }
  });
  it("Levels 1 and 2 keep the hop-by-ones question; Level 2 crosses ten every time", () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const i of createHop(opts(1, "mixed"), random(seed)).items) expect(i[0]).toBe(0);
      for (const i of createHop(opts(2, "mixed"), random(seed)).items) {
        const r = i[1] === 0 ? i[2] + i[3] : i[2] - i[3];
        expect(i[0]).toBe(0);
        expect(Math.min(i[2], r) <= 9 && Math.max(i[2], r) >= 11).toBe(true);
      }
    }
  });
  it("every reach puzzle's par is the breadth-first fewest jumps, and the smallest-jump bot needs more", () => {
    for (const level of [3, 4, 5] as Level[]) for (let seed = 1; seed <= 150; seed++) {
      for (const i of createHop(opts(level, "mixed"), random(seed)).items) {
        if (i[0] !== 1) continue;
        const h = hopOf(i, level), par = parOf(i, level)!;
        expect(par).toBe(fewestJumps(h));
        expect(solveHop(h)).toHaveLength(par);
        const dumb = dumbJumps(i, level);
        expect(dumb === null || dumb > par, `L${level} ${i.join()}`).toBe(true);
      }
    }
  });
  it("Level 4's top rungs are traps for the biggest-jump-first player; Level 5 rewards going past and back", () => {
    for (let seed = 1; seed <= 150; seed++) {
      const four = createHop(opts(4), random(seed)).items, five = createHop(opts(5), random(seed)).items;
      for (const i of four.slice(3)) {
        const h = hopOf(i, 4), g = greedyJumps(h);
        expect(g === null || g > fewestJumps(h)!).toBe(true);
      }
      for (const i of five.slice(0, 3)) {
        const h = hopOf(i, 5);
        expect(fewestJumps(h)!).toBeLessThan(fewestStraight(h)!);
      }
      for (const i of five.slice(3)) expect(i[0]).toBe(2);
      expect(five[4].slice(2).some((j) => j < 0)).toBe(true);
    }
  });
  it("levels are different strategies, not the same thing bigger: the jump sets differ and no puzzle repeats across levels", () => {
    const sets = (level: Level) => new Set(createHop(opts(level, "mixed"), random(3)).items.filter((i) => i[0] === 1).map((i) => i[3]));
    expect([...sets(3)]).toEqual([0]);
    expect([...sets(4)]).toEqual([1]);
    expect([...sets(5)]).toEqual([2]);
  });
});

describe("Number Hop round", () => {
  it.each(LEVELS)("level %i: the engine's fewest path finishes the round, every puzzle the child's own", (level) => {
    for (const choice of CHOICES) {
      const o = opts(level, choice), s = reload(finish(createHop(o, random(9))), o);
      expect(s.index).toBe(ROUND_LENGTH);
      expect(hopProgress(s)!.helped).toEqual([false, false, false, false, false]);
    }
  });
  it.each([3, 4, 5] as Level[])("level %i: the dumb player finishes but no reach puzzle counts as its own work", (level) => {
    for (let seed = 1; seed <= 40; seed++) {
      const o = opts(level, "mixed"), start = createHop(o, random(seed)), s = reload(dumbFinish(start), o);
      expect(s.index).toBe(ROUND_LENGTH);
      hopProgress(s)!.helped.forEach((h, k) => { if (start.items[k][0] === 1) expect(h, `seed ${seed} puzzle ${k}`).toBe(true); });
    }
  });
  it("landing in more than the fewest jumps is welcome, can be tried again, and a fresh try in par is the child's own", () => {
    const o = opts(3);
    let s = createHop(o, random(5));
    const h = hopOf(s.items[0], 3), up = h.target > h.start, one = h.jumps.indexOf(up ? 1 : -1);
    for (let k = 0; k < Math.abs(h.target - h.start); k++) s = hopMove(s, ["j", one]);
    expect(s.solved).toBe(true);
    s = reload(s, o);
    const over = hopProgress(s)!.puzzle!;
    expect(over.kind === 1 && over.work.path.length > over.par).toBe(true);
    s = hopMove(s, ["r"]);
    expect(s.solved).toBe(false);
    for (const a of solution(s)) s = hopMove(s, a);
    s = reload(hopMove(s, ["x"]), o);
    expect(hopProgress(s)!.helped).toEqual([false]);
  });
  it("Help names the next jump on a fewest path and marks the puzzle helped; Undo and Start again keep that", () => {
    const o = opts(4);
    let s = createHop(o, random(8));
    s = hopMove(s, ["h"]);
    const p = hopProgress(s)!.puzzle!;
    expect(p.kind === 1 && p.work.hint === 1 && p.work.helped).toBe(true);
    expect(hopMove(s, ["h"])).toBe(s);
    s = hopMove(hopMove(s, ["j", 2]), ["u"]);
    for (const a of solution(s)) s = hopMove(s, a);
    s = hopMove(s, ["x"]);
    expect(hopProgress(s)!.helped).toEqual([true]);
  });
  it("unknown starts are typed; a miss stays on the record and the child tries again", () => {
    const o = opts(5);
    let s = createHop(o, random(4));
    for (let k = 0; k < 3; k++) { for (const a of solution(s)) s = hopMove(s, a); s = hopMove(s, ["x"]); }
    const i = s.items[3];
    expect(i[0]).toBe(2);
    expect(landingOf(i)).toBe(i[1] + i.slice(2).reduce((a, b) => a + b, 0));
    s = reload(hopMove(s, ["n", i[1] + 1]), o);
    expect(s.wrong).toBe(i[1] + 1);
    s = reload(hopMove(s, ["n", i[1]]), o);
    expect(s.solved).toBe(true);
    s = finish(s);
    expect(hopProgress(s)!.helped).toEqual([false, false, false, true, false]);
  });
  it("a jump off the line is refused; jumps that pass a forward-only target leave a fresh start", () => {
    const o = opts(4);
    let s = createHop(o, random(6));
    const h = hopOf(s.items[0], 4);
    for (let k = 0; k < 20; k++) s = hopMove(s, ["j", 2]);
    const p = hopProgress(s)!.puzzle!;
    expect(p.kind === 1 && p.work.at <= h.hi).toBe(true);
    expect(hopFinishCost(s)).not.toBeNull();
    if (!s.solved) { s = hopMove(s, ["r"]); for (const a of solution(s)) s = hopMove(s, a); }
    expect(reload(s, o).solved).toBe(true);
  });
  it("a relentless child (every jump, undo, fresh start and help the round allows) can always finish, and every saved state reloads", () => {
    for (const level of LEVELS) for (let seed = 1; seed <= 3; seed++) {
      const o = opts(level, "mixed");
      let s = createHop(o, random(seed));
      for (let guard = 0; guard < 3000 && s.index < ROUND_LENGTH; guard++) {
        const p = hopProgress(s)!, i = p.item!;
        const tries: HopRoundAct[] = i[0] === 1
          ? [["j", guard % hopOf(i, level).jumps.length], ["u"], ["h"], ["r"], ...solution(s).slice(0, 1), ["x"]]
          : [["n", 99], ["h"], ["k"], ["u"], ...solution(s).slice(0, 1), ["x"]];
        let moved = false;
        for (const a of tries) { const next = hopMove(s, a); if (next !== s) { s = next; moved = true; break; } }
        expect(moved, `L${level} ${JSON.stringify(s.history.slice(-6))}`).toBe(true);
        if (guard % 17 === 0) s = reload(s, o);
      }
      expect(s.index).toBe(ROUND_LENGTH);
      expect(s.history.length).toBeLessThanOrEqual(HISTORY_CAP);
      reload(s, o);
    }
  });
  it("refuses forged rounds", () => {
    const o = opts(4), s = createHop(o, random(2));
    const l3: HopItem = createHop(opts(3), random(2)).items[0];
    expect(validHop2({ ...s, items: [l3, ...s.items.slice(1)] }, o)).toBe(false);
    expect(validHop2({ ...s, items: [s.items[0], s.items[0], ...s.items.slice(2)] }, o)).toBe(false);
    expect(validHop2({ ...s, history: [["x"]] }, o)).toBe(false);
    expect(validHop2({ ...s, history: [["j", 7]] }, o)).toBe(false);
    expect(validHop2({ ...s, solved: true }, o)).toBe(false);
    expect(validHop2({ ...s, level: 3 }, o)).toBe(false);
    expect(validHop2(s, opts(5))).toBe(false);
    expect(createHop(o, random(2))).toEqual(s);
  });
});
