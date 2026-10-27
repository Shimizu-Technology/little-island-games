import { describe, expect, it } from "vitest";
import { COLS, ROWS, cargoEngine, cargoLevel, cargoLevels, cargoResult, cargoStep, cargoTransition, createCargo, fits, landingRow, pieceCells, validCargo, type CargoState } from "../src/arcade/games/canoe-cargo/engine";
import { arcadeTransition, emptyArcade, validArcade } from "../src/arcade/progress";
import { arcadeShelfGames } from "../src/arcade/registry";
function gap(s: CargoState) { for (let r = ROWS - 1; r >= 0; r--) { const line = s.board.slice(r * COLS, (r + 1) * COLS); if (line.some(Boolean)) return line.findIndex(c => !c); } return 0; }
function delivery(s: CargoState, col: number) {
  for (let i = 0; i < 12 && s.col !== col; i++) s = cargoTransition(s, { type: s.col < col ? "right" : "left" });
  return cargoTransition(s, { type: "drop" });
}
describe("Canoe Cargo deterministic rules", () => {
  it("has 32 canonical levels, three visible goals, gentle opening, distinct board and reachable world targets", () => {
    expect([COLS, ROWS]).toEqual([9, 14]);
    for (const world of ["w1", "w2", "w3", "learn"]) expect(cargoLevels.filter(l => l.world === world)).toHaveLength(8);
    for (const level of cargoLevels) { expect(level.goals).toHaveLength(3); expect(new Set(level.goals).size).toBe(3); expect(level.fall).toBeGreaterThan(.4); expect(validCargo(createCargo(level, 45, true))).toBe(true); }
    expect(cargoLevels[0].fall).toBeGreaterThan(cargoLevel("w3-8").fall * 3);
  });
  it("uses mixed seeded bundles after the introductory delivery instead of scripting every normal level", () => {
    const shapes = new Set(Array.from({ length: 40 }, (_, seed) => createCargo(cargoLevel("w2-2"), seed * 987123, false).piece.shape));
    expect(shapes.size).toBe(7);
    expect(cargoLevel("w2-2").par).toBeGreaterThan(cargoLevel("w2-2").opening * 2);
    expect(createCargo(cargoLevel("w2-1"), 9, false).piece.shape).toBe(0);
  });
  it("replays seeds and serializable actions exactly without mutation", () => {
    let a = createCargo("endless", 198, false), b = createCargo("endless", 198, false);
    for (const type of ["left", "rotate", "drop", "right", "drop", "hold", "drop"] as const) { const copy = structuredClone(a); a = cargoTransition(a, { type }); expect(copy).toEqual(b); b = cargoEngine.reduce(b, { type }); expect(a).toEqual(b); expect(validCargo(a)).toBe(true); }
    expect(createCargo("endless", 199, false).next).not.toEqual(createCargo("endless", 198, false).next);
  });
  it("stops at walls and cargo; four rotations return the original shape; kicks stay inside", () => {
    let s = createCargo("endless", 7, false);
    const shape = pieceCells(s.piece);
    for (let n = 0; n < 4; n++) s = cargoTransition(s, { type: "rotate" });
    expect(pieceCells(s.piece)).toEqual(shape);
    for (let n = 0; n < 14; n++) s = cargoTransition(s, { type: "left" });
    expect(s.col).toBe(0); expect(s.bump).toBeGreaterThan(0);
    s = cargoTransition(s, { type: "rotate" }); expect(fits(s, s.piece, s.row, s.col)).toBe(true);
    expect(landingRow(s)).toBeLessThan(ROWS);
    const bottom = { ...s, row: landingRow(s) }; expect(fits(bottom, bottom.piece, bottom.row + 1, bottom.col)).toBe(false);
  });
  it("clears simultaneous full rows once, counts crates, combo and score consistently", () => {
    let s = createCargo("endless", 4, false);
    s = { ...s, piece: { shape: 5, turn: 0, kind: "fish", value: 1 }, col: 4 };
    s.board = s.board.map((_, i) => Math.floor(i / COLS) >= ROWS - 3 && i % COLS !== 4 ? { kind: "crate", value: 1, stuck: true } : null);
    const next = cargoTransition(s, { type: "drop" });
    expect(next.lines).toBe(3); expect(next.canoes).toBe(3); expect(next.freed).toBe(24); expect(next.score).toBe(425); expect(next.loads).toBe(1); expect(next.board.every(c => !c)).toBe(true); expect(validCargo(next)).toBe(true);
  });
  it.each(cargoLevels.filter(l => l.world === "learn"))("finishes $id with honest target sums through normal actions", level => {
    let s = createCargo(level, 222, true);
    for (let i = 0; i < level.opening; i++) {
      const col = gap(s), row = landingRow({ ...s, col });
      const sum = s.board.slice(row * COLS, (row + 1) * COLS).reduce((n, c) => n + (c?.value ?? 0), 0) + s.piece.value * 3;
      expect(sum).toBe(level.targetSum);
      s = delivery(s, col); expect(s.lastBonus).toBe(1); expect(validCargo(s)).toBe(true);
    }
    expect(cargoResult(s)).toMatchObject({ cleared: true, stars: 3 }); expect(s.canoes).toBe(level.target); expect(cargoTransition(s, { type: "drop" })).toBe(s);
  });
  it("full rows still sail when the sum misses, without a bonus", () => {
    const s = createCargo(cargoLevel("learn-1"), 1, true);
    const next = delivery({ ...s, piece: { ...s.piece, value: 2 } }, 3);
    expect(next.lines).toBe(1); expect(next.canoes).toBe(1); expect(next.lastBonus).toBe(0); expect(next.status).toBe("playing");
  });
  it("Helper slows normal fall, freezes number fall and permits one hold without changing stars", () => {
    let slow = createCargo(cargoLevel("w1-1"), 1, true), regular = createCargo(cargoLevel("w1-1"), 1, false);
    for (let n = 0; n < 150; n++) { slow = cargoStep(slow, { type: "idle" }, 1 / 60); regular = cargoStep(regular, { type: "idle" }, 1 / 60); }
    expect(slow.row).toBe(0); expect(regular.row).toBe(1);
    let learning = createCargo(cargoLevel("learn-1"), 1, true); const copy = structuredClone(learning);
    for (let n = 0; n < 1000; n++) learning = cargoStep(learning, { type: "idle" }, 1 / 60);
    expect(learning).toEqual(copy);
    expect(cargoTransition(regular, { type: "hold" })).toBe(regular);
    const reserved = learning.piece;
    learning = cargoTransition(learning, { type: "hold" }); expect(learning.holdUsed).toBe(true); expect(validCargo(learning)).toBe(true); expect(cargoTransition(learning, { type: "hold" })).toBe(learning);
    const queue = structuredClone(learning.next);
    learning = delivery(learning, 3); expect(learning.piece).toEqual(reserved); expect(learning.held).toBeNull(); expect(learning.next).toEqual(queue); expect(validCargo(learning)).toBe(true); expect(cargoTransition(learning, { type: "hold" })).toBe(learning);
    for (const helper of [true, false]) { let s = createCargo(cargoLevel("w1-1"), 1, helper); s = delivery(s, 3); s = delivery(s, 3); expect(cargoResult(s)?.stars).toBe(3); }
  });
  it("fixed dt guards malformed times, no-op input and invalid Helper", () => {
    const s = createCargo("endless", 4, false);
    for (const dt of [NaN, Infinity, -1, 0, 1]) expect(cargoStep(s, { type: "idle" }, dt)).toBe(s);
    expect(cargoTransition(s, { type: "invalid" } as never)).toBe(s);
    expect(cargoTransition(s, { type: "helper", value: 1 } as never)).toBe(s);
    expect(cargoTransition(s, null as never)).toBe(s);
  });
  it("garbage rises on its load boundary; topped-up holds fail, retry resets, endless finishes voluntarily", () => {
    let s = createCargo(cargoLevel("w3-8"), 65, false);
    s = { ...s, board: Array(COLS * ROWS).fill(null), loads: 2, event: 2 };
    s = delivery(s, 0); expect(s.board.slice(-COLS).filter(Boolean)).toHaveLength(6); expect(validCargo(s)).toBe(true);
    let endless = createCargo("endless", 9, false);
    for (let i = 0; i < 100 && endless.status === "playing"; i++) endless = cargoTransition(endless, { type: "drop" });
    expect(endless.status).toBe("over"); expect(cargoResult(endless)).toMatchObject({ cleared: false, stars: 0 });
    const retry = createCargo("endless", 9, false); expect(retry.status).toBe("playing"); expect(retry.loads).toBe(0);
    expect(cargoResult(cargoTransition(retry, { type: "finish" }))).toMatchObject({ cleared: false, stars: 0 });
    expect(cargoTransition(createCargo(cargoLevel("w1-1"), 1, false), { type: "finish" }).status).toBe("playing");
  });
  it("star tiers are based only on loads, including Helper, and never award stars for a loss", () => {
    const initial = createCargo(cargoLevel("w1-1"), 1, true);
    for (const [extra, stars] of [[3, 3], [8, 2], [9, 1]] as const) expect(cargoResult({ ...initial, status: "cleared", loads: initial.level !== "endless" ? initial.level.par + extra : 0 })?.stars).toBe(stars);
    expect(cargoResult({ ...initial, status: "over" })?.stars).toBe(0);
  });
  it("rejects unknown fields, malformed runtime states and counterfeit levels", () => {
    const s = createCargo(cargoLevel("w1-1"), 1, false);
    const bad = [null, {}, { ...s, surprise: true }, { ...s, board: [] }, { ...s, board: Array(126).fill({ kind: "fish", value: 9, stuck: false }) }, { ...s, piece: { ...s.piece, shape: 99 } }, { ...s, next: [s.piece] }, { ...s, seed: NaN }, { ...s, clock: Infinity }, { ...s, level: { ...cargoLevel("w1-1"), target: 0 } }, { ...s, row: 14 }, { ...s, col: -1 }, { ...s, holdUsed: true }, { ...s, canoes: 7 }, { ...s, status: "cleared" }, { ...s, lastRows: [1, 1] }];
    for (const value of bad) expect(validCargo(value)).toBe(false);
    expect(() => cargoLevel("w1-9" as never)).toThrow();
  });
  it("uses existing strict per-learner progress, duplicate credit guard and sticker offers", () => {
    const before = emptyArcade();
    const action = { type: "finish", game: "canoe-cargo", level: "w1-1", stars: 3, score: 250, round: "cargo-test-1", name: "QA" } as const;
    const after = arcadeTransition(before, "family", action);
    expect(validArcade(after)).toBe(true); expect(after.people.family.games["canoe-cargo"]?.stars["w1-1"]).toBe(3); expect(after.people.family.chest?.game).toBe("canoe-cargo"); expect(arcadeTransition(after, "family", action)).toBe(after); expect(before.people).toEqual({});
    expect(validArcade({ ...after, people: { family: { ...after.people.family, games: { "canoe-cargo": { ...after.people.family.games["canoe-cargo"], best: Infinity } } } } })).toBe(false);
    expect(arcadeShelfGames().map(g => g.id)).toContain("canoe-cargo");
  });
});
