import { describe, expect, it } from "vitest";
import { createSession, engines, playAgain, undo, validBoardSession } from "../src/board";
import { blank, rng, type Position } from "../src/board/types";
import * as coconut from "../src/board/coconut-drop/engine";
import * as nets from "../src/board/fishing-nets/engine";
import * as canoes from "../src/board/hidden-canoes/engine";
import * as pits from "../src/board/shell-pits/engine";
import { currentPolicy, policyById } from "../src/playPolicies/policies";
import { headStarts, rivalFor, rivalNames } from "../src/playPolicies/rivals";
import { CanoesCoverage, reviewGame, type KeyMoment } from "../src/playPolicies/review";
import { reviewCheckers } from "../src/playPolicies/checkersReview";
import { policyPlayer } from "../src/playPolicies/benchmark";
import { checkersMove, checkersMoves, createCheckers, checkersHeadStartSquare, type CheckersState } from "../src/games/checkers";
import { defaultOptions } from "../src/games/types";
import { validSession } from "../src/state/validation";

const finish = (t: { done: boolean; step: (n: number) => boolean; result: () => KeyMoment | null }) => {
  while (!t.step(4096));
  return t.result();
};
const play = (game: "coconut-drop" | "fishing-nets" | "shell-pits" | "hidden-canoes", p: Position, moves: number[]) =>
  moves.reduce((s, m) => {
    const next = engines[game].move(s, m);
    if (next === s) throw new Error(`illegal ${m}`);
    return next;
  }, p);

describe("rivals", () => {
  it("say what the policy that plays actually does, with one name per strength", () => {
    for (const game of ["coconut-drop", "fishing-nets", "hidden-canoes", "shell-pits"] as const)
      for (const strength of ["gentle", "growing", "challenge"] as const)
        expect(rivalFor(game, strength).plays).toBe(currentPolicy(game, strength).plays);
    expect(new Set(rivalNames).size).toBe(3);
    expect(rivalFor("checkers", "challenge").plays).toBe("Looks four moves ahead.");
  });
  it("Coconut Drop: Pebble takes a four, Coral blocks yours, Ray builds two threats at once", () => {
    const empty = coconut.create(1, 7, 1);
    // Rival (seat 1) has three in a row along the bottom: columns 0-2.
    const three = play("coconut-drop", empty, [0, 0, 1, 1, 2, 6]);
    expect(three.turn).toBe(1);
    for (const s of ["gentle", "growing", "challenge"] as const)
      expect(policyPlayer("coconut-drop", currentPolicy("coconut-drop", s))(three)).toBe(3);
    // You (seat 0) threaten the bottom row; Coral and Ray block.
    const threat = play("coconut-drop", coconut.create(1, 7, 0), [0, 6, 1, 6, 2]);
    expect(threat.turn).toBe(1);
    for (const s of ["growing", "challenge"] as const)
      expect(policyPlayer("coconut-drop", currentPolicy("coconut-drop", s))(threat)).toBe(3);
    // Two in the middle of an open bottom row: Ray makes an open three (two ways to finish).
    const fork = play("coconut-drop", coconut.create(1, 7, 1), [2, 6, 3, 6]);
    const m = policyPlayer("coconut-drop", currentPolicy("coconut-drop", "challenge"))(fork)!;
    const after = coconut.move(fork, m);
    const wins = coconut.legal({ ...after, turn: 1 }).filter((c) => coconut.move({ ...after, turn: 1 }, c).outcome === 1);
    expect(wins.length).toBeGreaterThanOrEqual(2);
  });
  it("Fishing Nets: Coral closes boxes and avoids third sides; Ray hands over the shortest chain", () => {
    for (let seed = 0; seed < 40; seed++) {
      let s = nets.create(seed, 3 + (seed % 3), 0);
      const random = rng(seed + 9);
      while (s.outcome === null) {
        const growing = policyPlayer("fishing-nets", currentPolicy("fishing-nets", "growing"))(s)!;
        const scoring = nets.scoring(s), safe = nets.safe(s);
        if (scoring.length) expect(scoring).toContain(growing);
        else if (safe.length) expect(safe).toContain(growing);
        else {
          const ray = policyPlayer("fishing-nets", currentPolicy("fishing-nets", "challenge"))(s)!;
          const least = Math.min(...nets.legal(s).map((e) => nets.giveaway(s, e)));
          expect(nets.giveaway(s, ray)).toBe(least);
        }
        const legal = nets.legal(s);
        s = nets.move(s, legal[Math.floor(random() * legal.length)]);
      }
    }
  });
  it("Hidden Canoes: Coral searches beside finds; Ray follows a line, then a checkerboard", () => {
    const s = canoes.create(3, 6, 1);
    const marks = [...s.marks];
    marks[36 + 20] = 2;
    const coral = policyPlayer("hidden-canoes", currentPolicy("hidden-canoes", "growing"), 5)({ ...s, marks })!;
    expect([14, 19, 21, 26]).toContain(coral);
    marks[36 + 21] = 2;
    const ray = policyPlayer("hidden-canoes", currentPolicy("hidden-canoes", "challenge"), 5)({ ...s, marks })!;
    expect([19, 22]).toContain(ray);
    const open = policyPlayer("hidden-canoes", currentPolicy("hidden-canoes", "challenge"), 5)(s)!;
    expect((Math.floor(open / 6) + (open % 6)) % 2).toBe(0);
  });
});

describe("declared head starts", () => {
  it("are shown in the game's own units and keep the same rival policy", () => {
    for (const game of ["coconut-drop", "fishing-nets", "hidden-canoes", "shell-pits"] as const)
      for (const h of headStarts(game, 3)) {
        const plain = createSession(game, { seed: 4, strength: "challenge", size: 3 }),
          ahead = createSession(game, { seed: 4, strength: "challenge", size: 3, edge: [h.amount, 0] });
        expect(ahead.policy).toBe(plain.policy);
        expect(ahead.position.edge).toEqual([h.amount, 0]);
        expect(plain.position.edge).toBeUndefined();
        expect(validBoardSession(ahead)).toBe(true);
        expect(h.amount).toBeLessThanOrEqual(engines[game].maxEdge);
        expect(playAgain(ahead, 5).position.edge).toEqual([h.amount, 0]);
      }
    expect(createSession("reef-sweep", { edge: [1, 0] }).position.edge).toBeUndefined();
  });
  it("Coconut Drop: one coconut already rests in the middle column", () => {
    const s = coconut.create(1, 7, 0, [1, 0]);
    expect(s.board[38]).toBe(0);
    expect(s.board.filter((v) => v !== -1)).toHaveLength(1);
    expect(coconut.move(s, 3).board[31]).toBe(0);
    expect(coconut.validate(play("coconut-drop", s, [3, 2, 4]))).toBe(true);
  });
  it("Shell Pits and Fishing Nets count it at the end; the 48 shells never change", () => {
    // A finished Pits game the circle side loses 23-25 becomes a 27-25 win with four shells ahead.
    const board = [0, 0, 0, 0, 0, 1, 22, 1, 0, 0, 0, 0, 0, 24];
    const close = (edge?: [number, number]) => pits.move({ ...blank(1, 6, 0, board), ...(edge ? { edge } : {}) }, 5);
    expect(close().outcome).toBe(1);
    expect(close([4, 0]).outcome).toBe(0);
    expect(close([4, 0]).board.reduce((a, b) => a + b, 0)).toBe(48);
    expect(close([4, 0]).scores).toEqual(close().scores);
    let n = nets.create(1, 3, 0, [2, 0]);
    const random = rng(1);
    while (n.outcome === null) n = nets.move(n, nets.legal(n)[Math.floor(random() * nets.legal(n).length)]);
    expect(n.outcome).toBe(n.scores[0] + 2 === n.scores[1] ? "draw" : n.scores[0] + 2 > n.scores[1] ? 0 : 1);
  });
  it("Hidden Canoes: the target drops, and nothing hidden is shown", () => {
    const s = canoes.create(8, 6, 0, [2, 0]);
    expect(canoes.target(s, 0)).toBe(5);
    expect(canoes.target(s, 1)).toBe(7);
    expect(s.marks.every((m) => m === 0)).toBe(true);
  });
  it("forged head starts are rejected: too big, both seats, zero, or on a version 1 round", () => {
    const s = createSession("shell-pits", { seed: 2, strength: "challenge", edge: [4, 0] });
    for (const edge of [[9, 0], [4, 4], [0, 0], [-1, 0], [1.5, 0], [4]])
      expect(validBoardSession({ ...s, position: { ...s.position, edge } })).toBe(false);
    const { policy: _p, salt: _s, ...rest } = s;
    expect(validBoardSession({ ...rest, version: 1 })).toBe(false);
    const moved = { ...s, position: pits.move(s.position, 2) };
    expect(undo(moved).position.edge).toEqual([4, 0]);
  });
  it("the rival never throws: with a head start it still takes a win it can see", () => {
    const three = play("coconut-drop", coconut.create(1, 7, 1, [1, 0]), [0, 0, 1, 1, 2, 6]);
    expect(policyPlayer("coconut-drop", policyById("coconut-drop/challenge@1")!)(three)).toBe(3);
  });
  it("Checkers: the rival begins one back-row piece short, only in a solo round", () => {
    const solo = createCheckers({ ...defaultOptions, game: undefined, checkersHeadStart: 1 } as never);
    expect(solo.position.board[checkersHeadStartSquare]).toBe(0);
    expect(solo.position.board.filter((p) => p < 0)).toHaveLength(11);
    expect(validSession(solo)).toBe(true);
    const together = createCheckers({ ...defaultOptions, mode: "together", checkersHeadStart: 1 });
    expect(together.position.board.filter((p) => p < 0)).toHaveLength(12);
    expect(validSession({ ...solo, options: { ...solo.options, checkersHeadStart: 2 } })).toBe(false);
  });
});

describe("See the best move", () => {
  it("never runs before the game ends", () => {
    for (const game of ["coconut-drop", "fishing-nets", "hidden-canoes", "shell-pits"] as const)
      expect(finish(reviewGame(game, engines[game].create(1), 0))).toBe(null);
    expect(reviewCheckers(createCheckers(defaultOptions))).toBe(null);
  });
  it("Coconut Drop: shows your winning drop, a missed four, or a missed block", () => {
    const won = play("coconut-drop", coconut.create(1, 7, 0), [0, 6, 1, 6, 2, 6, 3]);
    expect(finish(reviewGame("coconut-drop", won, 0))).toMatchObject({ kind: "your-win", show: 3, played: 3 });
    // You could have finished on move 7 (column 4) but played column 6; the rival then won.
    const missed = play("coconut-drop", coconut.create(1, 7, 0), [0, 5, 1, 5, 2, 5, 6, 5]);
    expect(missed.outcome).toBe(1);
    expect(finish(reviewGame("coconut-drop", missed, 0))).toMatchObject({ kind: "winning", show: 3, ply: 6 });
    const unblocked = play("coconut-drop", coconut.create(1, 7, 0), [6, 0, 6, 1, 5, 2, 4, 3]);
    expect(finish(reviewGame("coconut-drop", unblocked, 0))).toMatchObject({ kind: "stronger", show: 3, ply: 6 });
  });
  it("Shell Pits: names the sow that made a win certain, or a stronger sow after a loss", () => {
    const greedy = policyPlayer("shell-pits", policyById("shell-pits/challenge@2")!);
    let s = pits.create(1, 6, 0);
    const random = rng(4);
    while (s.outcome === null) {
      const legal = pits.legal(s);
      s = pits.move(s, s.turn === 0 ? legal[Math.floor(random() * legal.length)] : greedy(s)!);
    }
    expect(s.outcome).toBe(1);
    const lesson = finish(reviewGame("shell-pits", s, 0))!;
    expect(lesson.kind === "winning" || lesson.kind === "stronger").toBe(true);
    expect(lesson.before.turn).toBe(0);
    expect(pits.legal(lesson.before)).toContain(lesson.show);
    expect(lesson.show).not.toBe(lesson.played);
    const flipped = finish(reviewGame("shell-pits", s, 1))!;
    expect(flipped.kind).toBe("your-win");
    expect(flipped.text).toMatch(/more than half/);
  });
  it("Shell Pits: a sow that let the rival force a win is named as such, never as thousands of shells", () => {
    // The greedy grab against Ray from the start, as played on the simulator (17-31).
    const moves = [2, 3, 9, 8, 9, 4, 7, 8, 5, 7, 0, 12, 1, 10, 2, 3, 12, 9, 12, 11, 4, 12, 10, 3, 7, 2, 8, 5];
    const final = play("shell-pits", pits.create(1, 6, 0), moves);
    expect(final.scores).toEqual([17, 31]);
    const lesson = finish(reviewGame("shell-pits", final, 0))!;
    expect(lesson.text).not.toMatch(/\d{3,} shells/);
    expect(lesson.text).toMatch(/circle pit \d/);
    const shells = lesson.text.match(/about (\d+) shells/);
    if (shells) expect(Number(shells[1])).toBeLessThanOrEqual(48);
    expect(lesson.show).not.toBe(lesson.played);
  });
  it("Fishing Nets: a box left waiting, or a longer chain than needed", () => {
    let s = nets.create(2, 3, 0);
    const random = rng(2);
    while (s.outcome === null) {
      const legal = nets.legal(s);
      s = nets.move(s, s.turn === 0 ? legal[Math.floor(random() * legal.length)] : policyPlayer("fishing-nets", currentPolicy("fishing-nets", "challenge"))(s)!);
    }
    const lesson = finish(reviewGame("fishing-nets", s, 0));
    if (s.outcome !== 0) {
      expect(lesson).not.toBe(null);
      expect(lesson!.kind).toBe("stronger");
      expect(nets.legal(lesson!.before)).toContain(lesson!.show);
    }
  });
  it("Hidden Canoes: the best chance comes from the chart alone, never the hidden fleet", () => {
    const empty = new CanoesCoverage(Array(36).fill(0));
    while (!empty.step());
    expect(empty.layouts).toBeGreaterThan(10000);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) expect(empty.cover[r * 6 + c]).toBe(empty.cover[c * 6 + r]);
    const chart = Array(36).fill(0);
    chart[14] = 1;
    const miss = new CanoesCoverage(chart);
    while (!miss.step());
    expect(miss.cover[14]).toBe(0);
    // A lost game: the review is identical whatever the rival's unsearched fleet layout.
    const rival = policyPlayer("hidden-canoes", currentPolicy("hidden-canoes", "challenge"), 3);
    let s = canoes.create(12, 6, 1);
    const random = rng(12);
    while (s.outcome === null) {
      const legal = canoes.legal(s);
      s = canoes.move(s, s.turn === 0 ? legal[Math.floor(random() * legal.length)] : rival(s)!);
    }
    expect(s.outcome).toBe(1);
    const lesson = finish(reviewGame("hidden-canoes", s, 0));
    expect(lesson?.kind).toBe("stronger");
    expect(lesson!.text).toMatch(/of every 100 fleet layouts/);
  });
  it("Checkers: a skipped jump in Friendly rules, and your winning move", () => {
    const game = (seed: number) => {
      let s: CheckersState = createCheckers({ ...defaultOptions, checkersRules: "friendly" });
      const random = rng(seed);
      let skipped = false;
      for (let i = 0; i < 400 && !s.position.outcome; i++) {
        const moves = checkersMoves(s.position, "friendly"),
          quiet = moves.filter((m) => !m.captured.length);
        const skip = s.position.turn === 1 && quiet.length > 0 && moves.some((m) => m.captured.length) && !skipped;
        if (skip) skipped = true;
        s = checkersMove(s, skip ? quiet[0] : moves[Math.floor(random() * moves.length)]);
      }
      return s;
    };
    const lost = game(7);
    expect(lost.position.outcome).toBe("blue");
    const moment = reviewCheckers(lost, 1)!;
    expect(moment.kind).toBe("stronger");
    expect(moment.title).toBe("A jump was waiting");
    expect(moment.show.captured.length).toBeGreaterThan(0);
    expect(moment.before.turn).toBe(1);
    expect(reviewCheckers(lost, -1)!.kind).toBe("your-win");
    const won = game(6);
    expect(won.position.outcome).toBe("red");
    expect(reviewCheckers(won, 1)).toMatchObject({ kind: "your-win", title: "Your winning move" });
  });
});
