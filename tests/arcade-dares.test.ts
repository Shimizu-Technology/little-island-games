import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/challenge/catalog";
import { arcadeDare, arcadeDareBank, arcadeDareCatalog, arcadeDares, dareMet, dareRef, daresFor } from "../src/arcade/dares";
import { applyArcadeAction, dareMarked } from "../src/arcade/saveAction";
import { arcadeLearner, arcadeTransition, emptyArcade, gameProgress, validReefSession, type ArcadeAction } from "../src/arcade/progress";
import { validTerminalResult } from "../src/arcade/terminal";
import { arcadeIds, validLevelId, type ArcadeId, type LevelId } from "../src/arcade/types";
import { createReef, reefLevel } from "../src/arcade/games/reef-builder/engine";
import * as song from "../src/arcade/games/shell-song/engine";
import * as rail from "../src/arcade/games/rail-parade/engine";
import { catalogManifest } from "../src/state/catalogManifest";
import { saveCatalog } from "../src/state/challenge";
import { progressFor } from "../src/state/challengeDrafts";
import { encodeSave, migrateProfiles } from "../src/state/profiles";
import { emptySave, parseSave, type Save } from "../src/state/validation";
import { addLearner, familyLearners } from "../src/learn/learners";
import { pilot } from "./helpers/arcade-pilots";

const save = (): Save => migrateProfiles({ ...emptySave(), learning: addLearner(familyLearners(), "Kai", "kai") });
const expected = (s: Save) => ({ epoch: 3, learner: s.learning!.active });
const finish = (game: ArcadeId, level: LevelId, round: string, extra: Partial<Extract<ArcadeAction, { type: "finish" }>> = {}): ArcadeAction => ({ type: "finish", game, level, stars: 2, score: 10, round, name: "Kai", ...extra });
const bankState = (s: Save, owner: string, bank: number) => progressFor(s, owner)?.banks.find(b => b[0] === bank);

describe("AR-10 Arcade dares: registry", () => {
  it("puts dares on all nine games, with unique append-only slots", () => {
    expect(new Set(arcadeDares.map(d => d.game))).toEqual(new Set(arcadeIds));
    expect(new Set(arcadeDares.map(d => d.slot)).size).toBe(arcadeDares.length);
    for (const d of arcadeDares) {
      expect(d.slot).toBeGreaterThanOrEqual(4000); expect(d.slot).toBeLessThan(4072);
      expect(validLevelId(d.level) && !d.level.startsWith("learn-")).toBe(true);
      expect(d.title.length).toBeLessThanOrEqual(24); expect(d.detail.length).toBeLessThanOrEqual(80);
    }
    expect(Object.values(arcadeDareBank)).toEqual([500, 501, 502, 503, 504, 505, 506, 507, 508]);
  });
  it("registers every dare in the frozen save manifest as an allowed-help pick-up mark", () => {
    const frozen = JSON.parse(readFileSync("src/state/save-catalog.json", "utf8"));
    const own = catalogManifest(arcadeDareCatalog());
    for (const bank of own.banks) expect(frozen.banks).toContainEqual(JSON.parse(JSON.stringify(bank)));
    for (const dare of own.dares) expect(frozen.dares).toContainEqual(JSON.parse(JSON.stringify(dare)));
    for (const d of arcadeDares) {
      expect(saveCatalog.dares.get(d.slot)).toEqual({ kind: "pick-up", help: "allowed", bank: arcadeDareBank[d.game], puzzle: dareRef(d).puzzle });
      expect(saveCatalog.banks.get(dareRef(d).bank)).toBeDefined();
    }
    // No session codec: a real-time round can never be paused into a Challenge save.
    expect([...saveCatalog.codecs.values()].some(c => (arcadeIds as readonly string[]).includes(c.game))).toBe(false);
  });
  it("never asks for three stars, a hit-free level, Helper off or a chosen rival", () => {
    for (const d of arcadeDares) {
      // The rule reads one engine count on a cleared finish. Stars, Helper and Beach rival strength are not inputs.
      expect(dareMet(d, true, { [d.fact]: d.at === "least" ? d.value : 0 })).toBe(true);
      expect(dareMet(d, false, { [d.fact]: d.at === "least" ? d.value : 0 })).toBe(false);
      expect(saveCatalog.dares.get(d.slot)!.help).toBe("allowed");
    }
    expect(arcadeDares.map(d => d.fact).filter(f => ["hits", "bumps", "stars"].includes(f))).toEqual([]);
  });
});

describe("AR-10 Arcade dares: witnesses", () => {
  it.each(arcadeDares.map(d => [d.game, d.level, d.title, d.slot] as const))("%s %s %s has a legal-play witness, Helper off and on", (game, level, _title, slot) => {
    const d = arcadeDare(slot)!;
    // The fixture seed first, then up to 16 more: a witness proves the dare can be met with legal input.
    for (const helper of [false, true]) {
      const tried: string[] = [];
      const found = [undefined, ...Array.from({ length: 16 }, (_, i) => i + 1)].findIndex(seed => {
        const r = pilot(game, level, seed, helper); tried.push(JSON.stringify(r?.facts));
        return !!r && r.cleared && validTerminalResult(r) && dareMet(d, true, r.facts);
      });
      expect(found, `${game} ${level} helper=${helper} ${tried.join(" ")}`).toBeGreaterThanOrEqual(0);
    }
  }, 120000);
  it("earns Your own ears with a slip and only two stars", () => {
    const l = song.songLevel("w1-6");
    let s = song.createSong(l, 42, false), slipped = false;
    for (let n = 0; n < 20000 && !song.songResult(s); n++) {
      if (s.phase === "watch") s = song.songStep(s, { type: "tick" }, 1 / 30);
      else if (s.phase === "repeat") { s = song.songTransition(s, { type: "shell", index: slipped ? s.pattern[s.cursor] : (s.pattern[s.cursor] + 1) % s.shells }); slipped = true; }
    }
    const r = song.songResult(s)!;
    expect(r.stars).toBe(2); expect(r.facts).toEqual({ replays: 0 });
    expect(dareMet(daresFor("shell-song", "w1-6")[0], r.cleared, r.facts)).toBe(true);
    // Pressing Replay is always allowed; it only ends that attempt's dare.
    const replayed = song.songTransition(song.createSong(l, 42, false), { type: "replay" });
    expect(replayed.replays).toBe(1);
  });
});

describe("AR-10 Arcade dares: accepted terminal result and atomic credit", () => {
  const reefDare = arcadeDares.find(d => d.game === "reef-builder")!;
  it("saves the stars and the mark in one write, and it survives encode and parse", () => {
    const before = save(), owner = before.learning!.active;
    const next = applyArcadeAction(before, finish("reef-builder", reefDare.level, "dare-1", { dare: reefDare.slot, facts: { fish: 5 }, helped: false }), expected(before), 3);
    expect(gameProgress(arcadeLearner(next.arcade, owner), "reef-builder").stars[reefDare.level]).toBe(2);
    expect(dareMarked(next, owner, reefDare.slot)).toBe(true);
    expect(bankState(next, owner, arcadeDareBank["reef-builder"])).toBeDefined();
    const reread = parseSave(encodeSave(next));
    expect(dareMarked(reread, owner, reefDare.slot)).toBe(true);
    expect(dareMarked(reread, owner, arcadeDares[1].slot)).toBe(false);
  });
  it("still saves the stars when the dare is missed, with no mark", () => {
    const before = save(), owner = before.learning!.active;
    const next = applyArcadeAction(before, finish("reef-builder", reefDare.level, "dare-2", { dare: reefDare.slot, facts: { fish: 3 } }), expected(before), 3);
    expect(gameProgress(arcadeLearner(next.arcade, owner), "reef-builder").stars[reefDare.level]).toBe(2);
    expect(dareMarked(next, owner, reefDare.slot)).toBe(false);
  });
  it("accepts Helper: the mark is earned and the attempt is recorded as helped", () => {
    const before = save(), owner = before.learning!.active, crab = arcadeDares.find(d => d.game === "crab-crossing")!;
    const next = applyArcadeAction(before, finish("crab-crossing", crab.level, "dare-3", { dare: crab.slot, facts: { clean: 1 }, helped: true }), expected(before), 3);
    expect(dareMarked(next, owner, crab.slot)).toBe(true);
  });
  it("writes nothing to Challenge for a game over, and keeps an earlier mark forever", () => {
    const before = save(), owner = before.learning!.active;
    const lost = applyArcadeAction(before, finish("reef-builder", reefDare.level, "dare-4", { dare: reefDare.slot, facts: { fish: 9 }, stars: 0 }), expected(before), 3);
    expect(dareMarked(lost, owner, reefDare.slot)).toBe(false);
    expect(progressFor(lost, owner)).toEqual(progressFor(before, owner));
    const won = applyArcadeAction(before, finish("reef-builder", reefDare.level, "dare-5", { dare: reefDare.slot, facts: { fish: 9 } }), expected(before), 3);
    const missed = applyArcadeAction(won, finish("reef-builder", reefDare.level, "dare-6", { dare: reefDare.slot, facts: { fish: 0 } }), expected(won), 3);
    expect(dareMarked(missed, owner, reefDare.slot)).toBe(true);
  });
  it("refuses a dare from another level or game, malformed facts, duplicates and stale callbacks", () => {
    const before = save(), owner = before.learning!.active, other = arcadeDares.find(d => d.game === "canoe-cargo")!;
    expect(applyArcadeAction(before, finish("reef-builder", "w1-1", "bad-1", { dare: reefDare.slot, facts: { fish: 9 } }), expected(before), 3)).toBe(before);
    expect(applyArcadeAction(before, finish("reef-builder", reefDare.level, "bad-2", { dare: other.slot, facts: { rows: 4 } }), expected(before), 3)).toBe(before);
    expect(applyArcadeAction(before, finish("reef-builder", reefDare.level, "bad-3", { dare: 4071, facts: { fish: 9 } }), expected(before), 3)).toBe(before);
    expect(applyArcadeAction(before, finish("reef-builder", reefDare.level, "bad-4", { dare: reefDare.slot, facts: { fish: -1 } }), expected(before), 3)).toBe(before);
    expect(applyArcadeAction(before, finish("reef-builder", reefDare.level, "bad-5", { dare: reefDare.slot, facts: { frames: 1 } as never }), expected(before), 3)).toBe(before);
    expect(applyArcadeAction(before, finish("reef-builder", reefDare.level, "stale", { dare: reefDare.slot, facts: { fish: 9 } }), { epoch: 2, learner: owner }, 3)).toBe(before);
    const once = applyArcadeAction(before, finish("reef-builder", reefDare.level, "twice", { dare: reefDare.slot, facts: { fish: 9 } }), expected(before), 3);
    expect(applyArcadeAction(once, finish("reef-builder", reefDare.level, "twice", { dare: reefDare.slot, facts: { fish: 9 } }), expected(once), 3)).toBe(once);
  });
  it("saves no facts or frame log: Arcade progress is unchanged in shape and Challenge holds no paused arcade round", () => {
    const before = save(), owner = before.learning!.active;
    const next = applyArcadeAction(before, finish("reef-builder", reefDare.level, "shape", { dare: reefDare.slot, facts: { fish: 9 } }), expected(before), 3);
    expect(JSON.stringify(next.arcade)).not.toMatch(/facts|fish"|dare/);
    expect(progressFor(next, owner)!.paused).toEqual([]);
    expect(Object.keys(arcadeTransition(emptyArcade(), owner, finish("reef-builder", reefDare.level, "plain", { dare: reefDare.slot, facts: { fish: 9 } })).people[owner])).toEqual(Object.keys(arcadeTransition(emptyArcade(), owner, finish("reef-builder", reefDare.level, "plain")).people[owner]));
  });
});

describe("AR-10 Arcade dares: honest rounds", () => {
  it("keeps a reef dare with its paused round, and no other game's dare", () => {
    const state = createReef(reefLevel(reefDare().level), 42, false), base = { version: 1 as const, game: "reef-builder" as const, round: "reef-dare", state };
    expect(validReefSession(base)).toBe(true);
    expect(validReefSession({ ...base, dare: reefDare().slot })).toBe(true);
    expect(validReefSession({ ...base, dare: arcadeDares[1].slot })).toBe(false);
    expect(validReefSession({ ...base, dare: arcadeDares.find(d => d.game === "rail-parade")!.slot })).toBe(false);
    expect(validReefSession({ ...base, dare: "4000" })).toBe(false);
  });
  it("accepts engine facts on a terminal result, and only a few known counts", () => {
    const r = { cleared: true, outcome: "cleared", stars: 2, score: 1, detail: "" };
    expect(validTerminalResult({ ...r, facts: { rally: 7 } })).toBe(true);
    expect(validTerminalResult({ ...r, facts: { rally: 1.5 } })).toBe(false);
    expect(validTerminalResult({ ...r, facts: { frames: [1, 2] } })).toBe(false);
    expect(validTerminalResult({ ...r, facts: { fish: 1, aim: 1, rally: 1, fruit: 1, rows: 1 } })).toBe(false);
  });
  it("never charges a heart for a wrong learning answer", () => {
    let s = song.createSong(song.songLevel("learn-1"), 42, false);
    while (s.phase === "watch") s = song.songStep(s, { type: "tick" }, 1 / 30);
    const wrong = song.songTransition(s, { type: "shell", index: (s.pattern[0] + 1) % s.shells });
    expect(wrong.lives.hearts).toBe(s.lives.hearts);
    let r = rail.createRail(rail.railLevel("learn-1"), 120, false);
    const towardDecoy = (["up", "down", "left", "right"] as const).find(d => { const n = rail.railMove(r, d); return n.bumps > r.bumps; });
    if (towardDecoy) { const n = rail.railMove(r, towardDecoy); expect(n.lives.hearts).toBe(r.lives.hearts); }
    r = rail.railMove(r, "right");
    expect(r.lives.hearts).toBe(rail.createRail(rail.railLevel("learn-1"), 120, false).lives.hearts);
  });
});
const reefDare = () => arcadeDares.find(d => d.game === "reef-builder")!;
