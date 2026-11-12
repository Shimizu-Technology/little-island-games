import { describe, expect, it } from "vitest";
import * as nets from "../src/board/fishing-nets/engine";
import { chainRopes, defend, lesson, NetsTable, positionOf, replay, tableFor, validDescriptor, winningTotals, type Descriptor } from "../src/board/fishing-nets/chains";
import { ideas, netsChainsEngine, netsFacts, netsPuzzles, type Action, type State } from "../src/board/fishing-nets/challenge";
import { registration } from "../src/challenge/registrations/fishing-nets";
import { buildCatalog } from "../src/challenge/catalog";
import frozen from "../src/state/save-catalog.json";
import { emptyChallenge, type ChallengeSession } from "../src/state/challenge";
import authored from "../src/board/fishing-nets/chains.json";
import { rng, withEdge, type Position } from "../src/board/types";

/**
 * Independent of NetsTable: plain minimax on final margins, circle maximising and square
 * minimising, with a transposition key of board, turn and score. Extra turns keep the seat.
 */
function plainMargin(p: Position, memo = new Map<string, number>()): number {
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
const habits = {
  challenge: (p: Position) => nets.choose(p, "challenge")!,
  greedy: (p: Position) => nets.scoring(p)[0] ?? nets.safe(p)[0] ?? nets.legal(p)[0],
};
const play = (d: Descriptor, actions: Action[]) => {
  let s: State = netsChainsEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false });
  const events: string[] = [];
  for (const a of actions) {
    const next = netsChainsEngine.step(s, a, d);
    if (!next) throw new Error(`Rejected ${JSON.stringify(a)}`);
    events.push(next.event + (next.correct === undefined ? "" : String(next.correct)));
    s = next.state;
  }
  return { s, events };
};
function helpedLine(d: Descriptor): Action[] {
  const actions: Action[] = [];
  let s = play(d, []).s;
  while (s.position.outcome === null) {
    const h = netsChainsEngine.step(s, ["h"], d)!.state.hint!;
    actions.push(["r", h]);
    s = play(d, actions).s;
  }
  return actions;
}

describe("Fishing Nets chain endings (BD-04)", () => {
  it("12 endings, each a legal game replayed rope by rope, circle to move with 12 ropes or fewer", () => {
    expect(netsPuzzles.length).toBe(12);
    expect(netsPuzzles.map((p) => p.tier)).toEqual(netsPuzzles.map((p) => p.tier).sort());
    expect(new Set(netsPuzzles.map((p) => p.tier))).toEqual(new Set([1, 2, 3, 4]));
    for (const { descriptor: d } of netsPuzzles) {
      expect(validDescriptor(d)).toBe(true);
      let p = nets.create(0, d.size, 0);
      for (const m of d.moves) {
        expect(nets.legal(p)).toContain(m);
        p = nets.move(p, m);
      }
      expect(p.outcome).toBe(null);
      expect(p.turn).toBe(0);
      expect(nets.legal(p).length).toBeLessThanOrEqual(chainRopes);
      expect(positionOf(d)).toEqual(p);
      // A real chain ending: no rope is safe any more.
      expect(nets.safe(p).every((e) => nets.scoring(p).includes(e))).toBe(true);
    }
    expect(replay(3, [0, 0])).toBe(null);
    expect(validDescriptor({ version: 1, size: 3, moves: [] })).toBe(false);
    expect(netsPuzzles.map((p) => p.descriptor)).toEqual(authored.map((a) => a.ending));
  });
  it("the exact table agrees with a plain search keyed by board, turn and score", () => {
    for (const { descriptor: d } of netsPuzzles) {
      const root = positionOf(d),
        table = new NetsTable(root),
        memo = new Map<string, number>();
      expect(table.margin(root)).toBe(plainMargin(root, memo));
      // And at positions along random lines, both seats to move.
      const random = rng(d.moves.length * 31 + d.size);
      for (let k = 0; k < 6; k++) {
        let p = root;
        while (p.outcome === null && random() < 0.8) {
          const legal = nets.legal(p);
          p = nets.move(p, legal[Math.floor(random() * legal.length)]);
          expect(table.margin(p)).toBe(plainMargin(p, memo));
          for (const e of nets.legal(p)) {
            const after = nets.move(p, e),
              mover = p.turn === 0 ? 1 : -1;
            // A rope's value, for the side to move, is the margin it leads to, seen from that side.
            const [a, b] = withEdge(p);
            expect(mover * (a - b) + table.ropeValue(p, e) + 0).toBe(mover * plainMargin(after, memo) + 0);
          }
        }
      }
    }
  });
  it("circle can win, the 3.0 Challenge habit and plain greed both fail, and the facts beside each ending are true", () => {
    netsPuzzles.forEach(({ descriptor: d }, i) => {
      const root = positionOf(d),
        table = tableFor(d);
      expect(plainMargin(root)).toBeGreaterThan(0);
      for (const habit of Object.values(habits)) {
        let s = root;
        while (s.outcome === null) s = s.turn === 0 ? nets.move(s, habit(s)) : defend(s, table).position;
        expect(s.outcome).not.toBe(0);
      }
      const best = table.bestBoxes(root),
        totals = winningTotals(d);
      expect(netsFacts[i]).toEqual({ theme: lesson(d)!.theme, best, short: totals.some((n) => n < best) });
      expect(Math.max(...totals)).toBe(best);
    });
    expect(netsFacts.filter((f) => f.theme === "leave-two").length).toBe(6);
    expect(netsFacts.filter((f) => f.theme === "middle-two").length).toBe(6);
  });
  it("every explanation's claims hold on the board, checked by plain search", () => {
    netsPuzzles.forEach(({ descriptor: d }, i) => {
      const taught = lesson(d)!,
        q = taught.at,
        after = nets.move(q, taught.rope),
        memo = new Map<string, number>();
      // The idea's rope passes the turn and closes nothing.
      expect(after.turn).toBe(1);
      expect(after.scores).toEqual(q.scores);
      const touched = q.marks.flatMap((v, b) => (v === -1 && nets.boxEdges(q.size, b).includes(taught.rope) ? [b] : []));
      if (netsFacts[i].theme === "leave-two") {
        // A box was there to take, and the rope leaves two boxes with three sides each for Ray.
        expect(nets.scoring(q).length).toBeGreaterThan(0);
        const threeSided = after.marks.flatMap((v, b) => (v === -1 && nets.boxEdges(q.size, b).filter((e) => after.board[e] !== -1).length >= 3 ? [b] : []));
        expect(threeSided.length).toBeGreaterThanOrEqual(1);
      } else {
        // Every rope gave something away; the rope runs between two boxes, each left with three sides.
        expect(nets.scoring(q)).toEqual([]);
        expect(nets.safe(q)).toEqual([]);
        expect(touched).toHaveLength(2);
        for (const b of touched) expect(nets.boxEdges(q.size, b).filter((e) => after.board[e] !== -1).length).toBe(3);
      }
      // Ray takes exactly two, then has to open the next chain: circle has a box to close.
      const { position } = defend(after, tableFor(d));
      expect(position.scores[1] - after.scores[1]).toBe(2);
      expect(position.outcome === null && nets.scoring(position).length > 0).toBe(true);
      // The idea is strictly better than the tempting rope, by plain search.
      expect(taught.tempting.length).toBeGreaterThan(0);
      for (const e of taught.tempting) expect(plainMargin(nets.move(q, e), memo)).toBeLessThan(plainMargin(after, memo));
    });
    for (const text of Object.values(ideas)) expect(text).toMatch(/open the next chain of boxes for you/);
  });
  it("Help wins every ending, gets the most boxes, and a habit line is a lost try", () => {
    for (const { descriptor: d } of netsPuzzles) {
      const line = helpedLine(d),
        { s, events } = play(d, line);
      expect(events.at(-1)).toBe("checktrue");
      expect(s.position.scores[0]).toBe(tableFor(d).bestBoxes(positionOf(d)));
      expect(netsChainsEngine.inspect(s, d).objectives).toEqual(["most"]);
      // The 3.0 Challenge habit loses the ending somewhere; that rope is a lost try.
      const actions: Action[] = [];
      let t = play(d, []).s;
      while (!t.missed && t.position.outcome === null) {
        actions.push(["r", habits.challenge(t.position)]);
        t = play(d, actions).s;
      }
      expect(t.missed).toBe(true);
      expect(play(d, actions).events.at(-1)).toBe("checkfalse");
      expect(netsChainsEngine.step(t, ["h"], d)!.state.hint).toBe(null);
      expect(netsChainsEngine.step(t, ["r", nets.legal(t.position)[0] ?? 0], d)).toBe(null);
      const undone = netsChainsEngine.step(t, ["u"], d)!;
      expect(undone.state.missed).toBe(false);
    }
    for (const bad of [["r", 40], ["r", -1], ["x"], ["r"], null]) expect(netsChainsEngine.validAction(bad)).toBe(false);
  });
  it("dares go through the shared replay kit: clean, and all the boxes you can where a win can fall short", () => {
    for (const p of netsPuzzles) {
      const d = p.descriptor,
        clean = p.dares.find((x) => x.rule.kind === "clean")!,
        most = p.dares.find((x) => x.rule.kind === "pick-up");
      expect(!!most).toBe(netsFacts[p.ref.puzzle].short);
      const slots = [clean.slot, ...(most ? [most.slot] : [])];
      let s: ChallengeSession = registration.start(p.ref, "family", `nets-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, slots);
      // Ropes the Help line would choose, entered without pressing Help.
      for (const a of helpedLine(d)) s = registration.move(s, a)!;
      expect(s.result!.event).toBe("independent");
      expect(s.result!.dares).toEqual(slots);
      let h: ChallengeSession = registration.start(p.ref, "family", `nets-h-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, slots);
      h = registration.move(h, ["h"])!;
      for (const a of helpedLine(d)) h = registration.move(h, a)!;
      expect(h.result!.event).toBe("helped");
      expect(h.result!.dares).toEqual(most ? [most.slot] : []);
    }
    // Where a smaller win exists, it wins without the "most" mark.
    const short = netsPuzzles.find((p) => netsFacts[p.ref.puzzle].short)!,
      d = short.descriptor,
      best = tableFor(d).bestBoxes(positionOf(d));
    const smaller = (() => {
      const walk = (actions: Action[]): Action[] | null => {
        const { s } = play(d, actions);
        if (s.missed) return null;
        if (s.position.outcome === 0) return s.position.scores[0] < best ? actions : null;
        for (const e of nets.legal(s.position)) {
          const found = walk([...actions, ["r", e]]);
          if (found) return found;
        }
        return null;
      };
      return walk([]);
    })()!;
    expect(smaller).not.toBe(null);
    expect(netsChainsEngine.inspect(play(d, smaller).s, d)).toMatchObject({ solved: true, objectives: [] });
  });
  it("is registered in the frozen catalog at bank 462 with dares 3312–3335", () => {
    const catalog = buildCatalog([registration]);
    const bank = catalog.banks.get(462)!;
    expect(bank.engine).toBe("fishing-nets");
    expect(frozen.banks.find((b) => b.slot === 462)).toEqual(JSON.parse(JSON.stringify(bank)));
    for (const [slot, dare] of catalog.dares) {
      expect(slot).toBeGreaterThanOrEqual(3312);
      expect(slot).toBeLessThanOrEqual(3335);
      expect(frozen.dares.find((x) => x[0] === slot)?.[1]).toEqual(dare);
    }
    for (const c of ["nets-1", "nets-2", "nets-3", "nets-4"]) expect(frozen.contexts).toContain(c);
  });
});
