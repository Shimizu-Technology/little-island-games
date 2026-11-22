import { describe, expect, it } from "vitest";
import {
  JUMP_SETS, MAX_PATH, advanceHop, bestJump, fewestJumps, fewestStraight, greedyJumps, initialHop, jumpsToTarget, smallestJumpsBot, solveHop, validHop,
  type Hop,
} from "../src/math/kit";

/** A plain, slow reference: try every path up to a length, so the search's par is checked against brute force. */
function bruteFewest(h: Hop, limit = 12): number | null {
  let frontier = [h.start];
  for (let n = 0; n <= limit; n++) {
    if (frontier.indexOf(h.target) >= 0) return n;
    const next: number[] = [];
    for (const at of frontier) for (const j of h.jumps) {
      const to = at + j;
      if (to >= h.lo && to <= h.hi && next.indexOf(to) < 0) next.push(to);
    }
    frontier = next;
  }
  return null;
}

describe("K4 hops: fewest jumps by breadth-first search", () => {
  it("matches a brute-force search on every start and target for each jump set", () => {
    for (let set = 0; set < JUMP_SETS.length; set++) {
      const hi = set === 0 ? 20 : 60;
      for (let start = 0; start <= hi; start += set === 0 ? 1 : 3) for (let target = 0; target <= hi; target += set === 0 ? 1 : 7) {
        if (start === target) continue;
        const h: Hop = { start, target, jumps: JUMP_SETS[set], lo: 0, hi };
        expect(fewestJumps(h), JSON.stringify(h)).toBe(bruteFewest(h));
      }
    }
  });
  it("proves the worked examples from the plan", () => {
    // 17 to 63 with ones and tens: ten jumps straight, nine by going to 67 and back four.
    const h: Hop = { start: 17, target: 63, jumps: JUMP_SETS[2], lo: 0, hi: 100 };
    expect(fewestStraight(h)).toBe(10);
    expect(fewestJumps(h)).toBe(9);
    // 17 to 63 with 2, 5 and 10: the biggest jump that fits gets stuck one short.
    const skip: Hop = { start: 17, target: 63, jumps: JUMP_SETS[1], lo: 0, hi: 100 };
    expect(greedyJumps(skip)).toBeNull();
    expect(fewestJumps(skip)).toBe(7);
    expect(smallestJumpsBot(skip)).toBe(23);
  });
  it("Help's jump always keeps a fewest path, and following it lands in par", () => {
    for (let set = 0; set < JUMP_SETS.length; set++) for (let start = 0; start <= 60; start += 5) for (let target = 1; target <= 60; target += 4) {
      const h: Hop = { start, target, jumps: JUMP_SETS[set], lo: 0, hi: 60 };
      const par = fewestJumps(h);
      if (par === null || start === target || par > MAX_PATH) continue;
      const acts = solveHop(h);
      expect(acts).toHaveLength(par);
      let w = initialHop(h);
      for (const a of acts) w = advanceHop(h, w, a);
      expect(w.solved && w.at === target && w.path.length === par).toBe(true);
      const d = jumpsToTarget(target, h.jumps, 0, 60);
      expect(d[start] - 1).toBe(d[start + bestJump(h, start)!]);
    }
  });
  it("refuses jumps off the line, undo when there is nothing to undo, and jumps after landing", () => {
    const h: Hop = { start: 1, target: 3, jumps: JUMP_SETS[0], lo: 0, hi: 20 };
    let w = initialHop(h);
    expect(advanceHop(h, w, ["j", 0])).toBe(w);
    expect(advanceHop(h, w, ["u"])).toBe(w);
    expect(advanceHop(h, w, ["r"])).toBe(w);
    w = advanceHop(h, w, ["j", 3]);
    expect(w.solved).toBe(true);
    expect(advanceHop(h, w, ["j", 2])).toBe(w);
    expect(advanceHop(h, w, ["u"])).toBe(w);
    const again = advanceHop(h, w, ["r"]);
    expect(again).toMatchObject({ at: 1, path: [], solved: false, restarts: 1 });
  });
  it("Help is sticky across a fresh start; undo takes the last jump off the path", () => {
    const h: Hop = { start: 10, target: 30, jumps: JUMP_SETS[2], lo: 0, hi: 100 };
    let w = advanceHop(h, initialHop(h), ["h"]);
    expect(w).toMatchObject({ hint: 1, helped: true });
    w = advanceHop(h, w, ["j", 3]);
    expect(w.hint).toBe(0);
    w = advanceHop(h, w, ["u"]);
    expect(w).toMatchObject({ at: 10, path: [], undone: 1 });
    w = advanceHop(h, advanceHop(h, w, ["j", 3]), ["r"]);
    expect(w.helped).toBe(true);
  });
  it("validates only playable puzzles", () => {
    expect(validHop({ start: 3, target: 8, jumps: [2], lo: 0, hi: 20 })).toBe(false);
    expect(validHop({ start: 3, target: 9, jumps: [1, 1], lo: 0, hi: 20 })).toBe(false);
    expect(validHop({ start: 3, target: 9, jumps: [1, 2], lo: 0, hi: 20 })).toBe(true);
    expect(validHop({ start: 3, target: 30, jumps: [1, 2], lo: 0, hi: 20 })).toBe(false);
  });
});
