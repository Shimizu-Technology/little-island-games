import { describe, it, expect } from "vitest";
import { random } from "../src/games/types";
import type { LearnOptions, Pace } from "../src/learn/types";
import {
  engine as reef,
  boardEnd,
  nextStone,
  reefMove,
  reefRound,
  type ReefState,
} from "../src/learn/games/reef-race/engine";
import {
  engine as market,
  marketOrder,
  openOrder,
  packPiece,
  serve,
  nextCustomer,
  chooseOrder,
  marketTurn,
  ORDERS,
} from "../src/learn/games/island-market/engine";
import { COINS, adjustPieces, coinTotal, emptyPieces, pathRows, validPieces } from "../src/learn/kit/numbers";

const ctx = (seed = 7, starter: 0 | 1 = 1) => ({ rng: random(seed), skills: {}, starter, today: 20000 });
const paces: Pace[] = ["easy", "medium", "hard"];
describe("Reef Race counting-on engine", () => {
  for (const mode of reef.modes)
    for (const pace of paces)
      it(`completes ${mode}/${pace} through each numbered step`, () => {
        const o: LearnOptions = { mode, pace };
        let s = reef.create(o, ctx());
        expect(reef.turn!(s, o)).toBe(1);
        let moves = 0;
        while (reef.outcome(s, o) === null && moves++ < 1200) {
          const r = reefRound(s, o);
          const action = r.phase === "roll" ? "roll" : r.phase === "bonus" ? Math.max(...r.bonus!) : nextStone(r, o);
          const next = reefMove(s, o, action);
          expect(next).not.toBe(s);
          expect(reef.validate(next, o)).toBe(true);
          s = next;
        }
        expect(moves).toBeLessThan(1200);
        expect(reef.outcome(s, o)).not.toBeNull();
        expect(reefMove(s, o, "roll")).toBe(s);
        expect(reef.validate(JSON.parse(JSON.stringify(s)), o)).toBe(true);
        expect(reefRound(s, o).positions.every((n) => n >= 0 && n <= boardEnd(o))).toBe(true);
      });
  it("rejects skipped stones and preserves the round after a miss", () => {
    const o: LearnOptions = { mode: "versus", pace: "easy" };
    const s = reefMove(reef.create(o, ctx()), o, "roll");
    expect(reefMove(s, o, 2)).toBe(s);
    expect(reefRound(reefMove(s, o, 1), o).positions[1]).toBe(1);
    expect(reef.validate({ ...s, history: ["roll", 2] }, o)).toBe(false);
  });
  it("counts current steps and uses each current only once per turtle", () => {
    const o: LearnOptions = { mode: "together", pace: "medium" };
    let s: ReefState = {
      ...reef.create(o, ctx()),
      focus: "num.count-on",
      rolls: Array.from({ length: 256 }, () => [4]),
    };
    for (let i = 0; i < 10; i++) {
      const r = reefRound(s, o);
      s = reefMove(s, o, r.phase === "roll" ? "roll" : nextStone(r, o));
    }
    const r = reefRound(s, o);
    expect(r.phase).toBe("current");
    expect(r.positions[0]).toBe(8);
    expect(r.positions[1]).toBe(2);
    expect(reefMove(s, o, 10)).toBe(s);
    s = reefMove(reefMove(s, o, 9), o, 10);
    expect(reefRound(s, o).positions).toEqual([10, 4]);
  });
  it("rejects malformed, oversized or impossible saves", () => {
    const o: LearnOptions = { mode: "solo", pace: "easy" },
      s = reef.create(o, ctx());
    for (const bad of [
      { ...s, starter: 2 },
      { ...s, positions: [999, 0] },
      { ...s, rolls: [[4], ...s.rolls.slice(1)] },
      { ...s, rolls: s.rolls.slice(1) },
      { ...s, history: Array(1201).fill("roll") },
      { ...s, history: ["skip"] },
      { ...s, history: [1] },
      { ...s, focus: "num.nope" },
    ])
      expect(reef.validate(bad, o)).toBe(false);
  });
  it("is deterministic and bounds even minimum rolls", () => {
    const o: LearnOptions = { mode: "versus", pace: "hard" };
    expect(reef.create(o, ctx())).toEqual(reef.create(o, ctx()));
    let s = { ...reef.create(o, ctx()), rolls: Array.from({ length: 256 }, () => [1, 1]) };
    for (let n = 0; reef.outcome(s, o) === null && n < 1200; n++) {
      const r = reefRound(s, o);
      s = reefMove(s, o, r.phase === "roll" ? "roll" : r.phase === "bonus" ? "skip" : nextStone(r, o));
    }
    expect(reef.outcome(s, o)).not.toBeNull();
  });
});
describe("Island Market engines and content", () => {
  for (const mode of market.modes)
    for (const pace of paces)
      it(`completes and resumes ${mode}/${pace}`, () => {
        const o: LearnOptions = { mode, pace };
        let s = market.create(o, ctx());
        const allKinds = new Set(ORDERS.filter((q) => q.pace === pace).map((q) => q.kind));
        expect(new Set(s.orders.map((id) => ORDERS.find((q) => q.id === id)!.kind))).toEqual(allKinds);
        for (let i = 0; i < s.orders.length; i++) {
          expect(marketTurn(s)).toBe((1 + i) % 2);
          s = openOrder(s);
          expect(marketTurn(s)).toBe(i % 2);
          const q = marketOrder(s)!;
          if (q.kind === "compare") s = serve(s, q.target);
          else if (q.kind === "change") {
            let left = q.target;
            for (const coin of [3, 2, 1, 0] as const)
              while (left >= COINS[coin]) {
                s = packPiece(s, o, coin, 1);
                left -= COINS[coin];
              }
            s = serve(s);
          } else {
            for (let t = 0; t < Math.floor(q.target / 10); t++) s = packPiece(s, o, "tens", 1);
            for (let u = 0; u < q.target % 10; u++) s = packPiece(s, o, "ones", 1);
            expect(market.validate(s, o)).toBe(true);
            s = serve(s);
          }
          expect(s.phase).toBe("served");
          expect(market.validate(JSON.parse(JSON.stringify(s)), o)).toBe(true);
          s = nextCustomer(s);
          expect(market.validate(s, o)).toBe(true);
        }
        expect(market.outcome(s, o)).toBe("done");
        expect(nextCustomer(s)).toBe(s);
      });
  it("lets the shopkeeper choose and keeps errors reversible", () => {
    const o: LearnOptions = { mode: "together", pace: "easy" };
    const a = market.create(o, ctx()),
      b = chooseOrder(a);
    expect(b.orders[0]).toBe(a.orders[1]);
    expect(market.validate(b, o)).toBe(true);
    let s = openOrder(a);
    if (marketOrder(s)!.kind === "compare") expect(serve(s, -1)).toBe(s);
    else {
      expect(serve(s)).toBe(s);
      s = packPiece(s, o, "tens", 1);
      expect(packPiece(s, o, "tens", -1).pieces).toEqual(emptyPieces());
    }
  });
  it("rejects forged quantities, completed answers, phases and coin counts", () => {
    const o: LearnOptions = { mode: "solo", pace: "hard" },
      s = market.create(o, ctx());
    for (const bad of [
      { ...s, index: 99 },
      { ...s, phase: "done" },
      { ...s, orders: Array(8).fill(s.orders[0]) },
      { ...s, served: [999] },
      { ...s, pieces: { tens: 0, ones: 101, coins: [0, 0, 0, 0] } },
      { ...s, pieces: { tens: 0, ones: 0, coins: [-1, 0, 0, 0] } },
      { ...s, pieces: { tens: 0, ones: 0, coins: [0, 0, 0, 5] } },
      {
        ...s,
        orders: ORDERS.filter((q) => q.pace === "easy")
          .slice(0, 8)
          .map((q) => q.id),
      },
      { ...s, extra: true },
    ])
      expect(market.validate(bad, o)).toBe(false);
  });
  it("keeps all curated numbers in pace and arithmetic bounds", () => {
    expect(ORDERS).toHaveLength(66);
    for (const q of ORDERS) {
      expect(q.target).toBeGreaterThan(0);
      expect(q.target).toBeLessThanOrEqual(q.pace === "easy" ? 20 : 100);
      if (q.kind === "add") expect(q.target).toBe(q.a + q.b);
      if (q.kind === "subtract" || q.kind === "change") expect(q.target).toBe(q.a - q.b);
      if (q.kind === "compare") expect(q.target).toBe(Math.max(q.a, q.b));
    }
  });
});
describe("pure number manipulatives", () => {
  it("draws every path number once in connected serpentine order", () => {
    const rows = pathRows(1, 20, 5);
    expect(rows[1]).toEqual([10, 9, 8, 7, 6]);
    expect(rows.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
  it("uses bounded, reversible pieces and simple shell denominations", () => {
    expect(coinTotal([2, 1, 1, 1])).toBe(42);
    expect(validPieces({ tens: 1, ones: 12, coins: [0, 0, 0, 0] }, 20, false)).toBe(false);
    expect(adjustPieces(emptyPieces(), "ones", -1, 20, false)).toEqual(emptyPieces());
    expect(adjustPieces(emptyPieces(), 3, 1, 100, true).coins).toEqual([0, 0, 0, 1]);
    expect(validPieces({ tens: 0, ones: 0, coins: [0, 0, 0, 4] }, 100, true)).toBe(true);
  });
});
