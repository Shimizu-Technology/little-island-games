import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyBoardSave, catalog, createSession, playAgain, undo, validBoardSession } from "../src/board";
import * as reef from "../src/board/reef-sweep/engine";
import {
  boardFromMines,
  legacyBoard,
  REDRAW_MAX_ATTEMPTS,
  redrawBoard,
  urchins,
} from "../src/board/reef-sweep/redraw";
import { redrawBoardTask } from "../src/board/reef-sweep/redrawTask";
import {
  deducePublic,
  findCounterfactualTwins,
  neighbors,
  publicView,
  solvePublicNoGuess,
} from "../src/board/reef-sweep/solver";
import {
  challengeHintStep,
  REEF_DEEP_BANK,
  REEF_FIRST_DARE,
  reefChallengeEngine,
  reefDeepPuzzles,
  reefPackedBanks,
} from "../src/board/reef-sweep/challenge";
import { certifiedFallbackSync, loadCertifiedFallback } from "../src/board/reef-sweep/fallback";
import { registration as reefRegistration } from "../src/challenge/registrations/reef-sweep";
import { reefSweepAdapter, type ReefPayload } from "../src/puzzles/adapters/reef-sweep";
import { parsePack, type FamilyManifest, type RootIndex } from "../src/puzzles/bank";
import { decodeRow } from "../src/puzzles/descriptor";
import { emptyChallenge } from "../src/state/challenge";
import { emptySave, parseSave } from "../src/state/validation";

describe("BD-08: Reef Sweep deterministic first-tap no-guess redraw", () => {
  it("preserves every opening cell across sizes 5, 6 and 7 with deterministic zero-guess solvability", () => {
    for (const size of [5, 6, 7] as const) {
      const count = size * size;
      let maxAttemptsUsed = 0;
      for (const seed of [1, 7, 42]) {
        for (let first = 0; first < count; first++) {
          const r1 = redrawBoard(seed, size, first);
          const r2 = redrawBoard(seed, size, first);
          expect(r1.status).toBe("found");
          expect(r2.status).toBe("found");
          if (r1.status !== "found" || r2.status !== "found") continue;
          expect(r1.mines).toEqual(r2.mines);
          expect(r1.board).toEqual(r2.board);
          expect(r1.board[first]).toBe(0);
          expect(neighbors(size, first).every((nb) => r1.board[nb] >= 0)).toBe(true);
          expect(r1.mines).toHaveLength(urchins(size));
          maxAttemptsUsed = Math.max(maxAttemptsUsed, r1.attempt);

          const solved = solvePublicNoGuess(r1.board, size, first);
          expect(solved.status).toBe("solved");
        }
      }
      expect(maxAttemptsUsed).toBeLessThan(REDRAW_MAX_ATTEMPTS);
    }
  });

  it("runs redrawBoardTask asynchronously off the frame callback, supports cancellation and bounded exhaustion", async () => {
    let yields = 0;
    const yieldTurn = async () => {
      yields++;
      await Promise.resolve();
    };
    const cancel = { cancelled: false };
    const found = await redrawBoardTask(19, 7, 0, cancel, { yieldTurn });
    expect(found.status).toBe("found");
    expect(yields).toBeGreaterThanOrEqual(1);

    // Pre-cancelled task never does redraw work.
    const alreadyCancelled = { cancelled: true };
    const cancelledRes = await redrawBoardTask(19, 7, 0, alreadyCancelled, { yieldTurn });
    expect(cancelledRes.status).toBe("cancelled");

    // Exhausted attempt cap returns exhausted cleanly without silently moving the tap.
    const exhaustedAttempts = await redrawBoardTask(19, 7, 0, { cancelled: false }, { maxAttempts: 0, yieldTurn });
    expect(exhaustedAttempts.status).toBe("exhausted");

    // Exhausted wall-clock budget returns exhausted cleanly.
    let fakeTime = 0;
    const exhaustedTime = await redrawBoardTask(
      19,
      7,
      0,
      { cancelled: false },
      {
        budgetMs: 5,
        now: () => {
          fakeTime += 10;
          return fakeTime;
        },
        yieldTurn,
      }
    );
    expect(exhaustedTime.status).toBe("exhausted");
  });

  it("preserves legacy paused rounds unchanged via version marker while new rounds use rules: 2", () => {
    // Legacy round (no rules field) replays using exact legacy single-shuffle board.
    let legacy = reef.createLegacy(13, 7);
    expect(legacy.rules).toBeUndefined();
    legacy = reef.move(legacy, 0);
    expect(legacy.board).toEqual(legacyBoard(13, 7, 0));
    expect(reef.validate(legacy)).toBe(true);

    // Wrapping legacy round in a saved BoardSession preserves legacy board through save/parse and undo.
    const legacySession = { ...createSession("reef-sweep", { seed: 13, size: 7 }), position: legacy };
    expect(validBoardSession(legacySession)).toBe(true);
    const saved = applyBoardSave(emptySave(), "reef-sweep", legacySession, undefined, 0, 0);
    const parsed = parseSave(JSON.stringify(saved));
    expect(parsed.board?.["reef-sweep"]?.position).toEqual(legacy);

    // Make a second move on the legacy board, then undo: legacy board stays intact.
    const nextSafe = legacy.board.findIndex((v, i) => v >= 0 && legacy.marks[i] === 0);
    const legacyStep2 = { ...legacySession, position: reef.move(legacy, nextSafe) };
    expect(undo(legacyStep2).position).toEqual(legacy);

    // New rounds carry rules: 2 and playAgain starts a fresh rules: 2 round.
    const fresh = createSession("reef-sweep", { seed: 13, size: 7 });
    expect(fresh.position.rules).toBe(2);
    expect(validBoardSession(fresh)).toBe(true);
    const afterFirst = { ...fresh, position: reef.move(fresh.position, 0) };
    expect(validBoardSession(afterFirst)).toBe(true);
    expect(solvePublicNoGuess(afterFirst.position.board, 7, 0).status).toBe("solved");
    expect(playAgain(afterFirst, 55).position.rules).toBe(2);
    expect(playAgain(afterFirst, 55).position.fallback).toBeUndefined();
  });

  it("validates explicitly accepted certified fallback positions and rejects forged fallbacks", () => {
    const fb = certifiedFallbackSync(7, 99);
    let pos = reef.createFallbackPosition(99, 7, { start: fb.start, mines: fb.mines });
    expect(reef.validate(pos)).toBe(true);
    // Cannot open a cell other than the shown start on move 1.
    const wrongStart = fb.start === 0 ? 1 : 0;
    expect(reef.move(pos, wrongStart)).toBe(pos);
    // Opening the shown start works and validates cleanly.
    pos = reef.move(pos, fb.start);
    expect(reef.validate(pos)).toBe(true);
    expect(pos.board[fb.start]).toBe(0);

    // Undo restores the unopened fallback board cleanly.
    const fbSession = { ...createSession("reef-sweep", { seed: 99, size: 7 }), position: pos };
    expect(undo(fbSession).position.fallback).toEqual({ start: fb.start, mines: fb.mines });
    expect(undo(fbSession).position.moves).toEqual([]);

    // Forged rules or forged unsolvable fallback is rejected.
    expect(reef.validate({ ...pos, rules: 3 })).toBe(false);
    expect(reef.validate({ ...pos, fallback: { start: fb.start, mines: [0, 1] } })).toBe(false);
  });

  it("updates docs/BOARD_CLASSICS.md and catalog rule to remove the old guess caveat", () => {
    const doc = readFileSync("docs/BOARD_CLASSICS.md", "utf8");
    expect(doc).not.toContain("Some boards require a guess.");
    expect(doc).toContain("zero guesses");
    expect(doc).toContain("certified fallback");
    expect(catalog["reef-sweep"].rule).not.toMatch(/careful guess/i);
  });
});

describe("BD-09: Pure public-constraint deduction solver & counterfactuals", () => {
  it("solves single-cell, subset/difference (1-2-1), and coupled/remaining-urchin deductions strictly from public info", () => {
    // 1. Subset / overlap difference along row 0 of a 5x5 board:
    // Row 0 closed: [0, 1, 2, 3, 4], mines at [1, 3] (2 urchins). Rows 1..4 [5..24] revealed.
    // Row 1 clues: 5->1 ({0,1}), 6->1 ({0,1,2}), 7->2 ({1,2,3}), 8->1 ({2,3,4}), 9->1 ({3,4}).
    // Single-cell stalls (every clue has 0 < rem < |U|); subset {0,1} c {0,1,2} proves cell 2 is safe!
    const subsetMines = [1, 3];
    const subsetBoard = boardFromMines(5, subsetMines);
    const subsetMarks = Array.from({ length: 25 }, (_, i) => (i >= 5 ? 1 : 0));
    const subView = publicView(5, 2, subsetBoard, subsetMarks);
    const singleOnly = deducePublic(subView, { maxTier: "single-cell" });
    expect(singleOnly.status).toBe("stalled");
    const withSubset = deducePublic(subView, { maxTier: "subset" });
    expect(withSubset.status).toBe("deduced");
    if (withSubset.status === "deduced") {
      expect(withSubset.tier).toBe("subset");
      expect(withSubset.step.clues.length).toBeGreaterThanOrEqual(2);
      expect(withSubset.step.kind).toBe("open");
      expect(withSubset.safe).toContain(2);
      expect(subsetBoard[withSubset.step.cell]).not.toBe(-1);
    }

    // 2. Coupled / remaining-urchin count:
    // A single revealed "1" at B2 (cell 6) on a 5x5 reef with totalUrchins = 1:
    // Its 8 closed neighbors must hold the 1 remaining urchin, so all 16 outside cells are proven safe!
    const countView = {
      size: 5,
      totalUrchins: 1,
      visible: Array.from({ length: 25 }, (_, i) => (i === 6 ? 1 : -1)),
    };
    expect(deducePublic(countView, { maxTier: "subset" }).status).toBe("stalled");
    const coupled = deducePublic(countView, { maxTier: "coupled" });
    expect(coupled.status).toBe("deduced");
    if (coupled.status === "deduced") {
      expect(coupled.tier).toBe("coupled");
      expect(coupled.step.kind).toBe("open");
      expect(coupled.safe).toContain(24);
      expect(neighbors(5, 6)).not.toContain(coupled.step.cell);
    }
  });

  it("never leaks hidden mines across counterfactual twins and calmly flags wrong player flags", () => {
    // Corner opening on 7x7 leaves ample hidden interior cells so counterfactual twins exist.
    const pos = reef.move(reef.create(7, 7), 0);
    const actualMines = pos.board.flatMap((v, i) => (v === -1 ? [i] : []));
    const view = publicView(7, 8, pos.board, pos.marks);
    const twins = findCounterfactualTwins(view, actualMines, 0, 3);
    expect(twins.length).toBeGreaterThan(0);

    const baseStep = reef.publicHintStep(pos);
    const baseChoice = reef.choose(pos, "challenge");
    for (const twinMines of twins) {
      expect(twinMines).not.toEqual(actualMines);
      const twinBoard = boardFromMines(7, twinMines);
      const twinPos = { ...pos, board: twinBoard };
      expect(reef.publicHintStep(twinPos)).toEqual(baseStep);
      expect(reef.choose(twinPos, "challenge")).toBe(baseChoice);
    }

    // Wrong player flag on a proven safe cell must NEVER trick hints into opening an urchin!
    expect(baseStep).not.toBeNull();
    if (baseStep && baseStep.kind === "open") {
      const flaggedSafe = reef.move(pos, baseStep.cell + 49);
      const stepAfterWrongFlag = reef.publicHintStep(flaggedSafe);
      expect(stepAfterWrongFlag).not.toBeNull();
      if (stepAfterWrongFlag) {
        if (stepAfterWrongFlag.kind === "open") {
          expect(pos.board[stepAfterWrongFlag.cell]).not.toBe(-1);
        } else if (stepAfterWrongFlag.kind === "unflag") {
          expect(stepAfterWrongFlag.cell).toBe(baseStep.cell);
        }
      }
    }
  });
});

describe("BK-21: Certified 128-entry bank, receipts & tiered deduction Challenge", () => {
  it("ships 128 semantically distinct certified boards across 4 tiered bands (slots 464-467) with receipts", async () => {
    const root = JSON.parse(readFileSync("src/content/puzzles/root.json", "utf8")) as RootIndex;
    const entry = root.families.find((f) => f[0] === "reef-sweep");
    expect(entry).toBeDefined();
    expect(entry![3]).toBe(128);
    expect(entry![4]).toBe(4);

    const manifest = JSON.parse(readFileSync(`src/content/puzzles/assets/${entry![1]}.lipuzzle`, "utf8")) as FamilyManifest;
    expect(manifest.packs.map((p) => p[0])).toEqual([464, 465, 466, 467]);

    const seenSemantic = new Set<string>();
    const expectedCeiling: Record<string, string> = {
      "single-5": "single-cell",
      "single-6": "single-cell",
      "subset-7": "subset",
      "coupled-7": "coupled",
    };

    for (const packRow of manifest.packs) {
      const slot = packRow[0];
      const band = manifest.bands[packRow[5]];
      const receiptPath = `content/puzzles/receipts/reef-sweep/slot-${String(slot).padStart(4, "0")}.json`;
      expect(existsSync(receiptPath)).toBe(true);
      const parsed = parsePack(readFileSync(`src/content/puzzles/assets/p${slot}.lipuzzle`, "utf8"), packRow, manifest);
      expect(parsed).not.toBeNull();
      expect(parsed!.rows).toHaveLength(32);

      for (const line of parsed!.rows) {
        const core = decodeRow<ReefPayload>(line, band, reefSweepAdapter);
        expect(core).not.toBeNull();
        const key = reefSweepAdapter.semanticKey(core!);
        expect(seenSemantic.has(key)).toBe(false);
        seenSemantic.add(key);

        const board = boardFromMines(core!.payload.size, core!.payload.mines);
        const solved = solvePublicNoGuess(board, core!.payload.size, core!.payload.start);
        expect(solved.status).toBe("solved");
        if (solved.status === "solved") expect(solved.ceiling).toBe(expectedCeiling[band]);

        // Counterfactual tier check on subset-7 and coupled-7.
        if (band === "subset-7") {
          expect(solvePublicNoGuess(board, core!.payload.size, core!.payload.start, { maxTier: "single-cell" }).status).toBe("stalled");
        } else if (band === "coupled-7") {
          expect(solvePublicNoGuess(board, core!.payload.size, core!.payload.start, { maxTier: "subset" }).status).toBe("stalled");
        }
      }
    }
    expect(seenSemantic.size).toBe(128);

    // Fallback loader returns certified boards for all live sizes 5, 6, 7.
    for (const size of [5, 6, 7] as const) {
      const fb = await loadCertifiedFallback(size, 42);
      expect(fb.size).toBe(size);
      expect(fb.mines).toHaveLength(urchins(size));
      expect(solvePublicNoGuess(boardFromMines(size, fb.mines), size, fb.start).status).toBe("solved");
    }
  });

  it("registers Deep Water bank 468, packed bands 464-467, dares 3350-3373, and replays dares honestly", () => {
    expect(reefDeepPuzzles).toHaveLength(12);
    expect(reefPackedBanks.map((b) => b.slot)).toEqual([464, 465, 466, 467]);
    expect(reefRegistration.game).toBe("reef-sweep");
    expect(reefRegistration.cove).toBe(false);

    const allDareSlots = reefDeepPuzzles.flatMap((p) => p.dares.map((d) => d.slot));
    expect(Math.min(...allDareSlots)).toBe(REEF_FIRST_DARE);
    expect(Math.max(...allDareSlots)).toBeLessThanOrEqual(3399);
    expect(new Set(allDareSlots).size).toBe(allDareSlots.length);

    // Clean replay of a Deep Water puzzle credits both clean and par dares.
    const first = reefDeepPuzzles[0];
    expect(first.ref.bank).toBe(REEF_DEEP_BANK);
    const board = boardFromMines(first.descriptor.size, first.descriptor.mines);
    const witness = solvePublicNoGuess(board, first.descriptor.size, first.descriptor.start);
    expect(witness.status).toBe("solved");
    if (witness.status !== "solved") return;

    const progress = emptyChallenge();
    let session = reefRegistration.start(
      first.ref,
      "family",
      "reef-clean-1",
      progress,
      { supportOff: false, ownRead: false },
      first.dares.map((d) => d.slot)
    );
    for (const cell of witness.opens) {
      const next = reefRegistration.move(session, ["o", cell]);
      expect(next).not.toBeNull();
      session = next!;
    }
    expect(session.result).not.toBeNull();
    expect(session.result!.event).toBe("independent");
    expect(session.result!.dares).toEqual(first.dares.map((d) => d.slot).sort((a, b) => a - b));

    // Using Help or hitting an urchin + undoing still solves calmly, but does NOT claim the independent clean dare.
    let helped = reefRegistration.start(
      first.ref,
      "family",
      "reef-helped-1",
      progress,
      { supportOff: false, ownRead: false },
      [first.dares[0].slot]
    );
    helped = reefRegistration.move(helped, ["o", first.descriptor.start])!;
    // Hit an urchin, then undo calmly.
    const mine = first.descriptor.mines[0];
    helped = reefRegistration.move(helped, ["o", mine])!;
    expect(helped.result).toBeNull();
    helped = reefRegistration.move(helped, ["u"])!;
    // Finish using public hint ladder ("Show me" steps).
    for (let guard = 0; guard < 60 && !helped.result; guard++) {
      const st = reefChallengeEngine.create(first.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
      void st;
      // Step via engine replay using witness opens not yet opened.
      const nextOpen = witness.opens.find((c) => {
        const res = reefRegistration.move(helped, ["o", c]);
        if (res) {
          helped = res;
          return true;
        }
        return false;
      });
      if (nextOpen === undefined) break;
    }
    expect(helped.result).not.toBeNull();
    expect(helped.result!.event).toBe("helped");
    expect(helped.result!.dares).toEqual([]);

    // Hint ladder produces sound Look -> Think -> One step -> Show me step.
    let state = reefChallengeEngine.create(first.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
    const h0 = challengeHintStep(state);
    expect(h0?.cell).toBe(first.descriptor.start);
    state = reefChallengeEngine.step(state, ["ho", first.descriptor.start], first.descriptor)!.state;
    const h1 = challengeHintStep(state);
    expect(h1).not.toBeNull();
    expect(board[h1!.cell]).not.toBe(-1);

    // Speech stage file is design-only, non-shipping.
    expect(JSON.parse(readFileSync("scripts/learn/p4-reef-sweep.stage", "utf8"))).toEqual({
      status: "design-only",
      shipping: false,
    });
    expect(Object.keys(JSON.parse(readFileSync("scripts/learn/p4-reef-sweep.json", "utf8")))).toContain("p4-reef-sweep-rules");
  });
});
