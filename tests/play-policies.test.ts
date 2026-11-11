import { describe, expect, it } from "vitest";
import { createSession, engines, playAgain, sessionPolicy, validBoardSession, type BoardSession } from "../src/board";
import { rng, type Position } from "../src/board/types";
import * as canoes from "../src/board/hidden-canoes/engine";
import * as coconut from "../src/board/coconut-drop/engine";
import * as nets from "../src/board/fishing-nets/engine";
import * as pits from "../src/board/shell-pits/engine";
import {
  archivedChoice,
  boardPolicies,
  canoesChoice,
  currentPolicy,
  policyById,
  policyRandom,
} from "../src/playPolicies/policies";
import { canoesView, canoesViewKeys, openView, openViewKeys, publicView } from "../src/playPolicies/views";
import { computerTask, hintTask, runTask } from "../src/playPolicies/decide";
import { bench, policyPlayer, summarize } from "../src/playPolicies/benchmark";
import { emptySave, parseSave } from "../src/state/validation";

const run = (task: { done: boolean; step: (n: number) => boolean; move: () => number | null }, quota = 4096) => {
  while (!task.step(quota));
  return task.move();
};
function randomGame(game: "coconut-drop" | "fishing-nets" | "shell-pits" | "hidden-canoes", seed: number, plies: number, size?: number) {
  const engine = engines[game],
    random = rng(seed * 31 + 7);
  let s = engine.create(seed, size, (seed % 2) as 0 | 1);
  const out: Position[] = [s];
  for (let i = 0; i < plies && s.outcome === null; i++) {
    const legal = engine.legal(s);
    s = engine.move(s, legal[Math.floor(random() * legal.length)]);
    out.push(s);
  }
  return out.filter((p) => p.outcome === null);
}

describe("policy IDs", () => {
  it("are append-only and fixed: game, strength, revision, limits and visibility never change", () => {
    expect(boardPolicies.map((p) => [p.id, p.revision, p.publicOnly, p.limits])).toEqual([
      ["coconut-drop/gentle@1", 1, true, null],
      ["coconut-drop/growing@1", 1, true, null],
      ["coconut-drop/challenge@1", 1, true, null],
      ["fishing-nets/gentle@1", 1, true, null],
      ["fishing-nets/growing@1", 1, true, null],
      ["fishing-nets/challenge@1", 1, true, null],
      ["shell-pits/gentle@1", 1, true, null],
      ["shell-pits/growing@1", 1, true, null],
      ["shell-pits/challenge@1", 1, true, null],
      ["shell-pits/challenge@2", 2, true, { depth: 8, nodes: 50000 }],
      ["hidden-canoes/gentle@1", 1, false, null],
      ["hidden-canoes/growing@1", 1, false, null],
      ["hidden-canoes/challenge@1", 1, false, null],
      ["hidden-canoes/gentle@2", 2, true, null],
      ["hidden-canoes/growing@2", 2, true, null],
      ["hidden-canoes/challenge@2", 2, true, null],
    ]);
    expect(Object.isFrozen(boardPolicies)).toBe(true);
    for (const p of boardPolicies) expect(p.id).toBe(`${p.game}/${p.strength}@${p.revision}`);
    // Only Shell Pits Challenge and the Hidden Canoes chart reader changed; everything else is 3.0's.
    expect(currentPolicy("coconut-drop", "challenge").id).toBe("coconut-drop/challenge@1");
    expect(currentPolicy("fishing-nets", "challenge").id).toBe("fishing-nets/challenge@1");
    expect(currentPolicy("shell-pits", "gentle").id).toBe("shell-pits/gentle@1");
    expect(currentPolicy("shell-pits", "growing").id).toBe("shell-pits/growing@1");
    expect(currentPolicy("shell-pits", "challenge").id).toBe("shell-pits/challenge@2");
    expect(currentPolicy("hidden-canoes", "growing").id).toBe("hidden-canoes/growing@2");
  });
  it("revision 1 adapters make exactly the 3.0 decision from the public view", () => {
    for (const game of ["coconut-drop", "fishing-nets", "shell-pits"] as const)
      for (let seed = 0; seed < 12; seed++)
        for (const p of randomGame(game, seed, 30, game === "fishing-nets" ? 3 + (seed % 3) : undefined).filter((_, i) => i % 3 === 0))
          for (const strength of ["gentle", "growing", "challenge"] as const) {
            const policy = policyById(`${game}/${strength}@1`)!;
            const engine = game === "coconut-drop" ? coconut : game === "fishing-nets" ? nets : pits;
            expect(run(policy.choose(openView(game, p), () => 0.5))).toBe(engine.choose(p, strength));
          }
  });
});

describe("public views", () => {
  it("carry exactly the listed fields, frozen", () => {
    const p = createSession("shell-pits", { seed: 3 }).position;
    expect(Object.keys(openView("shell-pits", p)).sort()).toEqual([...openViewKeys]);
    const c = createSession("hidden-canoes", { seed: 3 }).position;
    expect(Object.keys(canoesView(c)).sort()).toEqual([...canoesViewKeys]);
    expect(Object.isFrozen(canoesView(c).searched)).toBe(true);
    expect(JSON.stringify(canoesView(c))).not.toMatch(/seed/);
  });
  it("Hidden Canoes: a different hidden fleet behind the same chart changes nothing", () => {
    // Move one rival canoe somewhere the computer has not searched.
    let tested = 0;
    for (let seed = 0; seed < 30; seed++) {
      let s = canoes.create(seed, 6, 1);
      const random = rng(seed + 1);
      for (let i = 0; i < 12 && s.outcome === null; i++) {
        const legal = canoes.legal(s);
        s = canoes.move(s, legal[Math.floor(random() * legal.length)]);
      }
      if (s.outcome !== null) continue;
      if (s.turn !== 1) s = canoes.move(s, canoes.legal(s)[0]);
      if (s.outcome !== null) continue;
      const counterfactual = withMovedRivalCanoe(s, 0);
      if (!counterfactual) continue;
      expect(canoesView(counterfactual, 1)).toEqual(canoesView(s, 1));
      expect(counterfactual.board).not.toEqual(s.board);
      tested++;
      for (const strength of ["gentle", "growing", "challenge"] as const)
        for (const salt of [0, 1, 0xdeadbeef]) {
          const policy = currentPolicy("hidden-canoes", strength),
            a = run(policy.choose(canoesView(s, 1), policyRandom(salt, s.moves.length, 1))),
            b = run(policy.choose(canoesView(counterfactual, 1), policyRandom(salt, s.moves.length, 1)));
          expect(a).toBe(b);
        }
      // Hints read only the chart of the seat they help.
      const session = (p: Position): BoardSession => ({ ...createSession("hidden-canoes", { seed }), position: p, salt: 9 });
      expect(run(hintTask(session(s))!)).toBe(run(hintTask(session(counterfactual))!));
    }
    expect(tested).toBeGreaterThan(20);
  });
  it("archived Hidden Canoes revision 1 read the fleet-laying seed: the same chart could change its search", () => {
    // This is the defect revision 2 fixes. Same public chart, different seed, different choice.
    let differs = 0;
    for (let seed = 0; seed < 40; seed++) {
      const a = canoes.create(seed, 6, 1),
        b = { ...a, seed: seed + 1000 };
      expect(canoesView(a, 1)).toEqual({ ...canoesView(b, 1), ownFleet: canoesView(a, 1).ownFleet });
      if (archivedChoice(policyById("hidden-canoes/gentle@1")!, a) !== archivedChoice(policyById("hidden-canoes/gentle@1")!, b)) differs++;
    }
    expect(differs).toBeGreaterThan(30);
    expect(policyById("hidden-canoes/gentle@1")!.publicOnly).toBe(false);
    expect(() => policyById("hidden-canoes/gentle@1")!.choose(canoesView(canoes.create(1)), () => 0)).toThrow(/Archived/);
  });
  it("revision 2 Hidden Canoes keeps the 3.0 rules of thumb", () => {
    // A find with an open neighbour is followed up; Challenge follows a line of two.
    const s = canoes.create(4, 6, 1);
    const marks = [...s.marks];
    marks[36 + 14] = 2;
    marks[36 + 15] = 2;
    const view = canoesView({ ...s, marks }, 1);
    expect([8, 13, 16, 20, 9, 21]).toContain(canoesChoice(view, "growing", () => 0.3));
    expect([13, 16]).toContain(canoesChoice(view, "challenge", () => 0.3));
    const blankView = canoesView(s, 1);
    const c = canoesChoice(blankView, "challenge", () => 0.7)!;
    expect((Math.floor(c / 6) + (c % 6)) % 2).toBe(0);
  });
});

/** Swap one rival canoe for another placement that avoids every searched cell. */
function withMovedRivalCanoe(s: Position, rivalSeat: 0 | 1): Position | null {
  const fleet = s.board.slice(rivalSeat * 36, rivalSeat * 36 + 36),
    seen = s.marks.slice((1 - rivalSeat) * 36, (1 - rivalSeat) * 36 + 36);
  for (const id of [1, 2, 3]) {
    const cells = fleet.flatMap((v, i) => (v === id ? [i] : []));
    if (cells.some((c) => seen[c])) continue;
    const length = cells.length;
    for (let i = 0; i < 36; i++)
      for (const d of [1, 6]) {
        const next = Array.from({ length }, (_, j) => i + j * d);
        if (
          next.every((p) => p < 36 && (d !== 1 || Math.floor(p / 6) === Math.floor(i / 6)) && !seen[p] && (fleet[p] === 0 || fleet[p] === id)) &&
          next.join() !== cells.join()
        ) {
          const board = [...s.board];
          for (const c of cells) board[rivalSeat * 36 + c] = 0;
          for (const c of next) board[rivalSeat * 36 + c] = id;
          return { ...s, board };
        }
      }
  }
  return null;
}

describe("saved rounds freeze their policy", () => {
  it("version 1 rounds finish on revision 1; new and replayed rounds take the current revision", () => {
    const v2 = createSession("shell-pits", { seed: 5, strength: "challenge" });
    expect(v2.version).toBe(2);
    expect(v2.policy).toBe("shell-pits/challenge@2");
    const { policy: _p, salt: _s, ...rest } = v2;
    const v1: BoardSession = { ...rest, version: 1 };
    expect(validBoardSession(v1)).toBe(true);
    expect(sessionPolicy(v1)!.id).toBe("shell-pits/challenge@1");
    // A save keeps its recorded revision through a reload.
    const pinned = { ...v2, policy: "shell-pits/challenge@1" as const };
    expect(validBoardSession(pinned)).toBe(true);
    const loaded = parseSave(JSON.stringify({ ...emptySave(), board: { "shell-pits": pinned } }));
    expect(sessionPolicy(loaded.board!["shell-pits"]!)!.id).toBe("shell-pits/challenge@1");
    expect(playAgain(v1, 9).policy).toBe("shell-pits/challenge@2");
    expect(playAgain(v1, 9).version).toBe(2);
    // The recorded policy must match the round's own game and strength.
    expect(validBoardSession({ ...v2, policy: "shell-pits/gentle@1" })).toBe(false);
    expect(validBoardSession({ ...v2, policy: "coconut-drop/challenge@1" })).toBe(false);
    expect(validBoardSession({ ...v2, policy: "hidden-canoes/challenge@1" })).toBe(false);
    expect(validBoardSession({ ...createSession("shell-pits", { mode: "together" }), policy: "shell-pits/gentle@1" })).toBe(false);
    expect(createSession("reef-sweep").policy).toBe(null);
  });
  it("a version 1 Hidden Canoes round keeps its old searcher exactly", () => {
    const v2 = createSession("hidden-canoes", { seed: 77, strength: "growing", starter: 1 });
    const { policy: _p, salt: _s, ...rest } = v2;
    const v1: BoardSession = { ...rest, version: 1 };
    expect(run(computerTask(v1)!)).toBe(canoes.choose(v1.position, "growing"));
  });
  it("strength never depends on the clock: any slice size gives the same move", async () => {
    for (const seed of [0, 3, 8]) {
      const p = randomGame("shell-pits", seed, 6)[4] ?? pits.create(seed);
      const policy = currentPolicy("shell-pits", "challenge");
      const view = openView("shell-pits", p);
      const answers = [1, 7, 256, 4096].map((q) => run(policy.choose(view, () => 0), q));
      expect(new Set(answers).size).toBe(1);
      let clock = 0;
      const sliced = await runTask(policy.choose(view, () => 0), { cancelled: false }, 8, () => (clock += 5));
      expect(sliced).toBe(answers[0]);
    }
    const cancel = { cancelled: true };
    expect(await runTask(currentPolicy("shell-pits", "challenge").choose(openView("shell-pits", pits.create(1)), () => 0), cancel)).toBe(null);
  });
});

describe("benchmark harness", () => {
  it("plays both starters, both seats and distinct prefixes, and counts unique trajectories apart from games", () => {
    const rows = bench({
      game: "coconut-drop",
      subject: policyPlayer("coconut-drop", policyById("coconut-drop/gentle@1")!),
      rival: policyPlayer("coconut-drop", policyById("coconut-drop/growing@1")!),
      openingPlies: [0, 2],
      seeds: 3,
    });
    expect(rows.length).toBe(16);
    expect(new Set(rows.map((r) => `${r.starter}${r.subject}`)).size).toBe(4);
    const summary = summarize([...rows, ...rows]);
    expect(summary.games).toBe(32);
    expect(summary.uniqueTrajectories).toBeLessThanOrEqual(16);
    expect(summary.win + summary.draw + summary.loss + summary.capped).toBe(32);
  });
  it("hands each policy only its own seat's view", () => {
    const seen: unknown[] = [];
    const spy = { ...currentPolicy("hidden-canoes", "growing") };
    spy.choose = (view, random) => {
      seen.push(view);
      return currentPolicy("hidden-canoes", "growing").choose(view, random);
    };
    bench({ game: "hidden-canoes", subject: policyPlayer("hidden-canoes", spy), rival: policyPlayer("hidden-canoes", spy), openingPlies: [0], seeds: 1 });
    expect(seen.length).toBeGreaterThan(20);
    for (const v of seen) expect(Object.keys(v as object).sort()).toEqual([...canoesViewKeys]);
    expect(publicView("hidden-canoes", canoes.create(1)).game).toBe("hidden-canoes");
  });
});
