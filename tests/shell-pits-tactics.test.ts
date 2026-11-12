import { describe, expect, it } from "vitest";
import * as pits from "../src/board/shell-pits/engine";
import { canWinWith, INF, positionOf, Solver, validDescriptor, type Objective } from "../src/board/shell-pits/tactics";
import { pitsPuzzles, pitsTacticsEngine, type Action, type State } from "../src/board/shell-pits/challenge";
import { registration } from "../src/challenge/registrations/shell-pits";
import { buildCatalog } from "../src/challenge/catalog";
import frozen from "../src/state/save-catalog.json";
import { emptyChallenge, type ChallengeSession } from "../src/state/challenge";
import { policyById } from "../src/playPolicies/policies";
import { policyPlayer } from "../src/playPolicies/benchmark";
import authored from "../src/board/shell-pits/tactics.json";

const greedyFirst = (board: number[]) => {
  const p = positionOf(board);
  return [...pits.legal(p)].sort((a, b) => {
    const v = (m: number) => {
      const n = pits.move(p, m);
      return (n.board[6] - p.board[6]) * 10 + Number(n.turn === 0) * 3;
    };
    return v(b) - v(a) || a - b;
  })[0];
};
const play = (d: (typeof pitsPuzzles)[number]["descriptor"], actions: Action[]) => {
  let s: State = pitsTacticsEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false });
  const events: string[] = [];
  for (const a of actions) {
    const next = pitsTacticsEngine.step(s, a, d);
    if (!next) throw new Error(`Rejected ${JSON.stringify(a)}`);
    events.push(next.event + (next.correct === undefined ? "" : String(next.correct)));
    s = next.state;
  }
  return { s, events };
};
/** A line of circle sows against the in-game defence that wins within par and meets the objective. */
function lineWith(d: (typeof pitsPuzzles)[number]["descriptor"], objective: Objective | null): Action[] | null {
  const search = (actions: Action[]): Action[] | null => {
    const { s } = play(d, actions);
    const r = pitsTacticsEngine.inspect(s, d);
    if (r.solved) return objective === null || r.objectives.includes(objective) ? actions : null;
    if (s.position.outcome !== null || s.line.length >= d.par) return null;
    for (const m of pits.legal(s.position)) {
      const found = search([...actions, ["s", m]]);
      if (found) return found;
    }
    return null;
  };
  return search([]);
}

describe("Shell Pits endgames", () => {
  it("every bundled endgame is certified: exact par, the greedy grab fails, and listed tactics really win", () => {
    expect(pitsPuzzles.length).toBe(16);
    expect(new Set(pitsPuzzles.map((p) => p.tier))).toEqual(new Set([1, 2, 3, 4]));
    for (const p of pitsPuzzles) {
      const d = p.descriptor;
      expect(validDescriptor(d)).toBe(true);
      const start = positionOf(d.board),
        solver = new Solver(d.par);
      expect(solver.value(start)).toBe(d.par);
      expect(new Solver(d.par - 1).value(start)).toBe(INF);
      // The obvious grab is not the answer.
      expect(solver.wins(pits.move(start, greedyFirst(d.board)), d.par - 1)).toBe(false);
      for (const o of ["capture", "one-turn"] as Objective[]) expect(canWinWith(start, d.par, o)).toBe(d.objectives.includes(o));
      expect(p.par).toEqual({ metric: "steps", lower: d.par, upper: d.par });
    }
    // The file is the generator's output, untouched.
    expect(pitsPuzzles.map((p) => p.descriptor)).toEqual(authored);
  });
  it("the solver's line wins in exactly par sows against the in-game defence", () => {
    for (const p of pitsPuzzles) {
      const d = p.descriptor,
        solver = new Solver(d.par + 3);
      const actions: Action[] = [];
      let s = play(d, []).s;
      while (s.position.outcome === null) {
        const m = solver.bestSow(s.position)!;
        expect(m).not.toBe(null);
        actions.push(["s", m]);
        s = play(d, actions).s;
      }
      const r = pitsTacticsEngine.inspect(s, d);
      expect(r.solved).toBe(true);
      expect(r.metrics.steps).toBe(d.par);
      for (const o of d.objectives) expect(lineWith(d, o)).not.toBe(null);
    }
  });
  it("help, undo, start again and a lost try are each recorded as such", () => {
    const d = pitsPuzzles[4].descriptor;
    const help = play(d, [["h"]]);
    expect(help.events).toEqual(["help"]);
    expect(help.s.hint).toBe(new Solver(d.par + 3).bestSow(positionOf(d.board)));
    // Find a sow sequence that loses, then undo and reset from it.
    const losing = (() => {
      const walk = (actions: Action[]): Action[] | null => {
        const { s } = play(d, actions);
        if (s.position.outcome !== null) return s.position.outcome === 0 ? null : actions;
        for (const m of pits.legal(s.position).reverse()) {
          const found = walk([...actions, ["s", m]]);
          if (found) return found;
        }
        return null;
      };
      return walk([]);
    })();
    expect(losing).not.toBe(null);
    const lost = play(d, losing!);
    expect(lost.events.at(-1)).toBe("checkfalse");
    expect(pitsTacticsEngine.inspect(lost.s, d).solved).toBe(false);
    expect(pitsTacticsEngine.step(lost.s, ["s", 0], d)).toBe(null);
    expect(pitsTacticsEngine.step(lost.s, ["h"], d)).toBe(null);
    const undone = pitsTacticsEngine.step(lost.s, ["u"], d)!;
    expect(undone.event).toBe("edit");
    expect(undone.state.line.length).toBe(losing!.length - 1);
    const reset = pitsTacticsEngine.step(lost.s, ["z"], d)!;
    expect(reset.event).toBe("reset");
    expect(reset.state.position).toEqual(positionOf(d.board));
    expect(pitsTacticsEngine.step(reset.state, ["z"], d)).toBe(null);
    expect(pitsTacticsEngine.step(reset.state, ["u"], d)).toBe(null);
    for (const bad of [["s", 6], ["s", -1], ["x"], ["s"], "s", null])
      expect(pitsTacticsEngine.validAction(bad)).toBe(false);
  });
  it("dares and awards go through the shared replay kit: par, capture, single turn and clean", () => {
    const entry = registration,
      owner = "family";
    for (const p of pitsPuzzles) {
      const d = p.descriptor;
      for (const objective of [null, ...d.objectives] as (Objective | null)[]) {
        const line = lineWith(d, objective)!;
        const dare = p.dares.find((x) => (objective ? x.rule.kind === "pick-up" && x.rule.objective === objective : x.rule.kind === "par"))!;
        let s: ChallengeSession = entry.start(p.ref, owner, `pits-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, [dare.slot]);
        for (const a of line) s = entry.move(s, a)!;
        expect(s.result).not.toBe(null);
        expect(s.result!.dares).toEqual([dare.slot]);
        expect(s.result!.event).toBe("independent");
        expect(s.result!.awards).toBe(3);
        expect(s.result!.cost).toBe(d.par);
      }
      // Help keeps the finish and the par mark, but not the clean mark.
      const clean = p.dares.find((x) => x.rule.kind === "clean")!;
      let s: ChallengeSession = entry.start(p.ref, owner, `pits-h-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, [clean.slot]);
      s = entry.move(s, ["h"])!;
      for (const a of lineWith(d, null)!) s = entry.move(s, a)!;
      expect(s.result!.event).toBe("helped");
      expect(s.result!.dares).toEqual([]);
      expect(s.result!.awards).toBe(2);
    }
  });
  it("is registered in the frozen catalog at bank 460 with dares from slot 3200", () => {
    const catalog = buildCatalog([registration]);
    const bank = catalog.banks.get(460)!;
    expect(bank.engine).toBe("shell-pits");
    expect(frozen.banks.find((b) => b.slot === 460)).toEqual(JSON.parse(JSON.stringify(bank)));
    for (const [slot, dare] of catalog.dares) {
      expect(slot).toBeGreaterThanOrEqual(3200);
      expect(frozen.dares.find((x) => x[0] === slot)?.[1]).toEqual(dare);
    }
    for (const c of ["pits-1", "pits-2", "pits-3", "pits-4"]) expect(frozen.contexts).toContain(c);
  });
});

describe("Challenge rival, BD-07: punishes the exploit but is not a forced loss", () => {
  // Lines found by a depth-14 search against revision 2; each replays the rival's exact choices.
  const witnesses: { starter: 0 | 1; human: 0 | 1; moves: number[] }[] = [
    { starter: 0, human: 0, moves: [2, 5, 8, 7, 4, 8, 5, 1, 10, 4, 2, 12, 4, 2, 11, 1, 12, 9, 2, 12, 10, 1, 11, 12] },
    { starter: 0, human: 1, moves: [2, 5, 11, 1, 5, 0, 10, 4, 11, 8, 5, 0, 7, 1, 11, 2, 5, 4, 10, 5, 3, 8, 4, 7, 5] },
    { starter: 1, human: 0, moves: [9, 12, 4, 8, 12, 7, 3, 11, 4, 1, 12, 7, 0, 8, 4, 9, 12, 11, 3, 12, 10, 1, 11, 0, 12] },
    { starter: 1, human: 1, moves: [9, 12, 1, 0, 11, 1, 12, 8, 3, 11, 9, 5, 11, 9, 4, 8, 5, 2, 9, 5, 3, 8, 4, 5] },
  ];
  const rival = policyPlayer("shell-pits", policyById("shell-pits/challenge@2")!);
  it.each(witnesses)("a winning line exists from the start: starter $starter, player seat $human", ({ starter, human, moves }) => {
    let s = pits.create(1, 6, starter);
    for (const m of moves) {
      if (s.turn !== human) expect(rival(s)).toBe(m);
      s = pits.move(s, m);
    }
    expect(s.outcome).toBe(human);
  });
});
