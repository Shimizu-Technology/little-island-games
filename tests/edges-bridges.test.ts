import { describe, expect, it } from 'vitest';
import { crossings, decodePuzzle, encodePuzzle, shapeOf, solved, validPuzzle, type BridgesPuzzle } from '../src/puzzles/edges/core';
import { independentCount } from '../src/puzzles/edges/independent';
import { boardMaps, bridgesAdapter, semanticKey } from '../src/puzzles/edges/adapter';
import { grade, initialBounds, planHint, rank, search, solutionOf, tidy } from '../src/puzzles/edges/solver';
import { bridgesRules, cueFor } from '../src/puzzles/edges/teach';
import { freshPayload, stepMarks, decodeMarks, type MarksPayload } from '../src/puzzles/edges/marks';
import { bridgesRungs } from '../src/puzzles/edges/rungs';
import { drawBridges, generateBridges } from '../scripts/puzzles/edges/bridges';

const puzzle = (rows: string[]): BridgesPuzzle => ({ kind: 'bridges', width: rows[0].length, height: rows.length, clues: rows.join('').split('').map(c => c === '.' ? 0 : Number(c)) });
/** Every assignment of 0–2 bridges per link, checked against the whole rule set. */
function brute(p: BridgesPuzzle, cap = 3): number {
  const n = shapeOf(p).links.length, counts = Array<number>(n).fill(0);
  let found = 0;
  const walk = (i: number) => { if (found >= cap) return; if (i === n) { if (solved(p, counts)) found++; return; } for (let v = 0; v <= 2; v++) { counts[i] = v; walk(i + 1); } counts[i] = 0; };
  walk(0);
  return found;
}
const small = { id: 'x', tier: 1 as const, width: 5, height: 5, islands: [4, 7] as [number, number], title: '', summary: '', min: 'full' as const, max: 'chain' as const };

describe('Bridges rules', () => {
  it('finds links only between islands that see each other, and the crossings between them', () => {
    const p = puzzle(['2.2', '...', '2.2']), s = shapeOf(p);
    expect(s.links.map(l => [l.a, l.b, l.horizontal])).toEqual([[0, 1, true], [0, 2, false], [1, 3, false], [2, 3, true]]);
    const plus = puzzle(['.1.', '1.1', '.1.']);
    expect(shapeOf(plus).crosses.flat().length).toBe(2);
    expect(crossings(plus, [1, 1])).toEqual([[0, 1]]);
  });
  it('round-trips the pack tuple and refuses impossible boards', () => {
    const p = puzzle(['3.2', '...', '2.1']);
    expect(decodePuzzle(encodePuzzle(p))).toEqual(p);
    expect(validPuzzle(puzzle(['5.1', '...', '1.1']))).toBe(false); // a corner island can take at most four
    expect(decodePuzzle([3, 3, '1........'])).toBeNull();
  });
  it('two separate counters agree with brute force on every small layout', () => {
    let checked = 0;
    for (let seed = 1; seed <= 400 && checked < 150; seed++) {
      const d = drawBridges(small, seed * 104729);
      if (!d || shapeOf(d.puzzle).links.length > 11) continue;
      const truth = brute(d.puzzle), one = search(d.puzzle, 3), two = independentCount(d.puzzle, 3);
      expect(one.status === 'counted' && one.count).toBe(truth);
      expect(two.status === 'counted' && two.count).toBe(truth);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });
  it('the grader never removes the answer, and a finished trace proves the only answer', () => {
    let complete = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const d = drawBridges({ ...small, width: 7, height: 7, islands: [9, 13] }, seed * 7919);
      if (!d) continue;
      const g = grade(d.puzzle);
      if (g.status !== 'complete') continue;
      complete++;
      const answer = solutionOf(d.puzzle)!, count = search(d.puzzle, 2);
      expect(count.status === 'counted' && count.count).toBe(1);
      expect(g.counts).toEqual(answer);
      for (const step of g.steps) step.links.forEach((e, k) => { expect(answer[e]).toBeGreaterThanOrEqual(step.lo[k]); expect(answer[e]).toBeLessThanOrEqual(step.hi[k]); });
    }
    expect(complete).toBeGreaterThan(80);
  });
  it('bookkeeping blocks crossings and caps a link at what both islands can still take', () => {
    // A bridge across blocks the one down; then the top and bottom 1s cannot be met.
    const p = puzzle(['.1.', '1.1', '.1.']), b = initialBounds(p);
    b.lo[0] = 1;
    expect(tidy(p, b)).toBe(false);
    expect(b.hi[1]).toBe(0);
    const q = puzzle(['3.2', '...', '1..']), c = initialBounds(q);
    expect(c.hi).toEqual([2, 1]);
    c.lo[1] = 1;
    expect(tidy(q, c)).toBe(true);
    expect(c.hi[0]).toBe(2);
  });
  it('each rung window holds: generated boards need the rung’s idea and nothing harder', () => {
    for (const rung of bridgesRungs.slice(0, 5)) {
      let seen = 0;
      for (let seed = 1; seed <= 3000 && seen < 6; seed++) {
        const c = generateBridges(rung, seed);
        if (!c) continue;
        seen++;
        expect(rank(c.grade.ceiling)).toBeGreaterThanOrEqual(rank(rung.min));
        expect(rank(c.grade.ceiling)).toBeLessThanOrEqual(rank(rung.max));
        if (rung.needs) expect(c.grade.steps.some(s => s.technique === rung.needs)).toBe(true);
      }
      expect(seen, rung.id).toBe(6);
    }
  });
});

describe('Bridges hints', () => {
  const p = (() => { for (let seed = 1; ; seed++) { const c = generateBridges(bridgesRungs[3], seed); if (c) return c.puzzle; } })();
  it('Show me walks from an empty map to the finish using the same plan the card describes', () => {
    let payload: MarksPayload = freshPayload(p, bridgesRules);
    for (let i = 0; i < 200 && !bridgesRules.solved(p, decodeMarks(payload, p, bridgesRules)!.marks); i++) {
      const marks = decodeMarks(payload, p, bridgesRules)!.marks, cue = cueFor(p, marks);
      expect(cue).not.toBeNull();
      expect(cue!.look.length).toBeGreaterThan(5);
      const next = stepMarks(p, bridgesRules, payload, { type: 'hint' })!;
      expect(next).not.toBe(payload);
      payload = next;
    }
    expect(bridgesRules.solved(p, decodeMarks(payload, p, bridgesRules)!.marks)).toBe(true);
  });
  it('points at a wrong bridge before anything else, and at an over-full island first of all', () => {
    const answer = solutionOf(p)!, wrong = answer.findIndex(c => c < 2 && c >= 0);
    const counts = answer.map(() => 0); counts[wrong] = answer[wrong] + 1;
    if (!crossings(p, counts).length) {
      const plan = planHint(p, counts);
      expect(['mistake', 'clash']).toContain(plan.kind);
    }
    const { islands, around } = shapeOf(p), one = islands.findIndex((s, i) => s.clue === 1 && around[i].length);
    if (one >= 0) { const c = answer.map(() => 0); c[around[one][0]] = 2; expect(planHint(p, c).kind).toBe('clash'); }
  });
});

describe('Bridges board state', () => {
  const p = puzzle(['2.1', '...', '1..']);
  it('one stroke is one undo step, redo replays it, and a crossing bridge is refused by board and engine alike', () => {
    let s = freshPayload(p, bridgesRules);
    s = stepMarks(p, bridgesRules, s, { type: 'set', changes: [[0, 1], [1, 1]] })!;
    expect(s.marks).toBe('11');
    expect(stepMarks(p, bridgesRules, s, { type: 'undo' })!.marks).toBe('00');
    expect(stepMarks(p, bridgesRules, stepMarks(p, bridgesRules, s, { type: 'undo' })!, { type: 'redo' })!.marks).toBe('11');
    const plus = puzzle(['.1.', '1.1', '.1.']);
    let q = stepMarks(plus, bridgesRules, freshPayload(plus, bridgesRules), { type: 'set', changes: [[0, 1]] })!;
    const refused = stepMarks(plus, bridgesRules, q, { type: 'set', changes: [[1, 1]] });
    expect(refused).toBe(q);
    const adapter = bridgesAdapter(), d = { format: 1 as const, seed: 0, rng: 1 as const, band: 'x', layout: 'x', template: 'x', payload: plus, objectives: [], limits: [], par: null, teaches: [], speech: null };
    const state = adapter.reduce(adapter.create(d), [0, 1], d);
    expect(adapter.reduce(state, [1, 1], d)).toBe(state);
    q = stepMarks(plus, bridgesRules, q, { type: 'reset' })!;
    expect(q.marks).toBe('00');
    expect(q.audit).toEqual([['reset', 1]]);
  });
  it('keeps the newest undo strokes inside the byte budget and never trims the board', () => {
    const big = (() => { for (let seed = 1; ; seed++) { const c = generateBridges(bridgesRungs[6], seed); if (c) return c.puzzle; } })();
    const n = shapeOf(big).links.length;
    let s = freshPayload(big, bridgesRules);
    for (let i = 0; i < 600; i++) { const e = i % n, next = stepMarks(big, bridgesRules, s, { type: 'set', changes: [[e, (decodeMarks(s, big, bridgesRules)!.marks[e] + 1) % 2]] }); if (next && next !== s) s = next; }
    expect(s.undo.length + s.redo.length).toBeLessThanOrEqual(1800);
    expect(s.marks.length).toBe(n);
    expect(JSON.stringify(s).length).toBeLessThan(2600);
    expect(decodeMarks(s, big, bridgesRules)).not.toBeNull();
  });
  it('treats turns, mirrors and the portrait form of a map as the same puzzle', () => {
    const p2 = puzzle(['3.2.', '....', '2..1', '.1..', '1.2.']);
    const key = semanticKey(p2);
    for (const { map, width, height } of boardMaps(p2.width, p2.height)) {
      const clues = Array<number>(p2.clues.length).fill(0);
      p2.clues.forEach((c, i) => { clues[map[i]] = c; });
      expect(semanticKey({ kind: 'bridges', width, height, clues })).toBe(key);
    }
    const t = Array<number>(p2.clues.length).fill(0);
    p2.clues.forEach((c, i) => { t[(i % p2.width) * p2.height + Math.floor(i / p2.width)] = c; });
    expect(semanticKey({ kind: 'bridges', width: p2.height, height: p2.width, clues: t })).toBe(key);
  });
});
