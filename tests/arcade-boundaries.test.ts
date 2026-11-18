import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boundaryIssues, boundaryMarkdown, boundaryTables, easings, songUnits, type EasingNote, type GameTable } from "../src/arcade/boundaries";
import { restBeats } from "../src/arcade/restBeats";
import { songLevel } from "../src/arcade/games/shell-song/engine";
import { arcadeIds } from "../src/arcade/types";

const file = "docs/ARCADE_BOUNDARIES.md";
/** Copy a table and change one value, so the validator is shown failing on real shapes. */
const edit = (game: string, level: string, metric: string, value: number) => boundaryTables().map(t => t.game !== game ? t : { ...t, rows: t.rows.map(r => r.level !== level ? r : { ...r, values: { ...r.values, [metric]: value } }) }) as GameTable[];

describe("AR-00 Arcade boundary table", () => {
  it("covers all 504 descriptors with real engine values", () => {
    expect(boundaryTables().map(t => t.game)).toEqual([...arcadeIds]);
    expect(boundaryTables().reduce((n, t) => n + t.rows.length, 0)).toBe(504);
    for (const t of boundaryTables()) for (const r of t.rows) for (const m of t.metrics) expect(r.values[m.id] === null || Number.isFinite(r.values[m.id]), `${t.game} ${r.level} ${m.id}`).toBe(true);
  });
  it("names every easing, with no stale notes and no Helper value harder than Helper off", () => {
    expect(boundaryIssues(restBeats)).toEqual([]);
    // One note per eased parameter; a note covers its parameter's start and peak columns.
    expect(new Set(easings().map(e => `${e.game} ${e.level} ${e.param}`)).size).toBe(restBeats.length);
  });
  it("keeps the committed generated table current", () => {
    const text = boundaryMarkdown(restBeats);
    if (process.env.LITTLE_ISLAND_WRITE_ARCADE_TABLE === "1") writeFileSync(file, text);
    expect(readFileSync(file, "utf8")).toBe(text);
    expect(text).not.toContain("UNEXPLAINED");
  });
  it("fails an unexplained drop, a stale note, a reasonless note and a harder Helper", () => {
    // Rail W2-3 step time made slower than W2-2: no note names it.
    const slower = edit("rail-parade", "w2-3", "tick", 0.2);
    expect(boundaryIssues(restBeats, slower)).toContain("Unexplained easing: rail-parade w2-2 → w2-3 tick 0.186 → 0.2");
    // Flight W2-1 target continuity applied: the AR-07 note no longer matches anything.
    const fixed = edit("fruit-bat-flight", "w2-1", "gates", 20);
    expect(boundaryIssues(restBeats, fixed)).toContain("Stale note, no easing here any more: fruit-bat-flight w2-1 gates");
    const blank: EasingNote[] = restBeats.map(n => n.game === "lagoon-run" && n.level === "w2-1" ? { ...n, reason: " ", owner: "AR-08" } as EasingNote : n);
    expect(boundaryIssues(blank)).toContain("Note without a stated reason: lagoon-run w2-1 markers");
    const unowned: EasingNote[] = restBeats.map(n => n.game === "lagoon-run" && n.level === "w2-1" ? { ...n, owner: "later" } as EasingNote : n);
    expect(boundaryIssues(unowned)).toContain("Note owner must be a ledger row: lagoon-run w2-1 markers");
    const beat = (metric: string): EasingNote => ({ game: "palm-patrol", level: "w2-1", metric, upTo: 5, restBeat: { teaches: "diving beetles", reason: "Beetles dive out of formation." } });
    expect(boundaryIssues([...restBeats, beat("speed")])).toContain("Duplicate note: palm-patrol w2-1 speed");
    expect(boundaryIssues([...restBeats, beat("dive")])).toContain("More than one rest beat at palm-patrol w2-1");
    // A second rest beat at one step must say which beat it sits beside, and that beat must be there.
    const beside = (metric: string, by: string): EasingNote => ({ game: "palm-patrol", level: "w2-1", metric, upTo: 5, restBeat: { teaches: "diving beetles", reason: "Beetles dive out of formation.", with: by } });
    expect(boundaryIssues([...restBeats, beside("dive", "armor")])).toContain("Rest beat palm-patrol w2-1 dive sits with armor, which has no rest beat there");
    expect(boundaryIssues([...restBeats, beside("dive", "speed")])).not.toContain("More than one rest beat at palm-patrol w2-1");
    const harder = boundaryTables().map(t => t.game !== "canoe-cargo" ? t : { ...t, helper: [{ level: "w1-1", metric: "fall", off: 0.8, on: 0.7, harder: "down" }] }) as GameTable[];
    expect(boundaryIssues(restBeats, harder)).toContain("Helper makes canoe-cargo w1-1 fall harder: 0.8 → 0.7");
  });
  it("binds each note to the largest easing that was reviewed", () => {
    // Review probe: Palm W2-1's march speed set to zero must not hide behind the 1.7 px/s rest beat.
    // (A3a's smaller World 1 waves make the W1-8 peak sharper, so the reviewed bound is 4.9%.)
    expect(boundaryIssues(restBeats, edit("palm-patrol", "w2-1", "speed", 0))).toContain("Easing larger than reviewed: palm-patrol w1-8 → w2-1 speed 47.7 → 0 eases 100%, reviewed up to 4.9%");
    // The bound covers the peak column too: a bigger reset at the hardest point needs a fresh review.
    expect(boundaryIssues(restBeats, edit("palm-patrol", "w2-1", "speedPeak", 90))).toContain("Easing larger than reviewed: palm-patrol w1-8 → w2-1 speedPeak 99.7611 → 90 eases 9.8%, reviewed up to 4.9%");
    // The reviewed drop itself passes, and so does a smaller one.
    expect(boundaryIssues(restBeats, edit("palm-patrol", "w2-1", "speed", 47))).toEqual([]);
    const unbounded = restBeats.map(n => n.game === "palm-patrol" && n.level === "w2-1" ? { ...n, upTo: undefined } as unknown as EasingNote : n);
    expect(boundaryIssues(unbounded)).toContain("Note without a reviewed bound: palm-patrol w2-1 speed");
    for (const n of restBeats) expect(n.upTo, `${n.game} ${n.level} ${n.metric}`).toBeLessThanOrEqual(40.0);
  });
  it("counts Shell Song memory in independent units, so paired echoes are not double-counted", () => {
    expect(songUnits(songLevel("w5-1"))).toEqual({ longestShown: 16, longestUnits: 8, firstNoteMs: 352, fastestNoteMs: 322 });
    expect(songUnits(songLevel("w6-1"))).toEqual({ longestShown: 10, longestUnits: 10, firstNoteMs: 310, fastestNoteMs: 280 });
    expect(songUnits(songLevel("w1-1")).longestUnits).toBe(4);
  });
});
