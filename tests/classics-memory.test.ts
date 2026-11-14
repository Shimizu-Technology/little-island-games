import { describe, expect, it } from "vitest";
import { memoryDareDescriptors, memoryDareEngine, seenPair, type State, type Action } from "../src/games/classics/memoryDares";
import { memoryKey, validMemoryCard, memoryDeck, chamoruCard, englishCard, createMemory } from "../src/games/memory";
import { defaultOptions, random } from "../src/games/types";
import { registration } from "../src/challenge/registrations/memory";
import { emptyChallenge, validChallengeSession } from "../src/state/challenge";
import { validSession } from "../src/state/validation";
const options = { supportOff: false, ownRead: false };
const groups = (cards: string[]) => [...new Set(cards.map(memoryKey))].map(key => cards.flatMap((c, i) => memoryKey(c) === key ? [i] : []));
const launch = (i: number) => { const p = registration.puzzles[i]; return registration.start(p.ref, "family", "memory-test", emptyChallenge(), options, p.dares.map(d => d.slot)); };
describe("Memory suggested dares and cross-modal cards", () => {
  it("pairs all three sizes and packs, freezes the preview rule and labels every target suggested", () => {
    expect(memoryDareDescriptors).toHaveLength(18);
    for (const [i, d] of memoryDareDescriptors.entries()) {
      expect(d.cards.every(c => validMemoryCard(c, d.pack))).toBe(true);
      expect(groups(d.cards).every(pair => pair.length === 2)).toBe(true);
      expect(d.suggested).toBe(d.preview ? d.cards.length / 2 * 1.5 : ({ 12: 14, 16: 19, 24: 28 }[d.cards.length]));
      expect(registration.puzzles[i].dares[0].label).toContain("Suggested:");
      expect(registration.puzzles[i].par).toBeUndefined();
      for (const pair of groups(d.cards)) {
        if (d.pack === "chamoru") { const [a, b] = pair.map(i => chamoruCard(d.cards[i])!); expect(a.word.sourceNote).toBeTruthy(); expect(a.word.id).toBe(b.word.id); expect(a.face).not.toBe(b.face); }
        if (d.pack === "words") expect(pair.map(i => englishCard(d.cards[i])!.face).sort()).toEqual(["picture", "word"]);
      }
    }
    for (const pack of ["pictures", "words", "chamoru"] as const) {
      expect(memoryDeck(12, pack, 12)).toEqual(memoryDeck(12, pack, 12));
      expect(validSession(createMemory(defaultOptions, 0, pack))).toBe(true);
    }
  });
  it("every dare is attainable through a legal replay, without claiming a random optimum", () => {
    for (const [i, d] of memoryDareDescriptors.entries()) {
      let s = launch(i);
      if (d.preview) { s = registration.move(s, ["p"])!; s = registration.move(s, ["g"])!; }
      for (const pair of groups(d.cards)) for (const j of pair) s = registration.move(s, ["f", j])!;
      expect(s.result).toMatchObject({ event: "independent", awards: 0, cost: null, dares: [registration.puzzles[i].dares[0].slot] });
      expect(validChallengeSession(JSON.parse(JSON.stringify(s)), "family", registration.catalog)).toBe(true);
      expect(registration.move(s, ["u"])).toBeNull();
    }
  });
  it("never awards a preview target after skipping, or creates a preview for a no-preview deal", () => {
    const d = memoryDareDescriptors[0]; let s = registration.move(launch(0), ["g"])!;
    for (const pair of groups(d.cards)) for (const j of pair) s = registration.move(s, ["f", j])!;
    expect(s.result).toMatchObject({ event: "independent", dares: [] });
    expect(registration.move(launch(1), ["p"])).toBeNull();
  });
  it("undo, reset and reload preserve spent turns and assistance; finishing past target still counts", () => {
    const d = memoryDareDescriptors[1], pair = groups(d.cards)[0];
    let s = launch(1);
    for (let i = 0; i < d.suggested; i++) {
      for (const j of pair) s = registration.move(s, ["f", j])!;
      s = registration.move(s, ["u"])!;
    }
    s = registration.move(JSON.parse(JSON.stringify(s)), ["z"])!;
    for (const p of groups(d.cards)) for (const j of p) s = registration.move(s, ["f", j])!;
    expect(s.result).toMatchObject({ event: "independent", dares: [] });
    let helped = registration.move(launch(1), ["h"])!;
    helped = registration.move(helped, ["z"])!;
    for (const p of groups(d.cards)) for (const j of p) helped = registration.move(helped, ["f", j])!;
    expect(helped.result).toMatchObject({ event: "helped", dares: [] });
  });
  it("first-card undo/reset cannot reveal the no-preview deal for free", () => {
    const d = memoryDareDescriptors[1]; let s = memoryDareEngine.create(d, { version: 1 }, options);
    for (let i = 0; i < d.cards.length; i++) {
      s = memoryDareEngine.step(s, ["f", i], d)!.state;
      s = memoryDareEngine.step(s, i % 2 ? ["u"] : ["z"], d)!.state;
    }
    expect(s.spent).toBe(d.cards.length / 2);
    expect(s.seen).toHaveLength(d.cards.length);
  });
  it("hint reads only seen faces, including a hidden-layout counterfactual", () => {
    const d = memoryDareDescriptors[1], s = memoryDareEngine.create(d, { version: 1 }, options);
    expect(seenPair(s)).toEqual([]);
    const known = groups(d.cards)[0], seen = { ...s, seen: known };
    expect(seenPair(seen)).toEqual(known.sort((a,b)=>a-b));
    const hidden = s.round.cards.map((_, i) => i).filter(i => !known.includes(i));
    const cards = [...s.round.cards]; [cards[hidden[0]], cards[hidden[1]]] = [cards[hidden[1]], cards[hidden[0]]];
    expect(seenPair({ ...seen, round: { ...seen.round, cards } })).toEqual(seenPair(seen));
    expect(memoryDareEngine.step(s, ["h"], d)?.state.hint).toEqual([]);
  });
  it("survives 10,000 deterministic legal/illegal prefixes and keeps every turn monotone", () => {
    const rng = random(663), d = memoryDareDescriptors[1];
    let s: State = memoryDareEngine.create(d, { version: 1 }, options), count = 0;
    for (let i = 0; i < 10000; i++) {
      if (memoryDareEngine.inspect(s, d).solved) s = memoryDareEngine.create(d, { version: 1 }, options);
      const a: Action = i % 11 === 0 ? ["z"] : i % 7 === 0 ? ["u"] : i % 3 === 0 ? ["n"] : ["f", Math.floor(rng() * d.cards.length)];
      const next = memoryDareEngine.step(s, a, d);
      if (next) { expect(next.state.spent).toBeGreaterThanOrEqual(s.spent); expect(validSession(next.state.round)).toBe(true); s = next.state; count++; }
    }
    expect(count).toBeGreaterThan(1000);
    expect(memoryDareEngine.validAction(["f", 24])).toBe(false);
  });
});

it("Help is accepted before and during preview", () => {
  let s = launch(0);
  expect(registration.move(s, ["h"])).not.toBeNull();
  s = registration.move(s, ["p"])!;
  expect(registration.move(s, ["h"])).not.toBeNull();
});
it("adversarial undo play offers an explicit bounded restart without laundering turns", () => {
  let s = launch(5);
  const d = memoryDareDescriptors[5], pair = groups(d.cards)[0];
  for (let i = 0; i < 1000; i++) {
    const n = registration.move(s, ["f", pair[0]]);
    if (!n) break;
    s = n;
    const u = registration.move(s, ["u"]); if (!u) break; s = u;
  }
  expect(registration.full?.(s)).toBe(true);
  expect(JSON.stringify(s).length).toBeLessThanOrEqual(4096);
  const next = registration.restart!(s, "continued-memory", emptyChallenge());
  const payload = next.payload as { initial: { prior: { flips: number } } };
  expect(payload.initial.prior.flips).toBeGreaterThan(100);
  expect(registration.move(next, ["f", pair[0]])).not.toBeNull();
  expect(validChallengeSession(next, "family", registration.catalog)).toBe(true);
});
it("120 no-memory 12-pair simulations finish or offer an honest restart", () => {
  let finished = 0, capacity = 0;
  for (const idx of [5, 11, 17, 4, 10, 16]) for (let seed = 1; seed <= 20; seed++) {
    const d = memoryDareDescriptors[idx], rng = random(seed * 97 + idx);
    let s = launch(idx);
    if (d.preview) s = registration.move(s, ["g"])!;
    const matched = new Set<number>();
    let stopped = false;
    for (let turns = 0; turns < 2000 && !s.result && !stopped; turns++) {
      const hidden = d.cards.map((_, i) => i).filter(i => !matched.has(i));
      const a = hidden[Math.floor(rng() * hidden.length)];
      const rest = hidden.filter(i => i !== a), b = rest[Math.floor(rng() * rest.length)];
      const actions: Action[] = [["f", a], ["f", b]];
      const match = memoryKey(d.cards[a]) === memoryKey(d.cards[b]);
      if (!match) actions.push(["n"]);
      for (const action of actions) {
        const n = registration.move(s, action);
        if (!n) {
          expect(registration.full?.(s)).toBe(true);
          const next = registration.restart!(s, "memory-capacity-restart", emptyChallenge());
          expect(validChallengeSession(next, "family", registration.catalog)).toBe(true);
          expect(registration.move(next, ["f", 0])).not.toBeNull();
          capacity++; stopped = true; break;
        }
        s = n;
        expect(JSON.stringify(s).length).toBeLessThanOrEqual(4096);
      }
      if (match) { matched.add(a); matched.add(b); }
    }
    if (s.result) finished++;
    expect(!!s.result || stopped).toBe(true);
  }
  expect(finished + capacity).toBe(120);
});
it("repeated new attempts retain Help and preview evidence and can start durably", () => {
  const d = memoryDareDescriptors[4];
  let s = registration.move(launch(4), ["p"])!;
  s = registration.move(s, ["h"])!;
  s = registration.restart!(s, "memory-next-one", emptyChallenge());
  s = registration.restart!(s, "memory-next-two", emptyChallenge());
  expect(registration.catalog.codecs.get(s.codec)!.canStart(s)).toBe(true);
  for (const pair of groups(d.cards)) for (const i of pair) s = registration.move(s, ["f", i])!;
  expect(s.result).toMatchObject({ event: "helped", dares: [] });
});

it('a restarted board can finish but cannot regain the suggested-turns mark even with few spent turns',()=>{
 const d=memoryDareDescriptors[1];const initial={version:1 as const,prior:{runs:0,failed:false,flips:0,previewed:false,seen:[]}};
 let s=memoryDareEngine.create(d,initial,options);
 for(const pair of groups(d.cards))for(const j of pair)s=memoryDareEngine.step(s,['f',j],d)!.state;
 expect(memoryDareEngine.inspect(s,d).solved).toBe(true);
 expect(memoryDareEngine.inspect(s,d).objectives).toEqual([]);
});
