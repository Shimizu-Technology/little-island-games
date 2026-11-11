import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { arcadeGames } from "../src/arcade/registry";
import { arcadeLearner, arcadeTransition, emptyArcade, endlessOpen, gameProgress, levelOpen, migrateArcade, outfitStars, validArcade, type ArcadeAction, type ArcadeSave } from "../src/arcade/progress";
import { allLevelIds, arcadeIds, type LevelId } from "../src/arcade/types";
import { encodeSave, migrateProfiles } from "../src/state/profiles";
import { parseSave } from "../src/state/validation";

/** Produced by tests/fixtures/arcade/PRODUCER.ts.txt with the shipped 3.0.0 (28) source. Never regenerated. */
const fixtureText = readFileSync("tests/fixtures/arcade/arcade-d1-shipped.json", "utf8");
const shipped = JSON.parse(fixtureText) as ArcadeSave;
const finish = (game: string, level: LevelId | "endless", round: string, stars: 0 | 1 | 2 | 3 = 2, score = 50): ArcadeAction => ({ type: "finish", game, level, stars, score, round, name: "Kid" } as ArcadeAction);
/** Everything a child earned: stars, outfits worn and earned, stickers, chests, bests and the family board. */
const earned = (a: ArcadeSave) => ({ scores: a.scores, people: Object.fromEntries(Object.entries(a.people).map(([id, p]) => [id, { stickers: p.stickers, chest: p.chest, games: Object.fromEntries(Object.entries(p.games).map(([g, v]) => [g, { stars: v.stars, outfit: v.outfit, unlockedOutfits: v.unlockedOutfits, best: v.best }])) }])) });

describe("AR-13 every Arcade world, level and Endless is open (Leon's D1)", () => {
  it("keeps the frozen shipped fixture byte-identical", () => {
    expect(createHash("sha256").update(fixtureText).digest("hex")).toBe("7b8407f170b67eafd18d053de4e59d74edaa937b5b63bc731bf5bb6e5bb76441");
    expect(fixtureText.length).toBe(2548);
  });
  it("upgrades an old save through envelope 3 with every star, outfit, sticker, chest and best intact", () => {
    const envelope = JSON.parse(readFileSync("tests/fixtures/save-v3/fix-advanced-envelope-2.json", "utf8"));
    const before = parseSave(JSON.stringify({ ...envelope, arcade: shipped }));
    const upgraded = migrateProfiles(before), reread = parseSave(encodeSave(upgraded));
    expect(validArcade(shipped)).toBe(true);
    expect(migrateArcade(shipped)).toBe(shipped);
    expect(upgraded.arcade).toEqual(shipped);
    expect(reread.arcade).toEqual(shipped);
    expect(earned(reread.arcade!)).toEqual(earned(shipped));
    // The input object itself is never changed by migration.
    expect(JSON.stringify(shipped)).toBe(fixtureText);
  });
  it("saves a finish on a level the shipped locks refused, without touching earned rewards", () => {
    // Learner b has 16 Shell Song stars; the shipped build kept Worlds 3–6 closed.
    const p = gameProgress(arcadeLearner(shipped, "b"), "shell-song");
    expect(p.openWorlds).toEqual(["w1", "w2", "learn"]);
    expect(levelOpen(p, "w6-8")).toBe(true);
    const after = arcadeTransition(shipped, "b", finish("shell-song", "w6-8", "d1-b-w6"));
    const q = gameProgress(arcadeLearner(after, "b"), "shell-song");
    expect(q.stars["w6-8"]).toBe(2);
    expect(q.stars).toEqual({ ...p.stars, "w6-8": 2 });
    expect(q.outfit).toBe("sunhat"); expect(q.unlockedOutfits).toEqual(p.unlockedOutfits);
    expect(arcadeLearner(after, "b").stickers).toEqual(arcadeLearner(shipped, "b").stickers);
    for (const id of ["a", "family"]) expect(after.people[id]).toBe(shipped.people[id]);
  });
  it("records Endless from zero World 1 stars, which the shipped build refused", () => {
    expect(shipped.scores.some(s => s.game === "fruit-bat-flight")).toBe(false);
    const after = arcadeTransition(shipped, "b", { ...finish("fruit-bat-flight", "endless", "d1-b-endless", 0, 4321), name: "Bea" } as ArcadeAction);
    expect(after.scores).toContainEqual({ game: "fruit-bat-flight", name: "Bea", score: 4321 });
    expect(endlessOpen(gameProgress(arcadeLearner(emptyArcade()), "lagoon-run"))).toBe(true);
  });
  it("retires the grown-up unlock: it cannot be set, an old value is preserved and changes nothing", () => {
    expect(shipped.unlockAll).toBe(true);
    const forged = { type: "preferences", unlockAll: false, music: true } as unknown as ArcadeAction;
    expect(arcadeTransition(shipped, "family", forged).unlockAll).toBe(true);
    expect(arcadeTransition(emptyArcade(), "family", { type: "preferences", unlockAll: true } as unknown as ArcadeAction).unlockAll).toBe(false);
    // The same finish produces the same progress whether the retired flag is on or off.
    const on = arcadeTransition(shipped, "a", finish("reef-builder", "w5-3", "d1-on")), off = arcadeTransition({ ...shipped, unlockAll: false }, "a", finish("reef-builder", "w5-3", "d1-on"));
    expect(on.people).toEqual(off.people);
  });
  it("keeps outfits as the same star showpieces", () => {
    expect(outfitStars).toEqual({ island: 0, sunhat: 12, explorer: 30, starlight: 60 });
    const a = arcadeTransition(emptyArcade(), "family", { type: "outfit", game: "canoe-cargo", outfit: "starlight" });
    expect(gameProgress(arcadeLearner(a), "canoe-cargo").outfit).toBe("island");
  });
});

describe("QA-20 house rules: Arcade follows D1", () => {
  it("accepts a first finish on every one of the 504 levels and every Endless with no stars", () => {
    for (const game of arcadeIds) {
      for (const level of allLevelIds) {
        const after = arcadeTransition(emptyArcade(), "family", finish(game, level, `qa20-${game}-${level}`, 1));
        expect(gameProgress(arcadeLearner(after), game).stars[level], `${game} ${level}`).toBe(1);
      }
      expect(arcadeTransition(emptyArcade(), "family", finish(game, "endless", `qa20-${game}-endless`, 0, 9)).scores).toHaveLength(1);
    }
  });
  it("still refuses invalid levels, duplicate rounds and malformed finishes", () => {
    const a = arcadeTransition(emptyArcade(), "family", finish("reef-builder", "w2-4", "qa20-once"));
    expect(arcadeTransition(a, "family", finish("reef-builder", "w2-5", "qa20-once"))).toBe(a);
    expect(arcadeTransition(a, "family", finish("reef-builder", "w7-1" as LevelId, "qa20-bad"))).toBe(a);
    expect(arcadeTransition(a, "family", finish("reef-builder", "w1-9" as LevelId, "qa20-bad"))).toBe(a);
    expect(arcadeTransition(a, "family", { ...finish("reef-builder", "w1-1", "qa20-bad"), stars: 4 } as unknown as ArcadeAction)).toBe(a);
  });
  it("has no lock copy, lock art or retired unlock reads left in Arcade play code", () => {
    const files = readdirSync("src/arcade", { recursive: true, encoding: "utf8" }).filter(f => /\.tsx?$/.test(f));
    for (const f of files) {
      const text = readFileSync(`src/arcade/${f}`, "utf8");
      expect(text, f).not.toMatch(/stars to explore|LockStone|, locked|Clear the eight first-world levels/);
      // progress.ts keeps the saved fields valid; types.ts keeps the historical world star numbers as data.
      if (f !== "progress.ts") expect(text, f).not.toMatch(f === "types.ts" ? /unlockAll|openWorlds|openedWorlds/ : /unlockAll|openWorlds|openedWorlds|worldStars/);
    }
    // World cards still carry their historical star numbers only as data; nothing shows them as a gate.
    expect(arcadeGames.every(g => g.worlds.length === 7)).toBe(true);
  });
});
