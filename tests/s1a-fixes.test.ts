/** S1a fix round 1: engine, content and credit-boundary findings (P1-2, P2-1, P2-2, P2-5). */
import { describe, expect, it } from "vitest";
import { clean, create, describeSetup, move, replay, solve, validState, type InquiryState, type Investigation } from "../src/learn/inquiry/engine";
import { investigations } from "../src/learn/games/space-station/investigations";
import { eclipseAt, eclipses, planetSize, planets } from "../src/learn/games/space-station/model";
import { engine, legacyEngine } from "../src/learn/games/space-station/engine";
import { engines } from "../src/learn/engines";
import { optionsAtLevel } from "../src/learn/levels";
import { independentRound, creditSchool } from "../src/learn/schoolProgress";
import { recordLevelRound } from "../src/learn/levelEvidence";
import { validLearnSession } from "../src/learn/session";
import { emptySave } from "../src/state/validation";
import { addLearner } from "../src/learn/learners";
import type { LearnSession } from "../src/learn/types";

const eclipseOf = (label: string) => eclipses.indexOf(label as (typeof eclipses)[number]);

const find = (level: number, key: string, seeds = 400) => {
  for (let seed = 0; seed < seeds; seed++) {
    const qs = investigations(level, seed), index = qs.findIndex((q) => q.key === key);
    if (index >= 0) return { seed, qs, index, q: qs[index] };
  }
  throw new Error(`no ${key}`);
};
/** Plays investigations before `index` correctly. */
function upTo(qs: readonly Investigation[], s: InquiryState, index: number) {
  while (s.index < index) {
    const q = qs[s.index];
    if (q.kind === "observe") s = move(qs, s, { type: "predict", outcome: q.observe(q.start).outcome });
    else solve(q)!.forEach((value, control) => { if (!q.controls[control].fixed) s = move(qs, s, { type: "set", control, value }); });
    s = move(qs, s, { type: "test" });
    s = move(qs, s, { type: "explain", choice: q.explain.answer });
    s = move(qs, s, { type: "next" });
  }
  return s;
}

describe("P2-1: a revised plan shows no result for its untested draft", () => {
  it("after a missed plan and a revision, the replay keeps the previous evidence with its own tested setup and clears the result", () => {
    const { seed, qs, index, q } = find(4, "gravity-b");
    let s = upTo(qs, create(4, seed, qs), index);
    const tested = [...s.draft];
    s = move(qs, s, { type: "test" }); // the start never reaches the goal
    expect(replay(qs, s.history)!.phase).toBe("result");
    s = move(qs, s, { type: "revise" });
    const free = q.controls.findIndex((c) => !c.fixed);
    s = move(qs, s, { type: "set", control: free, value: (s.draft[free] + 1) % q.controls[free].options.length });
    for (const state of [s, JSON.parse(JSON.stringify(s)) as InquiryState]) {
      expect(validState(state, 4, qs)).toBe(true);
      const p = replay(qs, state.history)!;
      expect(p.phase).toBe("setup");
      expect(p.seen).toBeNull();
      expect(p.previous?.settings).toEqual(tested);
      expect(p.previous?.observation).toEqual(q.observe(tested));
      const label = describeSetup(q, state.draft, p.seen);
      expect(label).toContain("Result hidden until you test.");
      expect(label).not.toContain(q.observe(state.draft).reading);
    }
  });
});

describe("P2-2: every planet narrower than Earth counts", () => {
  it("Venus (3 < 3.2 in the size model) is accepted whenever it is offered for a narrower-than-Earth goal", () => {
    let checked = 0;
    for (let seed = 0; seed < 400; seed++) for (const q of investigations(3, seed)) {
      if (q.kind !== "reach" || !/narrower than/.test(q.question)) continue;
      q.controls[0].options.forEach((name, i) => {
        const p = planets.indexOf(name as (typeof planets)[number]);
        expect(q.observe([i]).outcome === q.want, `${name} seed ${seed}`).toBe(planetSize[p] < planetSize[2]);
      });
      expect(q.controls[0].options).toContain("Venus");
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });
  it("a pair comparison never calls a narrower planet the same width", () => {
    for (let seed = 0; seed < 400; seed++) for (const q of investigations(3, seed)) {
      if (q.kind !== "observe") continue;
      const [a, b] = q.start, seen = q.observe(q.start);
      const wider = planetSize[a] > planetSize[b] ? planets[a] : planets[b];
      expect(q.outcomes[seen.outcome]).toBe(`${wider} is wider`);
    }
  });
});

describe("P1-2: the eclipse model keeps the Moon's orbit tilted", () => {
  it("the second condition is whether the Moon is on the Sun–Earth line now; tilt is never a choice", () => {
    for (let seed = 0; seed < 200; seed++) for (const q of investigations(5, seed)) {
      if (!q.key.startsWith("eclipse")) continue;
      const names = q.controls.map((c) => c.name).join(" ");
      const labels = q.controls.flatMap((c) => c.options).join(" ");
      // Tilt is never something a child turns off: no option says "Tilted" or "Lined up".
      expect(names + " " + labels).not.toMatch(/tilted|lined up|orbit/i);
      expect(names).toContain("Moon's path");
      expect(labels).toMatch(/crosses the line/i);
      expect(labels).toMatch(/passes above or below/i);
      expect(q.rule).toMatch(/orbit is tilted/i);
      expect(q.rule).toMatch(/crosses/i);
      expect(q.rule).toMatch(/most months/i);
    }
  });
  it("an aligned Moon near the crossing makes an eclipse; off the line never does", () => {
    expect(eclipseAt(0, 0)).toBe(0);
    expect(eclipseAt(1, 0)).toBe(1);
    for (const place of [0, 1, 2]) expect(eclipseAt(place, 1)).toBe(2);
    expect(eclipseAt(2, 0)).toBe(2);
  });
  it("the eclipse check varies its answer, and a miss explains that the Moon passed above or below", () => {
    const answers = new Set<number>();
    for (let seed = 0; seed < 400; seed++) {
      const q = investigations(5, seed).find((x) => x.key === "eclipse-d")!;
      const answer = q.observe(q.start).outcome;
      if (q.outcomes[answer] === "No eclipse") expect(q.explain.choices[q.explain.answer]).toMatch(/above/i);
      answers.add(eclipseOf(q.outcomes[answer]));
    }
    expect([...answers].sort()).toEqual([0, 1, 2]);
  });
});

describe("P2-5: independence comes from the replay at the credit and load boundary", () => {
  const level = 4, options = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
  const base = (state: InquiryState): LearnSession => ({ version: 1, game: "space-station", id: "restored", revision: 7, learner: "a", levelHelped: false, options, state });
  /** Finished or paused rounds whose history shows help, a wrong reason or a strict-level prediction miss. */
  function dirty(kind: "hint" | "miss" | "prediction", finish: boolean) {
    const s0 = engine.create(options, { skills: {}, rng: () => 0.37, starter: 0, today: 1 }) as InquiryState;
    const qs = investigations(level, s0.seed);
    let s = s0;
    const q = qs[0];
    if (kind === "hint") s = move(qs, s, { type: "hint" });
    if (q.kind === "observe") s = move(qs, s, { type: "predict", outcome: kind === "prediction" ? (q.observe(q.start).outcome + 1) % q.outcomes.length : q.observe(q.start).outcome });
    else if (kind !== "prediction") solve(q)!.forEach((value, control) => { if (!q.controls[control].fixed) s = move(qs, s, { type: "set", control, value }); });
    s = move(qs, s, { type: "test" });
    if (replay(qs, s.history)!.phase === "result") { s = move(qs, s, { type: "revise" }); solve(q)!.forEach((value, control) => { if (!q.controls[control].fixed) s = move(qs, s, { type: "set", control, value }); }); s = move(qs, s, { type: "test" }); }
    if (kind === "miss") s = move(qs, s, { type: "explain", choice: (q.explain.answer + 1) % 3 });
    s = move(qs, s, { type: "explain", choice: q.explain.answer });
    s = move(qs, s, { type: "next" });
    if (finish) s = upTo(qs, s, qs.length);
    expect(clean(replay(qs, s.history)!, level)).toBe(false);
    return s;
  }
  for (const kind of ["hint", "miss", "prediction"] as const) {
    it(`a finished round with a ${kind} and a false help flag earns no independent credit, and the input is not changed`, () => {
      const round = base(dirty(kind, true)), before = JSON.stringify(round);
      expect(validLearnSession(round)).toBe(true);
      expect(engine.outcome(round.state as InquiryState, options)).toBe("done");
      expect(independentRound(round)).toBe(false);
      expect(creditSchool({}, round, 100)["space-station"]?.[level]).toMatchObject({ stars: 1, independent: 0 });
      expect(engines["space-station"].helpedWork?.(round.state, options)).toBe(true);
      expect(JSON.stringify(round)).toBe(before);
    });
    it(`a paused round with a ${kind} and a false help flag is recorded as helped when it finishes`, () => {
      const paused = dirty(kind, false), qs = investigations(level, paused.seed);
      const finished = upTo(qs, paused, qs.length);
      const save = { ...emptySave(), learning: addLearner(undefined, "A", "a") };
      const before = { ...save, learn: { "space-station": base(paused) } };
      const after = { ...save, learn: { "space-station": base(finished) } };
      const frozen = JSON.stringify(after);
      const result = recordLevelRound(before, after, "space-station", 100);
      expect(result.school?.["space-station"]?.[level]).toMatchObject({ independent: 0, stars: 1 });
      expect(JSON.stringify(after)).toBe(frozen);
    });
  }
  it("a clean restored round keeps its independent credit, and version-1 rounds are unchanged", () => {
    const s0 = engine.create(options, { skills: {}, rng: () => 0.37, starter: 0, today: 1 }) as InquiryState;
    const qs = investigations(level, s0.seed);
    const round = base(upTo(qs, s0, qs.length));
    expect(independentRound(round)).toBe(true);
    const old = legacyEngine.create(optionsAtLevel({ mode: "solo", pace: "easy" }, 2), { skills: {}, rng: () => 0.2, starter: 0, today: 1 });
    expect(engines["space-station"].helpedWork?.(old, optionsAtLevel({ mode: "solo", pace: "easy" }, 2)) ?? false).toBe(false);
  });
});
