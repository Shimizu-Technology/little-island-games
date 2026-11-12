import { describe, expect, it } from "vitest";
import * as coconut from "../src/board/coconut-drop/engine";
import { answers, positionOf, replay, validDescriptor, type Descriptor } from "../src/board/coconut-drop/tactics";
import { allowance, coconutPuzzles, coconutTacticsEngine, helpDrop, type Action, type State } from "../src/board/coconut-drop/challenge";
import { registration } from "../src/challenge/registrations/drop-puzzles";
import { buildCatalog } from "../src/challenge/catalog";
import frozen from "../src/state/save-catalog.json";
import { emptyChallenge, type ChallengeSession } from "../src/state/challenge";
import authored from "../src/board/coconut-drop/puzzles.json";
import type { Position } from "../src/board/types";

/** Independent of the puzzle solver: plain search over the real engine, no memo. */
function forced(p: Position, k: number): boolean {
  if (p.outcome !== null) return p.outcome === 0;
  if (p.turn === 0 && k === 0) return false;
  const next = coconut.legal(p).map((c) => coconut.move(p, c));
  return p.turn === 0 ? next.some((n) => forced(n, k - 1)) : next.every((n) => forced(n, k));
}
const winsFor = (p: Position, seat: 0 | 1) => coconut.legal({ ...p, turn: seat }).filter((c) => coconut.move({ ...p, turn: seat }, c).outcome === seat);
const play = (d: Descriptor, actions: Action[]) => {
  let s: State = coconutTacticsEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false });
  const events: string[] = [];
  for (const a of actions) {
    const next = coconutTacticsEngine.step(s, a, d);
    if (!next) throw new Error(`Rejected ${JSON.stringify(a)}`);
    events.push(next.event + (next.correct === undefined ? "" : String(next.correct)));
    s = next.state;
  }
  return { s, events };
};
/** Follows Help to the end, as a child pressing Help each turn would. */
function helpedLine(d: Descriptor): Action[] {
  const actions: Action[] = [];
  let s = play(d, []).s;
  while (!coconutTacticsEngine.inspect(s, d).solved) {
    const m = helpDrop(s);
    expect(m).not.toBe(null);
    actions.push(["d", m!]);
    s = play(d, actions).s;
    expect(s.missed).toBe(false);
  }
  return actions;
}

describe("Coconut Drop puzzles (BD-02)", () => {
  it("24 puzzles, 8 each of win, block and fork, each replayed from a legal opening", () => {
    expect(coconutPuzzles.length).toBe(24);
    for (const kind of ["win", "block", "fork"]) expect(coconutPuzzles.filter((p) => p.descriptor.kind === kind).length).toBe(8);
    expect(coconutPuzzles.map((p) => p.tier)).toEqual([...Array(8).fill(1), ...Array(8).fill(2), ...Array(8).fill(3)]);
    for (const { descriptor: d } of coconutPuzzles) {
      expect(validDescriptor(d)).toBe(true);
      // Replayed drop by drop from an empty board, every drop legal, nobody has won yet.
      let p = coconut.create(0, 7, 0);
      for (const m of d.moves) {
        expect(coconut.legal(p)).toContain(m);
        p = coconut.move(p, m);
        expect(p.outcome).toBe(null);
      }
      expect(p.turn).toBe(0);
      expect(positionOf(d).board).toEqual(p.board);
    }
    // A broken opening is refused: an illegal drop, a finished game, or square to move.
    expect(replay([3, 3, 3, 3, 3, 3, 3])).toBe(null);
    expect(validDescriptor({ version: 1, kind: "win", moves: [0, 1, 0, 1, 0, 1, 0, 1], par: 1 })).toBe(false);
    expect(validDescriptor({ version: 1, kind: "win", moves: [0, 1, 2], par: 1 })).toBe(false);
    expect(validDescriptor({ version: 1, kind: "fork", moves: [], par: 1 })).toBe(false);
    // The file is the generator's output, pinned.
    expect(coconutPuzzles.map((p) => p.descriptor)).toEqual(authored);
  });
  it("each answer is certified by plain search, and only one drop answers each puzzle", () => {
    for (const { descriptor: d } of coconutPuzzles) {
      const p = positionOf(d),
        good = coconut.legal(p).filter((c) => {
          const after = coconut.move(p, c);
          if (d.kind === "block") return after.outcome === null && winsFor(after, 1).length === 0;
          return forced(after, d.par - 1);
        });
      expect(good).toHaveLength(1);
      expect(answers(d)).toEqual(good);
      if (d.kind === "win") expect(winsFor(p, 0)).toEqual(good);
      if (d.kind === "block") {
        expect(winsFor(p, 0)).toEqual([]);
        expect(winsFor(p, 1)).toEqual(good);
      }
      if (d.kind === "fork") {
        // Nothing quicker, no four to stop, and the answer makes two fours at once.
        expect(winsFor(p, 0)).toEqual([]);
        expect(winsFor(p, 1)).toEqual([]);
        expect(forced(p, 1)).toBe(false);
        expect(winsFor(coconut.move(p, good[0]), 0).length).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it("the in-game line: the answer solves it in par drops, and every other drop is a lost try", () => {
    for (const { descriptor: d } of coconutPuzzles) {
      const line = helpedLine(d);
      expect(line.length).toBe(d.par);
      expect(play(d, line).events.at(-1)).toBe("checktrue");
      if (d.kind === "fork") {
        // Ray blocks one of the two fours, and the other still wins.
        const after = play(d, line.slice(0, 1)).s;
        expect(after.line[0].reply).not.toBe(null);
        expect(winsFor(after.position, 0).length).toBe(1);
      }
      const p = positionOf(d);
      for (const c of coconut.legal(p).filter((c) => c !== answers(d)[0])) {
        const wrong = play(d, [["d", c]]);
        expect(wrong.s.missed).toBe(true);
        expect(wrong.events).toEqual(["checkfalse"]);
        // Locked until undone: no more drops, and Help says nothing sure is left.
        expect(coconutTacticsEngine.step(wrong.s, ["d", answers(d)[0]], d)).toBe(null);
        expect(coconutTacticsEngine.step(wrong.s, ["h"], d)!.state.hint).toBe(null);
        if (d.kind === "block") expect(wrong.s.position.outcome).toBe(1);
      }
    }
  });
  it("help, undo and start again are recorded as such", () => {
    const d = coconutPuzzles.find((p) => p.descriptor.kind === "fork")!.descriptor;
    const help = play(d, [["h"]]);
    expect(help.events).toEqual(["help"]);
    expect(help.s.hint).toBe(answers(d)[0]);
    const one = play(d, [["d", answers(d)[0]]]).s;
    const undone = coconutTacticsEngine.step(one, ["u"], d)!;
    expect(undone.event).toBe("edit");
    expect(undone.state.position).toEqual(positionOf(d));
    const reset = coconutTacticsEngine.step(one, ["z"], d)!;
    expect(reset.event).toBe("reset");
    expect(coconutTacticsEngine.step(reset.state, ["z"], d)).toBe(null);
    expect(coconutTacticsEngine.step(reset.state, ["u"], d)).toBe(null);
    expect(allowance(d)).toBe(2);
    for (const bad of [["d", 7], ["d", -1], ["x"], ["d"], "d", null]) expect(coconutTacticsEngine.validAction(bad)).toBe(false);
  });
  it("dares and awards go through the shared replay kit", () => {
    for (const p of coconutPuzzles) {
      const d = p.descriptor,
        clean = p.dares.find((x) => x.rule.kind === "clean")!,
        par = p.dares.find((x) => x.rule.kind === "par");
      expect(!!par).toBe(d.kind === "fork");
      const slots = [clean.slot, ...(par ? [par.slot] : [])];
      let s: ChallengeSession = registration.start(p.ref, "family", `coconut-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, slots);
      for (const a of helpedLine(d)) s = registration.move(s, a)!;
      expect(s.result!.event).toBe("independent");
      expect(s.result!.dares).toEqual(slots);
      expect(s.result!.awards).toBe(par ? 3 : 1);
      // A lost try keeps the finish but not the clean mark.
      const wrong = coconut.legal(positionOf(d)).find((c) => c !== answers(d)[0])!;
      let t: ChallengeSession = registration.start(p.ref, "family", `coconut-w-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, slots);
      t = registration.move(t, ["d", wrong])!;
      t = registration.move(t, ["u"])!;
      for (const a of helpedLine(d)) t = registration.move(t, a)!;
      expect(t.result!.event).toBe("helped");
      expect(t.result!.dares).toEqual(par ? [par.slot] : []);
      // Help keeps the finish, never the clean mark.
      let h: ChallengeSession = registration.start(p.ref, "family", `coconut-h-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, [clean.slot]);
      h = registration.move(h, ["h"])!;
      for (const a of helpedLine(d)) h = registration.move(h, a)!;
      expect(h.result!.event).toBe("helped");
      expect(h.result!.dares).toEqual([]);
    }
  });
  it("is registered in the frozen catalog at bank 461 with dares 3264–3311", () => {
    const catalog = buildCatalog([registration]);
    const bank = catalog.banks.get(461)!;
    expect(bank.engine).toBe("drop-puzzles");
    expect("entries" in bank && bank.entries.length).toBe(24);
    expect(frozen.banks.find((b) => b.slot === 461)).toEqual(JSON.parse(JSON.stringify(bank)));
    for (const [slot, dare] of catalog.dares) {
      expect(slot).toBeGreaterThanOrEqual(3264);
      expect(slot).toBeLessThanOrEqual(3311);
      expect(frozen.dares.find((x) => x[0] === slot)?.[1]).toEqual(dare);
    }
    for (const c of ["coconut-1", "coconut-2", "coconut-3"]) expect(frozen.contexts).toContain(c);
  });
});
