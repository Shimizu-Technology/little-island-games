/**
 * S1a fix round 1, P1-1: no fixed habit earns the top rungs' stars.
 *
 * A "habit" decides without reasoning about the model: a prediction tile by position or by label, a fixed reach plan
 * (each free control left alone, set to a position or set to a label), and an explanation picked by position, by
 * length rank or by word-count rank. It may be keyed by the step number or by the investigation type. At Levels 4–5 a
 * clean finish needs every first choice right, so a habit's clean rate is the share of seeds where all its first
 * choices are right. We search every habit exhaustively (bitsets with branch and bound) on the reviewer's 8,192 seeds.
 * Lead threshold: at most 0.5% for any fixed habit, while a reasoning strategy still succeeds.
 */
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clean, create, move, replay, solve, validState, type Investigation } from "../src/learn/inquiry/engine";
import { investigations } from "../src/learn/games/space-station/investigations";

const TRIALS = 8192, WORDS = 256; // 8,192 bits
const seedOf = (trial: number) => (trial * 7919 + 407123) % 1000000;
const THRESHOLD = 0.005;

type Bits = Uint32Array;
const bits = () => new Uint32Array(WORDS);
const setBit = (b: Bits, i: number) => { b[i >>> 5] |= 1 << (i & 31); };
const COUNT16 = new Uint8Array(65536);
for (let i = 1; i < 65536; i++) COUNT16[i] = COUNT16[i >> 1] + (i & 1);
const count32 = (v: number) => COUNT16[v & 0xffff] + COUNT16[v >>> 16];
const popcount = (b: Bits) => { let n = 0; for (let i = 0; i < WORDS; i++) n += count32(b[i]); return n; };
/** Size of a ∩ b without building it. */
const andCount = (a: Bits, b: Bits) => { let n = 0; for (let i = 0; i < WORDS; i++) n += count32(a[i] & b[i]); return n; };
const and = (a: Bits, b: Bits) => { const out = bits(); for (let i = 0; i < WORDS; i++) out[i] = a[i] & b[i]; return out; };

/** Explanation habits: position, length rank (longest, middle, shortest) and word-count rank; first index wins ties. */
function explanationHabits(choices: readonly string[]): string[] {
  const rank = (score: (s: string) => number, which: "max" | "min" | "mid") => {
    const order = choices.map((s, i) => ({ i, n: score(s) })).sort((a, b) => b.n - a.n || a.i - b.i);
    return which === "max" ? order[0].i : which === "min" ? order[order.length - 1].i : order[1].i;
  };
  const words = (s: string) => s.split(/\s+/).length;
  return [
    ...choices.map((_, i) => `pos${i}`),
    `len-max=${rank((s) => s.length, "max")}`, `len-mid=${rank((s) => s.length, "mid")}`, `len-min=${rank((s) => s.length, "min")}`,
    `words-max=${rank(words, "max")}`, `words-mid=${rank(words, "mid")}`, `words-min=${rank(words, "min")}`,
  ];
}
/** The explanation habits that pick the right reason, by habit name. */
function rightExplanations(q: Investigation): string[] {
  return explanationHabits(q.explain.choices).filter((h) => (h.startsWith("pos") ? Number(h.slice(3)) : Number(h.split("=")[1])) === q.explain.answer).map((h) => h.split("=")[0]);
}
/** The first-choice habits (prediction or plan) that are right for this investigation. */
function rightFirstChoices(q: Investigation): string[] {
  if (q.kind === "observe") {
    const answer = q.observe(q.start).outcome;
    return [`pos${answer}`, `label:${q.outcomes[answer]}`];
  }
  const free = q.controls.map((c, i) => (c.fixed ? -1 : i)).filter((i) => i >= 0);
  const per = free.map((c) => [
    ...q.controls[c].options.map((label, v) => [`p${v}`, v] as const),
    ...q.controls[c].options.map((label, v) => [`l:${label}`, v] as const),
    ["keep", q.start[c]] as const,
  ]);
  const out: string[] = [];
  const walk = (i: number, name: string[], setup: number[]) => {
    if (i === free.length) { if (q.observe(setup).outcome === q.want) out.push(name.join("|")); return; }
    for (const [habit, v] of per[i]) { const next = [...setup]; next[free[i]] = v; walk(i + 1, [...name, habit], next); }
  };
  walk(0, [], [...q.start]);
  return out;
}

/** Highest clean rate of any fixed habit, keyed by step number or by investigation type. */
function bestHabit(level: number, keyBy: "step" | "type") {
  const table = new Map<string, Map<string, Bits>>();
  const note = (key: string, habit: string, trial: number) => {
    const row = table.get(key) ?? new Map<string, Bits>(); table.set(key, row);
    const b = row.get(habit) ?? bits(); row.set(habit, b); setBit(b, trial);
  };
  for (let trial = 0; trial < TRIALS; trial++) {
    investigations(level, seedOf(trial)).forEach((q, step) => {
      const key = keyBy === "step" ? `step${step}` : q.key;
      for (const first of rightFirstChoices(q)) for (const why of rightExplanations(q)) note(key, `${first}#${why}`, trial);
    });
  }
  // Rows with the fewest seeds first prune hardest.
  const keys = [...table.keys()].sort((x, y) => Math.max(...[...table.get(x)!.values()].map(popcount)) - Math.max(...[...table.get(y)!.values()].map(popcount)));
  const rows = keys.map((k) => [...table.get(k)!.entries()].map(([habit, b]) => ({ habit, b, n: popcount(b) })).sort((a, b) => b.n - a.n));
  let best = 0, bestHabits: string[] = [];
  const all = bits().fill(0xffffffff);
  const walk = (i: number, current: Bits, chosen: string[]) => {
    if (i === rows.length) { const n = popcount(current); if (n > best) { best = n; bestHabits = chosen; } return; }
    for (const { habit, b, n } of rows[i]) {
      if (n <= best) break;
      if (andCount(current, b) <= best) continue;
      walk(i + 1, and(current, b), [...chosen, `${keys[i]}=${habit}`]);
    }
  };
  walk(0, all, []);
  return { rate: best / TRIALS, best, habits: bestHabits };
}

describe("P1-1: fixed habits cannot earn Level 4–5 stars", () => {
  for (const level of [4, 5]) for (const keyBy of ["step", "type"] as const)
    it(`level ${level}, habits keyed by ${keyBy}: best clean rate at most 0.5% of 8,192 seeds`, () => {
      const result = bestHabit(level, keyBy);
      if (process.env.LITTLE_ISLAND_HABIT_REPORT) appendFileSync(process.env.LITTLE_ISLAND_HABIT_REPORT, JSON.stringify({ level, keyBy, ...result }) + "\n");
      expect(result.rate, JSON.stringify(result)).toBeLessThanOrEqual(THRESHOLD);
    }, 600_000);

  /** The reviewer's public-information adversary (review/public-adversary.test.ts), kept as written. */
  const longest = (choices: readonly string[]) => choices.reduce((best, text, i, all) => (text.length > all[best].length ? i : best), 0);
  it("the reviewer's Level 5 public adversary stays at or below 0.5%", () => {
    let wins = 0;
    for (let trial = 0; trial < TRIALS; trial++) {
      const seed = seedOf(trial), qs = investigations(5, seed);
      let state = create(5, seed, qs);
      for (const [step, q] of qs.entries()) {
        if (q.kind === "observe") { state = move(qs, state, { type: "predict", outcome: [1, 0, -1, 2][step] }); state = move(qs, state, { type: "test" }); }
        else for (const plan of [[0, 0], [1, 0]]) {
          plan.forEach((value, control) => { state = move(qs, state, { type: "set", control, value }); });
          state = move(qs, state, { type: "test" });
          if (replay(qs, state.history)?.phase === "explain") break;
          state = move(qs, state, { type: "revise" });
        }
        state = move(qs, state, { type: "explain", choice: longest(q.explain.choices) });
        state = move(qs, state, { type: "next" });
      }
      const p = replay(qs, state.history)!;
      if (p.phase === "finished" && clean(p, 5)) wins++;
    }
    if (process.env.LITTLE_ISLAND_HABIT_REPORT) appendFileSync(process.env.LITTLE_ISLAND_HABIT_REPORT, JSON.stringify({ level: 5, adversary: "reviewer", wins, trials: TRIALS }) + "\n");
    expect(wins / TRIALS).toBeLessThanOrEqual(THRESHOLD);
  }, 60_000);
  it("the reviewer's Level 4 public adversary stays at or below 0.5%", () => {
    let wins = 0;
    for (let trial = 0; trial < TRIALS; trial++) {
      const seed = seedOf(trial), qs = investigations(4, seed);
      let state = create(4, seed, qs);
      for (const [step, q] of qs.entries()) {
        if (q.kind === "observe") { state = move(qs, state, { type: "predict", outcome: step === 0 ? 2 : 0 }); state = move(qs, state, { type: "test" }); }
        else if (step === 1) { state = move(qs, state, { type: "set", control: 0, value: 4 }); state = move(qs, state, { type: "test" }); }
        else for (const value of [1, 2, 3]) {
          state = move(qs, state, { type: "set", control: 1, value }); state = move(qs, state, { type: "test" });
          if (replay(qs, state.history)?.phase === "explain") break;
          state = move(qs, state, { type: "revise" });
        }
        const ordered = q.explain.choices.map((text, i) => ({ i, n: text.length })).sort((a, b) => b.n - a.n || a.i - b.i);
        for (const { i } of ordered) { state = move(qs, state, { type: "explain", choice: i }); if (replay(qs, state.history)?.phase === "done") break; }
        state = move(qs, state, { type: "next" });
      }
      const p = replay(qs, state.history)!;
      if (p.phase === "finished" && clean(p, 4)) wins++;
    }
    if (process.env.LITTLE_ISLAND_HABIT_REPORT) appendFileSync(process.env.LITTLE_ISLAND_HABIT_REPORT, JSON.stringify({ level: 4, adversary: "reviewer", wins, trials: TRIALS }) + "\n");
    expect(wins / TRIALS).toBeLessThanOrEqual(THRESHOLD);
  }, 60_000);

  it("a reasoning strategy still earns every top-rung round", () => {
    for (const level of [4, 5]) for (let trial = 0; trial < 2048; trial++) {
      const seed = seedOf(trial), qs = investigations(level, seed);
      let state = create(level, seed, qs);
      for (const q of qs) {
        if (q.kind === "observe") state = move(qs, state, { type: "predict", outcome: q.observe(q.start).outcome });
        else solve(q)!.forEach((value, control) => { if (!q.controls[control].fixed) state = move(qs, state, { type: "set", control, value }); });
        state = move(qs, state, { type: "test" });
        state = move(qs, state, { type: "explain", choice: q.explain.answer });
        state = move(qs, state, { type: "next" });
      }
      const p = replay(qs, state.history)!;
      expect(p.phase).toBe("finished");
      expect(clean(p, level)).toBe(true);
      expect(validState(JSON.parse(JSON.stringify(state)), level, qs)).toBe(true);
    }
  });

  it("in every top-rung investigation, the right reason is the longest, middle and shortest roughly equally often", () => {
    for (const level of [4, 5]) {
      const ranks = new Map<string, number[]>();
      for (let trial = 0; trial < 2048; trial++) for (const q of investigations(level, seedOf(trial))) {
        const lengths = q.explain.choices.map((c) => c.length), right = lengths[q.explain.answer];
        const row = ranks.get(q.key) ?? [0, 0, 0]; ranks.set(q.key, row);
        row[lengths.filter((n) => n > right).length]++;
      }
      for (const [key, row] of ranks) for (const n of row) {
        expect(n / 2048, `${key} ${row}`).toBeGreaterThanOrEqual(0.2);
        expect(n / 2048, `${key} ${row}`).toBeLessThanOrEqual(0.47);
      }
    }
  });
  it("no reason is reliably the longest: across rounds the right one is the longest in at most half of top-rung investigations", () => {
    for (const level of [4, 5]) {
      let longestRight = 0, total = 0;
      for (let trial = 0; trial < 2048; trial++) for (const q of investigations(level, seedOf(trial))) {
        total++;
        const max = Math.max(...q.explain.choices.map((c) => c.length));
        if (q.explain.choices[q.explain.answer].length === max) longestRight++;
      }
      expect(longestRight / total, `level ${level}`).toBeLessThanOrEqual(0.5);
    }
  });
});
