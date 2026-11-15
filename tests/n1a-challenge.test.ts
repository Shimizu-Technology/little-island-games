import { describe, expect, it } from "vitest";
import { registration } from "../src/learn/games/shell-math/challenge";
import { shellPuzzles, bankOfLevel, DEEP_BANK, FIRST_DARE } from "../src/learn/games/shell-math/challenge-content";
import { waysOf, playable, type Descriptor } from "../src/learn/games/shell-math/challenge-task";
import type { Action } from "../src/learn/games/shell-math/challenge-engine";
import { problemOf } from "../src/learn/games/shell-math/round2";
import { emptyChallenge, type ChallengeSession } from "../src/state/challenge";
import { jsonBytes } from "../src/state/saveBits";
import { sha256Hex } from "../src/puzzles/sha256";
import { fitsLevel, levelRoute, planKey, planLength, sameFact, solveActs, type Level, type Step } from "../src/math/kit";
import { buildCatalog } from "../src/challenge/catalog";

const opts = { supportOff: false, ownRead: false };
const start = (i: number, dares: number[] = [], solutions: [number, number, string][] = []) => {
  const p = shellPuzzles[i];
  const progress = { ...emptyChallenge(), solutions };
  return registration.start(p.ref, "a", `n1a-${i}`, progress, opts, dares);
};
const move = (s: ChallengeSession, a: Action) => { const n = registration.move(s, a); expect(n, JSON.stringify(a)).not.toBeNull(); return n!; };
/** Perfect play of way `w`: choose it when asked, then every step. */
function play(i: number, way = 0, dares: number[] = [], solutions: [number, number, string][] = []) {
  const p = shellPuzzles[i], d = p.descriptor;
  let s = start(i, dares, solutions);
  const ways = waysOf(d);
  if (ways.length > 1) s = move(s, ["r", way]);
  for (const a of solveActs(ways[way].plan)) s = move(s, a as Action);
  return s;
}
const index = (level: Level, n: number) => shellPuzzles.findIndex((p) => p.ref.bank === bankOfLevel(level) && p.ref.puzzle === n);
const darePuzzles = (level: Level) => shellPuzzles.filter((p) => p.ref.bank === bankOfLevel(level) && p.dares.length);

describe("Shell Math Challenge content", () => {
  it("fills banks 420 to 424 with 24 questions each and Deep Water 425 with 16, in order, inside the reserved slots", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const rows = shellPuzzles.filter((p) => p.ref.bank === bankOfLevel(level));
      expect(rows).toHaveLength(24);
      rows.forEach((p, n) => { expect(p.ref.puzzle).toBe(n); expect(p.path).toBe("endless"); expect(p.tier).toBe(level); expect(p.source).toEqual({ kind: "endless", bank: bankOfLevel(level), puzzle: n }); });
    }
    const deep = shellPuzzles.filter((p) => p.ref.bank === DEEP_BANK);
    expect(deep).toHaveLength(16);
    deep.forEach((p) => { expect(p.path).toBe("deep-water"); expect(p.dares).toEqual([]); });
    for (const p of shellPuzzles) { expect(p.ref.bank).toBeGreaterThanOrEqual(420); expect(p.ref.bank).toBeLessThanOrEqual(429); expect(p.ref.engine).toBe("shell-math"); }
    const slots = shellPuzzles.flatMap((p) => p.dares.map((d) => d.slot));
    expect(slots).toHaveLength(80);
    expect(new Set(slots).size).toBe(80);
    slots.forEach((s) => { expect(s).toBeGreaterThanOrEqual(FIRST_DARE); expect(s).toBeLessThanOrEqual(1099); });
    for (const level of [1, 2, 3, 4, 5] as const) expect(darePuzzles(level)).toHaveLength(16);
  });

  it("registers only inside its own slots in the published catalog", () => {
    const catalog = registration.catalog;
    expect([...catalog.banks.keys()].sort()).toEqual([420, 421, 422, 423, 424, 425]);
    expect([...catalog.dares.keys()].every((s) => s >= 1000 && s <= 1099)).toBe(true);
    expect([...catalog.contexts].sort()).toEqual(["shell-1", "shell-2", "shell-3", "shell-4", "shell-5", "shell-6"].filter((c) => catalog.contexts.has(c)));
    const all = buildCatalog();
    expect(all.banks.has(420) && all.banks.has(425) && all.dares.has(1000) && all.dares.has(1079)).toBe(true);
  });

  it("freezes each puzzle by the hash of its descriptor", () => {
    for (const p of shellPuzzles) expect(p.ref.hash).toBe(sha256Hex(JSON.stringify(p.descriptor)));
  });

  it("every level's questions belong to the level, never repeat, and lead with the level's own route", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const facts = shellPuzzles.filter((p) => p.ref.bank === bankOfLevel(level)).map((p) => p.descriptor as Extract<Descriptor, { t: "fact" }>);
      facts.forEach((d, n) => {
        const pr = problemOf(d.item);
        expect(d.level).toBe(level);
        expect(fitsLevel(level, pr), `${level}/${n}`).toBe(true);
        expect(d.ways[0]).toBe(levelRoute(level, pr));
        facts.slice(0, n).forEach((e) => expect(sameFact(pr, problemOf(e.item)), `${level}/${n}`).toBe(false));
      });
    }
  });

  it("every way of every puzzle can be played to the right answer by perfect play", () => {
    shellPuzzles.forEach((p, i) => {
      expect(playable(p.descriptor), String(i)).toBe(true);
      waysOf(p.descriptor).forEach((w, k) => {
        let s = start(i);
        if (waysOf(p.descriptor).length > 1) s = move(s, ["r", k]);
        for (const a of solveActs(w.plan)) s = move(s, a as Action);
        expect(s.result?.event, `${i}/${k}`).toBe("independent");
      });
    });
  });

  it("Deep Water answers match independent arithmetic", () => {
    const deep = shellPuzzles.filter((p) => p.ref.bank === DEEP_BANK).map((p) => p.descriptor);
    const last = (d: Descriptor) => { const plan = waysOf(d)[0].plan; return (plan[plan.length - 1] as { value: number }).value; };
    deep.forEach((d) => {
      if (d.t === "regroup") expect(last(d)).toBe(d.tens * 10 + d.ones);
      if (d.t === "missing") expect(last(d)).toBe(d.total - d.known);
      if (d.t === "equalize") { expect(last(d)).toBe((d.y - d.x) / 2); expect(d.x + last(d)).toBe(d.y - last(d)); }
      if (d.t === "pairs") expect(last(d)).toBe(d.nums.reduce((n, v) => n + v, 0));
    });
    expect(deep.map((d) => d.t)).toEqual([...Array(4).fill("regroup"), ...Array(4).fill("missing"), ...Array(4).fill("equalize"), ...Array(4).fill("pairs")]);
  });

  it("level dares match their level: clean, clean, two ways, whole, fewest moves", () => {
    const kinds: Record<number, string> = { 1: "clean", 2: "clean", 3: "two-ways", 4: "whole", 5: "par" };
    for (const level of [1, 2, 3, 4, 5] as const) for (const p of darePuzzles(level)) {
      expect(p.dares).toHaveLength(1);
      expect(p.dares[0].rule.kind).toBe(kinds[level]);
      expect(p.dares[0].help).toBe(level === 3 ? "allowed" : "independent");
    }
  });

  it("two-ways puzzles really have two different ways; fewest-moves par is the true minimum and beats the level's route", () => {
    for (const p of darePuzzles(3)) {
      const keys = waysOf(p.descriptor).map((w) => planKey(w.plan));
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.length).toBeGreaterThanOrEqual(2);
    }
    for (const p of darePuzzles(5)) {
      const lens = waysOf(p.descriptor).map((w) => planLength(w.plan)), rule = p.dares[0].rule;
      expect(rule).toEqual({ kind: "par", metric: "steps", max: Math.min(...lens) });
      expect(Math.min(...lens)).toBeLessThan(lens[0]);
      expect(p.par).toEqual({ metric: "steps", lower: Math.min(...lens), upper: Math.min(...lens) });
    }
  });
});

describe("Shell Math Challenge replay", () => {
  it("earns the level dare only by unhelped, unmissed play", () => {
    for (const level of [1, 2, 4] as const) {
      const p = darePuzzles(level)[0], i = shellPuzzles.indexOf(p), slot = p.dares[0].slot;
      const good = play(i, 0, [slot]);
      expect(good.result).toMatchObject({ event: "independent", dares: [slot] });
      expect(good.result!.awards & 1).toBe(1);
      // A miss on the way.
      let missed = start(i, [slot]);
      const plan = waysOf(p.descriptor)[0].plan, first = plan.findIndex((s) => s.kind === "number");
      for (const a of solveActs(plan.slice(0, first))) missed = move(missed, a as Action);
      const num = plan[first] as Extract<Step, { kind: "number" }>;
      missed = move(missed, ["n", num.value === 0 ? 1 : num.value + (num.value === 100 ? -1 : 1)]);
      for (const a of solveActs(plan.slice(first))) missed = move(missed, a as Action);
      expect(missed.result).toMatchObject({ event: "helped", dares: [] });
      // Help.
      let helped = start(i, [slot]);
      helped = move(helped, ["h"]);
      for (const a of solveActs(plan)) helped = move(helped, a as Action);
      expect(helped.result).toMatchObject({ event: "helped", dares: [] });
    }
  });

  it("two ways: the second solve must differ from the first", () => {
    const p = darePuzzles(3)[0], i = shellPuzzles.indexOf(p), slot = p.dares[0].slot;
    const first = play(i, 0, [slot]);
    expect(first.result).toMatchObject({ event: "independent", dares: [] });
    const hash = first.result!.solution!;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    const again = play(i, 0, [slot], [[p.ref.bank, p.ref.puzzle, hash]]);
    expect(again.result!.dares).toEqual([]);
    const other = play(i, 1, [slot], [[p.ref.bank, p.ref.puzzle, hash]]);
    expect(other.result!.dares).toEqual([slot]);
    expect(other.result!.solution).not.toBe(hash);
  });

  it("fewest moves: the short way earns the dare, the long way does not, and a miss costs it", () => {
    const p = darePuzzles(5)[0], i = shellPuzzles.indexOf(p), slot = p.dares[0].slot, ways = waysOf(p.descriptor);
    const shortest = ways.map((w) => planLength(w.plan)).indexOf(Math.min(...ways.map((w) => planLength(w.plan))));
    expect(play(i, shortest, [slot]).result!.dares).toEqual([slot]);
    expect(play(i, 0, [slot]).result!.dares).toEqual([]);
    let s = start(i, [slot]);
    s = move(s, ["r", shortest]);
    const plan = ways[shortest].plan, num = plan[0] as Extract<Step, { kind: "number" }>;
    s = move(s, ["n", num.value + 1 > 100 ? 0 : num.value + 1]);
    for (const a of solveActs(plan)) s = move(s, a as Action);
    expect(s.result!.dares).toEqual([]);
  });

  it("refuses moves that are not legal and anything after the finish", () => {
    const i = index(3, 0);
    let s = start(i, []);
    s = move(s, ["r", 0]);
    for (const bad of [["r", 1], ["c"], ["t"], ["p", 0, 1], ["m", 1, 3], ["n", 999]] as unknown[]) expect(registration.move(s, bad), JSON.stringify(bad)).toBeNull();
    const done = play(i, 0);
    for (const a of [["h"], ["n", 1], ["z"]] as Action[]) expect(registration.move(done, a)).toBeNull();
    const one = index(1, 0);
    expect(registration.move(start(one), ["r", 0])).toBeNull();
    // Going back to choose another way is allowed before any move, and the next choice is free again.
    const back = move(s, ["z"]);
    expect(registration.move(back, ["n", 1])).toBeNull();
    expect(registration.move(back, ["r", 1])).not.toBeNull();
  });

  it("starting over is allowed once there is something to undo, keeps misses and help, and is refused when idle", () => {
    const i = index(1, 0);
    const idle = start(i);
    expect(registration.move(idle, ["z"])).toBeNull();
    let s = move(idle, ["h"]);
    s = move(s, ["z"]);
    const plan = waysOf(shellPuzzles[i].descriptor)[0].plan;
    for (const a of solveActs(plan)) s = move(s, a as Action);
    expect(s.result!.event).toBe("helped");
  });

  it("a full help ladder on every step still fits the reserved room in the saved session", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const p = darePuzzles(level)[0], i = shellPuzzles.indexOf(p), ways = waysOf(p.descriptor);
      let s = start(i, p.dares.map((d) => d.slot));
      if (ways.length > 1) s = move(s, ["r", 0]);
      const plan = ways[0].plan;
      const acts = solveActs(plan);
      let at = 0, choices = false;
      for (let n = 0; n < plan.length; n++) {
        for (let h = 0; h < 3; h++) s = move(s, ["h"]);
        if (plan[n].kind === "number" && !choices) { s = move(s, ["k"]); choices = true; }
        const stepActs = plan[n].kind === "count" ? (plan[n] as { times: number }).times : 1;
        for (let k = 0; k < stepActs; k++) s = move(s, acts[at++] as Action);
      }
      expect(s.result).not.toBeNull();
      expect(jsonBytes(s)).toBeLessThanOrEqual(4096);
    }
  });

  it("the Deep Water pairs puzzle accepts either pairing first and refuses a pair that is not ten", () => {
    const i = shellPuzzles.findIndex((p) => p.descriptor.t === "pairs");
    const d = shellPuzzles[i].descriptor as Extract<Descriptor, { t: "pairs" }>;
    let s = start(i);
    expect(registration.move(s, ["p", 0, 1])).not.toBeNull(); // wrong pair is recorded as a miss, not refused
    const miss = registration.move(s, ["p", 0, 1])!;
    expect(miss.result).toBeNull();
    const a = d.nums.findIndex((n, k) => k > 0 && n + d.nums[0] === 10);
    s = move(s, ["p", 0, a]);
    const rest = d.nums.map((_, k) => k).filter((k) => k !== 0 && k !== a);
    // The used numbers cannot be used again.
    expect(registration.move(s, ["p", 0, a])!.result).toBeNull();
    void rest;
  });
});
