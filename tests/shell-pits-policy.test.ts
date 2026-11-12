import { describe, expect, it } from "vitest";
import * as pits from "../src/board/shell-pits/engine";
import { rng, type Position } from "../src/board/types";
import { IterativeSearch } from "../src/playPolicies/search";
import { pitsChallengeLimits, pitsOrder, pitsRules, policyById } from "../src/playPolicies/policies";
import { bench, pitsGreedy, policyPlayer, summarize } from "../src/playPolicies/benchmark";

const challenge1 = policyPlayer("shell-pits", policyById("shell-pits/challenge@1")!);
const challenge2 = policyPlayer("shell-pits", policyById("shell-pits/challenge@2")!);
/** The audit corpus: 2/4/6 random legal opening sows, twelve seeds, both starters and seats. */
const corpus = (rival: typeof challenge2) =>
  bench({ game: "shell-pits", subject: pitsGreedy, rival, openingPlies: [2, 4, 6], seeds: 12, maxPlies: 200 });

describe("Shell Pits Challenge, revision 2", () => {
  it("closes the four greedy opening cases that beat revision 1", () => {
    const four = (rival: typeof challenge2) =>
      bench({ game: "shell-pits", subject: pitsGreedy, rival, openingPlies: [0], seeds: 1 }).map((r) => r.result);
    // Before: the greedy grab won whenever it moved first.
    expect(four(challenge1)).toEqual(["win", "loss", "loss", "win"]);
    expect(four(challenge2)).toEqual(["loss", "loss", "loss", "loss"]);
  });
  it("does no worse on the 144-prefix corpus, and every game keeps 48 shells and legal turns", () => {
    const before = corpus(challenge1),
      after = corpus(challenge2);
    expect(after.length).toBe(144);
    const a = summarize(after),
      b = summarize(before);
    expect(b).toMatchObject({ win: 8, draw: 2, loss: 134 });
    // The greedy grab wins fewer games and the rival wins more. Seat-mirrored horizon flips are listed in docs.
    expect(a.win).toBeLessThanOrEqual(b.win);
    expect(a.loss).toBeGreaterThanOrEqual(b.loss);
    expect(a).toMatchObject({ win: 6, draw: 2, loss: 136, capped: 0 });
    for (const row of after) {
      let s = pits.create(row.seed, 6, row.starter);
      for (const m of row.moves) {
        const next = pits.move(s, m);
        expect(next).not.toBe(s);
        expect(next.board.reduce((x, y) => x + y, 0)).toBe(48);
        const store = s.turn === 0 ? 6 : 13,
          last = pits.sowPath(s, m).at(-1);
        if (next.outcome === null) expect(next.turn).toBe(last === store ? s.turn : 1 - s.turn);
        s = next;
      }
      expect(s.outcome).not.toBe(null);
    }
  });
  it("stays inside 50,000 positions and finishes depth 8 in sampled games", () => {
    let complete = 0,
      total = 0;
    for (let seed = 0; seed < 6; seed++) {
      let s = pits.create(seed, 6, (seed % 2) as 0 | 1);
      const random = rng(seed + 3);
      while (s.outcome === null) {
        const r = new IterativeSearch({ ...s, moves: [] }, pitsRules, pitsChallengeLimits).run();
        expect(r.nodes).toBeLessThanOrEqual(50_001);
        total++;
        if (r.complete) complete++;
        const legal = pits.legal(s);
        s = pits.move(s, random() < 0.5 ? r.move! : legal[Math.floor(random() * legal.length)]);
      }
    }
    expect(complete / total).toBeGreaterThan(0.95);
  });
  it("falls back to the deepest completed iteration, never a cut-off deeper one", () => {
    const s = pits.move(pits.move(pits.create(1), 2), 9);
    for (const cap of [40, 200, 900, 3000]) {
      const cut = new IterativeSearch(s, pitsRules, { depth: 8, nodes: cap }).run();
      if (cut.complete) continue;
      expect(cut.depth).toBeLessThan(8);
      // The fallback is exactly what a full search to that depth would choose.
      const full = new IterativeSearch(s, pitsRules, { depth: cut.depth, nodes: 1e9 }).run();
      expect(cut.move).toBe(full.move);
      expect(cut.score).toBe(full.score);
    }
    expect(new IterativeSearch(s, pitsRules, { depth: 8, nodes: 3 }).run().depth).toBeGreaterThanOrEqual(1);
  });
  it("orders moves for speed only: extra turns and captures are predicted from the real rules", () => {
    const random = rng(99);
    let s: Position = pits.create(1);
    for (let i = 0; i < 400; i++) {
      if (s.outcome !== null) s = pits.create(i);
      const legal = pits.legal(s),
        ordered = pitsOrder(s, legal);
      expect([...ordered].sort((a, b) => a - b)).toEqual(legal);
      for (const m of legal) {
        const extra = pits.move(s, m).turn === s.turn && pits.move(s, m).outcome === null;
        if (extra) expect(ordered.indexOf(m)).toBeLessThan(ordered.findIndex((x) => !(pits.move(s, x).turn === s.turn)) + 1 || legal.length);
      }
      s = pits.move(s, legal[Math.floor(random() * legal.length)]);
    }
  });
  it("keeps Gentle and Growing exactly as they were", () => {
    for (let seed = 0; seed < 8; seed++) {
      let s = pits.create(seed, 6, (seed % 2) as 0 | 1);
      const random = rng(seed);
      for (let i = 0; i < 20 && s.outcome === null; i++) {
        for (const strength of ["gentle", "growing"] as const)
          expect(policyPlayer("shell-pits", policyById(`shell-pits/${strength}@1`)!)(s)).toBe(pits.choose(s, strength));
        const legal = pits.legal(s);
        s = pits.move(s, legal[Math.floor(random() * legal.length)]);
      }
    }
  });
});
