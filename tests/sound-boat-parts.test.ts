import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createGrowth, withGrowth } from "../src/learn/growth/engine";
import { optionsAtLevel, type LearningLevel } from "../src/learn/levels";
import { random } from "../src/games/types";
import { answerMissed } from "../src/puzzles/wholeAnswer";
import { buildRules, draftTexts, firstMisfit, nextNeeded, type BuildTask } from "../src/learn/reading/build";
import { letterTaskById, partsTaskById, partsTasksAt } from "../src/learn/reading/tasks";
import { TILE_TWINS } from "../src/learn/reading/graphemes";
import { inheritedWords } from "../src/learn/reading/inherited";
import type { PartsDraft, WordBank } from "../src/learn/reading/records";
import { engine } from "../src/learn/games/sound-boat/engine";
import {
  PARTS_PER_ROUND,
  isParts,
  partsMove,
  partsTask as current,
  type PartsAction,
  type PartsState,
} from "../src/learn/games/sound-boat/parts";

// The fixture records stand in for an admitted bank; the real factory mints them (see helpers/fixture-door).
vi.mock("../src/learn/reading/admitted", async (real) => (await import("./helpers/fixture-door")).fixtureDoor(real));
const fixture = JSON.parse(readFileSync("tests/fixtures/reading/sound-boat-parts.fixture.json", "utf8")) as WordBank<PartsDraft>;
const tasks = { get: (id: string) => partsTaskById(id) };
const partsTask = (s: PartsState, _?: unknown) => current(s)!;
const dispatch = withGrowth(engine as never);
const ctx = (seed: number) => ({ skills: {}, rng: random(seed), starter: 0 as const, today: 20000 });
const at = (level: 4 | 5) => optionsAtLevel({ mode: "solo", pace: "easy" }, level as LearningLevel);
const round = (level: 4 | 5, seed = 1) => dispatch.create(at(level), ctx(seed)) as PartsState;
const step = (s: PartsState, a: PartsAction) => partsMove(s, a);
/** Place pieces by their texts, in order, using unused tray positions. */
function place(s: PartsState, texts: readonly string[]): PartsState {
  let out = s;
  for (const text of texts) {
    const task = partsTask(out, tasks);
    const i = task.tray.findIndex((p, k) => p === text && !out.answer.draft.includes(k));
    out = step(out, { type: "edit", edit: ["a", i] });
  }
  return out;
}
const build = (s: PartsState) => place(s, partsTask(s, tasks).tiles);
function playOut(s: PartsState, write: (task: BuildTask) => readonly string[]) {
  let out = s;
  while (!isParts(out) || out.index < PARTS_PER_ROUND) {
    out = place(out, write(partsTask(out, tasks)));
    out = step(out, { type: "check" });
    if (!out.answer.solved) return out;
    out = step(out, { type: "next" });
  }
  return out;
}

// The shipped engine (no admitted bank) and the playable floor are in sound-boat-provenance.test.tsx, without this mock.
it("an admitted bank at the playable floor switches the new board on", () => {
  expect(engine.nativeStages).toBe(true);
  expect(fixture.records.length).toBeGreaterThan(0);
});

describe("a Levels 4-5 round", () => {
  it("is six valid words per round, easier first, from the right level", () => {
    for (const level of [4, 5] as const)
      for (let seed = 1; seed <= 60; seed++) {
        const s = round(level, seed);
        expect(s.ids).toHaveLength(PARTS_PER_ROUND);
        expect(new Set(s.ids).size).toBe(PARTS_PER_ROUND);
        expect(dispatch.validate(s, at(level))).toBe(true);
        const sizes = s.ids.map((id) => tasks.get(id)!.tiles.length);
        if (level === 4) expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
      }
  });
  it("at Level 5 keeps words from one base word side by side", () => {
    const families = (seed: number) => round(5, seed).ids.map((id) => tasks.get(id)!.cue?.base ?? "");
    for (let seed = 1; seed <= 60; seed++) {
      const bases = families(seed), seen = new Set<string>();
      let prev = "";
      for (const b of bases) { if (b !== prev) { expect(seen.has(b), `${seed}:${bases}`).toBe(false); seen.add(b); } prev = b; }
    }
  });
  it("saved rounds only ever validate at their own level", () => {
    const s = round(4, 2);
    expect(dispatch.validate(s, at(5))).toBe(false);
    expect(dispatch.validate(s, { mode: "solo", pace: "easy" })).toBe(false);
  });
  it("finishes", () => {
    const s = round(4, 3);
    const done = playOut(s, (t) => t.tiles);
    expect(done.index).toBe(6);
    expect(done.clean).toEqual([true, true, true, true, true, true]);
    expect(dispatch.outcome(done, at(4))).toBe("done");
    expect(dispatch.validate(done, at(4))).toBe(true);
    expect(dispatch.outcome(round(4, 3), at(4))).toBeNull();
    expect(dispatch.outcome(done, { ...at(4), mode: "versus" })).toBe("draw");
  });
});

describe("whole-word Check", () => {
  it("marks nothing until Check, and a miss keeps the word", () => {
    let s = round(4, 4);
    const task = partsTask(s, tasks), wrong = [...task.tiles].reverse();
    if (wrong.join() === task.tiles.join()) throw new Error("fixture word reads the same reversed");
    s = place(s, wrong);
    expect(Object.keys(s.answer).sort()).toEqual(["checkedRevision", "checks", "draft", "helped", "last", "misses", "needsVariant", "revision", "solved"]);
    expect(s.answer.checks).toBe(0);
    expect(answerMissed(s.answer)).toBe(false);
    s = step(s, { type: "check" });
    expect(s.answer).toMatchObject({ checks: 1, misses: 1, solved: false });
    expect(answerMissed(s.answer)).toBe(true);
    expect(draftTexts(task, s.answer.draft)).toEqual(wrong);
    expect(step(s, { type: "check" })).toBe(s);
    s = step(s, { type: "edit", edit: ["x", 0] });
    expect(answerMissed(s.answer)).toBe(false);
    expect(s.answer.misses).toBe(1);
  });
  it("an incomplete word cannot be checked, and a solved word cannot be edited", () => {
    let s = round(4, 5);
    s = place(s, partsTask(s, tasks).tiles.slice(0, 1));
    expect(step(s, { type: "check" })).toBe(s);
    s = build(round(4, 5));
    s = step(s, { type: "check" });
    expect(s.answer.solved).toBe(true);
    expect(step(s, { type: "edit", edit: ["x", 0] })).toBe(s);
    expect(step(s, { type: "help" })).toBe(s);
  });
  it("counts the word as clean only on the first Check with no Help", () => {
    const run = (prepare: (s: PartsState) => PartsState) => {
      let s = prepare(round(4, 6));
      s = build(s.answer.draft.length ? step(s, { type: "reset" }) : s);
      s = step(s, { type: "check" });
      return step(s, { type: "next" }).clean;
    };
    expect(run((s) => s)).toEqual([true]);
    expect(run((s) => step(s, { type: "help" }))).toEqual([false]);
    expect(run((s) => step(place(s, [...partsTask(s, tasks).tiles].reverse()), { type: "check" }))).toEqual([false]);
  });
  it("Sail on waits for a solved word and Hear never marks the word", () => {
    const s = round(4, 7);
    expect(step(s, { type: "next" })).toBe(s);
    const heard = step(s, { type: "hear" });
    expect(heard.heard).toBe(true);
    expect(heard.answer).toEqual(s.answer);
    expect(step(build(heard), { type: "check" }).answer.helped).toBe(false);
  });
  it("Help lights the next needed piece, or points at a piece that does not fit", () => {
    let s = step(round(5, 8), { type: "help" });
    const task = partsTask(s, tasks);
    expect(s.answer.helped).toBe(true);
    expect(draftTexts(task, [nextNeeded(task, [])!])[0]).toBe(task.tiles[0]);
    s = place(s, [task.tray.find((p) => p !== task.tiles[0] && !task.tiles.includes(p))!]);
    expect(firstMisfit(task, s.answer.draft)).toBe(0);
    expect(nextNeeded(task, s.answer.draft)).toBeNull();
  });
  it("Start over keeps what Check and Help already counted", () => {
    let s = step(place(round(4, 9), [...partsTask(round(4, 9), tasks).tiles].reverse()), { type: "check" });
    s = step(s, { type: "help" });
    const again = step(s, { type: "reset" });
    expect(again.answer).toMatchObject({ draft: [], checks: 1, misses: 1, helped: true, last: null, checkedRevision: null });
  });
  it("keeps its revision small however long she edits", () => {
    let s = round(4, 10);
    for (let k = 0; k < 600; k++) s = step(s, { type: "edit", edit: k % 2 ? ["x", 0] : ["a", 0] });
    expect(dispatch.validate(s, at(4))).toBe(true);
    expect(s.answer.revision).toBeLessThanOrEqual(200);
  });
});

describe("saved rounds are checked, not trusted", () => {
  const ok = () => build(round(4, 11));
  it("rejects forged and inconsistent states", () => {
    const base = ok();
    const bad = (mutate: (s: PartsState) => unknown) => expect(dispatch.validate(mutate(structuredClone(base)), at(4))).toBe(false);
    expect(dispatch.validate(base, at(4))).toBe(true);
    bad((s) => ({ ...s, ids: s.ids.slice(1) }));
    bad((s) => ({ ...s, ids: [...s.ids.slice(0, 5), "nope"] }));
    bad((s) => ({ ...s, ids: [s.ids[0], ...s.ids.slice(1, 5), s.ids[0]] }));
    bad((s) => ({ ...s, index: 2 }));
    bad((s) => ({ ...s, extra: 1 }));
    bad((s) => ({ ...s, answer: { ...s.answer, draft: [99] } }));
    bad((s) => ({ ...s, answer: { ...s.answer, draft: [0, 0] } }));
    bad((s) => ({ ...s, answer: { ...s.answer, solved: true } }));
    bad((s) => ({ ...s, answer: { ...s.answer, misses: 3 } }));
    bad((s) => ({ ...s, answer: { ...s.answer, needsVariant: true } }));
    bad((s) => ({ ...s, answer: { ...s.answer, checkedRevision: 5 } }));
    bad((s) => ({ ...s, answer: { ...s.answer, last: { draft: [], correct: true } } }));
    bad((s) => ({ ...s, level: 5 }));
    bad((s) => ({ ...s, clean: [true] }));
  });
  it("accepts a solved word waiting for Sail on, and rejects a solved word with the wrong pieces", () => {
    const solved = step(ok(), { type: "check" });
    expect(dispatch.validate(solved, at(4))).toBe(true);
    const task = partsTask(solved, tasks);
    const swap = { ...solved, answer: { ...solved.answer, draft: [...solved.answer.draft].reverse() } };
    if (draftTexts(task, swap.answer.draft).join() !== task.tiles.join()) expect(dispatch.validate(swap, at(4))).toBe(false);
  });
  it("archived growth rounds still dispatch to their own board when the new stage is on", () => {
    for (const level of [4, 5] as const) {
      const old = createGrowth("sound-boat", at(level), ctx(5));
      expect(dispatch.validate(old, at(level))).toBe(true);
      expect(dispatch.validate(old, at(level === 4 ? 5 : 4))).toBe(false);
    }
  });
  it("leaves Levels 1-3 saves exactly as they were", () => {
    const o = { mode: "solo" as const, pace: "medium" as const };
    const s = dispatch.create(o, ctx(9));
    expect(isParts(s)).toBe(false);
    // Save shape 1 plus the optional credit marker (R1a fix 3); older saves without it still validate (sound-boat-undo).
    expect(Object.keys(s as object).sort()).toEqual(["assisted", "clean", "credit", "filled", "hint", "index", "ladders", "out", "pictures", "starter"]);
    expect(dispatch.validate(s, o)).toBe(true);
    expect(dispatch.validate(round(4, 1), o)).toBe(false);
  });
});

describe("difficulty really rises", () => {
  const first = (s: PartsState, write: (t: BuildTask) => readonly string[]) => {
    const out = playOut(s, write);
    return out.index === PARTS_PER_ROUND ? 1 : 0;
  };
  const tasksAt = (level: 4 | 5) => partsTasksAt(level);
  it("a child who keeps the base word and ignores the spelling change passes Level 4 endings and fails every Level 5 change", () => {
    const keepBase = (t: BuildTask) => (t.cue ? [t.cue.base, t.cue.affix] : t.tiles);
    const accepts = (t: BuildTask) => {
      const texts = keepBase(t);
      const tray = [...t.tray], draft: number[] = [];
      for (const p of texts) { const i = tray.findIndex((x, k) => x === p && !draft.includes(k)); if (i < 0) return false; draft.push(i); }
      return draft.length === t.tiles.length && buildRules.accepts(draft, t);
    };
    const l4 = tasksAt(4).filter((t) => t.cue), l5change = tasksAt(5).filter((t) => t.cue && t.skill === "read.spelling-change");
    expect(l4.length).toBeGreaterThanOrEqual(6);
    expect(l5change.length).toBeGreaterThanOrEqual(10);
    expect(l4.every(accepts)).toBe(true);
    expect(l5change.some(accepts)).toBe(false);
  });
  it("a bot that taps pieces in tray order almost never passes either level", () => {
    for (const level of [4, 5] as const) {
      let wins = 0, total = 0;
      for (const t of tasksAt(level)) {
        const draft = t.tray.map((_, i) => i).slice(0, t.tiles.length);
        total++;
        if (buildRules.accepts(draft, t)) wins++;
      }
      expect(wins / total, `level ${level}`).toBeLessThan(0.1);
    }
  });
  it("a bot that guesses at random fails the first Check of a six-word round at both levels", () => {
    for (const level of [4, 5] as const) {
      let passes = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const rng = random(seed * 977);
        passes += first(round(level, seed), (t) => {
          const order = t.tray.map((p, i) => ({ p, k: rng() })).sort((a, b) => a.k - b.k).slice(0, t.tiles.length);
          return order.map((o) => o.p);
        });
      }
      expect(passes, `level ${level}`).toBe(0);
    }
  });
  it("Level 5 asks for strictly more than Level 4: every Level 5 word has a spelling change or a start, and half the words it has are changes", () => {
    const l5 = tasksAt(5);
    expect(l5.every((t) => t.skill === "read.spelling-change" || t.skill === "read.prefixes")).toBe(true);
    expect(l5.filter((t) => t.skill === "read.spelling-change").length / l5.length).toBeGreaterThanOrEqual(0.5);
    expect(tasksAt(4).some((t) => t.skill === "read.spelling-change" || t.skill === "read.prefixes")).toBe(false);
  });
});

describe("letter-sound puzzles for Levels 1-3 (Challenge)", () => {
  const tasksL = inheritedWords.records.map((r) => letterTaskById(r.id)!);
  it("every shipped word makes a fair task: the right tiles are on the tray, and no look-alike is a twin of a right tile", () => {
    for (const t of tasksL) {
      const left = [...t.tray];
      for (const tile of t.tiles) { const i = left.indexOf(tile); expect(i, `${t.word}:${tile}`).toBeGreaterThanOrEqual(0); left.splice(i, 1); }
      expect(t.tray.length).toBeLessThanOrEqual(8);
      for (const extra of left) for (const tile of t.tiles) expect(TILE_TWINS.some((g) => g.includes(extra) && g.includes(tile)) || extra === tile, `${t.word}:${extra}~${tile}`).toBe(false);
    }
  });
  it("Check accepts the tiles in order and nothing else", () => {
    for (const t of tasksL.slice(0, 80)) {
      const used: number[] = [];
      for (const tile of t.tiles) used.push(t.tray.findIndex((p, k) => p === tile && !used.includes(k)));
      expect(buildRules.accepts(used, t), t.word).toBe(true);
      expect(buildRules.accepts([...used].reverse(), t) === (t.tiles.join() === [...t.tiles].reverse().join()), t.word).toBe(true);
    }
  });
});

describe("stored counts are bounded, and every legal transition stays saveable", () => {
  const wrongOrder = (t: BuildTask) => (t.tiles.length > 1 ? [...t.tiles].reverse() : t.tiles);
  it("501 legal misses in a row still validate, keep 'ever missed', and a correct Check afterwards validates too", () => {
    let s = round(5, 4);
    const task = partsTask(s, tasks), wrong = wrongOrder(task);
    expect(task.tiles.join()).not.toBe([...task.tiles].reverse().join());
    for (let i = 1; i <= 520; i++) {
      s = place(s, wrong);
      s = step(s, { type: "check" });
      expect(s.answer.solved).toBe(false);
      expect(s.answer.misses, `miss ${i}`).toBeGreaterThan(0);
      expect(s.answer.checks).toBeLessThanOrEqual(500);
      expect(s.answer.misses).toBeLessThanOrEqual(500);
      expect(engine.validate(s, at(5)), `after ${i} misses`).toBe(true);
      s = step(s, { type: "reset" });
    }
    expect(s.answer.misses).toBe(500);
    s = step(build(s), { type: "check" });
    expect(s.answer.solved).toBe(true);
    expect(s.answer.misses).toBeGreaterThan(0);
    expect(engine.validate(s, at(5))).toBe(true);
    s = step(s, { type: "next" });
    expect(s.clean).toEqual([false]);
    expect(engine.validate(s, at(5))).toBe(true);
  });
  it("a word with no miss is still first-try clean, and one miss is never forgotten", () => {
    let s = step(build(round(4, 2)), { type: "check" });
    expect(step(s, { type: "next" }).clean).toEqual([true]);
    s = round(4, 2);
    s = step(place(s, wrongOrder(partsTask(s, tasks))), { type: "check" });
    expect(s.answer.misses).toBe(1);
    s = step(step(s, { type: "reset" }), { type: "check" });
    s = step(build(s), { type: "check" });
    expect(step(s, { type: "next" }).clean).toEqual([false]);
  });
  it("a saved round at the cap is accepted, and one past it is still refused", () => {
    const s = round(4, 3), task = partsTask(s, tasks);
    const capped = { ...s, answer: { ...s.answer, checks: 500, misses: 500 } };
    expect(engine.validate(capped, at(4))).toBe(true);
    expect(engine.validate({ ...s, answer: { ...s.answer, checks: 501, misses: 501 } }, at(4))).toBe(false);
    expect(task.tiles.length).toBeGreaterThan(0);
  });
});
