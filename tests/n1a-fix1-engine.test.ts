import { describe, expect, it } from "vitest";
import { random } from "../src/games/types";
import { optionsAtLevel } from "../src/learn/levelOptions";
import { registration } from "../src/learn/games/shell-math/challenge";
import { shellPuzzles } from "../src/learn/games/shell-math/challenge-content";
import { waysOf } from "../src/learn/games/shell-math/challenge-task";
import { challengeEngine, type Action } from "../src/learn/games/shell-math/challenge-engine";
import { stepPrompt } from "../src/learn/games/shell-math/copy";
import { HISTORY_CAP, createShell, finishCost, progress, shellMove, validShell, type RoundAct, type ShellRound } from "../src/learn/games/shell-math/round2";
import {
  KIT_MAX, LEVELS, MAX_UNDO, ROUND_LENGTH, WIDE_MAX, advance, canUndo, candidates, initialWork, judge, levelPlan, levelRoute, planFor, replay, solveActs, validAct, validProblem,
  placeValue3, twoStepKey, twoStepPlan, twoStepProblems, twoStepResult, twoStepText, validTwoStep, wideProblems, resultOf, answerOf,
  type Act, type Level, type Problem, type TwoStep,
} from "../src/math/kit";
import { emptyChallenge, type ChallengeSession } from "../src/state/challenge";

const at = (level: Level) => optionsAtLevel({ mode: "solo", pace: "easy" }, level);
const opts = { supportOff: false, ownRead: false };

/** The level 5 dare puzzles whose par is strictly shorter than the level's own route. */
const parPuzzle = () => shellPuzzles.find((p) => p.dares[0]?.rule.kind === "par")!;
const startPar = (id: string) => {
  const p = parPuzzle();
  return { p, s: registration.start(p.ref, "a", id, emptyChallenge(), opts, [p.dares[0].slot]) };
};
const mv = (s: ChallengeSession, a: Action) => { const n = registration.move(s, a); expect(n, JSON.stringify(a)).not.toBeNull(); return n!; };
const longAndShort = () => {
  const ways = waysOf(parPuzzle().descriptor), lens = ways.map((w) => solveActs(w.plan).length), short = lens.indexOf(Math.min(...lens)), long = lens.indexOf(Math.max(...lens));
  return { ways, short, long };
};

describe("P2-1: Reset cannot erase accepted work from the Fewest moves cost", () => {
  it("correct first step, Reset, then the short way: the dare is not earned and the cost shows the extra move", () => {
    const { p, s: s0 } = startPar("fix1-reset");
    const { ways, short, long } = longAndShort();
    let s = mv(s0, ["r", long]);
    s = mv(s, solveActs(ways[long].plan)[0] as Action);
    s = mv(s, ["z"]);
    s = mv(s, ["r", short]);
    for (const a of solveActs(ways[short].plan)) s = mv(s, a as Action);
    const shortLen = solveActs(ways[short].plan).length;
    expect(s.result).not.toBeNull();
    expect(s.result!.dares).toEqual([]);
    expect(s.result!.cost).toBe(shortLen + 1);
    expect(p.par!.lower).toBe(shortLen);
  });

  it("a route change before any work stays free, and the dare is still earned", () => {
    const { p, s: s0 } = startPar("fix1-free");
    const { ways, short, long } = longAndShort();
    let s = mv(s0, ["r", long]);
    s = mv(s, ["z"]);
    s = mv(s, ["r", short]);
    for (const a of solveActs(ways[short].plan)) s = mv(s, a as Action);
    expect(s.result).toMatchObject({ event: "independent", dares: [p.dares[0].slot], cost: solveActs(ways[short].plan).length });
  });

  it("a miss before Reset keeps its cost and its evidence", () => {
    const { ways, short, long } = longAndShort();
    const { s: s0 } = startPar("fix1-miss");
    let s = mv(s0, ["r", long]);
    const first = ways[long].plan.findIndex((x) => x.kind === "number");
    for (const a of solveActs(ways[long].plan.slice(0, first))) s = mv(s, a as Action);
    s = mv(s, ["n", (ways[long].plan[first] as { value: number }).value + 1]);
    s = mv(s, ["z"]);
    s = mv(s, ["r", short]);
    for (const a of solveActs(ways[short].plan)) s = mv(s, a as Action);
    expect(s.result!.dares).toEqual([]);
    expect(s.result!.event).toBe("helped");
    expect(s.result!.cost).toBeGreaterThan(solveActs(ways[short].plan).length);
  });

  it("the engine carries the cost of every earlier move through a Reset", () => {
    const d = parPuzzle().descriptor, { ways, long } = longAndShort();
    let st = challengeEngine.create(d, { version: 1 }, opts);
    st = challengeEngine.step(st, ["r", long], d)!.state;
    st = challengeEngine.step(st, solveActs(ways[long].plan)[0] as Action, d)!.state;
    expect(st.work.moves).toBe(1);
    st = challengeEngine.step(st, ["z"], d)!.state;
    expect(st.work.moves).toBe(1);
    expect(st.work.at).toBe(0);
  });
});

describe("P2-2: Undo reverses an accepted decision, bounded, with honest evidence", () => {
  const planOf = (level: Level, i = 0) => {
    const p = candidates(level, level === 4 ? "add" : "subtract", 2).concat(candidates(level, "add", 2))[i];
    return { p, plan: levelPlan(level, p)! };
  };

  it("steps one accepted action back at every kind of step, and keeps the misses, the help and the cost", () => {
    for (const level of [1, 3, 4, 5] as Level[]) {
      const { plan } = planOf(level);
      const acts = solveActs(plan);
      let w = initialWork();
      w = advance(plan, w, acts[0] as Act);
      expect(canUndo(plan, w)).toBe(true);
      const before = w;
      const missed = advance(plan, w, plan[w.at].kind === "number" ? ["n", 99] : ["m", 0, 0]);
      const undone = advance(plan, missed, ["u"]);
      expect(undone).not.toBe(missed);
      expect(undone.at).toBe(0);
      expect(undone.wrong).toBe(missed.wrong);
      expect(undone.helped).toBe(missed.helped);
      expect(undone.moves).toBe(missed.moves + 1);
      expect(undone.solved).toBe(false);
      void before;
    }
  });

  it("restores the exact earlier position: count taps, side of a fill, pairs", () => {
    const count = levelPlan(1, candidates(1, "add", 3).find((p) => Math.min(p.a, p.b) >= 3)!)!;
    let w = initialWork();
    w = advance(count, w, ["c"]); w = advance(count, w, ["c"]);
    expect(w.tapped).toBe(2);
    w = advance(count, w, ["u"]);
    expect(w.tapped).toBe(1);
    const fillP = candidates(4, "add", 2).find((p) => (planFor(p, "to-ten", "built")![0] as unknown as { options: unknown[] }).options.length === 2)!;
    const plan = planFor(fillP, "to-ten", "built")!;
    const opt = (plan[0] as { options: readonly (readonly [0 | 1, number])[] }).options[1];
    let f = advance(plan, initialWork(), ["m", opt[0], opt[1]]);
    expect(f.side).toBe(1);
    f = advance(plan, f, ["u"]);
    expect(f.side).toBeNull();
    expect(f.at).toBe(0);
    const again = advance(plan, f, ["m", 0, (plan[0] as { options: readonly (readonly [0 | 1, number])[] }).options[0][1]]);
    expect(again.side).toBe(0);
  });

  it("is refused at the start, once solved, after Help clears nothing it should keep, and past the bound", () => {
    const { plan } = planOf(3);
    expect(judge(plan, initialWork(), ["u"])).toBe("ignored");
    let w = initialWork();
    for (const a of solveActs(plan)) w = advance(plan, w, a as Act);
    expect(w.solved).toBe(true);
    expect(judge(plan, w, ["u"])).toBe("ignored");
    w = advance(plan, initialWork(), solveActs(plan)[0] as Act);
    w = advance(plan, w, ["h"]);
    const u = advance(plan, w, ["u"]);
    expect(u.helped).toBe(true);
    expect(u.hint).toBe(0);
    let spent = initialWork();
    for (let i = 0; i < MAX_UNDO + 3; i++) {
      spent = advance(plan, spent, solveActs(plan)[0] as Act);
      spent = advance(plan, spent, ["u"]);
    }
    expect(spent.undone).toBe(MAX_UNDO);
    expect(canUndo(plan, advance(plan, spent, solveActs(plan)[0] as Act))).toBe(false);
  });

  it("the round: Undo is saved, replays the same after a reload, and never marks the problem helped by itself", () => {
    for (const level of LEVELS) {
      const o = at(level);
      let s = createShell(o, random(5));
      const p = progress(s)!, first = solveActs(p.plan!)[0] as RoundAct;
      s = shellMove(s, first);
      const withUndo = shellMove(s, ["u"]);
      expect(withUndo).not.toBe(s);
      expect(withUndo.history.at(-1)).toEqual(["u"]);
      const reloaded = JSON.parse(JSON.stringify(withUndo)) as ShellRound;
      expect(validShell(reloaded, o)).toBe(true);
      const q = progress(reloaded)!;
      expect(q.work.at).toBe(0);
      expect(q.work.helped).toBe(false);
      expect(q.work.moves).toBe(2);
      let done = reloaded;
      for (let i = 0; i < ROUND_LENGTH; i++) {
        for (const a of solveActs(progress(done)!.plan!)) done = shellMove(done, a);
        done = shellMove(done, ["x"]);
      }
      expect(done.index).toBe(ROUND_LENGTH);
      expect(validShell(done, o)).toBe(true);
      expect(progress(done)!.helped[0]).toBe(false);
    }
  });

  it("a forged round that undoes with nothing to undo is not valid", () => {
    const o = at(3), s = createShell(o, random(5));
    expect(validShell({ ...s, history: [["u"]] } as ShellRound, o)).toBe(false);
  });

  it("Challenge: Undo is an action, it is replayed, and it counts as a move in the Fewest moves cost", () => {
    const { ways, short } = longAndShort();
    const { s: s0 } = startPar("fix1-undo");
    let s = ways.length > 1 ? mv(s0, ["r", short]) : s0;
    const acts = solveActs(ways[short].plan);
    s = mv(s, acts[0] as Action);
    s = mv(s, ["u"]);
    for (const a of acts) s = mv(s, a as Action);
    expect(s.result!.dares).toEqual([]);
    expect(s.result!.cost).toBe(acts.length + 2);
    expect(registration.move(s, ["u"])).toBeNull();
  });

  it("Challenge: Undo before anything was done is refused", () => {
    const { s: s0 } = startPar("fix1-undo-none");
    const s = mv(s0, ["r", 0]);
    expect(registration.move(s, ["u"])).toBeNull();
  });
});

describe("P2-3: Help, choices and Undo can never use up the room to finish", () => {
  const misses = (s: ShellRound): RoundAct[] => {
    const p = progress(s);
    if (!p || !p.plan || p.work.solved) return [];
    const step = p.plan[p.work.at];
    if (step.kind === "number") return [["n", (step.value + 1) % 100]];
    if (step.kind === "fill") return [["m", 0, 0]];
    if (step.kind === "pair") return [["p", 0, 0 + 1]];
    return [];
  };
  /** The nastiest child there is: keeps asking for everything the round will still allow, and only then moves on. */
  function spam(s: ShellRound, forward: (s: ShellRound) => RoundAct, check: (s: ShellRound) => void) {
    let guard = 0;
    while (s.index < ROUND_LENGTH && guard++ < 2000) {
      let moved = false;
      for (const a of [...misses(s), ["h"], ["k"], ["u"]] as RoundAct[]) {
        const n = shellMove(s, a);
        if (n !== s) { s = n; moved = true; break; }
      }
      if (guard % 17 === 0) check(s);
      if (moved) continue;
      const n = shellMove(s, forward(s));
      expect(n, "the round must always allow a forward move").not.toBe(s);
      s = n;
    }
    return s;
  }
  const forward = (s: ShellRound): RoundAct => {
    const p = progress(s)!;
    if (p.work.solved) return ["x"];
    const need = solveActs(p.plan!.slice(p.work.at));
    // Count steps resume from the taps already made.
    const step = p.plan![p.work.at];
    return step.kind === "count" ? ["c"] : need[0];
  };
  const finishFrom = (s: ShellRound) => {
    let n = 0;
    while (s.index < ROUND_LENGTH && n++ < 500) { const next = shellMove(s, forward(s)); if (next === s) return null; s = next; }
    return s.index === ROUND_LENGTH && s.history.length <= HISTORY_CAP ? s : null;
  };

  it("every state a relentless child reaches can still be finished, saved and reloaded, at every level", () => {
    for (const level of LEVELS) for (const seed of [3, 11]) {
      const o = at(level);
      const end = spam(createShell(o, random(seed)), forward, (state) => {
        expect(validShell(JSON.parse(JSON.stringify(state)), o)).toBe(true);
        expect(finishFrom(state), JSON.stringify({ level, seed, len: state.history.length })).not.toBeNull();
      });
      expect(end.index).toBe(ROUND_LENGTH);
      expect(end.history.length).toBeLessThanOrEqual(HISTORY_CAP);
      expect(validShell(end, o)).toBe(true);
    }
  });

  it("the reviewer's trap: 190 misses, then the whole Help ladder at every step, still finishes after a reload", () => {
    const o = at(3);
    let s = createShell(o, random(3));
    const first = progress(s)!.plan![0] as { value: number };
    for (let i = 0; i < 192; i++) s = shellMove(s, ["n", first.value === 9 ? 8 : first.value + 1]);
    let guard = 0;
    while (s.index < ROUND_LENGTH && guard++ < 400) {
      const p = progress(s)!;
      if (!p.work.solved) for (const h of [["h"], ["h"], ["h"]] as RoundAct[]) s = shellMove(s, h);
      s = shellMove(s, forward(s));
      s = JSON.parse(JSON.stringify(s));
    }
    expect(s.index).toBe(ROUND_LENGTH);
    expect(validShell(s, o)).toBe(true);
  });

  it("finishCost is what forward play still needs, so a refused action is never a forward one", () => {
    const o = at(5);
    const s = createShell(o, random(7));
    const p = progress(s)!;
    expect(finishCost(s)).toBe(solveActs(p.plan!).length + 1 + [1, 2, 3, 4].reduce((n, i) => n + solveActs(levelPlan(5, { op: s.items[i][0] === 0 ? "add" : "subtract", a: s.items[i][1], b: s.items[i][2], unknown: "result" })!).length + 1, 0));
  });
});

describe("P2-5: Challenge answers are bounded to the range a puzzle can have", () => {
  it("the registration still refuses a number outside 0 to 100, so the board must say so", () => {
    const { s: s0 } = startPar("fix1-range");
    const s = mv(s0, ["r", 0]);
    expect(registration.move(s, ["n", 101])).toBeNull();
    expect(registration.move(s, ["n", 999])).toBeNull();
    expect(validAct(["n", 100])).toBe(true);
    expect(validAct(["n", 101])).toBe(false);
    expect(validAct(["n", 101], WIDE_MAX)).toBe(true);
  });
});

describe("P2-4: the next prompt describes the ten the child actually made", () => {
  it("for either valid recipient the rest prompt names the group that gave shells, and the amount moved", () => {
    let both = 0;
    for (const p of candidates(4, "add", 0).concat(candidates(4, "add", 1), candidates(4, "add", 2), candidates(4, "add", 3))) {
      const plan = planFor(p, "to-ten", "built")!, fill = plan[0] as { options: readonly (readonly [0 | 1, number])[] };
      for (const [side, n] of fill.options) {
        const w = advance(plan, initialWork(), ["m", side, n]);
        const text = stepPrompt(4, p, plan, w.at, levelRoute(4, p), w.side);
        if (side === 0) expect(text).toBe(`${p.b} to add, ${n} done. How many left?`);
        else { expect(text).toBe(`${p.a} to add, ${n} done. How many left?`); both++; }
        const rest = (plan[1] as { value: number }).value;
        expect(rest).toBe(side === 0 ? p.b - n : p.a - n);
      }
    }
    expect(both).toBeGreaterThan(0);
  });
  it("the reviewer's case: 8 + 3, seven shells moved from the first group, leaves 1", () => {
    const p: Problem = { op: "add", a: 8, b: 3, unknown: "result" }, plan = planFor(p, "to-ten", "built")!;
    const w = advance(plan, initialWork(), ["m", 1, 7]);
    expect(w.at).toBe(1);
    expect(stepPrompt(4, p, plan, 1, "to-ten", w.side)).toBe("8 to add, 7 done. How many left?");
  });
});

describe("P2-6: the K4 contract covers numbers beyond 100 and two-step problems", () => {
  it("the problem range is a parameter: 100 by default, the wide range for the games that need more", () => {
    const p = { op: "add", a: 99, b: 2, unknown: "result" };
    expect(validProblem(p)).toBe(false);
    expect(validProblem(p, WIDE_MAX)).toBe(true);
    expect(validProblem({ op: "add", a: 900, b: 101, unknown: "result" }, WIDE_MAX)).toBe(false);
    expect(validProblem({ op: "subtract", a: 5, b: 9, unknown: "result" }, WIDE_MAX)).toBe(false);
    expect(KIT_MAX).toBe(100);
    expect(WIDE_MAX).toBe(1000);
    expect(placeValue3(407)).toEqual({ hundreds: 4, tens: 0, ones: 7 });
    expect(placeValue3(1000)).toEqual({ hundreds: 10, tens: 0, ones: 0 });
  });

  it("wide generators give distinct, in-range facts that really go beyond 100, the same for the same seed", () => {
    for (let seed = 0; seed < 40; seed++) {
      const list = wideProblems(12, random(seed)), again = wideProblems(12, random(seed));
      expect(list).toEqual(again);
      expect(list).toHaveLength(12);
      const keys = new Set(list.map((p) => `${p.op}${p.a},${p.b},${p.unknown}`));
      expect(keys.size).toBe(12);
      for (const p of list) {
        expect(validProblem(p, WIDE_MAX)).toBe(true);
        expect(Math.max(p.a, p.b, resultOf(p))).toBeGreaterThan(KIT_MAX);
        expect(answerOf(p)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("two-step problems have one in-range answer, a plan that asks the middle number first, and no repeats", () => {
    for (let seed = 0; seed < 60; seed++) {
      const list = twoStepProblems(10, random(seed));
      expect(list).toHaveLength(10);
      expect(new Set(list.map(twoStepKey)).size).toBe(10);
      for (const t of list) {
        expect(validTwoStep(t)).toBe(true);
        const plan = twoStepPlan(t)!;
        expect(plan).toHaveLength(2);
        expect(plan[0]).toMatchObject({ kind: "number", role: "part" });
        expect(plan[1]).toMatchObject({ kind: "number", role: "final", value: twoStepResult(t) });
        const w = replay(plan, solveActs(plan));
        expect(w!.solved).toBe(true);
        expect(twoStepText(t)).toMatch(/\?$/);
        expect(twoStepText(t, true)).toContain(`= ${twoStepResult(t)}`);
      }
    }
  });

  it("a two-step problem outside the range, going negative on the way, or with extra keys is not valid", () => {
    const good: TwoStep = { a: 8, first: "add", b: 5, second: "subtract", c: 4 };
    expect(validTwoStep(good)).toBe(true);
    expect(twoStepResult(good)).toBe(9);
    expect(validTwoStep({ ...good, c: 14 })).toBe(false);
    expect(validTwoStep({ ...good, a: 101 })).toBe(false);
    expect(validTwoStep({ ...good, a: 101 }, WIDE_MAX)).toBe(true);
    expect(validTwoStep({ ...good, extra: 1 })).toBe(false);
    expect(validTwoStep(null)).toBe(false);
    expect(twoStepPlan({ ...good, c: 14 })).toBeNull();
  });
});
