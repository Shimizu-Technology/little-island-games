import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { engines } from "../src/board";
import { rng } from "../src/board/types";
import * as pits from "../src/board/shell-pits/engine";
import { applyCheckers, CheckersSearch, checkersMoves, createCheckers } from "../src/games/checkers";
import { defaultOptions, random } from "../src/games/types";
import { boardPolicies, checkersPolicyById, currentPolicy, pitsChallengeLimits, pitsRules, policyById } from "../src/playPolicies/policies";
import { openView } from "../src/playPolicies/views";

const run = (task: { done: boolean; step: (n: number) => boolean; move: () => number | null; nodes: number }) => {
  while (!task.step(4096));
  return [task.move(), task.nodes] as const;
};
// The review's reproduction: Shell Pits after the first player sows pit 1.
const afterPit1 = () => pits.move(pits.create(1, 6, 0), 1);
function pitsCorpus() {
  const out = [];
  for (let seed = 0; seed < 8; seed++) {
    const random = rng(seed * 97 + 3);
    let s = engines["shell-pits"].create(seed, undefined, (seed % 2) as 0 | 1);
    for (let ply = 0; ply < 40 && s.outcome === null; ply++) {
      if (ply % 5 === 0) out.push(s);
      const legal = pits.legal(s);
      s = pits.move(s, legal[Math.floor(random() * legal.length)]);
    }
  }
  return out;
}

describe("P2-1: a policy and its real search budget can't change under a fixed ID", () => {
  it("every policy, its limits and the rules its chooser reads are frozen", () => {
    for (const p of boardPolicies) {
      expect(Object.isFrozen(p), p.id).toBe(true);
      if (p.limits) expect(Object.isFrozen(p.limits), p.id).toBe(true);
    }
    expect(Object.isFrozen(pitsRules)).toBe(true);
    expect(Object.isFrozen(pitsChallengeLimits)).toBe(true);
  });
  it("changing a budget, a chooser or the rules at runtime throws, and the decision under the ID stays the same", () => {
    const policy = currentPolicy("shell-pits", "challenge");
    expect(policy.id).toBe("shell-pits/challenge@2");
    const view = openView("shell-pits", afterPit1());
    expect(run(policy.choose(view, () => 0.5))).toEqual([12, 12426]);
    const limits = policy.limits as { depth: number; nodes: number };
    expect(() => {
      limits.depth = 1;
    }).toThrow(TypeError);
    expect(() => {
      limits.nodes = 6;
    }).toThrow(TypeError);
    expect(() => {
      (policy as { choose: unknown }).choose = () => null;
    }).toThrow(TypeError);
    expect(() => {
      (pitsRules as { evaluate: unknown }).evaluate = () => 0;
    }).toThrow(TypeError);
    expect(() => {
      (pitsChallengeLimits as { depth: number }).depth = 1;
    }).toThrow(TypeError);
    expect(policy.limits).toEqual({ depth: 8, nodes: 50000 });
    expect(run(policyById("shell-pits/challenge@2")!.choose(view, () => 0.5))).toEqual([12, 12426]);
  });
  it("the real search under each budgeted ID is pinned: a different budget needs a new ID", () => {
    // Every searched decision (move and positions searched) on a fixed corpus. Editing the
    // depth, node cap, ordering or evaluation of a shipped ID changes this and fails here.
    const policy = policyById("shell-pits/challenge@2")!;
    const trace = pitsCorpus().map((p) => run(policy.choose(openView("shell-pits", p), () => 0.5)).join(":"));
    expect(trace.length).toBe(57);
    expect(createHash("sha256").update(trace.join(",")).digest("hex").slice(0, 16)).toBe("452b730c21f24083");
  });
  it("Checkers' node-budget search is pinned the same way", () => {
    const trace: string[] = [];
    for (let g = 0; g < 4; g++) {
      const r = random(g * 7 + 1);
      let p = createCheckers(defaultOptions).position;
      for (let ply = 0; ply < 40 && !p.outcome; ply++) {
        if (ply % 4 === 1)
          for (const id of ["checkers/growing@2", "checkers/challenge@2"]) {
            const search = new CheckersSearch(p, "classic", checkersPolicyById(id)!.limits!);
            while (!search.step(4096));
            trace.push(`${JSON.stringify(search.move())}:${search.nodes}`);
          }
        const m = checkersMoves(p);
        p = applyCheckers(p, m[Math.floor(r() * m.length)]);
      }
    }
    expect(trace.length).toBe(80);
    expect(createHash("sha256").update(trace.join(",")).digest("hex").slice(0, 16)).toBe("80450ae293f3cffc");
  });
});
