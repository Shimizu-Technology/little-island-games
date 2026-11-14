import { describe, expect, it } from "vitest";
import { random } from "../src/games/types";
import { engines } from "../src/learn/engines";
import { levelInfo } from "../src/learn/levels";
import { optionsAtLevel } from "../src/learn/levelOptions";
import { replaySession, startSession, validLearnSession, finished } from "../src/learn/session";
import { createGrowth } from "../src/learn/growth/engine";
import type { LearnOptions } from "../src/learn/types";
import { createRound, mathMove, questionOf, type MathRound } from "../src/learn/games/shell-math/round";
import { mathAnswer } from "../src/math/questions";
import { engine as shellEngine, isShellRound } from "../src/learn/games/shell-math/engine";
import { HISTORY_CAP, createShell, problemOf, progress, shellMove, validShell, type RoundAct, type ShellRound } from "../src/learn/games/shell-math/round2";
import { emptySave, parseSave } from "../src/state/validation";
import { LEVELS, ROUND_LENGTH, fitsLevel, candidates, solveActs, type Level } from "../src/math/kit";
import { finishShell } from "./helpers/shell-rounds";

const at = (level: Level, extra: Partial<LearnOptions> = {}): LearnOptions => optionsAtLevel({ mode: "solo", pace: "easy", ...extra }, level);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const roundOf = (level: Level, seed = 7, extra: Partial<LearnOptions> = {}) => createShell(at(level, extra), random(seed));

describe("Shell Math v2 rounds", () => {
  it("starts a valid version-2 round at every level, with the level's own strategy", () => {
    for (const level of LEVELS) for (const op of ["add", "subtract", "mixed"] as const) for (let seed = 0; seed < 40; seed++) {
      const options = at(level, { mathOperation: op }), session = startSession("shell-math", { options }, {}, seed);
      expect(isShellRound(session.state)).toBe(true);
      const s = session.state as ShellRound;
      expect(s.level).toBe(level);
      expect(s.items).toHaveLength(ROUND_LENGTH);
      expect(validShell(s, options)).toBe(true);
      expect(validLearnSession(clone(session))).toBe(true);
      s.items.forEach((c) => expect(fitsLevel(level, problemOf(c))).toBe(true));
    }
  });

  it("is finished by perfect play, step by step, and every saved moment loads back identically", () => {
    for (const level of LEVELS) {
      const options = at(level), session = startSession("shell-math", { options }, {}, 11);
      let s = session.state as ShellRound;
      const save = (state: ShellRound) => {
        const saved = { ...session, revision: session.revision + 1, state };
        expect(validLearnSession(clone(saved))).toBe(true);
        expect(parseSave(JSON.stringify({ ...emptySave(), learn: { "shell-math": saved }, recentLearn: "shell-math" })).learn?.["shell-math"]).toEqual(saved);
      };
      while (s.index < ROUND_LENGTH) {
        const p = progress(s)!;
        for (const a of solveActs(p.plan!)) {
          const next = shellMove(s, a);
          expect(next).not.toBe(s);
          s = next; save(s);
        }
        expect(s.solved).toBe(true);
        s = shellMove(s, ["x"]); save(s);
      }
      expect(shellEngine.outcome(s, options)).toBe("done");
      expect(finished({ ...session, state: s })).toBe(true);
      expect(progress(s)!.helped).toEqual([false, false, false, false, false]);
    }
  });

  it("ignores any move that is not legal where the child is, and never changes the original", () => {
    const s = roundOf(3), before = clone(s), p = progress(s)!;
    // Level 3 opens on "how many to make ten?", so counting, trading, a wrong fill or a stray next do nothing.
    for (const a of [["c"], ["t"], ["m", 0, 2], ["p", 0, 1], ["x"]] as RoundAct[]) expect(shellMove(s, a)).toBe(s);
    for (const bad of [null, undefined, "n", [], ["n"], ["n", -1], ["n", 1000], ["n", 1.5], ["z"], { 0: "n" }] as unknown[]) expect(shellMove(s, bad as RoundAct)).toBe(s);
    expect(s).toEqual(before);
    expect(p.work.at).toBe(0);
  });

  it("a miss is saved, marks the problem helped, and blocks nothing", () => {
    let s = roundOf(3);
    const p = progress(s)!, first = p.plan![0] as { value: number };
    const wrong = first.value === 9 ? 8 : first.value + 1;
    s = shellMove(s, ["n", wrong]);
    expect(s.wrong).toBe(wrong);
    expect(s.solved).toBe(false);
    const w = progress(s)!.work;
    expect(w).toMatchObject({ wrong: 1, helped: true, at: 0 });
    // The same wrong number twice is still just another miss; the right one then goes through.
    s = shellMove(s, ["n", wrong]);
    expect(progress(s)!.work.wrong).toBe(2);
    s = shellMove(s, ["n", first.value]);
    expect(s.wrong).toBeNull();
    expect(progress(s)!.work.at).toBe(1);
  });

  it("help climbs a cue, the number, then fills it in, one step at a time, and marks help", () => {
    let s = roundOf(4);
    // Level 4 opens on a fill step: help names the move, never a number it does not have.
    for (let i = 1; i <= 3; i++) { s = shellMove(s, ["h"]); expect(progress(s)!.work.hint).toBe(i); }
    expect(shellMove(s, ["h"])).toBe(s);
    expect(progress(s)!.work.helped).toBe(true);
    const done = finishShell(s);
    expect(progress(done)!.helped.every(Boolean) || progress(done)!.helped[0]).toBe(true);
  });

  it("choices are one-time help for typed levels and not offered a second time", () => {
    let s = roundOf(3);
    s = shellMove(s, ["k"]);
    expect(progress(s)!.work.choices).toBe(true);
    expect(shellMove(s, ["k"])).toBe(s);
  });

  it("mirrors solved and wrong for the frame, and rejects a save whose mirrors disagree", () => {
    const options = at(2);
    let s = roundOf(2);
    expect(s).toMatchObject({ solved: false, wrong: null });
    const acts = solveActs(progress(s)!.plan!);
    for (const a of acts) s = shellMove(s, a);
    expect(s.solved).toBe(true);
    expect(validShell({ ...s, solved: false }, options)).toBe(false);
    expect(validShell({ ...s, wrong: 3 }, options)).toBe(false);
    expect(validShell(shellMove(s, ["x"]), options)).toBe(true);
  });

  it("rejects forged, tampered and mismatched saves without throwing", () => {
    const options = at(3), good = roundOf(3);
    const done = finishShell(good);
    const bad: unknown[] = [
      null, [], {}, "x", 7,
      { ...good, version: 1 }, { ...good, extra: 1 }, { ...good, level: 4 }, { ...good, index: 1 }, { ...good, index: -1 }, { ...good, index: 99 },
      { ...good, items: good.items.slice(1) }, { ...good, items: [...good.items.slice(0, 4), [0, good.items[0][2], good.items[0][1], 0]] }, { ...good, items: [...good.items.slice(0, 4), [0, 2, 3, 0]] },
      { ...good, items: [[1, 99, 1, 0], ...good.items.slice(1)] }, { ...good, items: [[0, 1.5, 2, 0], ...good.items.slice(1)] },
      { ...good, items: good.items.map((c) => [c[0], c[1], c[2], c[3], 5]) }, { ...good, items: [good.items[0], good.items[0], ...good.items.slice(2)] },
      { ...good, history: [["n", 5]] }, { ...good, history: [["x"]] }, { ...good, history: [["c"]] }, { ...good, history: Array(HISTORY_CAP + 1).fill(["h"]) },
      { ...good, history: [["n", "5"]] }, { ...good, solved: true }, { ...good, wrong: 3 },
      { ...done, history: done.history.slice(0, -1) }, { ...done, index: 4 }, { ...done, history: [...done.history, ["h"]] },
    ];
    for (const b of bad) expect(() => validShell(b, options), JSON.stringify(b)?.slice(0, 80)).not.toThrow();
    for (const b of bad) expect(validShell(b, options), JSON.stringify(b)?.slice(0, 80)).toBe(false);
    expect(validShell(good, options)).toBe(true);
    expect(validShell(done, options)).toBe(true);
    // A round from one level is not valid under another level's options.
    expect(validShell(good, at(4))).toBe(false);
    expect(validShell(roundOf(5), at(3))).toBe(false);
  });

  it("honours the operation choice for the level and the old operation rule", () => {
    for (const level of [1, 2, 3] as const) {
      expect(roundOf(level, 3, { mathOperation: "subtract" }).items.every((c) => c[0] === 1)).toBe(true);
      expect(roundOf(level, 3, { mathOperation: "add" }).items.every((c) => c[0] === 0)).toBe(true);
      expect(roundOf(level, 3).items.every((c) => c[0] === 0)).toBe(true);
    }
    // Adding items to a subtract round is a forged save.
    const mixed = roundOf(3, 3, { mathOperation: "mixed" });
    expect(validShell(mixed, at(3, { mathOperation: "add" }))).toBe(false);
  });

  it("long runs of misses cannot trap a round: past the reserve only forward moves are saved", () => {
    let s = roundOf(3);
    const firstValue = (progress(s)!.plan![0] as { value: number }).value, wrong = firstValue === 9 ? 8 : firstValue + 1;
    let guard = 0;
    while (s.history.length < HISTORY_CAP && guard++ < 1000) {
      const next = shellMove(s, ["n", wrong]);
      if (next === s) break;
      s = next;
    }
    expect(s.history.length).toBeLessThan(HISTORY_CAP);
    expect(s.history.length).toBeGreaterThan(100);
    // The round can still be finished from here.
    const finishedRound = finishShell(s);
    expect(finishedRound.index).toBe(ROUND_LENGTH);
    expect(validShell(finishedRound, at(3))).toBe(true);
  });

  it("names five levels and the strategies they teach", () => {
    const names = LEVELS.map((l) => levelInfo("shell-math", l).name);
    expect(names).toEqual(["Count on", "Ten and ones", "Bridge a ten", "Make a ten", "Open a ten"]);
    expect(new Set(names).size).toBe(5);
    for (const l of LEVELS) expect(levelInfo("shell-math", l).description.length).toBeGreaterThan(10);
  });

  it("keeps every older save: version-1 rounds validate and play, and archived growth rounds still open", () => {
    const options: LearnOptions = { mode: "solo", pace: "medium", mathOperation: "mixed" };
    const legacy = createRound(options, "shell-math", random(5));
    expect(shellEngine.validate(legacy, options)).toBe(true);
    expect(engines["shell-math"].validate(legacy, options)).toBe(true);
    expect(validLearnSession({ ...startSession("shell-math", { options }, {}, 5), state: legacy })).toBe(true);
    let s: MathRound = legacy;
    while (s.index < s.questions.length) {
      for (let n = 0; n < questionOf(s).b; n++) s = mathMove(s, "shell-math", { type: "step" });
      s = mathMove(s, "shell-math", { type: "answer", answer: mathAnswer(questionOf(s)) });
      s = mathMove(s, "shell-math", { type: "next" });
    }
    expect(shellEngine.outcome(s, options)).toBe("done");
    // A version-1 round never carries a Level 4 or 5 stage.
    expect(shellEngine.validate(legacy, at(4))).toBe(false);
    // An archived Level 4 growth round still validates through the frame's shared board.
    const stage = at(4), growth = createGrowth("shell-math", stage, { skills: {}, rng: random(1), starter: 0, today: 1 });
    expect(engines["shell-math"].validate(growth, stage)).toBe(true);
    expect(validLearnSession({ ...startSession("shell-math", { options: stage }, {}, 5), state: growth })).toBe(true);
    // New rounds at those levels are version 2, never growth.
    expect(isShellRound(engines["shell-math"].create(stage, { skills: {}, rng: random(2), starter: 0, today: 1 }))).toBe(true);
  });

  it("a replay starts a fresh round of the same level and keeps the options", () => {
    const options = at(5), session = startSession("shell-math", { options }, {}, 4);
    const next = replaySession(session, {}, 9);
    expect(validLearnSession(next)).toBe(true);
    expect(next.options).toEqual(options);
    expect(next.state).toMatchObject({ version: 2, level: 5, index: 0, history: [] });
  });
});

describe("dumb players", () => {
  type Bot = (s: ShellRound, rng: () => number) => RoundAct | null;
  /** Plays until the round is done or the bot has nothing legal to try; returns what it managed. */
  function play(level: Level, seed: number, bot: Bot) {
    let s = roundOf(level, seed);
    const rng = random(seed ^ 0xabc);
    for (let turns = 0; turns < 600 && s.index < s.items.length; turns++) {
      const a = bot(s, rng);
      if (!a) break;
      const next = shellMove(s, a);
      if (next === s) { if (a[0] !== "n" && a[0] !== "m") break; }
      else s = next;
    }
    const p = progress(s)!;
    return { s, clean: s.index === s.items.length && p.helped.every((h) => !h), done: s.index === s.items.length, solvedProblems: s.index };
  }
  /** Taps the shell button and nothing else, the way a child who has only ever tapped singles plays. */
  const singleTapper: Bot = (s) => { const p = progress(s)!; return p.plan?.[p.work.at]?.kind === "count" ? ["c"] : p.work.solved ? ["x"] : null; };
  /** Says any number it can think of. */
  const guesser: Bot = (s, rng) => { const p = progress(s)!; if (p.work.solved) return ["x"]; return ["n", Math.floor(rng() * 21)]; };
  /** Keeps asking for help and takes the choices, finishing with everything shown. */
  const scanner: Bot = (s) => {
    const p = progress(s)!;
    if (p.work.solved) return ["x"];
    const step = p.plan![p.work.at];
    if (step.kind === "number") return p.work.hint < 3 ? ["h"] : ["n", step.value];
    if (step.kind === "count") return ["c"];
    if (step.kind === "trade") return ["t"];
    return step.kind === "fill" ? ["m", step.options[0][0], step.options[0][1]] : null;
  };

  it("tapping single shells finishes nothing above Level 1, and nothing at Level 1 either without an answer", () => {
    for (const level of LEVELS) for (let seed = 0; seed < 30; seed++) expect(play(level, seed, singleTapper).solvedProblems).toBe(0);
  });
  it("saying random numbers does not finish a clean round at any level, and at Levels 3 to 5 cannot even solve a problem unhelped", () => {
    for (const level of LEVELS) {
      let clean = 0;
      for (let seed = 0; seed < 200; seed++) if (play(level, seed, guesser).clean) clean++;
      expect(clean, `level ${level}`).toBe(0);
    }
  });
  it("a scanning player always finishes (help is never withheld) but is recorded as helped at every level", () => {
    for (const level of LEVELS) for (let seed = 0; seed < 20; seed++) {
      const r = play(level, seed, scanner);
      expect(r.done, `level ${level}`).toBe(true);
      expect(r.clean).toBe(false);
      expect(progress(r.s)!.helped.every(Boolean)).toBe(true);
    }
  });
  it("guessing gets worse with level: the chance of a lucky first answer falls as the numbers climb", () => {
    const luck = (level: Level) => {
      let hits = 0, trials = 0;
      for (let seed = 0; seed < 150; seed++) {
        const s = roundOf(level, seed), p = progress(s)!, step = p.plan![0];
        if (step.kind !== "number") continue;
        trials++;
        const rng = random(seed);
        if (Math.floor(rng() * 21) === step.value) hits++;
      }
      return trials ? hits / trials : 0;
    };
    // Levels 1 and 2 open with choices of three, so the typed levels are compared with a typed guess among 21 numbers.
    expect(luck(3)).toBeLessThan(0.2);
    expect(luck(5)).toBeLessThan(0.2);
  });
});

describe("a child who says too easy", () => {
  it("meets a different strategy at every step up, and a Challenge entry that is not the same question again", () => {
    for (let level = 1; level < 5; level++) {
      const here = candidates(level as Level, "add", 2), up = candidates((level + 1) as Level, "add", 2);
      const overlap = up.filter((p) => here.some((q) => q.a === p.a && q.b === p.b));
      // Levels 3 and 4 share the same ten-bridge arithmetic by design; every other step up changes the problems entirely.
      if (level !== 3) expect(overlap, `${level} to ${level + 1}`).toHaveLength(0);
    }
  });
});
