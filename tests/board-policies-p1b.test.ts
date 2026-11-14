import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSession, playAgain, sessionPolicy, validBoardSession, type BoardSession } from "../src/board";
import { rng, withEdge, type Position } from "../src/board/types";
import * as canoes from "../src/board/hidden-canoes/engine";
import * as nets from "../src/board/fishing-nets/engine";
import { lesson, NetsTable } from "../src/board/fishing-nets/chains";
import { netsPuzzles } from "../src/board/fishing-nets/challenge";
import { boardPolicies, currentPolicy, netsEndgameLimits, policyById, policyRandom } from "../src/playPolicies/policies";
import { CanoesHeatmap, likeliest } from "../src/playPolicies/canoesHeatmap";
import { NetsExact } from "../src/playPolicies/netsExact";
import { canoesView, canoesViewKeys, openView } from "../src/playPolicies/views";
import { hintTask } from "../src/playPolicies/decide";
import { bench, policyPlayer, summarize } from "../src/playPolicies/benchmark";
import { rivalFor } from "../src/playPolicies/rivals";
import type { PolicyTask } from "../src/playPolicies/types";

const run = (task: PolicyTask, quota = 4096) => {
  while (!task.step(quota));
  return task.move();
};
const netsAt2 = policyById("fishing-nets/challenge@2")!,
  netsAt1 = policyById("fishing-nets/challenge@1")!,
  canoesAt3 = policyById("hidden-canoes/challenge@3")!,
  canoesAt2 = policyById("hidden-canoes/challenge@2")!;
/** Seeded games through the real engine, every position kept. */
function netsGames(size: number, games: number): Position[] {
  const out: Position[] = [];
  for (let g = 0; g < games; g++) {
    const random = rng(g * 977 + size);
    let s = nets.create(g, size, (g % 2) as 0 | 1);
    while (s.outcome === null) {
      out.push(s);
      const grab = nets.scoring(s),
        quiet = nets.safe(s);
      const pool = grab.length && random() < 0.7 ? grab : quiet.length && random() < 0.8 ? quiet : nets.legal(s);
      s = nets.move(s, pool[Math.floor(random() * pool.length)]);
    }
  }
  return out;
}
/** Independent of NetsExact: plain minimax on final margins, keyed by board, turn and score. */
function plainMargin(p: Position, memo: Map<string, number>): number {
  if (p.outcome !== null) {
    const [a, b] = withEdge(p);
    return a - b;
  }
  const key = `${p.turn}|${p.scores.join(",")}|${p.board.join("")}`,
    known = memo.get(key);
  if (known !== undefined) return known;
  const values = nets.legal(p).map((e) => plainMargin(nets.move({ ...p, moves: [] }, e), memo));
  const v = p.turn === 0 ? Math.max(...values) : Math.min(...values);
  memo.set(key, v);
  return v;
}
/** Canoes positions from real seeded games, with the fleets the engine laid out. */
function canoesGames(games: number): Position[] {
  const out: Position[] = [];
  for (let g = 1; g <= games; g++) {
    const random = rng(g * 131);
    let s = canoes.create(g, 6, (g % 2) as 0 | 1);
    while (s.outcome === null) {
      out.push(s);
      const legal = canoes.legal(s);
      s = canoes.move(s, legal[Math.floor(random() * legal.length)]);
    }
  }
  return out;
}
const placeAll = (n: number, seen: readonly number[]) => {
  const out: number[][] = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++) {
      if (c + n <= 6) out.push(Array.from({ length: n }, (_, k) => r * 6 + c + k));
      if (r + n <= 6) out.push(Array.from({ length: n }, (_, k) => (r + k) * 6 + c));
    }
  return out.filter((cells) => cells.every((x) => seen[x] !== 1));
};
/** Independent of the heatmap: ordered fleets of 3, 2, 2 that fit a chart, and the cells they cover. */
function fleetCover(seen: readonly number[]) {
  const hits = seen.flatMap((v, i) => (v === 2 ? [i] : [])),
    cover = Array(36).fill(0);
  let layouts = 0;
  for (const a of placeAll(3, seen))
    for (const b of placeAll(2, seen))
      for (const c of placeAll(2, seen)) {
        const all = [...a, ...b, ...c];
        if (new Set(all).size !== 7 || !hits.every((h) => all.includes(h))) continue;
        layouts++;
        for (const x of all) cover[x]++;
      }
  return { layouts, cover };
}
/** Every rival fleet that fits what the searching seat has seen, laid out on the board. */
function otherFleets(s: Position, searcher: 0 | 1, limit: number): Position[] {
  const rival = 1 - searcher,
    seen = s.marks.slice(searcher * 36, searcher * 36 + 36);
  const place = (n: number) => {
    const out: number[][] = [];
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 6; c++) {
        if (c + n <= 6) out.push(Array.from({ length: n }, (_, k) => r * 6 + c + k));
        if (r + n <= 6) out.push(Array.from({ length: n }, (_, k) => (r + k) * 6 + c));
      }
    return out.filter((cells) => cells.every((x) => seen[x] !== 1));
  };
  const hits = seen.flatMap((v, i) => (v === 2 ? [i] : [])),
    out: Position[] = [];
  for (const a of place(3))
    for (const b of place(2))
      for (const c of place(2)) {
        const all = [...a, ...b, ...c];
        if (new Set(all).size !== 7 || !hits.every((h) => all.includes(h))) continue;
        const board = [...s.board];
        for (let i = 0; i < 36; i++) board[rival * 36 + i] = 0;
        a.forEach((x) => (board[rival * 36 + x] = 1));
        b.forEach((x) => (board[rival * 36 + x] = 2));
        c.forEach((x) => (board[rival * 36 + x] = 3));
        out.push({ ...s, board });
        if (out.length >= limit) return out;
      }
  return out;
}

describe("Fishing Nets Challenge revision 2: exact ending at 14 ropes or fewer (BD-04)", () => {
  it("is a new frozen ID; revision 1 stays for saved rounds", () => {
    expect(netsAt2.limits).toEqual({ depth: 14, nodes: 16384 });
    expect(Object.isFrozen(netsAt2)).toBe(true);
    expect(Object.isFrozen(netsEndgameLimits)).toBe(true);
    expect(() => {
      (netsEndgameLimits as { depth: number }).depth = 20;
    }).toThrow(TypeError);
    expect(currentPolicy("fishing-nets", "challenge")).toBe(netsAt2);
    expect(boardPolicies.filter((p) => p.game === "fishing-nets" && p.strength !== "challenge").every((p) => p.revision === 1)).toBe(true);
    // A new round records revision 2; a round saved under revision 1 keeps it, and Play again moves on.
    const fresh = createSession("fishing-nets", { seed: 3, strength: "challenge" });
    expect(fresh.policy).toBe("fishing-nets/challenge@2");
    const old: BoardSession = { ...fresh, policy: "fishing-nets/challenge@1" };
    expect(validBoardSession(old)).toBe(true);
    expect(sessionPolicy(old)!.id).toBe("fishing-nets/challenge@1");
    expect(playAgain(old, 4).policy).toBe("fishing-nets/challenge@2");
    expect(validBoardSession({ ...fresh, policy: "fishing-nets/challenge@3" })).toBe(false);
    expect(rivalFor("fishing-nets", "challenge").plays).toMatch(/14 ropes or fewer left, it works out the whole ending/);
  });
  it("with more than 14 ropes open it makes exactly revision 1's move", () => {
    let checked = 0;
    for (const size of [3, 4, 5])
      for (const p of netsGames(size, 6).filter((p) => nets.legal(p).length > 14)) {
        const view = openView("fishing-nets", p);
        expect(run(netsAt2.choose(view, policyRandom(5, p.moves.length, p.turn)))).toBe(run(netsAt1.choose(view, () => 0.5)));
        checked++;
      }
    expect(checked).toBeGreaterThan(150);
  });
  it("with 14 or fewer it picks a rope that wins the most, matching plain search with turn and score in the key", () => {
    let checked = 0;
    let plain = 0;
    for (const size of [3, 4])
      for (const p of netsGames(size, 8).filter((p) => nets.legal(p).length <= 14)) {
        const rope = run(netsAt2.choose(openView("fishing-nets", p), policyRandom(9, p.moves.length, p.turn)))!;
        // Plain search is quick enough up to 9 ropes; beyond that the chain endings' table, itself
        // checked against plain search in tests/nets-chains.test.ts, is the second implementation.
        if (nets.legal(p).length <= 9) {
          const memo = new Map<string, number>();
          expect(plainMargin(nets.move({ ...p, moves: [] }, rope), memo)).toBe(plainMargin(p, memo));
          plain++;
        } else {
          const table = new NetsTable(p, 14);
          expect(table.margin(nets.move({ ...p, moves: [] }, rope))).toBe(table.margin(p));
        }
        checked++;
      }
    expect(checked).toBeGreaterThan(100);
    expect(plain).toBeGreaterThan(40);
  });
  it("extra turns maximise for the same seat: it declines boxes when keeping control wins more", () => {
    let declined = 0;
    for (const { descriptor } of netsPuzzles) {
      const taught = lesson(descriptor)!;
      if (taught.theme !== "leave-two") continue;
      // Circle to move with a box on offer; every rope that takes it is strictly worse.
      const q = taught.at,
        rope = run(netsAt2.choose(openView("fishing-nets", q), () => 0.5))!;
      expect(nets.scoring(q).length).toBeGreaterThan(0);
      expect(nets.move(q, rope).turn).toBe(1);
      declined++;
    }
    expect(declined).toBe(6);
    // The search counts a closed box for the seat that closed it and lets it choose again.
    const p = netsPuzzles[0].descriptor && lesson(netsPuzzles[0].descriptor)!.at;
    const exact = new NetsExact({ ...p, moves: [] }, 1 << 16).run();
    for (const e of nets.legal(p)) {
      const after = nets.move(p, e),
        gain = after.scores[p.turn] - p.scores[p.turn];
      if (!gain) continue;
      expect(after.turn).toBe(p.turn);
      const rest = new NetsExact({ ...after, moves: [] }, 1 << 16).run();
      expect(exact.valueOf(e)).toBe(gain + Math.max(...nets.legal(after).map((r) => rest.valueOf(r)!)));
    }
  });
  it("the same move at any slice size; the salt only breaks ties between equal ropes", () => {
    for (const p of netsGames(4, 4).filter((p) => nets.legal(p).length <= 14).slice(0, 20)) {
      const view = openView("fishing-nets", p),
        random = () => policyRandom(3, p.moves.length, p.turn);
      const moves = [1, 7, 256, 4096].map((q) => run(netsAt2.choose(view, random()), q));
      expect(new Set(moves).size).toBe(1);
      const table = new NetsTable(p, 14),
        best = table.margin(p);
      for (const salt of [1, 2, 3, 4]) {
        const m = run(netsAt2.choose(view, policyRandom(salt, p.moves.length, p.turn)))!;
        expect(table.margin(nets.move({ ...p, moves: [] }, m))).toBe(best);
      }
    }
  });
  it("every decision on a fixed corpus is pinned: changing the search needs a new ID", () => {
    const trace = [3, 4, 5].flatMap((size) =>
      netsGames(size, 3)
        .filter((p) => nets.legal(p).length <= 14)
        .map((p) => {
          const task = netsAt2.choose(openView("fishing-nets", p), policyRandom(1, p.moves.length, p.turn));
          return `${run(task)}:${task.nodes}`;
        })
    );
    expect(trace.length).toBe(TRACE_NETS.count);
    expect(createHash("sha256").update(trace.join(",")).digest("hex").slice(0, 16)).toBe(TRACE_NETS.hash);
  });
  it("is stronger than revision 1 from both starters and seats, and its hint reads the exact ending", () => {
    for (const size of [3, 4]) {
      const t = summarize(
        bench({ game: "fishing-nets", size, subject: policyPlayer("fishing-nets", netsAt2), rival: policyPlayer("fishing-nets", netsAt1), openingPlies: [0, 2, 4], seeds: 6 })
      );
      expect(t.win).toBeGreaterThan(t.loss);
    }
    const p = netsGames(3, 1).find((p) => nets.legal(p).length <= 12)!;
    const session = { ...createSession("fishing-nets", { strength: "growing", seed: p.seed }), position: p };
    const table = new NetsTable(p, 14);
    expect(table.margin(nets.move({ ...p, moves: [] }, run(hintTask(session)!)!))).toBe(table.margin(p));
  });
});

describe("Hidden Canoes Challenge revision 3: the placement heatmap (BD-05)", () => {
  it("is a new frozen ID with the same view, and the rival says what it does", () => {
    expect(canoesAt3.publicOnly).toBe(true);
    expect(Object.isFrozen(canoesAt3)).toBe(true);
    expect(currentPolicy("hidden-canoes", "challenge")).toBe(canoesAt3);
    expect(currentPolicy("hidden-canoes", "growing").id).toBe("hidden-canoes/growing@2");
    const fresh = createSession("hidden-canoes", { seed: 3, strength: "challenge" });
    expect(fresh.policy).toBe("hidden-canoes/challenge@3");
    const old: BoardSession = { ...fresh, policy: "hidden-canoes/challenge@2" };
    expect(validBoardSession(old)).toBe(true);
    expect(sessionPolicy(old)!.id).toBe("hidden-canoes/challenge@2");
    expect(Object.keys(canoesView(fresh.position)).sort()).toEqual([...canoesViewKeys]);
    expect(rivalFor("hidden-canoes", "challenge").plays).toBe("Counts every way the canoes could fit its chart, then searches where the most of them could be.");
  });
  it("its heatmap is an exact count, and it always searches a space the most layouts cover", () => {
    let checked = 0;
    for (const s of canoesGames(12).filter((_, i) => i % 5 === 0)) {
      const seat = s.turn,
        view = canoesView(s, seat),
        map = new CanoesHeatmap(view.searched).run();
      const brute = fleetCover(view.searched);
      // Each unordered short pair counted once: twice as many ordered fleets.
      expect(brute.layouts).toBe(2 * map.layouts);
      expect(brute.cover.map((n) => n / 2)).toEqual(map.cover);
      const move = run(canoesAt3.choose(view, policyRandom(7, s.moves.length, seat)))!;
      expect(likeliest(map, view.searched)).toContain(move);
      checked++;
    }
    expect(checked).toBeGreaterThan(40);
  });
  it("counterfactual: any rival fleet that fits the chart gives the same view, move and hint", () => {
    let cases = 0;
    for (const s of canoesGames(10).filter((_, i) => i % 7 === 3)) {
      const seat = s.turn,
        salt = 11,
        base = run(canoesAt3.choose(canoesView(s, seat), policyRandom(salt, s.moves.length, seat)));
      const session = { ...createSession("hidden-canoes", { strength: "challenge", seed: s.seed }), position: s, salt };
      const hint = run(hintTask(session)!);
      for (const other of otherFleets(s, seat, 25)) {
        expect(canoesView(other, seat)).toEqual(canoesView(s, seat));
        expect(run(canoesAt3.choose(canoesView(other, seat), policyRandom(salt, s.moves.length, seat)))).toBe(base);
        expect(run(hintTask({ ...session, position: other })!)).toBe(hint);
        cases++;
      }
    }
    expect(cases).toBeGreaterThan(500);
  });
  it("the same move at any slice size, and every decision on a fixed corpus is pinned", () => {
    const trace: string[] = [];
    for (const s of canoesGames(6).filter((_, i) => i % 4 === 0)) {
      const view = canoesView(s, s.turn),
        moves = [1, 7, 256, 4096].map((q) => run(canoesAt3.choose(view, policyRandom(2, s.moves.length, s.turn)), q));
      expect(new Set(moves).size).toBe(1);
      const task = canoesAt3.choose(view, policyRandom(2, s.moves.length, s.turn));
      trace.push(`${run(task)}:${task.nodes}`);
    }
    expect(trace.length).toBe(TRACE_CANOES.count);
    expect(createHash("sha256").update(trace.join(",")).digest("hex").slice(0, 16)).toBe(TRACE_CANOES.hash);
  });
  it("finds the fleet in fewer searches than revision 2 and wins more head to head", () => {
    let w = 0,
      l = 0;
    for (let board = 1; board <= 20; board++) {
      const t = summarize(
        bench({ game: "hidden-canoes", subject: policyPlayer("hidden-canoes", canoesAt3, board), rival: policyPlayer("hidden-canoes", canoesAt2, board), openingPlies: [0], seeds: 1, boardSeed: () => board })
      );
      w += t.win;
      l += t.loss;
    }
    expect(w).toBeGreaterThan(l);
  });
});
// Pinned by running the corpus once; a change here means a changed search under a shipped ID.
const TRACE_NETS = { count: 126, hash: "744cffd4eeb33582" };
const TRACE_CANOES = { count: 90, hash: "78570960218aca42" };
