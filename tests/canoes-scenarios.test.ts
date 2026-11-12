import { describe, expect, it } from "vitest";
import { canoesPuzzles, canoesScenarioEngine, reason, type Action, type State } from "../src/board/hidden-canoes/challenge";
import { factsFor, validDescriptor, type Descriptor } from "../src/board/hidden-canoes/scenarios";
import { registration } from "../src/challenge/registrations/hidden-canoes";
import { buildCatalog } from "../src/challenge/catalog";
import frozen from "../src/state/save-catalog.json";
import { emptyChallenge, type ChallengeSession } from "../src/state/challenge";
import authored from "../src/board/hidden-canoes/scenarios.json";

/** Independent of the heatmap: every ordered fleet of 3, 2, 2 that fits, by plain arrays. */
function bruteCover(chart: readonly number[]) {
  const place = (n: number) => {
    const out: number[][] = [];
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 6; c++) {
        if (c + n <= 6) out.push(Array.from({ length: n }, (_, k) => r * 6 + c + k));
        if (r + n <= 6) out.push(Array.from({ length: n }, (_, k) => (r + k) * 6 + c));
      }
    return out.filter((cells) => cells.every((x) => chart[x] !== 1));
  };
  const hits = chart.flatMap((v, i) => (v === 2 ? [i] : []));
  let layouts = 0;
  const cover = Array(36).fill(0);
  for (const a of place(3))
    for (const b of place(2))
      for (const c of place(2)) {
        const all = [...a, ...b, ...c];
        if (new Set(all).size !== 7 || !hits.every((h) => all.includes(h))) continue;
        layouts++;
        for (const x of all) cover[x]++;
      }
  return { layouts, cover };
}
const play = (d: Descriptor, actions: Action[]) => {
  let s: State = canoesScenarioEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false });
  const events: string[] = [];
  for (const a of actions) {
    const next = canoesScenarioEngine.step(s, a, d);
    if (!next) throw new Error(`Rejected ${JSON.stringify(a)}`);
    events.push(next.event + (next.correct === undefined ? "" : String(next.correct)));
    s = next.state;
  }
  return { s, events };
};

describe("Hidden Canoes deduction charts (BD-05)", () => {
  it("12 charts of public information only: no fleet, no seed, nothing hidden", () => {
    expect(canoesPuzzles.length).toBe(12);
    expect(canoesPuzzles.map((p) => p.tier)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]);
    for (const { descriptor: d } of canoesPuzzles) {
      expect(validDescriptor(d)).toBe(true);
      expect(Object.keys(d).sort()).toEqual(["ask", "chart", "count", "version"]);
      expect(d.chart.filter((v) => v === 2).length).toBeLessThan(7);
    }
    expect(canoesPuzzles.map((p) => p.descriptor)).toEqual(authored);
    expect(validDescriptor({ version: 1, ask: "best", chart: Array(36).fill(0), count: 2 })).toBe(false);
    expect(validDescriptor({ version: 1, ask: "sure", chart: Array(36).fill(2), count: 1 })).toBe(false);
  });
  it("every answer is certified by an independent count of fleet layouts", () => {
    for (const { descriptor: d } of canoesPuzzles) {
      const brute = bruteCover(d.chart),
        f = factsFor(d),
        open = d.chart.flatMap((v, i) => (v ? [] : [i]));
      // Ordered short canoes count each layout twice; the shares are the same.
      expect(brute.layouts).toBe(2 * f.layouts);
      expect(brute.cover.map((n) => n / 2)).toEqual(f.cover);
      // More than one layout fits, so the chart doesn't simply give the fleet away.
      expect(f.layouts).toBeGreaterThanOrEqual(2);
      const expected =
        d.ask === "sure"
          ? open.filter((c) => brute.cover[c] === brute.layouts)
          : d.ask === "water"
            ? open.filter((c) => brute.cover[c] === 0)
            : open.filter((c) => brute.cover[c] === Math.max(...open.map((x) => brute.cover[x])));
      expect(f.answers).toEqual(expected);
      expect(f.answers.length).toBe(d.count);
      // The best chance is still only a chance: not a sure space.
      if (d.ask === "best") expect(brute.cover[f.answers[0]]).toBeLessThan(brute.layouts);
    }
  });
  it("a tap is right only when the chart proves it: no mark can come from a lucky guess", () => {
    for (const { descriptor: d } of canoesPuzzles) {
      const { answers } = factsFor(d);
      for (let cell = 0; cell < 36; cell++) {
        if (d.chart[cell]) {
          expect(canoesScenarioEngine.step(play(d, []).s, ["t", cell], d)).toBe(null);
          continue;
        }
        const tap = play(d, [["t", cell]]);
        expect(tap.s.picks[0].right).toBe(answers.includes(cell));
        if (!answers.includes(cell)) {
          // A wrong tap is a lost try, explained from the chart alone.
          expect(tap.events).toEqual(["checkfalse"]);
          expect(reason(d, cell)).toMatch(d.ask === "sure" ? /might be open water/ : d.ask === "water" ? /could hold a canoe/ : /another space has a better chance/);
        }
      }
      // All the answers, in any order, solve it.
      const forward = play(d, answers.map((c): Action => ["t", c])),
        backward = play(d, [...answers].reverse().map((c): Action => ["t", c]));
      for (const r of [forward, backward]) {
        expect(r.events.at(-1)).toBe("checktrue");
        expect(canoesScenarioEngine.inspect(r.s, d).solved).toBe(true);
      }
      expect(canoesScenarioEngine.inspect(forward.s, d).solution).toBe(canoesScenarioEngine.inspect(backward.s, d).solution);
    }
  });
  it("Help points to an answer and says why from the chart; undo and start again work", () => {
    for (const { descriptor: d } of canoesPuzzles) {
      const { answers } = factsFor(d);
      const h = play(d, [["h"]]);
      expect(h.events).toEqual(["help"]);
      expect(answers).toContain(h.s.hint);
      expect(reason(d, h.s.hint!)).toMatch(d.ask === "sure" ? /must hold a canoe: there's no way to fit the canoes without it/ : d.ask === "water" ? /can't hold a canoe: no canoe fits there/ : /than any other space/);
      const wrong = d.chart.findIndex((v, i) => !v && !answers.includes(i));
      const t = play(d, [["t", wrong]]).s;
      expect(canoesScenarioEngine.step(t, ["t", wrong], d)).toBe(null);
      expect(canoesScenarioEngine.step(t, ["u"], d)!.state.picks).toEqual([]);
      expect(canoesScenarioEngine.step(t, ["z"], d)!.event).toBe("reset");
    }
    for (const bad of [["t", 36], ["t", -1], ["x"], ["t"], null]) expect(canoesScenarioEngine.validAction(bad)).toBe(false);
  });
  it("the clean dare goes through the shared replay kit and needs no help and no wrong taps", () => {
    for (const p of canoesPuzzles) {
      const d = p.descriptor,
        { answers } = factsFor(d),
        clean = p.dares[0];
      expect(p.dares).toHaveLength(1);
      let s: ChallengeSession = registration.start(p.ref, "family", `canoes-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, [clean.slot]);
      for (const c of answers) s = registration.move(s, ["t", c])!;
      expect(s.result).toMatchObject({ event: "independent", dares: [clean.slot], awards: 1, cost: d.count });
      const wrong = d.chart.findIndex((v, i) => !v && !answers.includes(i));
      let t: ChallengeSession = registration.start(p.ref, "family", `canoes-w-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, [clean.slot]);
      t = registration.move(t, ["t", wrong])!;
      for (const c of answers) t = registration.move(t, ["t", c])!;
      expect(t.result).toMatchObject({ event: "helped", dares: [], awards: 0 });
      let h: ChallengeSession = registration.start(p.ref, "family", `canoes-h-${p.ref.puzzle}`, emptyChallenge(), { supportOff: false, ownRead: false }, [clean.slot]);
      h = registration.move(h, ["h"])!;
      for (const c of answers) h = registration.move(h, ["t", c])!;
      expect(h.result).toMatchObject({ event: "helped", dares: [] });
    }
  });
  it("is registered in the frozen catalog at bank 463 with dares 3336–3347", () => {
    const catalog = buildCatalog([registration]);
    const bank = catalog.banks.get(463)!;
    expect(bank.engine).toBe("hidden-canoes");
    expect(frozen.banks.find((b) => b.slot === 463)).toEqual(JSON.parse(JSON.stringify(bank)));
    for (const [slot, dare] of catalog.dares) {
      expect(slot).toBeGreaterThanOrEqual(3336);
      expect(slot).toBeLessThanOrEqual(3347);
      expect(frozen.dares.find((x) => x[0] === slot)?.[1]).toEqual(dare);
    }
    for (const c of ["canoes-1", "canoes-2", "canoes-3", "canoes-4"]) expect(frozen.contexts).toContain(c);
  });
});
