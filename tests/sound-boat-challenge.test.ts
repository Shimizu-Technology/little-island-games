import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { challengeFor } from "../src/challenge/catalog";
import { defineSoundBoat, registration as production } from "../src/learn/games/sound-boat/challenge";
import { challengeEngine, type Action } from "../src/learn/games/sound-boat/challenge-engine";
import { BANK_BASE, DARES_PER_LEVEL, DARE_BASE, soundBoatPuzzles, soundBoatProduction } from "../src/learn/games/sound-boat/challenge-content";
import { buildRules, taskOfLetters, taskOfParts, type BuildTask } from "../src/learn/reading/build";
import { inheritedWords } from "../src/learn/reading/inherited";
import { readingEvidence } from "../src/learn/reading/evidence";
import type { PartsDraft, PartsWord, WordBank } from "../src/learn/reading/records";
import { emptyChallenge, validChallengeSession, type ChallengeSession } from "../src/state/challenge";

const fixture = JSON.parse(readFileSync("tests/fixtures/reading/sound-boat-parts.fixture.json", "utf8")) as WordBank<PartsDraft>;
const letters = inheritedWords.records.filter((r) => ["cat", "fish", "boat", "cake", "ship", "star", "moon", "hen"].includes(r.word)).map(taskOfLetters);
const all = [...letters, ...fixture.records.map(taskOfParts)];
const puzzles = soundBoatPuzzles(all);
const registration = defineSoundBoat(puzzles);
const move = (s: ChallengeSession, a: Action) => { const n = registration.move(s, a); expect(n, JSON.stringify(a)).not.toBeNull(); return n!; };
const start = (i: number, ownRead = false, id = "p") => {
  const p = puzzles[i];
  return { p, s: registration.start(p.ref, "a", id, emptyChallenge(), { supportOff: false, ownRead }, p.dares.map((d) => d.slot)) };
};
/** Place the right tiles by their tray positions. */
function fill(s: ChallengeSession, task: BuildTask, tiles: readonly string[] = task.tiles) {
  const used: number[] = [];
  for (const t of tiles) { const i = task.tray.findIndex((p, k) => p === t && !used.includes(k)); used.push(i); s = move(s, ["a", i]); }
  return s;
}
const wrongOrder = (task: BuildTask) => [...task.tiles].reverse();
const at = (level: number, n = 0) => puzzles.findIndex((p) => p.source.kind === "school" && p.source.level === level) + n;

describe("the registration's content", () => {
  it("production has no Challenge until a reviewed bank is admitted", () => {
    expect(soundBoatProduction()).toEqual([]);
    expect(production.puzzles).toEqual([]);
    expect(production.catalog.banks.size).toBe(0);
    expect(production.catalog.dares.size).toBe(0);
    expect(challengeFor("sound-boat")).toBeUndefined();
  });
  it("fills banks 440-444 and dare slots 3600-3699 only, once each", () => {
    const slots = puzzles.flatMap((p) => p.dares.map((d) => d.slot));
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots.every((s) => s >= DARE_BASE && s < DARE_BASE + 100)).toBe(true);
    for (const p of puzzles) { expect(p.ref.bank).toBeGreaterThanOrEqual(BANK_BASE); expect(p.ref.bank).toBeLessThan(BANK_BASE + 5); expect(p.ref.engine).toBe("sound-boat"); }
    expect(puzzles.every((p) => p.dares.length <= 1)).toBe(true);
  });
  it("gives a dare to Levels 2-5 only, for at most 25 puzzles each: own read at 2-3, one first-try Check at 4-5", () => {
    const rule = (level: number) => puzzles.filter((p) => p.source.kind === "school" && p.source.level === level).flatMap((p) => p.dares.map((d) => d.rule.kind));
    expect(rule(1)).toEqual([]);
    expect(new Set(rule(2))).toEqual(new Set(["own-read"]));
    expect(new Set(rule(3))).toEqual(new Set(["own-read"]));
    expect(new Set(rule(4))).toEqual(new Set(["whole"]));
    expect(new Set(rule(5))).toEqual(new Set(["whole"]));
    expect(DARES_PER_LEVEL * 4).toBe(100);
    const many = soundBoatPuzzles(Array.from({ length: 60 }, (_, i) => ({ ...taskOfParts(fixture.records[0]), id: `x${i}`, word: `sunset${i}` })));
    expect(many.filter((p) => p.dares.length).length).toBe(DARES_PER_LEVEL);
    expect(new Set(many.map((p) => p.ref.hash)).size).toBe(60);
  });
  it("every puzzle is a fair task whose right tiles are on the tray", () => {
    for (const p of puzzles) {
      const d = p.descriptor, left = [...d.tray];
      for (const t of d.tiles) { const i = left.indexOf(t); expect(i, d.word).toBeGreaterThanOrEqual(0); left.splice(i, 1); }
    }
  });
});

describe("replay", () => {
  it("Level 4 first-try Check earns the dare, and the saved session is valid", () => {
    const { p, s: s0 } = start(at(4));
    let s = fill(s0, p.descriptor);
    s = move(s, ["k"]);
    expect(s.result).toMatchObject({ event: "independent", dares: [p.dares[0].slot] });
    expect(validChallengeSession(s, "a", registration.catalog)).toBe(true);
    expect(validChallengeSession({ ...s, result: { ...s.result!, cost: 99 } }, "a", registration.catalog)).toBe(false);
  });
  it("a miss, Help or a second Check forfeits the whole-word dare but still finishes", () => {
    for (const how of ["miss", "help"] as const) {
      const { p, s: s0 } = start(at(5), false, how);
      let s = s0;
      if (how === "help") s = move(s, ["h"]);
      else { s = fill(s, p.descriptor, wrongOrder(p.descriptor)); s = move(s, ["k"]); expect(s.result).toBeFalsy(); s = move(s, ["x", 0]); s = move(s, ["x", 0]); }
      s = fill(s, p.descriptor);
      s = move(s, ["k"]);
      expect(s.result?.dares).toEqual([]);
      expect(s.result?.event).not.toBe("independent");
    }
  });
  it("Level 2-3 own read: reading the printed word and building it, without hearing it, earns the mark", () => {
    for (const level of [2, 3]) {
      const { p, s: s0 } = start(at(level), true, `own-${level}`);
      const done = move(fill(s0, p.descriptor), ["k"]);
      expect(done.result).toMatchObject({ event: "independent", dares: [p.dares[0].slot] });
    }
  });
  it("the Levels 2-3 dare promises only what the board gives: reading it yourself, never a first hearing", () => {
    for (const level of [2, 3]) {
      const label = puzzles[at(level)].dares[0].label;
      expect(label).toBe("Read it yourself, then build it");
      expect(label).not.toMatch(/hear/i);
    }
    expect(registration.dareHelp).toMatch(/not the own-read mark/);
  });
  it("spelling after hearing is never own-read evidence, with or without a clean finish", () => {
    for (const ownRead of [true, false]) {
      const { p, s: s0 } = start(at(3), ownRead, `dictation-${ownRead}`);
      const done = move(fill(move(s0, ["r"]), p.descriptor), ["k"]);
      expect(done.result?.dares, `ownRead ${ownRead}`).toEqual([]);
    }
    expect(readingEvidence(["read-aloud"]).independentDecoding).toBe(false);
    expect(readingEvidence(["prompt", "read-aloud"]).independentDecoding).toBe(false);
  });
  it("the replay state keeps the launch choice, so the board can print the word for an own-read dare only", () => {
    const task = puzzles[at(2)].descriptor;
    expect(challengeEngine.create(task, { version: 1 }, { supportOff: false, ownRead: true }).ownRead).toBe(true);
    expect(challengeEngine.create(task, { version: 1 }, { supportOff: false, ownRead: false }).ownRead).toBe(false);
  });
  it("hearing is recorded once and never counts as Help", () => {
    const { p, s: s0 } = start(at(2), true, "heard");
    let s = move(s0, ["r"]);
    expect(registration.move(s, ["r"])).toBeNull();
    s = move(fill(s, p.descriptor), ["k"]);
    expect(s.result?.dares).toEqual([]);
    expect(s.result?.event).toBe("independent");
  });
  it("an own-read mark needs the child to have chosen own read at the start", () => {
    const { p, s: s0 } = start(at(2), false, "not-own");
    const s = move(fill(s0, p.descriptor), ["k"]);
    expect(s.result?.dares).toEqual([]);
  });
  it("rejects what a real board cannot send, and anything after the word is built", () => {
    const { p, s: s0 } = start(at(4), false, "tamper");
    for (const bad of [["a", 99], ["a", -1], ["a", 1.5], ["x", 0], ["k"], ["q"], [], ["a"], ["a", 0, 1], "k", null]) expect(registration.move(s0, bad as never), JSON.stringify(bad)).toBeNull();
    const done = move(fill(s0, p.descriptor), ["k"]);
    for (const a of [["a", 0], ["h"], ["z"], ["k"], ["r"]] as Action[]) expect(registration.move(done, a)).toBeNull();
  });
  it("Check on an incomplete word does nothing, and Start over keeps counted evidence", () => {
    const { p, s: s0 } = start(at(4), false, "partial");
    const task = p.descriptor;
    let s = move(s0, ["a", task.tray.indexOf(task.tiles[0])]);
    expect(registration.move(s, ["k"])).toBeNull();
    s = fill(move(s, ["z"]), task, wrongOrder(task));
    s = move(s, ["k"]);
    s = move(move(s, ["h"]), ["z"]);
    s = move(fill(s, task), ["k"]);
    expect(s.result?.dares).toEqual([]);
    expect(s.result?.event).not.toBe("independent");
  });
  it("a long session of edits still fits the replay envelope, and the wall leaves Help available", () => {
    const { p, s: s0 } = start(at(4), false, "capacity");
    let s = s0;
    for (let i = 0; i < 120; i++) s = move(move(s, ["a", 0]), ["x", 0]);
    s = move(fill(s, p.descriptor), ["k"]);
    expect(new TextEncoder().encode(JSON.stringify(s)).length).toBeLessThanOrEqual(4096);
    expect(s.result?.event).toBe("independent");
    // Run edits to the wall: ordinary taps stop, Help does not.
    let w = start(at(4), false, "wall").s, next: Action = ["a", 0];
    for (let i = 0; i < 1100; i++) { next = i % 2 ? ["x", 0] : ["a", 0]; const n = registration.move(w, next); if (!n) break; w = n; }
    expect(registration.move(w, next)).toBeNull();
    expect(registration.move(w, ["h"])).not.toBeNull();
  });
  it("the engine checks the same way as the School board", () => {
    for (const p of puzzles) {
      const d = p.descriptor;
      let s = challengeEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false });
      const used: number[] = [];
      for (const t of d.tiles) { const i = d.tray.findIndex((x, k) => x === t && !used.includes(k)); used.push(i); s = challengeEngine.step(s, ["a", i], d)!.state; }
      expect(buildRules.accepts(s.answer.draft, d)).toBe(true);
      expect(challengeEngine.step(s, ["k"], d)).toMatchObject({ event: "check", correct: true });
    }
  });
});
