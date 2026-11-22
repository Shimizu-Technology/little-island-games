/** S1a: the K6 inquiry kit and Star Station on it (SC-09). */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HISTORY_CAP, clean, create, describeSetup as describeScene, hintText, investigationBound, move, replay, solve, strictLevel, testedBefore, undo, validSetup, validState,
  type InquiryState, type Investigation, type Move,
} from "../src/learn/inquiry/engine";
import { inquirySpeechKey } from "../src/learn/inquiry/speech";
import { engine, isInquiry, legacyEngine } from "../src/learn/games/space-station/engine";
import { investigations } from "../src/learn/games/space-station/investigations";
import { gravity, lightMinutes, masses, visibleMoonPercent, weight, worlds } from "../src/learn/games/space-station/model";
import { weightNewtons } from "../src/learn/games/weather-watch/model";
import { optionsAtLevel, levelNumbers } from "../src/learn/levels";
import { random } from "../src/games/types";
import { startSession, validLearnSession } from "../src/learn/session";
import { creditSchool, independentRound } from "../src/learn/schoolProgress";
import type { LearnSession } from "../src/learn/types";

const SEEDS = 400;
const ctx = (seed: number) => ({ skills: {}, rng: random(seed), starter: 0 as const, today: 0 });
const opts = (level: number) => optionsAtLevel({ mode: "solo", pace: "easy" }, level as 1);
const all = (level: number, n = SEEDS) => Array.from({ length: n }, (_, seed) => ({ seed, qs: investigations(level, seed) }));
const go = (qs: readonly Investigation[], s: InquiryState, m: Move) => {
  const next = move(qs, s, m);
  expect(next, JSON.stringify(m)).not.toBe(s);
  return next;
};

/** Plays a round with a strategy; returns the final state and whether it stayed independent the whole way. */
type Strategy = {
  predict: (q: Investigation, i: number) => number;
  /** Setups to try in order for a reach investigation. */
  plans: (q: Investigation) => number[][];
  /** Reasons to try in order. */
  reasons: (q: Investigation) => number[];
};
function play(level: number, seed: number, how: Strategy) {
  const qs = investigations(level, seed);
  let s = create(level, seed, qs);
  qs.forEach((q, i) => {
    if (q.kind === "observe") {
      s = go(qs, s, { type: "predict", outcome: how.predict(q, i) });
      s = go(qs, s, { type: "test" });
    } else {
      for (const plan of how.plans(q)) {
        plan.forEach((v, c) => { if (!q.controls[c].fixed) s = move(qs, s, { type: "set", control: c, value: v }); });
        s = go(qs, s, { type: "test" });
        if (replay(qs, s.history)!.phase === "explain") break;
        s = go(qs, s, { type: "revise" });
      }
    }
    for (const r of how.reasons(q)) { s = go(qs, s, { type: "explain", choice: r }); if (replay(qs, s.history)!.phase === "done") break; }
    s = go(qs, s, { type: "next" });
  });
  const p = replay(qs, s.history)!;
  expect(p.phase).toBe("finished");
  return { s, independent: clean(p, level) };
}
/** Every setup of the unfixed controls, odometer order from the start: what guess-and-check tries. */
function sweep(q: Investigation): number[][] {
  const out: number[][] = [];
  const walk = (i: number, at: number[]) => {
    if (i === q.controls.length) { out.push(at); return; }
    const c = q.controls[i], n = c.options.length;
    if (c.fixed) walk(i + 1, [...at, q.start[i]]);
    else for (let k = 0; k < n; k++) walk(i + 1, [...at, (q.start[i] + k) % n]);
  };
  walk(0, []);
  return out;
}
const reasoned: Strategy = { predict: (q) => q.observe(q.start).outcome, plans: (q) => [solve(q)!], reasons: (q) => [q.explain.answer] };
const inOrder = (q: Investigation) => q.explain.choices.map((_, i) => i);

describe("K6 kit rules", () => {
  const qs = investigations(1, 3), observe = qs.findIndex((q) => q.kind === "observe"), reach = qs.findIndex((q) => q.kind === "reach");
  it("an observe test needs a prediction first; Next needs an accepted explanation", () => {
    let s = create(1, 3, qs);
    expect(observe).toBe(0);
    expect(move(qs, s, { type: "test" })).toBe(s);
    expect(move(qs, s, { type: "next" })).toBe(s);
    expect(move(qs, s, { type: "set", control: 0, value: (qs[0].start[0] + 1) % 4 })).toBe(s); // the setup is given
    s = go(qs, s, { type: "predict", outcome: 0 });
    s = go(qs, s, { type: "test" });
    expect(move(qs, s, { type: "predict", outcome: 1 })).toBe(s); // a prediction cannot change after the test
    expect(move(qs, s, { type: "next" })).toBe(s);
    const wrong = qs[0].explain.answer === 0 ? 1 : 0;
    s = go(qs, s, { type: "explain", choice: wrong });
    expect(move(qs, s, { type: "explain", choice: wrong })).toBe(s); // each wrong reason counts once
    expect(replay(qs, s.history)!.records[0].misses).toBe(1);
    s = go(qs, s, { type: "explain", choice: qs[0].explain.answer });
    s = go(qs, s, { type: "next" });
    expect(s.index).toBe(1);
    expect(s.draft).toEqual(qs[1].start);
  });
  it("a reach plan that misses must be revised; a setup is tested once", () => {
    let s = create(1, 3, qs);
    s = { ...s, ...play1(qs, s, reach) };
    const q = qs[reach];
    s = go(qs, s, { type: "test" }); // the start never reaches the goal
    expect(replay(qs, s.history)!.phase).toBe("result");
    expect(move(qs, s, { type: "set", control: 0, value: solve(q)![0] })).toBe(s);
    s = go(qs, s, { type: "revise" });
    expect(testedBefore(qs, s)).toBe(true);
    expect(move(qs, s, { type: "test" })).toBe(s);
    s = go(qs, s, { type: "set", control: 0, value: solve(q)![0] });
    s = go(qs, s, { type: "test" });
    const p = replay(qs, s.history)!;
    expect(p.phase).toBe("explain");
    expect(p.records[reach]).toMatchObject({ tests: 2, firstMatched: false });
  });
  it("hints climb three stages from the same investigation, and never past three", () => {
    let s = create(5, 11, investigations(5, 11));
    const q5 = investigations(5, 11);
    for (let i = 0; i < 3; i++) s = go(q5, s, { type: "hint" });
    expect(move(q5, s, { type: "hint" })).toBe(s);
    const text = hintText(q5[0], replay(q5, s.history)!);
    expect(text).toEqual([q5[0].clue, q5[0].rule, `This model will show: ${q5[0].outcomes[q5[0].observe(q5[0].start).outcome]}.`]);
    const reachQ = q5.find((q) => q.kind === "reach")!;
    const shown = hintText(reachQ, { ...replay(q5, s.history)!, index: 0, records: [{ tests: 0, firstMatched: false, misses: 0, hints: 3 }] });
    expect(shown[2]).toMatch(/^One setup that works: /);
  });
  it("Undo restores an earlier draft in the setup step only and never removes evidence", () => {
    let s = create(4, 9, investigations(4, 9));
    const q4 = investigations(4, 9), fair = q4.findIndex((q) => q.key === "gravity-b");
    s = { ...s, ...play1(q4, s, fair) };
    const before = s;
    s = go(q4, s, { type: "set", control: 0, value: (s.draft[0] + 1) % 5 });
    expect(undo(s, before, q4).draft).toEqual(before.draft);
    const tested = go(q4, s, { type: "test" });
    expect(undo(tested, before, q4)).toBe(tested);
  });
  it("saved rounds are checked against their replay: forged or inconsistent states are refused", () => {
    const q2 = investigations(2, 5);
    let s = create(2, 5, q2);
    expect(validState(s, 2, q2)).toBe(true);
    expect(validState({ ...s, level: 3 }, 2, q2)).toBe(false);
    expect(validState({ ...s, index: 1 }, 2, q2)).toBe(false);
    expect(validState({ ...s, draft: [(s.draft[0] + 1) % 8] }, 2, q2)).toBe(false); // a fixed setup changed
    expect(validState({ ...s, guess: 9 }, 2, q2)).toBe(false);
    expect(validState({ ...s, extra: 1 }, 2, q2)).toBe(false);
    expect(validState({ ...s, history: [["x"]] }, 2, q2)).toBe(false);
    expect(validState({ ...s, history: [["t", 0, 3]] }, 2, q2)).toBe(false); // tested a setup that was not given
    s = go(q2, s, { type: "predict", outcome: 1 });
    s = go(q2, s, { type: "test" });
    expect(validState(s, 2, q2)).toBe(true);
    expect(validState({ ...s, guess: 2 }, 2, q2)).toBe(false); // the shown prediction must be the tested one
    expect(validState({ ...s, history: Array(HISTORY_CAP + 1).fill(["h"]) }, 2, q2)).toBe(false);
  });
});
/** Moves one investigation's state to its first step (helper for focused rule tests). */
function play1(qs: readonly Investigation[], s: InquiryState, target: number): Partial<InquiryState> {
  for (let i = 0; i < target; i++) s = advance(qs, s);
  return s;
}
function advance(qs: readonly Investigation[], s: InquiryState): InquiryState {
  const q = qs[s.index];
  if (q.kind === "observe") s = move(qs, s, { type: "predict", outcome: q.observe(q.start).outcome });
  else solve(q)!.forEach((v, c) => { s = move(qs, s, { type: "set", control: c, value: v }); });
  s = move(qs, s, { type: "test" });
  s = move(qs, s, { type: "explain", choice: q.explain.answer });
  return move(qs, s, { type: "next" });
}

describe("Star Station content (SC-09)", () => {
  it.each([...levelNumbers])("level %i: every round is solvable, bounded and starts with a hidden target", (level) => {
    for (const { seed, qs } of all(level)) {
      expect(qs).toHaveLength(4);
      expect(new Set(qs.map((q) => q.key)).size).toBe(4);
      expect(qs.reduce((n, q) => n + investigationBound(q), 0)).toBeLessThanOrEqual(HISTORY_CAP);
      for (const q of qs) {
        expect(validSetup(q, q.start)).toBe(true);
        expect(q.explain.choices).toHaveLength(3);
        expect(new Set(q.explain.choices).size).toBe(3);
        expect(q.explain.choices[q.explain.answer]).toBeTruthy();
        if (q.kind === "observe") expect(q.controls.every((c) => c.fixed)).toBe(true);
        else {
          expect(q.observe(q.start).outcome, `${q.key} ${seed}`).not.toBe(q.want);
          expect(solve(q), q.key).not.toBeNull();
        }
      }
      expect(play(level, seed, reasoned).independent).toBe(true);
    }
  });
  it("goal text never states the answer: not the outcome, not the setting that reaches it, not the reason", () => {
    for (const level of levelNumbers) for (const { qs } of all(level)) for (const q of qs) {
      const goal = `${q.title} ${q.question} ${q.given ?? ""}`.toLowerCase();
      // A one-word label (a mass, a world) must appear as its own word; "6" inside "58.6 N" is not naming it.
      const words = new Set(goal.split(/[\s,?!:;]+/).map((w) => w.replace(/\.$/, "")));
      const names = (label: string) => (label.includes(" ") ? goal.includes(label) : words.has(label));
      expect(goal, q.key).not.toContain(q.explain.choices[q.explain.answer].toLowerCase());
      if (q.kind === "observe") expect(goal, q.key).not.toContain(q.outcomes[q.observe(q.start).outcome].toLowerCase());
      else {
        // Every setup that works needs at least one setting the goal does not name.
        for (const plan of sweep(q).filter((p) => q.observe(p).outcome === q.want)) {
          const changed = plan.map((v, i) => (v !== q.start[i] ? q.controls[i].options[v].toLowerCase() : null)).filter(Boolean) as string[];
          expect(changed.length, q.key).toBeGreaterThan(0);
          expect(changed.every(names), `${q.key}: ${changed}`).toBe(false);
        }
      }
    }
  });
  it("before a test, the scene names the setup only; the result appears after", () => {
    for (const level of levelNumbers) for (const q of investigations(level, 7)) {
      const before = describeScene(q, q.start, null), seen = q.observe(q.start);
      expect(before).toContain("Result hidden until you test.");
      expect(before).not.toContain(seen.reading);
      expect(describeScene(q, q.start, seen)).toContain(seen.reading);
    }
  });
  it("every number comes from the model functions", () => {
    for (const { qs } of all(4, 60)) for (const q of qs) for (const plan of sweep(q)) {
      const reading = q.observe(plan).reading;
      for (const [, kg, world, n] of reading.matchAll(/(\d+) kg on (\w+): ([\d.]+) N/g)) {
        const w = worlds.indexOf(world as (typeof worlds)[number]);
        expect(Number(n)).toBe(Math.round(weightNewtons(Number(kg), w) * 10) / 10);
        expect(masses).toContain(Number(kg));
      }
    }
    for (const { qs } of all(2, 60)) for (const q of qs) for (const plan of sweep(q)) {
      const [, percent] = q.observe(plan).reading.match(/(\d+)% of the side/)!;
      expect(Number(percent)).toBe(visibleMoonPercent(plan[0]));
    }
    for (const { qs } of all(5, 60)) {
      const light = qs.find((q) => q.key === "light-a")!;
      light.outcomes.forEach((o, i) => expect(o).toBe(`${lightMinutes(Number(light.controls[0].options[i].split(" ")[0])).toFixed(1)} minutes`));
    }
    expect(gravity).toEqual([9.81, 1.62, 3.71, 23.1]);
    expect(weight(12, 1)).toBe(19.4);
  });
  it("every rule cites the model, and space rules say the picture is illustrative or a model scale", () => {
    for (const level of levelNumbers) for (const { qs } of all(level, 40)) for (const q of qs) {
      expect(q.rule, q.key).toMatch(/model/i);
      expect(q.rule, q.key).toMatch(/Illustrative model|model scale/);
      expect(q.question + q.observe(q.start).reading, q.key).toMatch(/model|N\b|crate|Moon|Earth/);
    }
  });
  it("Level 4 has a mystery world and Level 5 an eclipse twist, each with its own reasoning", () => {
    for (const { qs } of all(4)) {
      const mystery = qs.find((q) => q.key === "gravity-c")!;
      const answer = solve(mystery)!;
      expect(mystery.question).not.toContain(mystery.controls[1].options[answer[1]]);
      expect(mystery.given).toMatch(/ N$/);
    }
    // The eclipse check: Moon in place for an eclipse, and on or off the Sun–Earth line right now.
    for (const { qs } of all(5)) {
      const check = qs.find((q) => q.key === "eclipse-d")!;
      const result = check.outcomes[check.observe(check.start).outcome];
      expect(result).toBe(check.controls[1].options[check.start[1]] === "Passes above or below" ? "No eclipse" : check.start[0] === 0 ? "Solar eclipse" : "Lunar eclipse");
    }
  });
});

describe("difficulty rises by inquiry demand", () => {
  const constant = (k: number): Strategy => ({
    predict: (q) => k % q.outcomes.length, plans: (q) => sweep(q), reasons: (q) => [k % 3, ...inOrder(q).filter((i) => i !== k % 3)],
  });
  const guessAndCheck: Strategy = { predict: () => 0, plans: sweep, reasons: inOrder };
  it("dumb bots (fixed guesses, guess-and-check) never earn the stars at Levels 4 and 5", () => {
    for (const level of [4, 5]) {
      expect(strictLevel(level)).toBe(true);
      for (const { seed } of all(level, 1000)) {
        expect(play(level, seed, guessAndCheck).independent, `${level}/${seed}`).toBe(false);
        for (const k of [0, 1, 2, 3]) expect(play(level, seed, constant(k)).independent, `${level}/${seed}/${k}`).toBe(false);
      }
    }
  });
  it("a random guesser earns the top stars at most rarely (measured)", () => {
    for (const level of [4, 5]) {
      const rng = random(level * 101);
      const pick = (n: number) => Math.floor(rng() * n);
      let wins = 0;
      const trials = 4000;
      for (let seed = 0; seed < trials; seed++) {
        const lucky: Strategy = { predict: (q) => pick(q.outcomes.length), plans: (q) => shuffle(sweep(q), pick), reasons: (q) => shuffle(inOrder(q), pick) };
        if (play(level, seed, lucky).independent) wins++;
      }
      expect(wins / trials, `level ${level}`).toBeLessThan(0.002);
    }
  });
  it("Levels 1–3 forgive a surprising prediction, so a curious child is not punished for being wrong", () => {
    for (const level of [1, 2, 3]) {
      expect(strictLevel(level)).toBe(false);
      const qs = investigations(level, 2);
      const surprised: Strategy = { ...reasoned, predict: (q) => (q.observe(q.start).outcome + 1) % q.outcomes.length };
      expect(play(level, 2, surprised).independent).toBe(true);
      expect(qs.length).toBe(4);
    }
  });
  it("each level asks for something new", () => {
    // Levels 4–5 shuffle the order of their four investigations; compare the sets.
    const kinds = levelNumbers.map((level) => investigations(level, 1).map((q) => q.key.split("-")[0]).sort());
    expect(kinds).toEqual([["day", "day", "day", "day"], ["moon", "moon", "moon", "moon"], ["planets", "planets", "planets", "planets"], ["gravity", "gravity", "gravity", "gravity"], ["eclipse", "eclipse", "light", "tilt"]]);
    // Level 4 needs a fair test (two free controls) and Level 5 two conditions at once.
    expect(investigations(4, 1).find((q) => q.key === "gravity-b")!.controls.filter((c) => !c.fixed)).toHaveLength(2);
    expect(investigations(5, 1).find((q) => q.key === "eclipse-c")!.controls.filter((c) => !c.fixed)).toHaveLength(2);
  });
});
function shuffle<T>(items: T[], pick: (n: number) => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = pick(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

describe("saves (K8): paused rounds resume, stars unchanged", () => {
  it("fresh rounds are version 2; a saved version-1 round still validates, plays and credits as before", () => {
    for (const level of levelNumbers) {
      const o = opts(level);
      const fresh = engine.create(o, ctx(level));
      expect(isInquiry(fresh)).toBe(true);
      expect(engine.validate(fresh, o)).toBe(true);
      expect(engine.outcome(fresh, o)).toBeNull();
      const old = legacyEngine.create(o, ctx(level));
      expect(old.version).toBe(1);
      expect(engine.validate(old, o)).toBe(true);
      expect(engine.validate(JSON.parse(JSON.stringify(old)), o)).toBe(true);
      expect(engine.validate(fresh, opts(level === 5 ? 4 : level + 1))).toBe(false);
      const round: LearnSession = { version: 1, game: "space-station", id: "old", revision: 3, learner: "a", levelHelped: false, options: o, state: old };
      expect(validLearnSession(round)).toBe(true);
    }
  });
  it("a paused inquiry round survives a save and reload mid-investigation, exactly", () => {
    for (const level of levelNumbers) {
      let session = startSession("space-station", { options: opts(level) }, {}, 11);
      const s = session.state as InquiryState, qs = investigations(level, s.seed);
      let next = advance(qs, s);
      const q = qs[next.index];
      next = q.kind === "observe" ? move(qs, next, { type: "predict", outcome: 0 }) : move(qs, next, { type: "set", control: q.controls.findIndex((c) => !c.fixed), value: (q.start[q.controls.findIndex((c) => !c.fixed)] + 1) % q.controls[q.controls.findIndex((c) => !c.fixed)].options.length });
      next = move(qs, next, { type: "hint" });
      session = { ...session, state: next };
      const reloaded = JSON.parse(JSON.stringify(session));
      expect(validLearnSession(reloaded)).toBe(true);
      expect(reloaded).toEqual(session);
      expect(replay(qs, reloaded.state.history)).toEqual(replay(qs, next.history));
    }
  });
  it("a finished inquiry round credits School stars by the existing rule", () => {
    const o = opts(4);
    const s = engine.create(o, ctx(5)) as InquiryState, qs = investigations(4, s.seed);
    let state = s;
    while (state.index < qs.length) state = advance(qs, state);
    const round: LearnSession = { version: 1, game: "space-station", id: "r1", revision: 9, learner: "a", levelHelped: false, options: o, state };
    expect(engine.outcome(state, o)).toBe("done");
    expect(independentRound(round)).toBe(true);
    expect(creditSchool({}, round, 100)["space-station"]?.[4]).toMatchObject({ stars: 2, completed: 1, independent: 1 });
    expect(independentRound({ ...round, levelHelped: true })).toBe(false);
  });
  it("the longest possible round stays well inside a session's 4,096 bytes", () => {
    const qs = investigations(4, 0);
    const state: InquiryState = { ...create(4, 999999, qs), history: Array.from({ length: HISTORY_CAP }, () => ["t", 2, 4, 3, 3] as const) };
    const session = { version: 1, game: "space-station", id: "x".repeat(24), revision: 99999, learner: "abcdefgh", levelHelped: true, options: opts(4), state };
    expect(JSON.stringify(session).length).toBeLessThan(4096);
  });
});

/** Speech lines for the lead to voice. Regenerate with LITTLE_ISLAND_WRITE_INQUIRY_SPEECH=1. */
function speakable(seeds: number): Record<string, string> {
  const lines: Record<string, string> = { "space-station-help-v4": engine.help };
  for (const level of levelNumbers) for (let seed = 0; seed < seeds; seed++) for (const q of investigations(level, seed))
    for (const text of [`${q.title}. ${q.question}`, q.rule]) lines[inquirySpeechKey(text)] = text;
  return Object.fromEntries(Object.entries(lines).sort(([a], [b]) => a.localeCompare(b)));
}
it("registers every goal and model rule the board can speak in scripts/learn/s1a-inquiry.json (voiced in the W5a batch)", () => {
  const path = new URL("../scripts/learn/s1a-inquiry.json", import.meta.url);
  if (process.env.LITTLE_ISLAND_WRITE_INQUIRY_SPEECH === "1") writeFileSync(path, JSON.stringify(speakable(40000), null, 1) + "\n");
  const lines = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
  for (const [key, text] of Object.entries(speakable(3000))) expect(lines[key], text).toBe(text);
  expect(existsSync(new URL("../scripts/learn/s1a-inquiry.stage", import.meta.url)), "voiced in the W5a batch; the staging sidecar is gone").toBe(false);
});
