import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCheckers,
  archivedCheckersChoice,
  checkersChoice,
  checkersMoves,
  checkersPolicy,
  CheckersSearch,
  createCheckers,
  replayCheckers,
  type CheckersState,
  type Position,
} from "../src/games/checkers";
import { defaultOptions, random } from "../src/games/types";
import { checkersPolicies, checkersPolicyById } from "../src/playPolicies/policies";
import { rivalFor } from "../src/playPolicies/rivals";
import { emptySave, parseSave, validSession } from "../src/state/validation";

afterEach(() => vi.restoreAllMocks());
const hard = () => createCheckers({ ...defaultOptions, difficulty: "hard" });
function corpus(games = 6) {
  const out: Position[] = [];
  for (let g = 0; g < games; g++) {
    const r = random(g * 104729 + 17);
    let p = createCheckers(defaultOptions).position;
    for (let ply = 0; ply < 48 && !p.outcome; ply++) {
      if (ply % 6 === 3) out.push(p);
      const m = checkersMoves(p);
      p = applyCheckers(p, m[Math.floor(r() * m.length)]);
    }
  }
  return out;
}
/** A clock that runs 9 ms on every reading, like a very slow device. */
const slowClock = () => {
  let t = 0;
  vi.spyOn(Date, "now").mockImplementation(() => (t += 9));
};
const stoppedClock = () => vi.spyOn(Date, "now").mockReturnValue(0);

describe("Checkers policies", () => {
  it("are append-only and frozen; revision 2 keeps revision 1's depth and node cap without the clock", () => {
    expect(checkersPolicies.map((p) => [p.id, p.revision, p.limits, p.timed])).toEqual([
      ["checkers/gentle@1", 1, null, false],
      ["checkers/growing@1", 1, { depth: 2, nodes: 1800 }, true],
      ["checkers/challenge@1", 1, { depth: 4, nodes: 9000 }, true],
      ["checkers/gentle@2", 2, null, false],
      ["checkers/growing@2", 2, { depth: 2, nodes: 1800 }, false],
      ["checkers/challenge@2", 2, { depth: 4, nodes: 9000 }, false],
    ]);
    expect(Object.isFrozen(checkersPolicies)).toBe(true);
    for (const p of checkersPolicies) {
      expect(Object.isFrozen(p)).toBe(true);
      if (p.limits) expect(Object.isFrozen(p.limits)).toBe(true);
    }
    expect(() => {
      (checkersPolicyById("checkers/challenge@2")!.limits as { depth: number }).depth = 1;
    }).toThrow(TypeError);
    // The rival's words are the same claim at both revisions.
    expect(rivalFor("checkers", "challenge").plays).toBe("Looks four moves ahead.");
  });
  it("a new or replayed round records revision 2; a saved round without a policy keeps revision 1", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const s = createCheckers({ ...defaultOptions, difficulty });
      expect(s.policy).toBe(`checkers/${{ easy: "gentle", medium: "growing", hard: "challenge" }[difficulty]}@2`);
      expect(validSession(s)).toBe(true);
      expect(replayCheckers({ ...s, policy: undefined }).policy).toBe(s.policy);
    }
    const save = emptySave();
    save.sessions.checkers = { ...hard(), policy: undefined };
    const old = parseSave(JSON.stringify(save)).sessions.checkers as CheckersState;
    expect(old.policy).toBeUndefined();
    expect(checkersPolicy(old).id).toBe("checkers/challenge@1");
    save.sessions.checkers = hard();
    expect(checkersPolicy(parseSave(JSON.stringify(save)).sessions.checkers as CheckersState).id).toBe("checkers/challenge@2");
    // A policy must be a known Checkers revision for the round's own strength.
    expect(validSession({ ...hard(), policy: "checkers/gentle@2" })).toBe(false);
    expect(validSession({ ...hard(), policy: "checkers/challenge@9" })).toBe(false);
    expect(validSession({ ...hard(), policy: "shell-pits/challenge@2" })).toBe(false);
    expect(validSession({ ...hard(), policy: "checkers/challenge@1" })).toBe(true);
  });
  it("revision 2 makes revision 1's move whenever revision 1's clock doesn't run out", async () => {
    stoppedClock();
    let checked = 0;
    for (const strength of ["medium", "hard"] as const)
      for (const p of corpus()) {
        const s = { ...createCheckers({ ...defaultOptions, difficulty: strength }), position: p };
        const search = new CheckersSearch(p, "classic", checkersPolicy(s).limits!);
        while (!search.step(64));
        expect(search.move()).toEqual(await archivedCheckersChoice({ ...s, policy: undefined }));
        checked++;
      }
    expect(checked).toBeGreaterThan(40);
  });
  it("a new round's move never depends on the clock or the slice size", async () => {
    // Before revision 2 this failed: on a slow clock the computer saw only one move ahead.
    for (const p of corpus(2)) {
      const s = { ...hard(), position: p };
      stoppedClock();
      const settled = await checkersChoice(s);
      vi.restoreAllMocks();
      slowClock();
      expect(await checkersChoice(s)).toEqual(settled);
      vi.restoreAllMocks();
      expect(await checkersChoice(s, undefined, 1)).toEqual(settled);
    }
  });
  it("revision 1's clock really changes its move on a slow device, which is why saved rounds alone keep it", async () => {
    let changed = 0;
    for (const p of corpus()) {
      const s = { ...hard(), policy: undefined, position: p };
      stoppedClock();
      const full = await archivedCheckersChoice(s);
      vi.restoreAllMocks();
      slowClock();
      if (JSON.stringify(await archivedCheckersChoice(s)) !== JSON.stringify(full)) changed++;
      vi.restoreAllMocks();
    }
    expect(changed).toBeGreaterThan(0);
  });
  it("searches in pieces that each stay small, and gentle picks the same move for the same round", async () => {
    const s = hard(),
      search = new CheckersSearch(s.position, "classic", checkersPolicy(s).limits!);
    let steps = 0,
      last = 0;
    while (!search.step(32)) {
      expect(search.nodes - last).toBeLessThanOrEqual(32);
      last = search.nodes;
      steps++;
    }
    expect(steps).toBeGreaterThan(3);
    expect(search.nodes).toBeLessThanOrEqual(9000);
    const gentle = createCheckers(defaultOptions);
    expect(await checkersChoice(gentle)).toEqual(await checkersChoice(gentle));
    expect(checkersMoves(gentle.position)).toContainEqual(await checkersChoice(gentle));
  });
});
