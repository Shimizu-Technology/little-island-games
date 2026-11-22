import { describe, expect, it } from "vitest";
import { random } from "../src/games/types";
import { startSession, validLearnSession } from "../src/learn/session";
import { emptySave, parseSave } from "../src/state/validation";
import { optionsAtLevel } from "../src/learn/levelOptions";
import type { LearnOptions } from "../src/learn/types";
import { LEVELS, drawFor, seeded, type Level, type OpChoice } from "../src/math/kit";
import {
  ROUND, answerOf, choicesOf, cueFor, fitsSlot, freshItem, hopsFor, itemKey, levelMax, sentenceOf, storySum, storyText, workingFor, type QItem,
} from "../src/learn/games/quick-practice/items";
import { FIRST_TWO_STEP, STORIES } from "../src/learn/games/quick-practice/stories";
import { MAX_TRIES, createQuick, quickMove, quickProgress, validQuick, type QuickRound } from "../src/learn/games/quick-practice/round2";

const CHOICES: OpChoice[] = ["add", "subtract", "mixed"];
const opts = (level: Level, mathOperation: OpChoice = "add"): LearnOptions => ({ ...optionsAtLevel({ mode: "solo", pace: "easy" }, level), mathOperation });
const reload = (s: QuickRound, o: LearnOptions) => {
  const copy = JSON.parse(JSON.stringify(s));
  expect(validQuick(copy, o)).toBe(true);
  return copy as QuickRound;
};
/** Perfect play: the right answer, then Next. */
function finish(s: QuickRound, choice: OpChoice): QuickRound {
  while (s.index < ROUND) {
    const p = quickProgress(s)!;
    s = quickMove(s, ["n", answerOf(s.items[p.cur])], choice);
    s = quickMove(s, ["x"], choice);
  }
  return s;
}

describe("Quick Practice questions", () => {
  it("every level, choice and seed makes a valid round of three distinct questions that fit their places", () => {
    for (const level of LEVELS) for (const choice of CHOICES) for (let seed = 1; seed <= 120; seed++) {
      const o = opts(level, choice), s = createQuick(o, random(seed));
      expect(validQuick(s, o), `L${level} ${choice} ${seed}`).toBe(true);
      expect(s.items).toHaveLength(ROUND);
      s.items.forEach((i, pos) => {
        expect(fitsSlot(level, pos, choice, i)).toBe(true);
        const ans = answerOf(i);
        expect(Number.isInteger(ans) && ans >= 0 && ans <= levelMax(level), `${sentenceOf(i)} → ${ans}`).toBe(true);
      });
      expect(new Set(s.items.map(itemKey)).size).toBe(ROUND);
    }
  });
  it("a source that always says the same number still makes a full, valid round", () => {
    for (const level of LEVELS) for (const choice of CHOICES) for (const c of [0, 0.5, 0.999999]) {
      const o = opts(level, choice);
      expect(validQuick(createQuick(o, () => c), o)).toBe(true);
    }
  });
  it("Level 3 is not Level 2 again: every question hides a number, the first one hides the first number, and answers are typed", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const two = createQuick(opts(2, "mixed"), random(seed)), three = createQuick(opts(3, "mixed"), random(seed));
      expect(two.items.map((i) => i[4])).toEqual([2, 2, 1]);
      expect(three.items.map((i) => i[4])).toEqual([0, 1, 0]);
      expect(sentenceOf(three.items[0]).startsWith("?")).toBe(true);
    }
  });
  it("Levels 4 and 5 are generated from the kit: two-digit unknowns, equal sides and stories; past 100, two steps and two-step stories", () => {
    const seen4 = new Set<string>(), seen5 = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const four = createQuick(opts(4), random(seed)), five = createQuick(opts(5), random(seed));
      expect(four.items.map((i) => i[0])).toEqual([0, 1, 3]);
      expect(five.items.map((i) => i[0])).toEqual([0, 2, 3]);
      expect(four.items[0][4]).not.toBe(2);
      expect(Math.max(...four.items[0].slice(2, 4))).toBeGreaterThanOrEqual(10);
      expect(Math.max(five.items[0][2], five.items[0][3], five.items[0][2] + (five.items[0][1] === 0 ? five.items[0][3] : -five.items[0][3]))).toBeGreaterThan(100);
      four.items.forEach((i) => seen4.add(itemKey(i)));
      five.items.forEach((i) => seen5.add(itemKey(i)));
    }
    // A lot of questions: nobody runs out.
    expect(seen4.size).toBeGreaterThan(800);
    expect(seen5.size).toBeGreaterThan(800);
  });
});

describe("Quick Practice stories (60 templates)", () => {
  it("has 30 one-step and 30 two-step templates, and no text says the hidden number", () => {
    expect(STORIES).toHaveLength(60);
    expect(STORIES.slice(0, FIRST_TWO_STEP).every((t) => t.math.steps === 1)).toBe(true);
    expect(STORIES.slice(FIRST_TWO_STEP).every((t) => t.math.steps === 2)).toBe(true);
    for (const t of STORIES) {
      const m = t.math, blank = m.steps === 1 ? m.blank : 3;
      const hidden = ["{a}", "{b}", "{c}", "{d}"][blank];
      expect(t.text.includes(hidden), t.text).toBe(false);
      const shown = ["{a}", "{b}", "{c}"].filter((_, k) => k !== blank);
      for (const p of shown) expect(t.text.includes(p), `${t.text} needs ${p}`).toBe(true);
      expect(t.text.trim().endsWith("?")).toBe(true);
    }
  });
  it("property: every template, with every number the generator can pick, has a whole-number answer in range and reads cleanly", () => {
    for (let t = 0; t < STORIES.length; t++) {
      const level: Level = t < FIRST_TWO_STEP ? 4 : 5;
      let made = 0;
      for (let seed = 1; seed <= 4000 && made < 150; seed++) {
        const i = freshItem(level, 2, "mixed", seeded(seed), [], (n) => seeded(n + 9000));
        if (i[1] !== t) continue;
        made++;
        const ans = answerOf(i), text = storyText(i), m = storySum(i)!;
        expect(Number.isInteger(ans) && ans >= 2 && ans <= 100, `${text} → ${ans}`).toBe(true);
        expect(text).not.toMatch(/[{}]/);
        // Every number a child reads is at least 2, so no "1 shells".
        for (const n of text.match(/\d+/g) ?? []) expect(Number(n)).toBeGreaterThanOrEqual(2);
        if ("first" in m) expect(Number.isInteger(m.a + (m.first === "add" ? m.b : -m.b))).toBe(true);
        expect(text).not.toContain("undefined");
      }
      expect(made, `template ${t} is reachable`).toBeGreaterThan(20);
    }
  });
  it("a story counts the same group from start to question (review P2-2: story 34; and 36, 59 where c can exceed b)", () => {
    // The review's item: 20 ripe mangoes, 5 picked, 8 more ripe: the question asks about ripe mangoes, the same group as the start.
    expect(storyText([3, 34, 0, 20, 5, 8])).toBe("A tree had 20 ripe mangoes. 5 were picked, then 8 more became ripe. How many ripe mangoes are on the tree now?");
    // Something that "comes back" can only be what left; these add c that may be larger than b, so they say the c are others.
    expect(storyText([3, 36, 0, 40, 5, 12])).toContain("12 other books");
    expect(storyText([3, 59, 0, 40, 5, 12])).toContain("12 other canoes");
    for (const t of STORIES) expect(t.text, t.text).not.toMatch(/\b(came back|brought back|grew big enough)\b/);
  });
  it("two names in a story are always different people", () => {
    for (let name = 0; name < 8; name++) {
      const text = storyText([3, 4, name, 20, 5]);
      const names = text.match(/\b[A-Z][a-z]+\b/g)!;
      expect(names[0]).not.toBe(names[1]);
    }
  });
});

describe("Quick Practice round", () => {
  it.each(LEVELS)("level %i: perfect play finishes the round with every place the child's own", (level) => {
    for (const choice of CHOICES) {
      const o = opts(level, choice);
      const s = reload(finish(createQuick(o, random(7)), choice), o);
      expect(s.index).toBe(ROUND);
      expect(quickProgress(s)!.helped).toEqual([false, false, false]);
    }
  });
  it("a miss shows the worked answer and brings a fresh question of the same kind; the place is then helped", () => {
    for (const level of LEVELS) {
      const o = opts(level, "mixed");
      let s = createQuick(o, random(11));
      const first = s.items[0], wrong = answerOf(first) === 0 ? 1 : answerOf(first) - 1;
      s = reload(quickMove(s, ["n", wrong], "mixed"), o);
      const p = quickProgress(s)!;
      expect(p.pos).toBe(0);
      expect(p.missed).toEqual({ item: first, value: wrong });
      expect(s.wrong).toBe(wrong);
      expect(s.solved).toBe(false);
      const fresh = s.items[0];
      expect(itemKey(fresh)).not.toBe(itemKey(first));
      expect(fitsSlot(level, 0, "mixed", fresh)).toBe(true);
      // Nothing grows: three questions, a counter and a sticky helped flag per place.
      expect(s.items).toHaveLength(ROUND);
      expect(s.tries).toEqual([1, 0, 0]);
      expect(s.helped).toEqual([true, false, false]);
      // The journey bar reads total, which never grows with fresh questions.
      expect(s.total).toBe(ROUND);
      // The worked answer for the missed one ends with its answer.
      expect(workingFor(first)).toContain(String(answerOf(first)));
      // Any next move clears the miss note.
      s = quickMove(s, ["h"], "mixed");
      expect(quickProgress(s)!.missed).toBeNull();
      s = finish(s, "mixed");
      expect(quickProgress(s)!.helped).toEqual([true, false, false]);
      reload(s, o);
    }
  });
  it("the same miss on a reload draws the same fresh question", () => {
    const o = opts(4);
    const a = quickMove(createQuick(o, random(5)), ["n", 0], "add"), b = quickMove(createQuick(o, random(5)), ["n", 0], "add");
    expect(a.items).toEqual(b.items);
  });
  it("every miss, the 10th and the 40th too, shows its worked answer and brings a fresh question; later places still do after many misses (review P2-1)", () => {
    for (const level of LEVELS) {
      const o = opts(level, "mixed");
      let s = createQuick(o, random(7));
      const bytes0 = JSON.stringify(s).length;
      for (let k = 1; k <= 40; k++) {
        const before = s.items[0], wrong = answerOf(before) === 0 ? 1 : answerOf(before) - 1;
        s = quickMove(s, ["n", wrong], "mixed");
        if (k % 7 === 0 || k === 10) s = reload(s, o);
        const p = quickProgress(s)!;
        expect(p.missed, `L${level} miss ${k}`).toEqual({ item: before, value: wrong });
        expect(workingFor(p.missed!.item)).toContain(String(answerOf(before)));
        expect(itemKey(s.items[0]), `L${level} miss ${k} is a fresh question`).not.toBe(itemKey(before));
        expect(fitsSlot(level, 0, "mixed", s.items[0])).toBe(true);
        expect(s.tries[0]).toBe(k);
      }
      // Bounded: forty misses cost a few bytes for the counter, not forty questions.
      expect(JSON.stringify(s).length - bytes0).toBeLessThan(120);
      // The next places behave the same after all that: a miss there is answered and replaced too.
      s = quickMove(quickMove(s, ["n", answerOf(s.items[0])], "mixed"), ["x"], "mixed");
      const second = s.items[1];
      s = reload(quickMove(s, ["n", answerOf(second) + 1 > levelMax(level) ? answerOf(second) - 1 : answerOf(second) + 1], "mixed"), o);
      expect(quickProgress(s)!.missed?.item).toEqual(second);
      expect(itemKey(s.items[1])).not.toBe(itemKey(second));
      s = finish(s, "mixed");
      expect(quickProgress(s)!.helped).toEqual([true, true, false]);
      reload(s, o);
    }
  });
  it(`the retry counter stops at ${MAX_TRIES}, and a miss there is still answered with a different question`, () => {
    const o = opts(3), s0 = createQuick(o, random(5));
    const s: QuickRound = { ...s0, tries: [MAX_TRIES, 0, 0], helped: [true, false, false] };
    expect(validQuick(s, o)).toBe(true);
    const next = reload(quickMove(s, ["n", answerOf(s.items[0]) + 1], "add"), o);
    expect(next.tries[0]).toBe(MAX_TRIES);
    expect(itemKey(next.items[0])).not.toBe(itemKey(s.items[0]));
    expect(quickProgress(next)!.missed?.item).toEqual(s.items[0]);
  });
  it("brute force does not work: a guesser never finishes a clean typed round, and does no better than chance with tiles (200 seeds each)", () => {
    for (const level of LEVELS) {
      let clean = 0;
      const o = opts(level, "mixed"), max = levelMax(level);
      for (let seed = 1; seed <= 200; seed++) {
        let s = createQuick(o, random(seed));
        const rng = random(seed * 31 + 1);
        for (let guard = 0; guard < 400 && s.index < ROUND; guard++) {
          const p = quickProgress(s)!;
          if (p.work.solved) { s = quickMove(s, ["x"], "mixed"); continue; }
          // Pick one of the choices the board would show, or any number in range.
          const tiles = choicesOf(s.items[p.cur], level, p.cur);
          const guess = level <= 2 ? tiles[Math.floor(rng() * 3)] : Math.floor(rng() * (max + 1));
          const next = quickMove(s, ["n", guess], "mixed");
          s = next === s ? quickMove(s, ["h"], "mixed") : next;
        }
        if (s.index === ROUND && quickProgress(s)!.helped.every((h) => !h)) clean++;
      }
      // Three tiles give a lucky guesser one round in 27 at Levels 1 and 2; typed levels give none.
      if (level >= 3) expect(clean, `L${level}`).toBe(0);
      else expect(clean / 200, `L${level}`).toBeLessThan(0.08);
    }
  });
  it("counting up from 0 to the answer in typed levels is never clean either", () => {
    const o = opts(4);
    let s = createQuick(o, random(2));
    for (let n = 0; n <= 100 && !quickProgress(s)!.work.solved; n++) s = quickMove(s, ["n", n], "add");
    expect(s.tries[0]).toBeGreaterThan(0);
    expect(s.helped[0]).toBe(true);
  });
  it("help is a ladder from the engine: a cue, the working, then the answer filled in; choices hold the answer", () => {
    for (const level of LEVELS) {
      const o = opts(level, "mixed"), s0 = createQuick(o, random(21));
      for (const i of s0.items) {
        expect(cueFor(i).length).toBeGreaterThan(5);
        expect(workingFor(i)).toContain(String(answerOf(i)));
        const tiles = choicesOf(i, level, 0);
        expect(new Set(tiles).size).toBe(3);
        expect(tiles).toContain(answerOf(i));
        expect(tiles.every((n) => n >= 0 && n <= levelMax(level))).toBe(true);
      }
      let s = s0;
      for (const a of [["h"], ["h"], ["h"], ["k"]] as const) s = quickMove(s, a, "mixed");
      expect(quickProgress(s)!.work).toMatchObject({ hint: 3, choices: true, helped: true });
      expect(quickMove(s, ["h"], "mixed")).toBe(s);
      s = finish(reload(s, o), "mixed");
      expect(quickProgress(s)!.helped[0]).toBe(true);
    }
  });
  it("the open number line never shows the answer as a landing point", () => {
    for (let seed = 1; seed <= 300; seed++) for (const level of [1, 2, 3, 4] as Level[]) {
      for (const i of createQuick(opts(level, "mixed"), random(seed)).items) {
        const line = hopsFor(i);
        if (!line) continue;
        const ans = answerOf(i);
        expect([line.start, ...line.hops]).not.toContain(ans);
        expect(line.hops[line.hops.length - 1] - line.start).toBe(ans);
      }
    }
  });
  it("a relentless child (a dozen misses and every help at each place) always finishes, and every saved state reloads", () => {
    for (const level of LEVELS) for (let seed = 1; seed <= 4; seed++) {
      const o = opts(level, "mixed");
      let s = createQuick(o, random(seed));
      for (let guard = 0; guard < 1000 && s.index < ROUND; guard++) {
        const p = quickProgress(s)!;
        // Twelve misses at every place (misses never run out), then every help, then the answer.
        const miss: (readonly ["n", number])[] = s.tries[p.pos] < 12 ? [["n", answerOf(s.items[p.cur]) === 0 ? 1 : answerOf(s.items[p.cur]) - 1]] : [];
        const tries: (readonly ["n", number] | readonly ["h"] | readonly ["k"] | readonly ["x"])[] = [...miss, ["h"], ["k"], ["n", answerOf(s.items[p.cur])], ["x"]];
        let moved = false;
        for (const a of tries) { const next = quickMove(s, a, "mixed"); if (next !== s) { s = next; moved = true; break; } }
        expect(moved).toBe(true);
        if (guard % 13 === 0) s = reload(s, o);
      }
      expect(s.index).toBe(ROUND);
      reload(s, o);
    }
  });
  it("refuses forged rounds: a question from another level, an illegal action, a mirror that lies, a repeat", () => {
    const o = opts(3), s = createQuick(o, random(4));
    const l2: QItem = createQuick(opts(2), random(4)).items[0];
    expect(validQuick({ ...s, items: [l2, ...s.items.slice(1)] }, o)).toBe(false);
    expect(validQuick({ ...s, history: [["x"]] }, o)).toBe(false);
    expect(validQuick({ ...s, solved: true }, o)).toBe(false);
    expect(validQuick({ ...s, items: [s.items[0], s.items[0], s.items[2]] }, o)).toBe(false);
    expect(validQuick({ ...s, level: 4 }, o)).toBe(false);
    expect(validQuick({ ...s, extra: 1 }, o)).toBe(false);
    expect(validQuick({ ...s, total: 4 }, o)).toBe(false);
    expect(validQuick({ ...s, history: [["n", 999]] }, o)).toBe(false);
    // The bounded fields: counters and helped flags in range and only up to the place on screen, a missed question that fits.
    expect(validQuick({ ...s, tries: [0, 1, 0] }, o)).toBe(false);
    expect(validQuick({ ...s, helped: [false, true, false] }, o)).toBe(false);
    expect(validQuick({ ...s, tries: [MAX_TRIES + 1, 0, 0] }, o)).toBe(false);
    expect(validQuick({ ...s, missed: s.items[1], wrong: 1, tries: [1, 0, 0], helped: [true, false, false] }, o)).toBe(false);
    expect(validQuick({ ...s, missed: null, wrong: 3 }, o)).toBe(false);
    const missed = quickMove(s, ["n", answerOf(s.items[0]) + 1], "add");
    expect(validQuick(missed, o)).toBe(true);
    expect(validQuick({ ...missed, helped: [false, false, false] }, o)).toBe(false);
    expect(validQuick({ ...missed, wrong: answerOf(missed.missed!) }, o)).toBe(false);
    expect(validQuick({ ...missed, history: [["h"]] }, o)).toBe(false);
    expect(validQuick(s, opts(4))).toBe(false);
    // A seed-drawn round for the same seed is the same.
    expect(createQuick(o, random(4))).toEqual(s);
    expect(drawFor(1, 2)()).toBe(drawFor(1, 2)());
  });
});

describe("Quick Practice saves after review round 2 (P2-1): completed places carry witnesses, flags match evidence", () => {
  const o = opts(3, "mixed");
  /** Seed 7, the reviewer's round: miss the first question, then answer its replacement. */
  function missThenAnswer(): QuickRound {
    let s = createQuick(o, random(7));
    s = quickMove(s, ["n", answerOf(s.items[0]) + 1], "mixed");
    return quickMove(s, ["n", answerOf(s.items[0])], "mixed");
  }
  it("rejects helped turned false after answering a fresh replacement (the reviewer's repro)", () => {
    const s = missThenAnswer();
    expect(s).toMatchObject({ tries: [1, 0, 0], missed: null, helped: [true, false, false], solved: true });
    expect(validQuick(s, o)).toBe(true);
    expect(validQuick({ ...s, helped: [false, false, false] }, o)).toBe(false);
  });
  it("rejects helped turned false after moving on to the next place", () => {
    const s = quickMove(missThenAnswer(), ["x"], "mixed");
    expect(s.index).toBe(1);
    expect(validQuick(s, o)).toBe(true);
    expect(validQuick({ ...s, helped: [false, false, false] }, o)).toBe(false);
    // Help on a finished place is witnessed too.
    let h = createQuick(o, random(8));
    h = quickMove(quickMove(quickMove(h, ["h"], "mixed"), ["n", answerOf(h.items[0])], "mixed"), ["x"], "mixed");
    expect(h.done[0]).toEqual([answerOf(h.items[0]), 1]);
    expect(validQuick(h, o)).toBe(true);
    expect(validQuick({ ...h, helped: [false, false, false] }, o)).toBe(false);
    expect(validQuick({ ...h, done: [[answerOf(h.items[0]), 0], null, null] }, o)).toBe(false);
  });
  it("rejects a place index changed without completion evidence, and witnesses that do not fit", () => {
    const fresh = createQuick(o, random(7));
    expect(validQuick({ ...fresh, index: 3 }, o)).toBe(false);
    expect(validQuick({ ...fresh, index: 1 }, o)).toBe(false);
    const one = quickMove(quickMove(fresh, ["n", answerOf(fresh.items[0])], "mixed"), ["x"], "mixed");
    expect(validQuick(one, o)).toBe(true);
    expect(validQuick({ ...one, index: 2 }, o)).toBe(false);
    expect(validQuick({ ...one, index: 0 }, o)).toBe(false);
    expect(validQuick({ ...one, done: [[answerOf(fresh.items[0]) + 1, 0], null, null] }, o)).toBe(false);
    expect(validQuick({ ...one, done: [null, [answerOf(fresh.items[1]), 0], null] }, o)).toBe(false);
    expect(validQuick({ ...one, done: [[answerOf(fresh.items[0]), 2], null, null] }, o)).toBe(false);
    expect(validQuick({ ...one, done: [[answerOf(fresh.items[0]), 0, 0], null, null] }, o)).toBe(false);
    expect(validQuick({ ...one, helped: [true, false, false] }, o)).toBe(false);
    const finished = finish(fresh, "mixed");
    expect(validQuick(finished, o)).toBe(true);
    expect(validQuick({ ...finished, done: [finished.done[0], finished.done[1], null] }, o)).toBe(false);
  });
  it("a contradictory save is refused by the session and save parsers, so recovery keeps the original bytes", () => {
    const s = missThenAnswer();
    const session = { ...startSession("quick-practice", { options: o }, {}, 7), state: { ...s, helped: [false, false, false] } };
    expect(validLearnSession(session)).toBe(false);
    expect(() => parseSave(JSON.stringify({ ...emptySave(), learn: { "quick-practice": session } }))).toThrow();
    const good = { ...session, state: s };
    expect(parseSave(JSON.stringify({ ...emptySave(), learn: { "quick-practice": good } })).learn?.["quick-practice"]).toEqual(good);
  });
  it("the save stays small: the worst valid state measured across levels, seeds and saturated counters", () => {
    let worst = 0, worstState = "";
    for (const level of LEVELS) for (const choice of CHOICES) for (let seed = 1; seed <= 40; seed++) {
      const lo = opts(level, choice);
      let s = createQuick(lo, random(seed));
      // Every place: help to the last stage and choices, a counter at its cap, then a miss shown while waiting.
      for (let pos = 0; pos < ROUND; pos++) {
        s = { ...s, tries: s.tries.map((t, i) => (i === pos ? MAX_TRIES - 1 : t)), helped: s.helped.map((h, i) => (i === pos ? true : h)) };
        const wrong = answerOf(s.items[pos]) === levelMax(level) ? 0 : levelMax(level);
        const missed = quickMove(s, ["n", wrong], choice);
        expect(validQuick(missed, lo)).toBe(true);
        const size = JSON.stringify(missed).length;
        if (size > worst) { worst = size; worstState = JSON.stringify(missed); }
        for (const a of [["h"], ["h"], ["h"], ["k"]] as const) s = quickMove(missed, a, choice) === missed ? s : quickMove(s, a, choice);
        let t = missed;
        for (const a of [["h"], ["h"], ["h"], ["k"]] as const) t = quickMove(t, a, choice);
        expect(validQuick(t, lo)).toBe(true);
        worst = Math.max(worst, JSON.stringify(t).length);
        s = quickMove(quickMove(t, ["n", answerOf(t.items[pos])], choice), ["x"], choice);
        expect(validQuick(s, lo)).toBe(true);
        worst = Math.max(worst, JSON.stringify(s).length);
      }
    }
    // Recorded in FIX-REPORT-2: the largest valid state seen.
    expect(worst).toBeLessThanOrEqual(420);
    expect(worstState.length).toBeGreaterThan(0);
  });
});
