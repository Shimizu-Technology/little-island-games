import { existsSync, readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { optionsAtLevel } from "../src/learn/levels";
import { learnIds } from "../src/learn/types";
import type { BoardProps, LearnOptions } from "../src/learn/types";
import {
  RULE_CATALOG,
  betweenNeighboursPick,
  buildRulePuzzle,
  checkUniqueCatalogRule,
  patternHint,
  stone,
} from "../src/learn/games/pattern-path/rules";
import {
  engine as patternEngine,
  help as patternHelp,
  hintText as patternHintText,
  place as patternPlace,
  taskAt as patternTaskAt,
  type PatternState,
} from "../src/learn/games/pattern-path/engine";
import { Board as PatternBoard } from "../src/learn/games/pattern-path/view";
import {
  CHECK as P_CHECK,
  HELP as P_HELP,
  challengeEngine as patternChallengeEngine,
  gapAction,
  ruleAction,
} from "../src/learn/games/pattern-path/challenge-engine";
import { patternChallengePuzzles } from "../src/learn/games/pattern-path/challenge-content";
import { ChallengeBoard as PatternChallengeBoard } from "../src/learn/games/pattern-path/challenge-view";
import {
  INVALID_CUBE_NETS,
  VALID_CUBE_NETS,
  foldCubeNet,
  orientNet,
} from "../src/learn/games/shape-shift/cubeNet";
import {
  DEEP_POLY_DEFS,
  POLY_BLUEPRINTS,
  TANGRAM_SILHOUETTES,
  tangramTopology,
} from "../src/learn/games/shape-shift/silhouettes";
import {
  atomsSignature,
  canonicalTilingHash,
  countExactCoverIndependent,
  is4Connected,
  normalizeAtoms,
  solveExactCover,
  uniqueOrientations,
} from "../src/learn/games/shape-shift/solver";
import {
  chooseCube,
  engine as shapeEngine,
  help as shapeHelp,
  place as shapePlace,
  removePlaced,
  setMode,
  shapeHint,
  taskAt as shapeTaskAt,
  transformPiece,
  type ShapeState,
} from "../src/learn/games/shape-shift/engine";
import { Board as ShapeBoard } from "../src/learn/games/shape-shift/view";
import { dropGridCoord } from "../src/learn/games/shape-shift/ShapeCanvas";
import {
  challengeEngine as shapeChallengeEngine,
  challengeShapeHint,
  type Payload as ShapePayload,
} from "../src/learn/games/shape-shift/challenge-engine";
import { shapeChallengePuzzles } from "../src/learn/games/shape-shift/challenge-content";
import { ChallengeBoard as ShapeChallengeBoard } from "../src/learn/games/shape-shift/challenge-view";
import { registration as patternChallengeReg } from "../src/learn/games/pattern-path/challenge";
import { registration as shapeChallengeReg } from "../src/learn/games/shape-shift/challenge";
import { type Payload as PatternPayload } from "../src/learn/games/pattern-path/challenge-engine";
import { emptyChallenge } from "../src/state/challenge";
import { decodeShapeTuple } from "../src/puzzles/adapters/shape-shift";
import { decodePatternTuple } from "../src/puzzles/adapters/pattern-path";
import type { Cell } from "../src/learn/games/shape-shift/legacy";

const { Pass } = vi.hoisted(() => ({ Pass: ({ children }: { children?: unknown }) => children as never }));
const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => true }));
vi.mock("../src/components/Audio", () => ({ AudioPreferences: React.createContext({}) }));
vi.mock("react-native", () => ({
  View: Pass,
  ScrollView: Pass,
  Platform: { OS: "ios" },
  useWindowDimensions: () => viewport,
}));
vi.mock("react-native-svg", () => ({
  default: Pass,
  Circle: Pass,
  Ellipse: Pass,
  Line: Pass,
  Path: Pass,
  Polygon: Pass,
  Rect: Pass,
}));
vi.mock("../src/components/ui", () => ({
  C: { ink: "#183F39" },
  Copy: Pass,
  Button: Pass,
  PressableScale: Pass,
}));

const base: LearnOptions = { mode: "solo", pace: "easy" };
const ctx = (seed: number) => ({ rng: () => seed / 0xffffffff, skills: {}, starter: 0 as const, today: 0 });
const boardProps = <S,>(game: "pattern-path" | "shape-shift", state: S, options: LearnOptions, width = 390): BoardProps<S> => ({
  session: { game, version: 1, id: "test", revision: 0, options, state },
  update: () => {},
  practice: () => {},
  skills: {},
  sound: () => {},
  stopSound: () => {},
  soundOn: false,
  width,
  height: 844,
  active: true,
  coach: { active: false, done: () => {} },
  cheer: () => {},
});

describe("W0-05 + SC-07: Pattern Path 30-rule catalog, uniqueness, F3 habit, and Deep Water", () => {
  it("ships a 30-rule catalog where every rule produces uniquely certified puzzles", () => {
    expect(RULE_CATALOG).toHaveLength(30);
    expect(new Set(RULE_CATALOG.map((r) => r.id)).size).toBe(30);
    for (const rule of RULE_CATALOG) {
      let builtCount = 0;
      for (let s = 1; s <= 25; s++) {
        const p = buildRulePuzzle(rule.id, s * 7919);
        if (p) {
          builtCount++;
          const v = checkUniqueCatalogRule(p.tiles, p.gaps);
          expect(v.unique, rule.id).toBe(true);
          expect(v.matchingRules).toEqual([rule.id]);
        }
      }
      expect(builtCount, `rule ${rule.id} produced puzzles`).toBeGreaterThan(0);
    }
  });

  it("independent uniqueness checker rejects ambiguous visible trails", () => {
    // Only 2 stones visible out of 7 leaves multiple rules matching!
    const ambiguous = checkUniqueCatalogRule(["2", "4", "6", "8", "10", "12", "14"], [2, 3, 4, 5, 6]);
    expect(ambiguous.unique).toBe(false);
    expect(ambiguous.matchingRules.length).toBeGreaterThan(1);
    // Color trail with 1st color only repeated in visible spots cannot distinguish AB vs ABC vs ABB
    const ambColor = checkUniqueCatalogRule(
      [stone("coral"), stone("blue"), stone("coral"), stone("blue"), stone("coral"), stone("blue"), stone("coral")],
      [2, 3, 4, 5, 6],
    );
    expect(ambColor.unique).toBe(false);
  });

  it("places gaps anywhere after stone 2 across seeds (not stuck at stone 6)", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const o = optionsAtLevel(base, level);
      const seenGaps = new Set<number>();
      for (let seed = 1; seed <= 80; seed++) {
        const s = patternEngine.create(o, ctx(seed * 1009));
        for (let index = 0; index < 3; index++) {
          const t = patternTaskAt({ ...s, version: 2, index } as PatternState);
          if (t.tiles.length === 7) {
            expect(t.missing).toBeGreaterThanOrEqual(2);
            expect(t.missing).toBeLessThanOrEqual(6);
            seenGaps.add(t.missing);
          }
        }
      }
      expect(seenGaps.size, `level ${level} gap variety`).toBeGreaterThanOrEqual(4);
    }
  });

  it("F3 habit test: between-neighbours heuristic wins strictly under 40% at Levels 3 and 5", () => {
    for (const level of [3, 5] as const) {
      let total = 0, hitsUpper = 0, hitsLower = 0;
      for (let seed = 1; seed <= 200; seed++) {
        for (let index = 0; index < 4; index++) {
          const t = patternTaskAt({
            version: 2, level, seed: seed * 1337, index, total: 4, attempt: 0, helped: false, hintLevel: 0,
          });
          if (/^\d+$/.test(t.answer) && t.tiles.length === 7) {
            total++;
            if (betweenNeighboursPick(t.tiles, t.missing, t.choices, "upper") === t.answer) hitsUpper++;
            if (betweenNeighboursPick(t.tiles, t.missing, t.choices, "lower") === t.answer) hitsLower++;
          }
        }
      }
      expect(total).toBeGreaterThan(200);
      expect(hitsUpper / total, `L${level} upper`).toBeLessThan(0.4);
      expect(hitsLower / total, `L${level} lower`).toBeLessThan(0.4);
    }
  });

  it("Level 2 shell trails offer multiple unseen shell counts so answer is not the sole missing tile", () => {
    let multiUnseen = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const t = patternTaskAt({ version: 2, level: 2, seed: seed * 997, index: 0, total: 4, attempt: 0, helped: false, hintLevel: 0 });
      const shown = new Set(t.tiles.filter((_, i) => i !== t.missing));
      const unseenChoices = t.choices.filter((c) => !shown.has(c));
      if (unseenChoices.length >= 2) multiUnseen++;
    }
    expect(multiUnseen).toBeGreaterThan(30);
  });

  it("Level 4 includes turn rules; Help names the rule first and only reveals the stone on tap 2", () => {
    const o4 = optionsAtLevel(base, 4);
    let sawTurn = false;
    for (let seed = 1; seed <= 20; seed++) {
      for (let index = 0; index < 4; index++) {
        const s = { ...(patternEngine.create(o4, ctx(seed * 503)) as Extract<PatternState, { version: 2 }>), index };
        const t = patternTaskAt(s);
        if (t.tiles.some((tok) => tok.split(":").length === 4)) sawTurn = true;
      }
    }
    expect(sawTurn).toBe(true);

    // Help step 1 NEVER leaks the exact answer string, step 2 reveals it!
    const o5 = optionsAtLevel(base, 5);
    const s0 = patternEngine.create(o5, ctx(42)) as Extract<PatternState, { version: 2 }>;
    const t = patternTaskAt(s0);
    const s1 = patternHelp(s0) as Extract<PatternState, { version: 2 }>;
    expect(s1.hintLevel).toBe(1);
    const h1 = patternHintText(s1);
    expect(h1).not.toContain(`The answer:`);
    expect(patternHint(t.puzzle!, 1)).not.toContain(`The answer:`);
    const s2 = patternHelp(s1) as Extract<PatternState, { version: 2 }>;
    expect(s2.hintLevel).toBe(2);
    expect(patternHintText(s2)).toContain(t.answer);
  });

  it("Levels 3–5 deal a fresh trail after a miss; legacy v1 saves remain valid and unmutated", () => {
    const o3 = optionsAtLevel(base, 3);
    const s0 = patternEngine.create(o3, ctx(77)) as Extract<PatternState, { version: 2 }>;
    const wrong = patternTaskAt(s0).choices.find((c) => c !== patternTaskAt(s0).answer)!;
    const afterMiss = patternPlace(s0, wrong) as Extract<PatternState, { version: 2 }>;
    expect(afterMiss.attempt).toBe(1);
    expect(patternEngine.validate(afterMiss, o3)).toBe(true);

    // Legacy v1 save validation & immutability
    const legacy: PatternState = { version: 1, level: 3, seed: 12345, index: 1, total: 4, helped: false };
    const snap = JSON.stringify(legacy);
    expect(patternEngine.validate(legacy, o3)).toBe(true);
    expect(JSON.stringify(legacy)).toBe(snap);
    const lTask = patternTaskAt(legacy);
    const lNext = patternPlace(legacy, lTask.answer);
    expect(lNext.index).toBe(2);
    expect(JSON.stringify(legacy)).toBe(snap);
  });

  it("every shipped Pattern Path Challenge puzzle passes unique-rule check and replays cleanly", () => {
    expect(patternChallengePuzzles.length).toBe(32); // 16 Deep Water + 16 School Dares
    for (const p of patternChallengePuzzles) {
      const v = checkUniqueCatalogRule(p.descriptor.payload.tiles, p.descriptor.payload.gaps);
      expect(v.unique, p.title).toBe(true);
      expect(v.matchingRules).toEqual([p.descriptor.payload.ruleId]);

      // Replay through the real Challenge engine!
      let st = patternChallengeEngine.create(p.descriptor, 0, { supportOff: false, ownRead: false });
      if (p.descriptor.payload.ruleChoices) {
        const rIdx = p.descriptor.payload.ruleChoices.indexOf(p.descriptor.payload.ruleId);
        st = patternChallengeEngine.step(st, ruleAction(rIdx), p.descriptor)!.state;
      }
      for (let slot = 0; slot < p.descriptor.payload.gaps.length; slot++) {
        const want = p.descriptor.payload.tiles[p.descriptor.payload.gaps[slot]];
        const cIdx = p.descriptor.payload.choices.indexOf(want);
        st = patternChallengeEngine.step(st, gapAction(slot, cIdx), p.descriptor)!.state;
      }
      const checked = patternChallengeEngine.step(st, P_CHECK, p.descriptor)!;
      expect(checked.event).toBe("check");
      expect(checked.correct).toBe(true);
      expect(patternChallengeEngine.inspect(checked.state, p.descriptor).solved).toBe(true);

      // Help step 1 records help without solving
      const h0 = patternChallengeEngine.create(p.descriptor, 0, { supportOff: false, ownRead: false });
      const h1 = patternChallengeEngine.step(h0, P_HELP, p.descriptor)!;
      expect(h1.event).toBe("help");
      expect(patternChallengeEngine.inspect(h1.state, p.descriptor).solved).toBe(false);
    }
  });
});

describe("W0-06 + SC-08 + SP-06: Shape Shift drop fix, varied nets, exact-cover, and Tangram mode", () => {
  it("keeps Tangrams strictly inside Shape Shift with NO new game entry in learnIds", () => {
    expect(learnIds.includes("shape-shift")).toBe(true);
    expect((learnIds as readonly string[]).some((id) => id.includes("tangram"))).toBe(false);
  });

  it("proves all 11 cube nets fold validly and all 6 invalid nets fail folding", () => {
    expect(VALID_CUBE_NETS).toHaveLength(11);
    for (const net of VALID_CUBE_NETS) {
      const f = foldCubeNet(net.cells);
      expect(f.valid, net.id).toBe(true);
      // Every opposite is symmetric: opp[opp[i]] === i
      for (let i = 0; i < 6; i++) expect(f.opposites[f.opposites[i]]).toBe(i);
    }
    expect(INVALID_CUBE_NETS).toHaveLength(6);
    for (const bad of INVALID_CUBE_NETS) {
      expect(foldCubeNet(bad.cells).valid, bad.id).toBe(false);
    }
    // Check SPEC.md's specific cube net claims:
    // T-net A B C with D, E, F below B: D (idx 3) opposite F (idx 5)
    expect(foldCubeNet(VALID_CUBE_NETS[0].cells).opposites[3]).toBe(5);
    // Zigzag 2-2-2 net: A (idx 0) opposite D (idx 3)
    expect(foldCubeNet(VALID_CUBE_NETS[9].cells).opposites[0]).toBe(3);
  });

  it("varies Level 5 cube net geometry across seeds (never one fixed cross net)", () => {
    const o5 = optionsAtLevel(base, 5);
    const netIds = new Set<string>();
    const askIndices = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const s = { ...(shapeEngine.create(o5, ctx(seed * 1777)) as Extract<ShapeState, { version: 2 }>), index: 1 };
      const t = shapeTaskAt(s);
      expect(t.kind).toBe("cube");
      if (t.cube?.kind === "opposite") {
        netIds.add(t.pictureId);
        askIndices.add(t.cube.askIndex);
      }
    }
    expect(netIds.size).toBeGreaterThanOrEqual(6);
    expect(askIndices.size).toBeGreaterThanOrEqual(4);
  });

  it("W0-06 drop lands where dropped: wrong spot inside silhouette NEVER snaps to target slot", () => {
    const o2 = optionsAtLevel(base, 2);
    const s = shapeEngine.create(o2, ctx(55)) as Extract<ShapeState, { version: 2 }>;
    const t = shapeTaskAt(s);
    // Find a valid orientation for piece 0, then try placing it at a WRONG coordinate!
    const p0 = t.pieces[0];
    const targetX = Math.min(...p0.target.map((a) => a[0]));
    const targetY = Math.min(...p0.target.map((a) => a[1]));
    const rightCells = normalizeAtoms(p0.target);
    // Wrong spot (shifted by +2,+2 or +1,+2) MUST be rejected!
    const wrongX = targetX === 0 ? 3 : 0;
    const wrongY = targetY === 0 ? 3 : 0;
    expect(shapePlace(s, 0, rightCells, wrongX, wrongY)).toBe(s);
    // Exact spot succeeds!
    const placed = shapePlace(s, 0, rightCells, targetX, targetY);
    expect(placed).not.toBe(s);
    // Verify dropGridCoord maps directly without snapping to a secret anchor:
    const c1 = dropGridCoord(100, 100, 50, 50, 40, [[0, 0]]);
    const c2 = dropGridCoord(220, 180, 50, 50, 40, [[0, 0]]);
    expect(c1).not.toEqual(c2);
  });

  it("SC-08 progression: 20 blueprints (every part & silhouette 4-connected), free piece order from L2, no gold corner at L3, outline-only at L4", () => {
    const is4Connected = (cells: readonly [number, number][]) => {
      if (cells.length === 0) return true;
      const set = new Set(cells.map(([x, y]) => `${x},${y}`));
      const seen = new Set([`${cells[0][0]},${cells[0][1]}`]);
      const q: [number, number][] = [cells[0]];
      while (q.length) {
        const [x, y] = q.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${x + dx},${y + dy}`;
          if (set.has(k) && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); }
        }
      }
      return seen.size === set.size;
    };

    expect(POLY_BLUEPRINTS).toHaveLength(20);
    for (const bp of POLY_BLUEPRINTS) {
      for (const part of bp.parts) {
        expect(is4Connected(part.cells), `${bp.id}:${part.name} must be 4-connected`).toBe(true);
      }
      const sil = bp.parts.flatMap((p) => p.cells);
      expect(is4Connected(sil), `${bp.id} silhouette must be 4-connected`).toBe(true);
      const res = solveExactCover(sil, bp.parts.map((p) => p.cells), { maxSolutions: 2 });
      expect(res.count, bp.id).toBeGreaterThanOrEqual(1);
    }
    for (const def of DEEP_POLY_DEFS) {
      for (const p of def.pieces) expect(is4Connected(p.cells), `${def.id}:${p.name}`).toBe(true);
      expect(is4Connected(def.silhouette), `${def.id} sil`).toBe(true);
    }
    // Every merged L1-L4 School piece is ALSO strictly 4-connected!
    for (const level of [1, 2, 3, 4] as const) {
      for (let seed = 1; seed <= 25; seed++) {
        for (let index = 0; index < 4; index++) {
          const t = shapeTaskAt({ version: 2, level, mode: "poly", seed: seed * 101, index, total: 4, placed: [], helped: false, hintPiece: null });
          for (const p of t.pieces) expect(is4Connected(p.cells as [number, number][]), `L${level}:${t.pictureId}:${p.name}`).toBe(true);
        }
      }
    }

    const s1 = shapeEngine.create(optionsAtLevel(base, 1), ctx(11)) as Extract<ShapeState, { version: 2 }>;
    const s2 = shapeEngine.create(optionsAtLevel(base, 2), ctx(11)) as Extract<ShapeState, { version: 2 }>;
    const s3 = shapeEngine.create(optionsAtLevel(base, 3), ctx(11)) as Extract<ShapeState, { version: 2 }>;
    const s4 = shapeEngine.create(optionsAtLevel(base, 4), ctx(11)) as Extract<ShapeState, { version: 2 }>;

    expect(shapeTaskAt(s1)).toMatchObject({ freeOrder: false, showGoldCorner: true, outlineOnly: false });
    expect(shapeTaskAt(s2)).toMatchObject({ freeOrder: true, showGoldCorner: true, outlineOnly: false });
    expect(shapeTaskAt(s3)).toMatchObject({ freeOrder: true, showGoldCorner: false, outlineOnly: false });
    expect(shapeTaskAt(s4)).toMatchObject({ freeOrder: true, showGoldCorner: false, outlineOnly: true });

    // Free order at L2: place piece 1 BEFORE piece 0!
    const t2 = shapeTaskAt(s2);
    const p1 = t2.pieces[1];
    const next = shapePlace(s2, 1, normalizeAtoms(p1.target), Math.min(...p1.target.map((a) => a[0])), Math.min(...p1.target.map((a) => a[1])));
    expect(next).not.toBe(s2);
    expect((next as Extract<ShapeState, { version: 2 }>).placed.map((p) => p.pieceIndex)).toEqual([1]);
    // Can lift placed piece back cleanly
    const lifted = removePlaced(next, 1) as Extract<ShapeState, { version: 2 }>;
    expect(lifted.placed).toEqual([]);
  });

  it("proves exact-cover counts with two independent solvers and accepts ANY valid exact fill", () => {
    // All 5 unique Deep Water silhouettes have count === 1 by BOTH solvers
    for (const def of DEEP_POLY_DEFS.slice(0, 5)) {
      const a = solveExactCover(def.silhouette, def.pieces.map((p) => p.cells), { maxSolutions: 2 });
      const b = countExactCoverIndependent(def.silhouette, def.pieces.map((p) => p.cells), { maxSolutions: 2 });
      expect(a.count, def.id).toBe(1);
      expect(b).toEqual({ status: "counted", count: 1 });
    }
    // All 5 Find-Two-Ways silhouettes have >= 2 distinct canonical tilings, and BOTH win in Challenge!
    for (const def of DEEP_POLY_DEFS.slice(10, 15)) {
      const res = solveExactCover(def.silhouette, def.pieces.map((p) => p.cells), { maxSolutions: 3 });
      expect(res.count, def.id).toBeGreaterThanOrEqual(2);
      const h0 = canonicalTilingHash(res.solutions[0]);
      const h1 = canonicalTilingHash(res.solutions[1]);
      expect(h0).not.toBe(h1);

      // Replay BOTH distinct tilings through the Challenge engine and confirm BOTH win with distinct solution hashes!
      const puz = shapeChallengePuzzles.find((p) => p.descriptor.payload.kind === "poly" && p.descriptor.payload.name === def.name)!;
      expect(puz).toBeDefined();
      const hashes = [res.solutions[0], res.solutions[1]].map((sol) => {
        let st = shapeChallengeEngine.create(puz.descriptor, 0, { supportOff: false, ownRead: false });
        const payload = puz.descriptor.payload;
        if (payload.kind !== "poly" && payload.kind !== "tangram") throw new Error("expected fit payload");
        for (const pl of sol) {
          const orients = uniqueOrientations(payload.pieces[pl.pieceIndex], true, true);
          const wantSig = normalizeAtoms(pl.cells).map((c) => c.join(",")).join(";");
          const oIdx = orients.findIndex((o) => o.map((c) => c.join(",")).join(";") === wantSig);
          st = shapeChallengeEngine.step(st, ["p", pl.pieceIndex, oIdx, pl.x, pl.y, 0], puz.descriptor)!.state;
        }
        const done = shapeChallengeEngine.step(st, ["c"], puz.descriptor)!;
        expect(done.correct).toBe(true);
        const insp = shapeChallengeEngine.inspect(done.state, puz.descriptor);
        expect(insp.solved).toBe(true);
        return insp.solution;
      });
      expect(hashes[0]).not.toBe(hashes[1]);
    }
  });

  it("SP-06 Tangram mode: all 16 original silhouettes are hole-free, pinch-free, exact-cover proved, and play inside Shape Shift", () => {
    expect(TANGRAM_SILHOUETTES).toHaveLength(16);
    for (const tg of TANGRAM_SILHOUETTES) {
      const topo = tangramTopology(tg.silhouette);
      expect(topo.comps, `${tg.id} outer loop count`).toBe(1);
      expect(topo.pinches, `${tg.id} pinch vertices`).toBe(0);
      const res = solveExactCover(tg.silhouette, tg.pieces.map((p) => p.baseCells), { maxSolutions: 2 });
      expect(res.count, tg.id).toBeGreaterThanOrEqual(1);
    }

    const o3 = optionsAtLevel(base, 3);
    const polyState = shapeEngine.create(o3, ctx(99)) as Extract<ShapeState, { version: 2 }>;
    const tgState = setMode(polyState, "tangram") as Extract<ShapeState, { version: 2 }>;
    expect(tgState.mode).toBe("tangram");
    expect(shapeEngine.validate(tgState, o3)).toBe(true);
    const tgTask = shapeTaskAt(tgState);
    expect(tgTask.kind).toBe("tangram");
    expect(tgTask.pieces.length).toBe(7);
    // Unique Tangram pieces never get a redundant "1" suffix!
    expect(tgTask.pieces.map((p) => p.name)).toContain("Medium triangle");
    expect(tgTask.pieces.map((p) => p.name)).toContain("Square");
    expect(tgTask.pieces.map((p) => p.name)).toContain("Parallelogram");
    expect(tgTask.pieces.map((p) => p.name)).not.toContain("Medium triangle 1");

    // Solve all 7 pieces of the Tangram task via shared exact-cover hint!
    let cur: ShapeState = tgState;
    for (let step = 0; step < 7; step++) {
      const h = shapeHint(cur);
      expect(h.deadEnd).toBe(false);
      expect(h.suggestion).not.toBeNull();
      const mv = h.suggestion!;
      cur = shapePlace(cur, mv.pieceIndex, mv.cells, mv.x, mv.y);
    }
    expect(cur.index).toBe(1);
  });

  it("legacy v1 Shape Shift saves validate, load, and complete without mutating input", () => {
    const o4 = optionsAtLevel(base, 4);
    const legacy: ShapeState = { version: 1, level: 4, seed: 4242, index: 1, total: 4, placed: [0], helped: false };
    const before = JSON.stringify(legacy);
    expect(shapeEngine.validate(legacy, o4)).toBe(true);
    expect(JSON.stringify(legacy)).toBe(before);
    const h = shapeHelp(legacy);
    expect(h.helped).toBe(true);
    expect(JSON.stringify(legacy)).toBe(before);
    expect(transformPiece([[0, 0], [1, 0]], 1, false)).toEqual([[0, 0], [0, 1]]);
    expect(chooseCube(legacy, "A")).toBe(legacy);
  });
});

describe("T2 UI, AX5 rendering, and design-only speech staging", () => {
  it("renders Pattern Path, Shape Shift (Poly, Cube, Tangram), and Challenge boards at default & AX5", () => {
    for (const scale of [1, 3.12]) {
      viewport.fontScale = scale;
      const p4 = patternEngine.create(optionsAtLevel(base, 4), ctx(12));
      expect(renderToStaticMarkup(<PatternBoard {...boardProps("pattern-path", p4, optionsAtLevel(base, 4), 337)} />)).toContain("TRAIL 1 OF 4");

      const sh3 = shapeEngine.create(optionsAtLevel(base, 3), ctx(12));
      expect(renderToStaticMarkup(<ShapeBoard {...boardProps("shape-shift", sh3, optionsAtLevel(base, 3), 337)} />)).toContain("Tangrams");

      const tg3 = setMode(sh3, "tangram");
      expect(renderToStaticMarkup(<ShapeBoard {...boardProps("shape-shift", tg3, optionsAtLevel(base, 3), 337)} />)).toContain("Tangram");

      const sh5Cube: ShapeState = { ...(shapeEngine.create(optionsAtLevel(base, 5), ctx(12)) as Extract<ShapeState, { version: 2 }>), index: 1 };
      expect(renderToStaticMarkup(<ShapeBoard {...boardProps<ShapeState>("shape-shift", sh5Cube, optionsAtLevel(base, 5), 337)} />)).toContain("Fold the cube");

      const pCh = patternChallengePuzzles[4]; // Say-the-rule two-rule Deep Water
      const pChState = patternChallengeEngine.create(pCh.descriptor, 0, { supportOff: false, ownRead: false });
      expect(renderToStaticMarkup(<PatternChallengeBoard state={pChState} dispatch={() => {}} active width={350} />)).toContain("Say the rule");

      const sCh = shapeChallengePuzzles[shapeChallengePuzzles.length - 1]; // Tangram Deep Water
      const sChState = shapeChallengeEngine.create(sCh.descriptor, 0, { supportOff: false, ownRead: false });
      expect(renderToStaticMarkup(<ShapeChallengeBoard state={sChState} dispatch={() => {}} active width={350} />)).toContain("Look (shape clue)");

      // Cube net prompt preserves "T-net" capitalization (no lowercase "this t net") and clarifies fold clue.
      const tNetCh = shapeChallengePuzzles.find((p) => p.descriptor.payload.kind === "cube-opp" && p.descriptor.payload.netName === "T net")!;
      const tNetState = shapeChallengeEngine.create(tNetCh.descriptor, 0, { supportOff: false, ownRead: false });
      const tNetHtml = renderToStaticMarkup(<ShapeChallengeBoard state={tNetState} dispatch={() => {}} active width={350} />);
      expect(tNetHtml).toContain("T-net");
      expect(tNetHtml).toContain("Look (fold clue)");
      expect(tNetHtml).not.toContain("this t net");
    }
    viewport.fontScale = 1;
  });

  it("Say-the-rule puzzle titles never leak the rule answer", () => {
    const spoilers = [/two rules/i, /double/i, /take 1/i, /square/i, /product/i, /bigger jump/i, /up then down/i, /add then/i];
    for (const p of patternChallengePuzzles) {
      if (!p.descriptor.payload.ruleChoices) continue;
      for (const re of spoilers) {
        expect(p.title, `${p.title} leaked ${re}`).not.toMatch(re);
        expect(p.descriptor.title, `${p.descriptor.title} leaked ${re}`).not.toMatch(re);
      }
    }
  });

  it("stages T2 speech lines as design-only without generating unvoiced audio or broken Hear buttons", () => {
    expect(existsSync("scripts/learn/t2-thinking.json")).toBe(true);
    expect(existsSync("scripts/learn/t2-thinking.stage")).toBe(true);
    const stage = JSON.parse(readFileSync("scripts/learn/t2-thinking.stage", "utf8"));
    expect(stage).toEqual({ status: "design-only", shipping: false });
    const lines = JSON.parse(readFileSync("scripts/learn/t2-thinking.json", "utf8")) as Record<string, string>;
    expect(Object.keys(lines).length).toBeGreaterThanOrEqual(4);
  });
});

describe("T2 Fix Round 1 regressions (R1–R6)", () => {
  const canonicalNetKey = (cells: readonly Cell[]): string => {
    let best = "";
    for (const m of [false, true]) {
      for (let t = 0; t < 4; t++) {
        const key = orientNet(cells, t, m).map(([x, y]) => `${x},${y}`).join(";");
        if (!best || key < best) best = key;
      }
    }
    return best;
  };

  it("R1: underdetermined two-interleaved odd track is rejected (14, 18, 16, ?, 18, ?, 20) and all packed pattern rows are unique", () => {
    const counter = checkUniqueCatalogRule(["14", "18", "16", "20", "18", "22", "20"], [3, 5]);
    expect(counter.unique).toBe(false);
    expect(counter.matchingRules).toContain("two-add-sub");
    expect(counter.matchingRules).toContain("two-interleaved");

    for (const bank of [280, 281, 282, 283, 284, 285]) {
      const lines = readFileSync(`src/content/puzzles/assets/p${bank}.lipuzzle`, "utf8").trim().split("\n");
      lines.shift();
      for (let i = 0; i < lines.length; i++) {
        const row = JSON.parse(lines[i]) as unknown[];
        const pay = decodePatternTuple(row[3])!;
        expect(pay, `${bank}:${i}`).not.toBeNull();
        const v = checkUniqueCatalogRule(pay.tiles, pay.gaps);
        expect(v.unique, `${bank}:${i} (${pay.ruleId})`).toBe(true);
        expect(v.matchingRules, `${bank}:${i}`).toEqual([pay.ruleId]);
      }
    }
  });

  it("R2: Shape Shift repeat misses preserve completion reserve + failed evidence; saturated Help stays bounded", () => {
    // Repeat miss on 294:0
    const pShape = shapeChallengePuzzles[0];
    let s = shapeChallengeReg.start(
      pShape.ref,
      "a",
      "r2-repeat-miss",
      emptyChallenge(),
      { supportOff: false, ownRead: false },
      pShape.dares.map((d) => d.slot),
    );
    while (true) {
      const next = shapeChallengeReg.move(s, ["m"]);
      if (!next) break;
      s = next;
    }
    const payload = s.payload as ShapePayload;
    expect(payload.actions.length).toBeLessThan(512);

    // Help -> One step -> ... -> Check still succeeds and yields helped with no independent dares!
    s = shapeChallengeReg.move(s, ["h"])!;
    expect(s).toBeTruthy();
    s = shapeChallengeReg.move(s, ["h"])!;
    expect(s).toBeTruthy();
    const shapeState = (sess: typeof s) => {
      const pl = sess.payload as ShapePayload;
      return pl.actions.reduce(
        (st, act) => shapeChallengeEngine.step(st, act, pShape.descriptor)!.state,
        shapeChallengeEngine.create(pShape.descriptor, 0, pl.options),
      );
    };
    expect(shapeState(s).misses).toBeGreaterThan(0);
    for (let i = 0; i < 8; i++) {
      const h = challengeShapeHint(shapeState(s));
      if (!h.nextPlacement) break;
      s = shapeChallengeReg.move(s, ["s", ...h.nextPlacement])!;
      expect(s).toBeTruthy();
    }
    s = shapeChallengeReg.move(s, ["c"])!;
    expect(s.result?.event).toBe("helped");
    expect(s.result?.dares).toEqual([]);

    // Also verify a single miss without Help STILL blocks Clean/Plan dares on win!
    let ms = shapeChallengeReg.start(
      pShape.ref,
      "a",
      "r2-miss-monotone",
      emptyChallenge(),
      { supportOff: false, ownRead: false },
      pShape.dares.map((d) => d.slot),
    );
    ms = shapeChallengeReg.move(ms, ["m"])!;
    ms = shapeChallengeReg.move(ms, ["m"])!;
    const p0Pay = pShape.descriptor.payload;
    if (p0Pay.kind !== "poly") throw new Error("expected poly");
    const solMiss = solveExactCover(p0Pay.silhouette, p0Pay.pieces, { maxSolutions: 1 }).solutions[0];
    for (const pl of solMiss) {
      const os = uniqueOrientations(p0Pay.pieces[pl.pieceIndex], p0Pay.allowRotate, p0Pay.allowFlip);
      const oi = os.findIndex((o) => atomsSignature(o) === atomsSignature(pl.cells));
      ms = shapeChallengeReg.move(ms, ["p", pl.pieceIndex, oi, pl.x, pl.y, 0])!;
    }
    ms = shapeChallengeReg.move(ms, ["c"])!;
    expect(ms.result?.event).toBe("helped");
    expect(shapeChallengeReg.completionFacts?.(ms)).toEqual({ helpUsed: false, failed: true });
    expect(ms.result?.dares).toEqual([]);

    // Saturated Help on completed drafts in BOTH Pattern Path & Shape Shift
    const pPat = patternChallengePuzzles[0];
    let ps = patternChallengeReg.start(
      pPat.ref,
      "a",
      "r2-sat-pat",
      emptyChallenge(),
      { supportOff: false, ownRead: false },
      pPat.dares.map((d) => d.slot),
    );
    const pPay = pPat.descriptor.payload;
    if (pPay.ruleChoices) ps = patternChallengeReg.move(ps, ruleAction(pPay.ruleChoices.indexOf(pPay.ruleId)))!;
    for (let slot = 0; slot < pPay.gaps.length; slot++) {
      ps = patternChallengeReg.move(ps, gapAction(slot, pPay.choices.indexOf(pPay.tiles[pPay.gaps[slot]])))!;
    }
    while (true) {
      const n = patternChallengeReg.move(ps, P_HELP);
      if (!n) break;
      ps = n;
    }
    expect((ps.payload as PatternPayload).actions.length).toBeLessThan(20);
    const pDone = patternChallengeReg.move(ps, P_CHECK);
    expect(pDone?.result?.event).toBe("helped");
    expect(pDone?.result?.dares).toEqual([]);

    let ss = shapeChallengeReg.start(
      pShape.ref,
      "a",
      "r2-sat-shape",
      emptyChallenge(),
      { supportOff: false, ownRead: false },
      pShape.dares.map((d) => d.slot),
    );
    const sPay = pShape.descriptor.payload;
    if (sPay.kind !== "poly") throw new Error("expected poly");
    const sol0 = solveExactCover(sPay.silhouette, sPay.pieces, { maxSolutions: 1 }).solutions[0];
    for (const pl of sol0) {
      const os = uniqueOrientations(sPay.pieces[pl.pieceIndex], sPay.allowRotate, sPay.allowFlip);
      const oi = os.findIndex((o) => atomsSignature(o) === atomsSignature(pl.cells));
      ss = shapeChallengeReg.move(ss, ["p", pl.pieceIndex, oi, pl.x, pl.y, 0])!;
    }
    while (true) {
      const n = shapeChallengeReg.move(ss, ["h"]);
      if (!n) break;
      ss = n;
    }
    expect((ss.payload as ShapePayload).actions.length).toBeLessThan(20);
    const sDone = shapeChallengeReg.move(ss, ["c"]);
    expect(sDone?.result?.event).toBe("helped");
    expect(sDone?.result?.dares).toEqual([]);
  });

  it("R3: dead-end recovery (['x'] & ['x', piece]) and cube assisted selection (['a', idx]) win from ordinary-play cap", () => {
    // Fit dead-end at ordinary cap on 294:0
    const pFit = shapeChallengePuzzles[0];
    const getFitState = (sess: ReturnType<typeof shapeChallengeReg.start>) => {
      const pl = sess.payload as ShapePayload;
      return pl.actions.reduce(
        (st, act) => shapeChallengeEngine.step(st, act, pFit.descriptor)!.state,
        shapeChallengeEngine.create(pFit.descriptor, 0, pl.options),
      );
    };

    for (const recoveryAction of [["x"] as const, ["x", 0] as const]) {
      let s = shapeChallengeReg.start(
        pFit.ref,
        "a",
        "r3-dead-end",
        emptyChallenge(),
        { supportOff: false, ownRead: false },
        pFit.dares.map((d) => d.slot),
      );
      s = shapeChallengeReg.move(s, ["p", 0, 0, 1, 2, 0])!;
      while (true) {
        const next = shapeChallengeReg.move(s, ["m"]);
        if (!next) break;
        s = next;
      }
      expect(challengeShapeHint(getFitState(s)).deadEnd).toBe(true);
      s = shapeChallengeReg.move(s, ["h"])!;
      s = shapeChallengeReg.move(s, recoveryAction)!;
      expect(getFitState(s).placed).toEqual([]);
      s = shapeChallengeReg.move(s, ["h"])!;
      for (let i = 0; i < 8; i++) {
        const h = challengeShapeHint(getFitState(s));
        if (!h.nextPlacement) break;
        s = shapeChallengeReg.move(s, ["s", ...h.nextPlacement])!;
      }
      s = shapeChallengeReg.move(s, ["c"])!;
      expect(s.result?.event).toBe("helped");
      expect(s.result?.dares).toEqual([]);
    }

    // All 9 inline cube puzzles at ordinary cap -> ["h"], ["h"], ["a", ans], ["c"]
    const cubePuzzles = shapeChallengePuzzles.filter(
      (p) => p.descriptor.payload.kind === "cube-opp" || p.descriptor.payload.kind === "cube-fold",
    );
    expect(cubePuzzles).toHaveLength(9);
    for (const p of cubePuzzles) {
      const pay = p.descriptor.payload;
      if (pay.kind !== "cube-opp" && pay.kind !== "cube-fold") continue;
      let s = shapeChallengeReg.start(
        p.ref,
        "a",
        `r3-cube-${p.ref.bank}-${p.ref.puzzle}`,
        emptyChallenge(),
        { supportOff: false, ownRead: false },
        p.dares.map((d) => d.slot),
      );
      const ans = pay.kind === "cube-fold" ? pay.answerIndex : pay.faces.indexOf(pay.answer);
      const wrongs = Array.from({ length: pay.kind === "cube-fold" ? 3 : 6 }, (_, i) => i).filter(
        (i) => i !== ans && (pay.kind === "cube-fold" || i !== pay.askIndex),
      );
      let k = 0;
      while (true) {
        const n = shapeChallengeReg.move(s, ["k", wrongs[k++ % wrongs.length]]);
        if (!n) break;
        s = n;
      }
      s = shapeChallengeReg.move(s, ["h"])!;
      s = shapeChallengeReg.move(s, ["h"])!;
      s = shapeChallengeReg.move(s, ["a", ans])!;
      s = shapeChallengeReg.move(s, ["c"])!;
      expect(s.result?.event, `${p.ref.bank}:${p.ref.puzzle}`).toBe("helped");
      expect(s.result?.dares, `${p.ref.bank}:${p.ref.puzzle}`).toEqual([]);
    }
  });

  it("R4: every packed (p288–p291) and inline (294–295) polyomino piece is strictly 4-connected", () => {
    for (const bank of [288, 289, 290, 291]) {
      const lines = readFileSync(`src/content/puzzles/assets/p${bank}.lipuzzle`, "utf8").trim().split("\n");
      lines.shift();
      for (let i = 0; i < lines.length; i++) {
        const row = JSON.parse(lines[i]) as unknown[];
        const pay = decodeShapeTuple(row[3])!;
        expect(pay, `${bank}:${i}`).not.toBeNull();
        if (pay.kind === "poly") {
          for (let pi = 0; pi < pay.pieces.length; pi++) {
            expect(is4Connected(pay.pieces[pi] as Cell[]), `${bank}:${i} piece ${pi}`).toBe(true);
          }
        }
      }
    }
    for (const p of shapeChallengePuzzles) {
      const pay = p.descriptor.payload;
      if (pay.kind === "poly") {
        for (let pi = 0; pi < pay.pieces.length; pi++) {
          expect(is4Connected(pay.pieces[pi] as Cell[]), `${p.ref.bank}:${p.ref.puzzle} piece ${pi}`).toBe(true);
        }
      }
    }
  });

  it("R5: all 6 invalid cube nets (including bad-u) are 4-connected, fail 3D fold, and are D4-distinct; p292 nets are 4-connected", () => {
    const validKeys = new Set(VALID_CUBE_NETS.map((n) => canonicalNetKey(n.cells)));
    const invalidKeys = new Set<string>();
    for (const bad of INVALID_CUBE_NETS) {
      expect(is4Connected(bad.cells), `${bad.id} must be 4-connected`).toBe(true);
      expect(foldCubeNet(bad.cells).valid, `${bad.id} must fail 3D fold`).toBe(false);
      const key = canonicalNetKey(bad.cells);
      expect(validKeys.has(key), `${bad.id} must not equal a valid net`).toBe(false);
      invalidKeys.add(key);
    }
    expect(invalidKeys.size).toBe(INVALID_CUBE_NETS.length);

    const lines = readFileSync("src/content/puzzles/assets/p292.lipuzzle", "utf8").trim().split("\n");
    lines.shift();
    for (let i = 0; i < lines.length; i++) {
      const row = JSON.parse(lines[i]) as unknown[];
      const pay = decodeShapeTuple(row[3])!;
      expect(pay, `p292:${i}`).not.toBeNull();
      if (pay.kind === "cube-fold") {
        for (let oi = 0; oi < pay.options.length; oi++) {
          expect(is4Connected(pay.options[oi]), `p292:${i} option ${oi}`).toBe(true);
        }
      } else if (pay.kind === "cube-opp") {
        expect(is4Connected(pay.cells), `p292:${i}`).toBe(true);
      }
    }
  });

  it("R6: fixed-order Level 1 School shapeHint always suggests the permitted piece s.placed.length", () => {
    // Exact Codex counterexample: { version: 2, level: 1, mode: 'poly', seed: 1, index: 0 }
    const s: ShapeState = {
      version: 2,
      level: 1,
      mode: "poly",
      seed: 1,
      index: 0,
      total: 4,
      placed: [],
      helped: false,
      hintPiece: null,
    };
    const h0 = shapeHint(s);
    expect(h0.suggestion).not.toBeNull();
    expect(h0.suggestion!.pieceIndex).toBe(0);
    const next = shapePlace(s, h0.suggestion!.pieceIndex, h0.suggestion!.cells, h0.suggestion!.x, h0.suggestion!.y);
    expect(next).not.toBe(s);

    // Exhaustive sweep across 100 seeds × 4 indices (400 tasks), solving every piece via shapeHint!
    for (let seed = 1; seed <= 100; seed++) {
      for (let index = 0; index < 4; index++) {
        let cur: ShapeState = {
          version: 2,
          level: 1,
          mode: "poly",
          seed,
          index,
          total: 4,
          placed: [],
          helped: false,
          hintPiece: null,
        };
        const t = shapeTaskAt(cur);
        for (let step = 0; step < t.pieces.length; step++) {
          const h = shapeHint(cur);
          expect(h.suggestion, `seed=${seed} idx=${index} step=${step}`).not.toBeNull();
          expect(h.suggestion!.pieceIndex, `seed=${seed} idx=${index} step=${step}`).toBe(step);
          const placed = shapePlace(cur, h.suggestion!.pieceIndex, h.suggestion!.cells, h.suggestion!.x, h.suggestion!.y);
          expect(placed, `seed=${seed} idx=${index} step=${step} must advance`).not.toBe(cur);
          cur = placed;
        }
        expect(cur.index).toBe(index + 1);
      }
    }
  });
});

describe("T2 Fix Round 2 regressions (R2-1: zero reserve-burning cycles)", () => {
  it("R2-1a (Cube 294:15): wrong ['a', idx] & post-cap ['k', idx] cannot spend reserve; ['h'] -> ['a', ans] -> ['c'] succeeds", () => {
    const pCube = shapeChallengePuzzles.find((p) => p.ref.bank === 294 && p.ref.puzzle === 15)!;
    const pay = pCube.descriptor.payload;
    if (pay.kind !== "cube-opp") throw new Error("expected cube-opp");
    const ans = pay.faces.indexOf(pay.answer);
    const wrongs = pay.faces.map((_, i) => i).filter((i) => i !== ans && i !== pay.askIndex);

    let s = shapeChallengeReg.start(
      pCube.ref,
      "a",
      "r2-1-cube",
      emptyChallenge(),
      { supportOff: false, ownRead: false },
      pCube.dares.map((d) => d.slot),
    );
    let n = 0;
    while (true) {
      const next = shapeChallengeReg.move(s, ["k", wrongs[n++ % wrongs.length]]);
      if (!next) break;
      s = next;
    }
    s = shapeChallengeReg.move(s, ["h"])!;
    expect(s).toBeTruthy();

    // Neither wrong ['a', idx] nor ordinary wrong ['k', idx] can spend the completion reserve!
    for (const w of wrongs) {
      expect(shapeChallengeReg.move(s, ["a", w])).toBeNull();
      expect(shapeChallengeReg.move(s, ["k", w])).toBeNull();
    }

    s = shapeChallengeReg.move(s, ["h"])!;
    expect(s).toBeTruthy();
    s = shapeChallengeReg.move(s, ["a", ans])!;
    expect(s).toBeTruthy();
    // Repeating ['a', ans] is rejected once selected.
    expect(shapeChallengeReg.move(s, ["a", ans])).toBeNull();
    s = shapeChallengeReg.move(s, ["c"])!;
    expect(s.result?.event).toBe("helped");
    expect(s.result?.dares).toEqual([]);
    expect(s.result?.awards).toBe(0);
    expect(shapeChallengeReg.completionFacts?.(s)).toEqual({ helpUsed: true, failed: false });
  });

  it("R2-1b (Fit 294:0): completable partial draft rejects ['x']/['z']/['r'] and dead-end ['s'], preventing One step -> Clear cycles", () => {
    const pFit = shapeChallengePuzzles[0];
    const getState = (sess: ReturnType<typeof shapeChallengeReg.start>) => {
      const pl = sess.payload as ShapePayload;
      return pl.actions.reduce(
        (st, act) => shapeChallengeEngine.step(st, act, pFit.descriptor)!.state,
        shapeChallengeEngine.create(pFit.descriptor, 0, pl.options),
      );
    };

    let s = shapeChallengeReg.start(
      pFit.ref,
      "a",
      "r2-1-fit",
      emptyChallenge(),
      { supportOff: false, ownRead: false },
      pFit.dares.map((d) => d.slot),
    );
    while (true) {
      const next = shapeChallengeReg.move(s, ["m"]);
      if (!next) break;
      s = next;
    }
    s = shapeChallengeReg.move(s, ["h"])!;
    s = shapeChallengeReg.move(s, ["h"])!;

    // Dead-end placement via assisted ['s'] is rejected so assisted play cannot manufacture a dead end.
    expect(shapeChallengeReg.move(s, ["s", 0, 0, 1, 2])).toBeNull();

    // Valid One-step placement succeeds, and attempting Clear/lift on the completable draft is rejected (0 cycles!).
    const h0 = challengeShapeHint(getState(s));
    expect(h0.nextPlacement).not.toBeNull();
    s = shapeChallengeReg.move(s, ["s", ...h0.nextPlacement!])!;
    expect(s).toBeTruthy();
    expect(shapeChallengeReg.move(s, ["x"])).toBeNull();
    expect(shapeChallengeReg.move(s, ["x", h0.nextPlacement![0]])).toBeNull();
    expect(shapeChallengeReg.move(s, ["z"])).toBeNull();
    expect(shapeChallengeReg.move(s, ["r", h0.nextPlacement![0]])).toBeNull();

    // Continuing One step -> Check finishes cleanly with failed + helped evidence preserved!
    for (let i = 0; i < 8; i++) {
      const h = challengeShapeHint(getState(s));
      if (!h.nextPlacement) break;
      s = shapeChallengeReg.move(s, ["s", ...h.nextPlacement])!;
      expect(s).toBeTruthy();
    }
    s = shapeChallengeReg.move(s, ["c"])!;
    expect(s.result?.event).toBe("helped");
    expect(s.result?.dares).toEqual([]);
    expect(s.result?.awards).toBe(0);
    expect(shapeChallengeReg.completionFacts?.(s)).toEqual({ helpUsed: true, failed: true });
  });

  it("R2-1c (Dead-end non-laundering): direct ['x'] / ['x', 0] on dead end without ['h'] still marks helpUsed and blocks dares", () => {
    const pFit = shapeChallengePuzzles[0];
    const pay = pFit.descriptor.payload;
    if (pay.kind !== "poly") throw new Error("expected poly");
    const sol0 = solveExactCover(pay.silhouette, pay.pieces, { maxSolutions: 1 }).solutions[0];

    for (const act of [["x"] as const, ["x", 0] as const]) {
      let s = shapeChallengeReg.start(
        pFit.ref,
        "a",
        "r2-1-direct-x",
        emptyChallenge(),
        { supportOff: false, ownRead: false },
        pFit.dares.map((d) => d.slot),
      );
      s = shapeChallengeReg.move(s, ["p", 0, 0, 1, 2, 0])!;
      s = shapeChallengeReg.move(s, act)!;
      expect(shapeChallengeReg.completionFacts?.(s)).toEqual({ helpUsed: true, failed: false });
      for (const pl of sol0) {
        const os = uniqueOrientations(pay.pieces[pl.pieceIndex], pay.allowRotate, pay.allowFlip);
        const oi = os.findIndex((o) => atomsSignature(o) === atomsSignature(pl.cells));
        s = shapeChallengeReg.move(s, ["p", pl.pieceIndex, oi, pl.x, pl.y, 0])!;
      }
      s = shapeChallengeReg.move(s, ["c"])!;
      expect(s.result?.event).toBe("helped");
      expect(s.result?.dares).toEqual([]);
      expect(s.result?.awards).toBe(0);
    }
  });
});
