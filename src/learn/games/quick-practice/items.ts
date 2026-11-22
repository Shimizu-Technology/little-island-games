import {
  WIDE_MAX, balanceAnswer, balanceText, missingAnswer, missingResult, missingText, twoStepMid, twoStepResult, twoStepText, validBalance, validMissing, validTwoStep,
  type Balance, type Blank, type Level, type Missing, type Op, type OpChoice, type TwoStep,
} from "../../../math/kit";
import { FIRST_TWO_STEP, STORIES, STORY_NAMES, type Story } from "./stories";

/**
 * Quick Practice questions (SC-13). A question is a short array so a saved round stays small:
 *   [0, op, a, b, blank]          a op b = c with one part hidden (`? + 6 = 14`)
 *   [1, a, b, c, d, blank]        equal sides a + b = c + d with one hidden (`7 + ? = 5 + 9`)
 *   [2, a, first, b, second, c]   two steps, left to right (`40 − 15 + 8 = ?`)
 *   [3, story, name, a, b]        a one-step story (Level 4)
 *   [3, story, name, a, b, c]     a two-step story (Level 5)
 * Ops are 0 for add and 1 for take away.
 *
 * Levels rise by what the child has to think about, not only by size:
 *   1  find the answer, then a missing second number, to 10 (tiles)
 *   2  cross ten, then a missing second number, to 20 (tiles)
 *   3  missing numbers from the first question, the first number hidden too, to 20 (typed)
 *   4  missing parts to 100, equal sides, and one-step stories (typed)
 *   5  missing parts past 100, two-step sums and two-step stories (typed)
 */
export type QItem = readonly number[];
export const ROUND = 3;
/** The largest number a level's answers reach: what the pad lets a child type. */
export const levelMax = (level: Level): number => (level === 1 ? 10 : level <= 3 ? 20 : level === 4 ? 100 : WIDE_MAX);
export const typedLevel = (level: Level) => level >= 3;

const opOf = (n: number): Op => (n === 0 ? "add" : "subtract");
const codeOp = (op: Op) => (op === "add" ? 0 : 1);
const whole = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

export const missingOf = (i: QItem): Missing => ({ op: opOf(i[1]), a: i[2], b: i[3], blank: i[4] as Blank });
export const balanceOf = (i: QItem): Balance => ({ a: i[1], b: i[2], c: i[3], d: i[4], blank: i[5] as Balance["blank"] });
export const twoStepOf = (i: QItem): TwoStep => ({ a: i[1], first: opOf(i[2]), b: i[3], second: opOf(i[4]), c: i[5] });
export const storyOf = (i: QItem): Story | undefined => STORIES[i[1]];
/** A story's numbers as the sum it stands for. */
export function storySum(i: QItem): Missing | TwoStep | null {
  const t = storyOf(i);
  if (!t) return null;
  return t.math.steps === 1 ? { op: t.math.op, a: i[3], b: i[4], blank: t.math.blank } : { a: i[3], first: t.math.first, b: i[4], second: t.math.second, c: i[5] };
}
const isTwo = (m: Missing | TwoStep): m is TwoStep => "first" in m;

export function answerOf(i: QItem): number {
  switch (i[0]) {
    case 0: return missingAnswer(missingOf(i));
    case 1: return balanceAnswer(balanceOf(i));
    case 2: return twoStepResult(twoStepOf(i));
    default: {
      const m = storySum(i);
      return !m ? -1 : isTwo(m) ? twoStepResult(m) : missingAnswer(m);
    }
  }
}
/** The number sentence on screen: `? + 6 = 14`. For a story it is the sum the story stands for, shown once the story is solved. */
export function sentenceOf(i: QItem, reveal = false): string {
  switch (i[0]) {
    case 0: return missingText(missingOf(i), reveal);
    case 1: return balanceText(balanceOf(i), reveal);
    case 2: return twoStepText(twoStepOf(i), reveal);
    default: {
      const m = storySum(i);
      return !m ? "" : isTwo(m) ? twoStepText(m, reveal) : missingText(m, reveal);
    }
  }
}
/** The story with its numbers and names filled in. */
export function storyText(i: QItem): string {
  const t = storyOf(i);
  if (!t) return "";
  const m = storySum(i)!;
  const nums = isTwo(m) ? { a: m.a, b: m.b, c: m.c } : { a: m.a, b: m.b, c: missingResult(m) };
  const n = STORY_NAMES[i[2] % STORY_NAMES.length], other = STORY_NAMES[(i[2] + 3) % STORY_NAMES.length];
  return t.text.replace(/\{n\}/g, n).replace(/\{m\}/g, other).replace(/\{a\}/g, String(nums.a)).replace(/\{b\}/g, String(nums.b)).replace(/\{c\}/g, String(nums.c));
}
/** Stable key for repeats: two questions with the same sum are the same question. */
export const itemKey = (i: QItem): string => (i[0] === 3 ? `s${sentenceOf(i)}` : `${i[0]}:${sentenceOf(i)}`);

/** What the question is about, for practice notes and the grown-up view. */
export const LEVEL_SKILL = ["num.find-to-10", "num.find-to-20", "num.missing-first", "num.missing-to-100", "num.two-step"] as const;

// ---------------------------------------------------------------------------------------------------------------
// Slots: what each of the three questions in a round asks for at each level.

/** The op a position asks for at Levels 1 to 3, following the child's choice. */
const opFor = (pos: number, choice: OpChoice): Op => (choice === "mixed" ? (pos % 2 === 0 ? "add" : "subtract") : choice);
const crosses = (m: Missing) => {
  const c = missingResult(m);
  return m.op === "add" ? m.a <= 9 && m.b <= 9 && c >= 11 : m.a >= 11 && m.a <= 19 && m.b <= 9 && c <= 9;
};
/** A regroup in two-digit work: the ones need a new ten or need a ten opened. */
const regroups = (m: Missing) => (m.op === "add" ? (m.a % 10) + (m.b % 10) >= 10 : m.a % 10 < m.b % 10);

/** Whether a question belongs at this level and position. The generator and the save check use the same rules. */
export function fitsSlot(level: Level, pos: number, choice: OpChoice, i: QItem): boolean {
  if (!Array.isArray(i) || !i.every((n) => Number.isInteger(n))) return false;
  const max = levelMax(level);
  if (level <= 3 || (level >= 4 && pos === 0)) {
    if (i.length !== 5 || i[0] !== 0 || (i[1] !== 0 && i[1] !== 1) || !whole(i[4], 0, 2)) return false;
    const m = missingOf(i);
    if (!validMissing(m, max)) return false;
    const c = missingResult(m), ans = missingAnswer(m);
    if (m.a < 1 || m.b < 1 || c < 1) return false;
    if (level <= 3 && m.op !== opFor(pos, choice)) return false;
    switch (level) {
      case 1: return pos === 0 ? m.blank === 2 && Math.max(m.a, m.b, c) <= 6 : pos === 1 ? m.blank === 2 && Math.max(m.a, m.b, c) >= 5 : m.blank === 1;
      case 2: return pos === 0 ? m.blank === 2 && crosses(m) : pos === 1 ? m.blank === 2 && Math.max(m.a, c) >= 11 : m.blank === 1 && crosses(m) && m.b >= 2;
      case 3: return m.b >= 2 && ans >= 2 && (pos === 0 ? m.blank === 0 && Math.max(m.a, c) >= 8 : pos === 1 ? m.blank === 1 && crosses(m) : m.blank === 0 && crosses(m));
      case 4: return m.blank !== 2 && m.a >= 10 && m.b >= 10 && c >= 10 && regroups(m);
      case 5: return m.blank !== 2 && m.a % 10 === 0 && m.b % 10 === 0 && m.a >= 20 && m.b >= 20 && c >= 20 && Math.max(m.a, m.b, c) > 100;
    }
  }
  if (level === 4 && pos === 1) {
    if (i.length !== 6 || i[0] !== 1 || !whole(i[5], 0, 3)) return false;
    const b = balanceOf(i);
    if (!validBalance(b, max)) return false;
    const left = [b.a, b.b], right = [b.c, b.d];
    // No number on both sides: `7 + ? = 7 + 9` is matching, not balancing.
    return [b.a, b.b, b.c, b.d].every((n) => n >= 2 && n <= 60) && balanceTotal(b) >= 12 && !left.some((n) => right.indexOf(n) >= 0);
  }
  if (level === 5 && pos === 1) {
    if (i.length !== 6 || i[0] !== 2 || (i[2] !== 0 && i[2] !== 1) || (i[4] !== 0 && i[4] !== 1)) return false;
    const t = twoStepOf(i);
    // At least one take-away, so the order matters.
    return validTwoStep(t, 100) && (t.first === "subtract" || t.second === "subtract") && twoStepFits(t);
  }
  if (pos === 2 && i[0] === 3) {
    const t = storyOf(i);
    if (!t || !whole(i[2], 0, STORY_NAMES.length - 1)) return false;
    if (level === 4) return i[1] < FIRST_TWO_STEP && t.math.steps === 1 && i.length === 5 && oneStoryFits(storySum(i) as Missing);
    return i[1] >= FIRST_TWO_STEP && t.math.steps === 2 && i.length === 6 && twoStepFits(storySum(i) as TwoStep);
  }
  return false;
}
const balanceTotal = (b: Balance) => b.a + b.b;
/** Story numbers are all at least 2 (so "1 shells" never appears), the answer too, and something reaches 20 or more. */
function oneStoryFits(m: Missing): boolean {
  const c = missingResult(m);
  return validMissing(m, 100) && m.a >= 2 && m.b >= 2 && c >= 2 && Math.max(m.a, m.b, c) >= 20;
}
function twoStepFits(t: TwoStep): boolean {
  const mid = twoStepMid(t), r = twoStepResult(t);
  return validTwoStep(t, 100) && t.a >= 2 && t.b >= 2 && t.c >= 2 && mid >= 2 && r >= 2 && Math.max(t.a, mid) >= 20 && r !== t.a;
}

// ---------------------------------------------------------------------------------------------------------------
// Generation. Each slot draws candidates from a random source and keeps the first that fits and is not a repeat.

const pick = (rng: () => number, n: number) => {
  const r = rng();
  return Math.min(n - 1, Math.max(0, Math.floor(Number.isFinite(r) ? r * n : 0)));
};
const between = (rng: () => number, lo: number, hi: number) => lo + pick(rng, Math.max(1, hi - lo + 1));

function candidate(level: Level, pos: number, choice: OpChoice, rng: () => number): QItem {
  const max = levelMax(level);
  if (level <= 3) {
    const op = opFor(pos, choice);
    const blank: Blank = level === 3 ? (pos === 1 ? 1 : 0) : pos === 2 ? 1 : 2;
    const top = level === 1 && pos === 0 ? 6 : max;
    const a = op === "add" ? between(rng, 1, top - 1) : between(rng, 2, top);
    const b = op === "add" ? between(rng, 1, top - a) : between(rng, 1, a - 1);
    return [0, codeOp(op), a, b, blank];
  }
  if (pos === 0) {
    const op: Op = pick(rng, 2) === 0 ? "add" : "subtract", blank = pick(rng, 2) as Blank;
    if (level === 4) {
      const a = op === "add" ? between(rng, 10, 89) : between(rng, 21, 99);
      const b = op === "add" ? between(rng, 10, 100 - a) : between(rng, 10, a - 10);
      return [0, codeOp(op), a, b, blank];
    }
    const a = 10 * (op === "add" ? between(rng, 2, 98) : between(rng, 11, 100));
    const b = 10 * (op === "add" ? between(rng, 2, 100 - a / 10) : between(rng, 2, a / 10 - 2));
    return [0, codeOp(op), a, b, blank];
  }
  if (pos === 1 && level === 4) {
    const a = between(rng, 2, 50), b = between(rng, 2, 50), c = between(rng, 2, Math.min(60, a + b - 2));
    return [1, a, b, c, a + b - c, pick(rng, 4)];
  }
  if (pos === 1) {
    return [2, between(rng, 10, 99), pick(rng, 2), between(rng, 2, 60), pick(rng, 2), between(rng, 2, 60)];
  }
  const name = pick(rng, STORY_NAMES.length);
  if (level === 4) {
    const t = pick(rng, FIRST_TWO_STEP), story = STORIES[t].math as { op: Op };
    const a = story.op === "add" ? between(rng, 2, 98) : between(rng, 20, 100);
    const b = story.op === "add" ? between(rng, 2, 100 - a) : between(rng, 2, a - 2);
    return [3, t, name, a, b];
  }
  const t = FIRST_TWO_STEP + pick(rng, STORIES.length - FIRST_TWO_STEP);
  return [3, t, name, between(rng, 10, 99), between(rng, 2, 60), between(rng, 2, 60)];
}

/**
 * One question for a level's position, not a repeat of any in `avoid`. Draws from `rng`; if a source keeps giving
 * the same numbers (a test's constant source), it falls back to fixed seeds, so it always returns a question.
 */
export function freshItem(level: Level, pos: number, choice: OpChoice, rng: () => number, avoid: readonly QItem[], seeded: (n: number) => () => number): QItem {
  const keys = avoid.map(itemKey);
  const tryFrom = (r: () => number) => {
    for (let k = 0; k < 400; k++) {
      const i = candidate(level, pos, choice, r);
      if (fitsSlot(level, pos, choice, i) && keys.indexOf(itemKey(i)) < 0) return i;
    }
    return null;
  };
  const hit = tryFrom(rng);
  if (hit) return hit;
  for (let s = 1; s < 64; s++) {
    const again = tryFrom(seeded(s));
    if (again) return again;
  }
  throw new Error(`No Quick Practice question for level ${level}, position ${pos}`);
}

// ---------------------------------------------------------------------------------------------------------------
// Help, worked from the question. The engine decides what each stage says; the board only shows it.

/** Stage 1: where to start thinking. */
export function cueFor(i: QItem): string {
  if (i[0] === 3) {
    const m = storySum(i);
    return m ? `Write it as a number sentence: ${sentenceOf(i)}` : "";
  }
  if (i[0] === 1) {
    const b = balanceOf(i), full = b.blank <= 1 ? `${b.c} + ${b.d}` : `${b.a} + ${b.b}`;
    return `Both sides make the same. Work out ${full} first.`;
  }
  if (i[0] === 2) {
    const t = twoStepOf(i);
    return `Work left to right. First ${t.a} ${t.first === "add" ? "+" : "−"} ${t.b}.`;
  }
  const m = missingOf(i), c = missingResult(m), big = Math.max(m.a, m.b, c) > 20;
  if (m.blank === 2) return m.op === "add" ? (big ? "Add the tens, then the ones." : `Start at ${Math.max(m.a, m.b)} and count on ${Math.min(m.a, m.b)}.`) : big ? "Take away the tens, then the ones." : `Start at ${m.a} and count back ${m.b}.`;
  if (m.op === "add") return m.blank === 1 ? `Count up from ${m.a} to ${c}.` : `What goes with ${m.b} to make ${c}? Count up from ${m.b} to ${c}.`;
  return m.blank === 1 ? `How far is it from ${c} up to ${m.a}?` : `Put the ${m.b} back: what is ${c} + ${m.b}?`;
}
/** Stage 2: the working, which ends with the answer. */
export function workingFor(i: QItem): string {
  const ans = answerOf(i);
  const m = i[0] === 3 ? storySum(i) : i[0] === 0 ? missingOf(i) : null;
  if (i[0] === 1) {
    // The number beside the gap, on the same side.
    const b = balanceOf(i), total = balanceTotal(b), known = [b.b, b.a, b.d, b.c][b.blank];
    return `${b.blank <= 1 ? `${b.c} + ${b.d}` : `${b.a} + ${b.b}`} = ${total}, and ${total} − ${known} = ${ans}.`;
  }
  const t = i[0] === 2 ? twoStepOf(i) : m && isTwo(m) ? m : null;
  if (t) {
    const sign = (op: Op) => (op === "add" ? "+" : "−");
    return `${t.a} ${sign(t.first)} ${t.b} = ${twoStepMid(t)}, then ${twoStepMid(t)} ${sign(t.second)} ${t.c} = ${ans}.`;
  }
  if (!m || isTwo(m)) return String(ans);
  const c = missingResult(m);
  if (m.blank === 2) return `${missingText(m, true)}.`;
  if (m.op === "add") return m.blank === 1 ? `${c} − ${m.a} = ${ans}.` : `${c} − ${m.b} = ${ans}.`;
  return m.blank === 1 ? `${m.a} − ${c} = ${ans}.` : `${c} + ${m.b} = ${ans}.`;
}
/**
 * The open number line Help draws when the answer is a distance: from the smaller number to the ten, on by tens,
 * then the ones. Null when the answer would be a landing point (the picture would give it away) or the line is too long.
 */
export function hopsFor(i: QItem): { start: number; hops: number[]; lo: number; hi: number } | null {
  const m = i[0] === 0 ? missingOf(i) : i[0] === 3 ? storySum(i) : null;
  if (!m || isTwo(m)) return null;
  const c = missingResult(m);
  let from: number, to: number;
  if (m.op === "add" && m.blank === 1) { from = m.a; to = c; }
  else if (m.op === "add" && m.blank === 0) { from = m.b; to = c; }
  else if (m.op === "subtract" && m.blank === 1) { from = c; to = m.a; }
  else return null;
  if (to - from < 2 || to > 100) return null;
  const hops: number[] = [];
  let at = from;
  const nextTen = Math.ceil((at + 1) / 10) * 10;
  if (at % 10 !== 0 && nextTen <= to) { at = nextTen; hops.push(at); }
  const tens = Math.floor((to - at) / 10) * 10;
  if (tens > 0) { at += tens; hops.push(at); }
  if (at < to) hops.push(to);
  // A landing that happens to equal the answer would read as a hint of the wrong kind: no picture then.
  if (from === to - from || hops.indexOf(to - from) >= 0) return null;
  const lo = Math.floor(from / 10) * 10, hi = Math.max(lo + 10, Math.ceil(to / 10) * 10);
  return { start: from, hops, lo, hi };
}

/** Three choices for the typed-answer help: the answer and the slips a child makes (one off, ten off; a hundred off past 100). */
export function choicesOf(i: QItem, level: Level, key: number): number[] {
  const ans = answerOf(i), max = levelMax(level);
  const steps = level === 5 ? [10, -10, 100, -100, 20] : level === 4 ? [1, -1, 10, -10, 2] : [1, -1, 2, -2, 3];
  const near: number[] = [];
  for (const d of steps) { const n = ans + d; if (n >= 0 && n <= max && near.indexOf(n) < 0) near.push(n); }
  const all = [ans, near[0], near[1]], turn = (key + ans) % 3;
  return [all[turn % 3], all[(turn + 1) % 3], all[(turn + 2) % 3]];
}
