import { describe, expect, it } from "vitest";
import { random } from "../src/games/types";
import { optionsAtLevel } from "../src/learn/levelOptions";
import type { LearnOptions } from "../src/learn/types";
import { LEVELS, drawFor, seeded, type Level, type OpChoice } from "../src/math/kit";
import {
  ROUND, answerOf, choicesOf, cueFor, fitsSlot, freshItem, hopsFor, itemKey, levelMax, sentenceOf, storySum, storyText, workingFor, type QItem,
} from "../src/learn/games/quick-practice/items";
import { FIRST_TWO_STEP, STORIES } from "../src/learn/games/quick-practice/stories";
import { HISTORY_CAP, MAX_FRESH, createQuick, quickMove, quickProgress, validQuick, type QuickRound } from "../src/learn/games/quick-practice/round2";

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
      expect(p.cur).toBe(1);
      expect(p.pos).toBe(0);
      expect(p.missed).toEqual({ item: first, value: wrong });
      expect(s.wrong).toBe(wrong);
      expect(s.solved).toBe(false);
      const fresh = s.items[1];
      expect(itemKey(fresh)).not.toBe(itemKey(first));
      expect(fitsSlot(level, 0, "mixed", fresh)).toBe(true);
      expect(s.items).toHaveLength(ROUND + 1);
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
  it(`after ${MAX_FRESH} fresh questions a miss is an ordinary miss on the same question`, () => {
    const o = opts(3);
    let s = createQuick(o, random(3));
    for (let k = 0; k < MAX_FRESH; k++) {
      const cur = quickProgress(s)!.cur;
      s = quickMove(s, ["n", answerOf(s.items[cur]) + 1], "add");
    }
    expect(s.items).toHaveLength(ROUND + MAX_FRESH);
    const cur = quickProgress(s)!.cur, before = s.items.length;
    s = reload(quickMove(s, ["n", answerOf(s.items[cur]) + 1], "add"), o);
    expect(s.items).toHaveLength(before);
    expect(quickProgress(s)!.cur).toBe(cur);
    expect(s.wrong).toBe(answerOf(s.items[cur]) + 1);
    expect(finish(s, "add").index).toBe(ROUND);
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
          if (s === next && next.history.length >= HISTORY_CAP) break;
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
    expect(quickProgress(s)!.fresh).toBeGreaterThan(0);
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
  it("a relentless child (every miss and help the round allows) can always finish, and every saved state reloads", () => {
    for (const level of LEVELS) for (let seed = 1; seed <= 4; seed++) {
      const o = opts(level, "mixed");
      let s = createQuick(o, random(seed));
      for (let guard = 0; guard < 1000 && s.index < ROUND; guard++) {
        const p = quickProgress(s)!;
        const tries: (readonly ["n", number] | readonly ["h"] | readonly ["k"] | readonly ["x"])[] = [["n", answerOf(s.items[p.cur]) + 1], ["h"], ["k"], ["n", answerOf(s.items[p.cur])], ["x"]];
        let moved = false;
        for (const a of tries) { const next = quickMove(s, a, "mixed"); if (next !== s) { s = next; moved = true; break; } }
        expect(moved).toBe(true);
        if (guard % 13 === 0) s = reload(s, o);
      }
      expect(s.index).toBe(ROUND);
      expect(s.history.length).toBeLessThanOrEqual(HISTORY_CAP);
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
    expect(validQuick(s, opts(4))).toBe(false);
    // A seed-drawn round for the same seed is the same.
    expect(createQuick(o, random(4))).toEqual(s);
    expect(drawFor(1, 2)()).toBe(drawFor(1, 2)());
  });
});
