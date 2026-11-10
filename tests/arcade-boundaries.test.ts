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
    expect(easings().length).toBe(restBeats.length);
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
    const beat = (metric: string): EasingNote => ({ game: "crab-crossing", level: "w4-1", metric, restBeat: { teaches: "opposite currents", reason: "Logs drift both ways." } });
    expect(boundaryIssues([...restBeats, beat("speed")])).toContain("Duplicate note: crab-crossing w4-1 speed");
    const beats = restBeats.map(n => n.game === "crab-crossing" && n.level === "w4-1" ? beat(n.metric) : n);
    expect(boundaryIssues(beats)).toContain("More than one rest beat at crab-crossing w4-1");
    const harder = boundaryTables().map(t => t.game !== "canoe-cargo" ? t : { ...t, helper: [{ level: "w1-1", metric: "fall", off: 0.8, on: 0.7, harder: "down" }] }) as GameTable[];
    expect(boundaryIssues(restBeats, harder)).toContain("Helper makes canoe-cargo w1-1 fall harder: 0.8 → 0.7");
  });
  it("counts Shell Song memory in independent units, so paired echoes are not double-counted", () => {
    expect(songUnits(songLevel("w5-1"))).toEqual({ longestShown: 14, longestUnits: 7 });
    expect(songUnits(songLevel("w6-1"))).toEqual({ longestShown: 11, longestUnits: 11 });
    expect(songUnits(songLevel("w1-1")).longestUnits).toBe(4);
  });
});
