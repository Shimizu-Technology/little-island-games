import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyBoardSave, catalog, createSession, playAgain, undo, validBoardSession } from "../src/board";
import * as reef from "../src/board/reef-sweep/engine";
import {
  boardFromMines,
  candidateMines,
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
  descriptorFromPayload,
  REEF_DEEP_BANK,
  REEF_FIRST_DARE,
  reefChallengeEngine,
  reefDeepPuzzles,
  reefPackedBanks,
} from "../src/board/reef-sweep/challenge";
import { bankLoader } from "../src/puzzles/catalog";
import { bankTransport } from "../src/puzzles/bankAssets";
import { sha256Hex } from "../src/puzzles/sha256";
import { validChallengeSession } from "../src/state/challenge";
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

    // Deterministic clock probe (P2-2): candidate finishing at t=10 past budgetMs=5 MUST return exhausted, never found.
    let clockCall = 0;
    const midCandidateTimeout = await redrawBoardTask(
      19,
      7,
      0,
      { cancelled: false },
      {
        budgetMs: 5,
        now: () => [0, 1, 10][Math.min(clockCall++, 2)],
        yieldTurn,
      }
    );
    expect(midCandidateTimeout.status).toBe("exhausted");
    expect(midCandidateTimeout.durationMs).toBe(10);

    // P2-2: moveWithAttempt carries proven attempt directly; validate accepts it and rejects forged unsolvable attempts.
    const foundRes = redrawBoard(19, 7, 0);
    expect(foundRes.status).toBe("found");
    if (foundRes.status === "found") {
      const startPos = reef.create(19, 7);
      const opened = reef.moveWithAttempt(startPos, 0, foundRes.attempt);
      expect(opened.attempt).toBe(foundRes.attempt);
      expect(opened.board).toEqual(foundRes.board);
      expect(reef.validate(opened)).toBe(true);
      // Legacy v2 save without `attempt` still validates.
      const { attempt: _omit, ...withoutAttempt } = opened;
      void _omit;
      expect(reef.validate(withoutAttempt)).toBe(true);
      // Undoing back to unopened clears `attempt` cleanly.
      const s = { ...createSession("reef-sweep", { seed: 19, size: 7 }), position: opened };
      const undone = undo(s);
      expect(undone.position.attempt).toBeUndefined();
      expect(undone.position.moves).toEqual([]);
      // Unopened position carrying a forged attempt is rejected.
      expect(reef.validate({ ...startPos, attempt: 0 })).toBe(false);
      // Verify candidateMines matches the recorded attempt.
      expect(boardFromMines(7, candidateMines(19, 7, 0, foundRes.attempt))).toEqual(opened.board);
    }
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

    // Hint ladder produces sound Look -> Think -> One step -> Show me step (teaching prerequisite flag before derived open).
    let state = reefChallengeEngine.create(first.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
    const h0 = challengeHintStep(state);
    expect(h0?.cell).toBe(first.descriptor.start);
    state = reefChallengeEngine.step(state, ["ho", first.descriptor.start], first.descriptor)!.state;
    const h1 = challengeHintStep(state);
    expect(h1).not.toBeNull();
    if (h1!.kind === "flag") {
      expect(board[h1!.cell]).toBe(-1);
      // Applying the prerequisite flag unlocks the next safe opening with truthful flagged-urchin wording.
      state = reefChallengeEngine.step(state, ["ho", h1!.cell], first.descriptor)!.state;
      const h2 = challengeHintStep(state);
      expect(h2).not.toBeNull();
      expect(h2!.reason.oneStep).not.toContain("already has all its urchins placed");
    } else {
      expect(board[h1!.cell]).not.toBe(-1);
    }

    // Speech stage file is design-only, non-shipping.
    expect(JSON.parse(readFileSync("scripts/learn/p4-reef-sweep.stage", "utf8"))).toEqual({
      status: "design-only",
      shipping: false,
    });
    expect(Object.keys(JSON.parse(readFileSync("scripts/learn/p4-reef-sweep.json", "utf8")))).toContain("p4-reef-sweep-rules");
  });
});

describe("Fix Round 1 regressions (P1-1, P2-3, P3-6)", () => {
  it("P1-1 Reproduction A: packed bank 466:20 completes from ordinary reserve boundary via both compact and 4-step ladders", async () => {
    const prevRead = bankTransport.read;
    bankTransport.read = async (name) => readFileSync(`src/content/puzzles/assets/${name}.lipuzzle`, "utf8");
    try {
      const packText = readFileSync("src/content/puzzles/assets/p466.lipuzzle", "utf8").trimEnd().split("\n");
      const ref = {
        bank: 466,
        puzzle: 20,
        engine: "reef-sweep",
        rules: 1,
        hash: sha256Hex(JSON.stringify(JSON.parse(packText[21]))),
      };
      await reefRegistration.packed!.prepare(ref);
      const entry = await bankLoader().entry(reefSweepAdapter, "reef-sweep", 466 * 1024 + 20);
      const d = descriptorFromPayload(entry.payload, "subset-7");

      for (const mode of ["compact", "four-step"] as const) {
        let s = reefRegistration.start(ref, "family", `packed-capacity-max-wrapper-${mode}`, emptyChallenge(), { supportOff: false, ownRead: false }, []);
        let st = reefChallengeEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false });
        const apply = (a: unknown) => {
          const next = reefRegistration.move(s, a);
          if (!next) return false;
          s = next;
          st = reefChallengeEngine.step(st, a as never, d)!.state;
          return true;
        };
        expect(apply(["o", d.start])).toBe(true);
        const flagCell = st.marks.findIndex((m) => m === 0);
        while (apply(["f", flagCell])) {
          // Fill right up to the ordinary reserve boundary.
        }
        // Complete via Help/Show me inside the reserve.
        if (mode === "compact") {
          expect(apply(["h", 0])).toBe(true);
          for (let k = 0; k < 100 && !s.result; k++) {
            const step = challengeHintStep(st);
            expect(step).not.toBeNull();
            expect(apply(["ho", step!.cell])).toBe(true);
          }
        } else {
          for (let k = 0; k < 220 && !s.result; k++) {
            const h = st.hintStage;
            const step = challengeHintStep(st);
            expect(step).not.toBeNull();
            const action = h === null ? ["h", 0] : h === 0 ? ["h", 1] : h === 1 ? ["h", 2] : ["ho", step!.cell];
            expect(apply(action)).toBe(true);
          }
        }
        expect(s.result?.event).toBe("helped");
        expect(s.result?.dares).toEqual([]);
        expect(st.marks.filter((m) => m === 1)).toHaveLength(41);
        expect(Buffer.byteLength(JSON.stringify(s))).toBeLessThanOrEqual(4096);
        expect(validChallengeSession(s, s.owner, reefRegistration.catalog)).toBe(true);
      }
    } finally {
      bankTransport.read = prevRead;
    }
  });

  it("P1-1 Reproduction B: late miss at ordinary boundary allows Undo and Start again and finishes with monotonic audit", () => {
    const p = reefDeepPuzzles[8];
    for (const recovery of [["u"] as const, ["z"] as const]) {
      let s = reefRegistration.start(
        p.ref,
        "family",
        `cap-miss-${recovery[0]}`,
        emptyChallenge(),
        { supportOff: false, ownRead: false },
        p.dares.map((d) => d.slot)
      );
      let st = reefChallengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
      const apply = (a: unknown) => {
        const next = reefRegistration.move(s, a);
        if (!next) return false;
        s = next;
        st = reefChallengeEngine.step(st, a as never, p.descriptor)!.state;
        return true;
      };
      expect(apply(["o", p.descriptor.start])).toBe(true);
      while (apply(["f", p.descriptor.mines[0]])) {
        // Fill to ordinary reserve boundary.
      }
      // Late miss is accepted.
      expect(apply(["o", p.descriptor.mines[1]])).toBe(true);
      expect(st.outcome).toBe(1);
      // Recovery action (Undo or Start again) MUST succeed!
      expect(apply(recovery)).toBe(true);
      expect(st.outcome).toBeNull();
      // Complete with Help/Show me -> helped finish, zero dares laundered.
      expect(apply(["h", 0])).toBe(true);
      for (let k = 0; k < 100 && !s.result; k++) {
        const step = challengeHintStep(st);
        expect(step).not.toBeNull();
        expect(apply(["ho", step!.cell])).toBe(true);
      }
      expect(s.result?.event).toBe("helped");
      expect(s.result?.dares).toEqual([]);
      expect(Buffer.byteLength(JSON.stringify(s))).toBeLessThanOrEqual(4096);
      expect(validChallengeSession(s, "family", reefRegistration.catalog)).toBe(true);
    }
  });

  it("P2-3: every coupled hint across bank 467 names a mathematically complete premise set with zero counterexamples", () => {
    const lines = readFileSync("src/content/puzzles/assets/p467.lipuzzle", "utf8").trimEnd().split("\n").slice(1);
    let checkedCoupled = 0;

    function hasCounterexample(
      size: number,
      total: number,
      visible: readonly number[],
      namedClues: readonly number[],
      target: number,
      wantSafe: boolean,
      useTotal: boolean
    ): boolean {
      const closed: number[] = [];
      for (let i = 0; i < size * size; i++) if (visible[i] < 0) closed.push(i);
      const cs = namedClues.map((clue) => ({
        cells: neighbors(size, clue).filter((nb) => visible[nb] < 0),
        v: visible[clue],
      }));
      const inFront = new Set<number>(cs.flatMap((c) => c.cells));
      const front = closed.filter((i) => inFront.has(i));
      const outside = closed.filter((i) => !inFront.has(i));
      const used = cs.map(() => 0);
      const left = cs.map((c) => c.cells.length);
      const touch = front.map((cell) => cs.flatMap((c, ci) => (c.cells.includes(cell) ? [ci] : [])));
      const targetPos = front.indexOf(target);
      let foundBad = false;
      function dfs(p: number, mines: number): void {
        if (foundBad) return;
        if (useTotal && (mines > total || mines + (front.length - p) + outside.length < total)) return;
        if (p === front.length) {
          if (used.some((u, ci) => u !== cs[ci].v)) return;
          if (useTotal) {
            const rem = total - mines;
            if (rem < 0 || rem > outside.length) return;
            if (targetPos === -1 && ((wantSafe && rem > 0) || (!wantSafe && rem < outside.length))) foundBad = true;
          } else if (targetPos === -1) {
            foundBad = true;
          }
          return;
        }
        const vals: readonly (0 | 1)[] = p === targetPos ? (wantSafe ? [1] : [0]) : [0, 1];
        for (const val of vals) {
          if (touch[p].some((ci) => used[ci] + val > cs[ci].v || used[ci] + val + left[ci] - 1 < cs[ci].v)) continue;
          for (const ci of touch[p]) {
            used[ci] += val;
            left[ci]--;
          }
          if (p === targetPos) {
            // Check whether ANY completion exists for the bad assignment.
            let badComplete = false;
            const checkRest = (q: number, m2: number): void => {
              if (badComplete) return;
              if (useTotal && (m2 > total || m2 + (front.length - q) + outside.length < total)) return;
              if (q === front.length) {
                if (used.some((u, ci) => u !== cs[ci].v)) return;
                if (!useTotal || (total - m2 >= 0 && total - m2 <= outside.length)) badComplete = true;
                return;
              }
              for (const v2 of [0, 1] as const) {
                if (touch[q].some((ci) => used[ci] + v2 > cs[ci].v || used[ci] + v2 + left[ci] - 1 < cs[ci].v)) continue;
                for (const ci of touch[q]) {
                  used[ci] += v2;
                  left[ci]--;
                }
                checkRest(q + 1, m2 + v2);
                for (const ci of touch[q]) {
                  used[ci] -= v2;
                  left[ci]++;
                }
              }
            };
            checkRest(p + 1, mines + val);
            if (badComplete) foundBad = true;
          } else {
            dfs(p + 1, mines + val);
          }
          for (const ci of touch[p]) {
            used[ci] -= val;
            left[ci]++;
          }
          if (foundBad) return;
        }
      }
      dfs(0, 0);
      return foundBad;
    }

    for (let idx = 0; idx < lines.length; idx++) {
      const [n, start, mines] = JSON.parse(lines[idx])[3] as [number, number, number[]];
      const board = boardFromMines(n, mines);
      let marks = Array<number>(n * n).fill(0);
      const open = (cell: number) => {
        const q = [cell];
        while (q.length) {
          const c = q.pop()!;
          if (marks[c] === 1) continue;
          marks[c] = 1;
          if (board[c] === 0) for (const nb of neighbors(n, c)) if (marks[nb] === 0) q.push(nb);
        }
      };
      open(start);
      for (let k = 0; k < 49; k++) {
        const view = publicView(n, mines.length, board, marks);
        const res = deducePublic(view);
        if (res.status !== "deduced") break;
        if (res.tier === "coupled") {
          checkedCoupled++;
          const citesTotal = res.step.reason.oneStep.includes(`${mines.length} sea urchins`);
          expect(
            hasCounterexample(n, mines.length, view.visible, res.step.clues, res.step.cell, res.step.kind !== "flag", citesTotal),
            `467:${idx} coupled step cell=${res.step.cell} clues=${res.step.clues.join(",")}`
          ).toBe(false);
          if (idx === 0) {
            // Codex's explicit counterexample [9,30,32,33,40,41,43,46] MUST violate the named clues!
            const badMines = new Set([9, 30, 32, 33, 40, 41, 43, 46]);
            const violates = res.step.clues.some(
              (c) => neighbors(n, c).filter((nb) => badMines.has(nb)).length !== view.visible[c]
            );
            expect(violates).toBe(true);
          }
        }
        open(res.step.cell);
      }
    }
    expect(checkedCoupled).toBeGreaterThanOrEqual(30);
  });

  it("P3-6: certifiedFallbackSync reports the true global bank-468 Deep Water puzzle ordinal", () => {
    const fb6 = certifiedFallbackSync(6, 42);
    expect(fb6.bank).toBe(468);
    expect(fb6.puzzle).toBe(4);
    expect(reefDeepPuzzles[4].descriptor.start).toBe(fb6.start);
    expect(reefDeepPuzzles[4].descriptor.mines).toEqual(fb6.mines);

    for (const size of [5, 6, 7] as const) {
      for (const seed of [1, 7, 19, 42, 99]) {
        const fb = certifiedFallbackSync(size, seed);
        expect(fb.bank).toBe(468);
        const deep = reefDeepPuzzles[fb.puzzle];
        expect(deep).toBeDefined();
        expect(deep.ref.puzzle).toBe(fb.puzzle);
        expect(deep.descriptor.size).toBe(fb.size);
        expect(deep.descriptor.start).toBe(fb.start);
        expect(deep.descriptor.mines).toEqual(fb.mines);
        expect(deep.descriptor.band).toBe(fb.band);
      }
    }
  });
});
