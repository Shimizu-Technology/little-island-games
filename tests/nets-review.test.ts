import { describe, expect, it } from "vitest";
import * as nets from "../src/board/fishing-nets/engine";
import { rng, type Position } from "../src/board/types";
import { reviewGame, replayStates, type ReviewTask } from "../src/playPolicies/review";
import { closedBy, isolatedCapture, NetsExact } from "../src/playPolicies/netsExact";
import { policyPlayer } from "../src/playPolicies/benchmark";
import { currentPolicy } from "../src/playPolicies/policies";

const finish = (t: ReviewTask) => {
  while (!t.step(4096));
  return t.result();
};
const play = (moves: number[], size = 3, seed = 0) => moves.reduce((s, m) => nets.move(s, m), nets.create(seed, size, 0));
const label = (n: number, b: number) => `${String.fromCharCode(65 + (b % n))}${Math.floor(b / n) + 1}`;
/** Exact value of tying `rope` from `s`, for the side to move, solved without a budget. */
const exact = (s: Position, rope: number) => new NetsExact(s, 1e9, 20).run().valueOf(rope)!;
// The review's internal-rope fixture: at ply 8 the rope B2–C2 closes B1 only; B2 had one side.
const reviewFixture = [5, 9, 13, 17, 1, 10, 19, 14, 0, 16, 6, 11, 18, 22, 4, 23, 20, 7, 15, 8, 2, 3, 12, 21];

/** Finished 3×3 games between the shipped rivals and a random player, both seats. */
function curated(): Position[] {
  const out: Position[] = [];
  const players = [
    policyPlayer("fishing-nets", currentPolicy("fishing-nets", "gentle")),
    policyPlayer("fishing-nets", currentPolicy("fishing-nets", "growing")),
    policyPlayer("fishing-nets", currentPolicy("fishing-nets", "challenge")),
  ];
  for (let seed = 0; seed < 36; seed++) {
    const random = rng(seed * 131 + 5),
      rival = players[seed % 3];
    let s = nets.create(seed, 3, (seed % 2) as 0 | 1);
    while (s.outcome === null) {
      const legal = nets.legal(s);
      s = nets.move(s, s.turn === 0 ? legal[Math.floor(random() * legal.length)] : rival(s)!);
    }
    out.push(s);
  }
  return out;
}

describe("P2-2: Fishing Nets look-back advice is true and correct", () => {
  it("names only the boxes the rope really closes", () => {
    const final = play(reviewFixture);
    expect(final.outcome).not.toBeNull();
    const before = replayStates("fishing-nets", final)[8];
    // Rope 4, B2 to C2, touches B1 (three sides) and B2 (one side).
    expect(nets.edgeDots(3, 4)).toEqual([5, 6]);
    expect(closedBy(before, 4).map((b) => label(3, b))).toEqual(["B1"]);
    const lesson = finish(reviewGame("fishing-nets", final, 0))!;
    expect(lesson.ply).toBe(8);
    expect(lesson.text).not.toContain("B1 and B2");
    expect(lesson.text).toBe("Tying B2 to C2 would have closed B1 and kept your turn.");
  });
  it("every lesson on the curated games matches an exact search", () => {
    let lessons = 0,
      waiting = 0,
      gave = 0,
      exactly = 0,
      proven = 0;
    for (const final of curated())
      for (const seat of [0, 1] as const) {
        const lesson = finish(reviewGame("fishing-nets", final, seat));
        if (!lesson || lesson.kind === "your-win") continue;
        lessons++;
        const s = lesson.before,
          played = lesson.played;
        expect(s.turn).toBe(seat);
        // Advice is never the move that was played, and it is strictly better with best play.
        expect(lesson.show).not.toBe(played);
        if (nets.legal(s).length <= 20) {
          expect(exact(s, lesson.show)).toBeGreaterThan(exact(s, played));
          exactly++;
        } else {
          // Too many open ropes to solve here: only a proven free box may be advised.
          expect(isolatedCapture(s, lesson.show) && !nets.scoring(s).includes(played)).toBe(true);
          proven++;
        }
        if (lesson.title === "A box was waiting") {
          waiting++;
          const named = closedBy(s, lesson.show).map((b) => label(3, b));
          expect(named.length).toBeGreaterThan(0);
          expect(lesson.text).toContain(`closed ${named.join(" and ")} and kept your turn`);
        } else {
          gave++;
          const [, count] = lesson.text.match(/close (\d+) box/)!;
          expect(nets.giveaway(s, played)).toBe(Number(count));
        }
      }
    // The curated games exercise both kinds of lesson.
    expect(waiting).toBeGreaterThan(3);
    expect(gave).toBeGreaterThan(3);
    expect(lessons).toBe(waiting + gave);
    expect(exactly).toBeGreaterThan(proven);
  });
  it("taking a box whose rope touches nothing else is never worse, by exact search", () => {
    let checked = 0;
    for (const final of curated().slice(0, 12))
      for (const s of replayStates("fishing-nets", final))
        if (s.outcome === null && nets.legal(s).length <= 16)
          for (const rope of nets.scoring(s).filter((e) => isolatedCapture(s, e))) {
            const solved = new NetsExact(s, 1e9).run(),
              best = Math.max(...nets.legal(s).map((e) => solved.valueOf(e)!));
            expect(solved.valueOf(rope)).toBe(best);
            for (const quiet of nets.legal(s).filter((e) => !nets.scoring(s).includes(e)))
              expect(solved.valueOf(rope)!).toBeGreaterThan(solved.valueOf(quiet)!);
            checked++;
          }
    expect(checked).toBeGreaterThan(20);
  });
  it("the exact search agrees with a plain recursive one, and gives up past its budget", () => {
    const plain = (s: Position): number => {
      const legal = nets.legal(s);
      if (!legal.length) return 0;
      return Math.max(
        ...legal.map((e) => {
          const next = nets.move(s, e),
            gain = next.scores[s.turn] - s.scores[s.turn];
          return gain ? gain + plain(next) : -plain(next);
        })
      );
    };
    const states = replayStates("fishing-nets", play(reviewFixture)).filter((s) => s.outcome === null && nets.legal(s).length <= 8);
    expect(states.length).toBeGreaterThan(3);
    for (const s of states) {
      const solved = new NetsExact(s, 1e9).run();
      for (const e of nets.legal(s)) {
        const next = nets.move(s, e),
          gain = next.scores[s.turn] - s.scores[s.turn];
        expect(solved.valueOf(e)).toBe(gain ? gain + plain(next) : -plain(next));
      }
    }
    const capped = new NetsExact(nets.create(0, 3, 0), 1000).run();
    expect(capped.solved).toBe(false);
    expect(capped.valueOf(0)).toBeNull();
    expect(new NetsExact(nets.create(0, 5, 0), 1e9).solved).toBe(false);
  });
});
