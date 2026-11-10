import { describe, expect, it } from 'vitest';
import { CROSS, EMPTY, LINE, decodePuzzle, encodePuzzle, latticeOf, solved, type LinePuzzle } from '../src/puzzles/lines/core';
import { independentCount } from '../src/puzzles/lines/independent';
import { grade, planHint, rank, search, solutionOf } from '../src/puzzles/lines/solver';
import { semanticKey } from '../src/puzzles/lines/adapter';
import { cueFor, lineRules } from '../src/puzzles/lines/teach';
import { decodeMarks, freshPayload, stepMarks, type MarksPayload } from '../src/puzzles/edges/marks';
import { loopRungs, pearlRungs } from '../src/puzzles/lines/rungs';
import { generateLine } from '../scripts/puzzles/lines/loops';

const loop = (rows: string[]): LinePuzzle => ({ kind: 'loop', rows: rows.length, cols: rows[0].length, clues: rows.join('').split('').map(c => c === '.' ? -1 : Number(c)) });
const pearls = (rows: string[]): LinePuzzle => ({ kind: 'pearl-loop', rows: rows.length, cols: rows[0].length, pearls: rows.join('').split('').map(c => '.wb'.indexOf(c)) });
/** Every inside/outside colouring of the squares, turned into edges and checked by the edge rules. */
function brute(p: LinePuzzle): number {
  const sr = p.kind === 'loop' ? p.rows : p.rows - 1, sc = p.kind === 'loop' ? p.cols : p.cols - 1, l = latticeOf(p);
  // The two squares on either side of each edge (-1 is outside the board).
  const square = (r: number, c: number) => r < 0 || c < 0 || r >= sr || c >= sc ? -1 : r * sc + c;
  const sides = l.edges.map(([a, b], e) => {
    if (p.kind === 'loop') return l.faces[e];
    const ar = Math.floor(a / p.cols), ac = a % p.cols;
    return b === a + 1 ? [square(ar - 1, ac), square(ar, ac)] : [square(ar, ac - 1), square(ar, ac)];
  });
  let found = 0;
  for (let m = 0; m < 2 ** (sr * sc); m++) {
    const v = (x: number) => x < 0 ? 0 : Math.floor(m / 2 ** x) % 2;
    if (solved(p, sides.map(([f, g]) => v(f) !== v(g) ? LINE : EMPTY))) found++;
  }
  return found;
}

describe('Loop and Pearl Loop rules', () => {
  it('round-trips both pack tuples', () => {
    const a = loop(['3.2', '.1.', '2.3']), b = pearls(['b..w', '....', 'w..b']);
    expect(decodePuzzle('loop', encodePuzzle(a))).toEqual(a);
    expect(decodePuzzle('pearl-loop', encodePuzzle(b))).toEqual(b);
    expect(decodePuzzle('loop', [3, 3, '4........'])).toBeNull();
  });
  it('both counters agree with a brute-force count on small boards, unique or not', () => {
    let checked = 0;
    for (let seed = 1; seed <= 300 && checked < 60; seed++) {
      const c = generateLine('loop', { ...loopRungs[0], rows: 3, cols: 5, min: 'count', max: 'chain', keep: 0 }, seed * 977);
      const p = c?.puzzle ?? null;
      if (!p) continue;
      // Thin it further by hand so some boards have many answers.
      const sparse = { ...p, clues: (p as Extract<LinePuzzle, { kind: 'loop' }>).clues.map((v, i) => (i * 7 + seed) % 3 ? v : -1) } as LinePuzzle;
      for (const q of [p, sparse]) {
        const truth = Math.min(3, brute(q)), one = search(q, 3), two = independentCount(q, 3);
        expect(one.status === 'counted' && one.count).toBe(truth);
        expect(two.status === 'counted' && two.count).toBe(truth);
      }
      checked++;
    }
    for (let seed = 1; seed <= 200 && checked < 90; seed++) {
      const c = generateLine('pearl-loop', { ...pearlRungs[0], rows: 4, cols: 6, max: 'chain' }, seed * 31);
      if (!c) continue;
      const q = c.puzzle, truth = Math.min(3, brute(q));
      expect(truth).toBe(1);
      const one = search(q, 3), two = independentCount(q, 3);
      expect(one.status === 'counted' && one.count).toBe(1);
      expect(two.status === 'counted' && two.count).toBe(1);
      checked++;
    }
    expect(checked).toBeGreaterThan(60);
  });
  it('never closes a loop just because closing would be valid: a longer loop may be too (regression)', () => {
    const p = loop(['.00...', '.2....', '..1...', '..0.2.', '10.02.', '.1.220']);
    const one = search(p, 3), two = independentCount(p, 3);
    expect(one.status === 'counted' && one.count).toBe(3);
    expect(two.status === 'counted' && two.count).toBe(3);
    expect(grade(p).status).toBe('stalled');
  });
  it('the grader never contradicts the answer, and a finished trace is the only answer', () => {
    for (const [kind, rungs] of [['loop', loopRungs.slice(0, 5)], ['pearl-loop', pearlRungs.slice(0, 1)]] as const) for (const rung of rungs) {
      let seen = 0;
      for (let seed = 1; seed <= 400 && seen < 3; seed++) {
        const c = generateLine(kind, rung, seed * 131);
        if (!c) continue;
        seen++;
        const answer = solutionOf(c.puzzle)!, count = search(c.puzzle, 2);
        expect(count.status === 'counted' && count.count).toBe(1);
        expect(c.grade.marks).toEqual(answer);
        for (const step of c.grade.steps) for (const [e, v] of step.set) expect(answer[e]).toBe(v);
        expect(rank(kind, c.grade.ceiling)).toBeGreaterThanOrEqual(rank(kind, rung.min));
        expect(rank(kind, c.grade.ceiling)).toBeLessThanOrEqual(rank(kind, rung.max));
        if (rung.needs) expect(c.grade.steps.some(s => s.technique === rung.needs)).toBe(true);
      }
      expect(seen, `${kind} ${rung.id}`).toBe(3);
    }
  });
  it('turns and mirrors share one key', () => {
    const p = loop(['3.2.', '.1..', '2..3']), key = semanticKey(p);
    const flipped = loop(['.2.3', '..1.', '3..2']), upside = loop(['2..3', '.1..', '3.2.']);
    expect(semanticKey(flipped)).toBe(key);
    expect(semanticKey(upside)).toBe(key);
    expect(semanticKey(loop(['3.2.', '.1..', '2..2']))).not.toBe(key);
  });
});

describe('Loop hints and board state', () => {
  const p = (() => { for (let seed = 1; ; seed++) { const c = generateLine('loop', loopRungs[1], seed); if (c) return c.puzzle; } })();
  it('Show me walks from an empty board to the finish with the plan the card describes', () => {
    for (const q of [p, (() => { for (let seed = 1; ; seed++) { const c = generateLine('pearl-loop', pearlRungs[0], seed); if (c) return c.puzzle; } })()]) {
      let s: MarksPayload = freshPayload(q, lineRules);
      for (let i = 0; i < 400 && !lineRules.solved(q, decodeMarks(s, q, lineRules)!.marks); i++) {
        const marks = decodeMarks(s, q, lineRules)!.marks;
        expect(cueFor(q, marks)?.look.length).toBeGreaterThan(5);
        const next = stepMarks(q, lineRules, s, { type: 'hint' })!;
        expect(next).not.toBe(s);
        s = next;
      }
      expect(lineRules.solved(q, decodeMarks(s, q, lineRules)!.marks)).toBe(true);
    }
  });
  it('fixes a branching dot or a wrong mark before giving a new step', () => {
    const answer = solutionOf(p)!, l = latticeOf(p);
    const wrong = answer.findIndex(m => m === CROSS), marks = answer.map(() => EMPTY);
    marks[wrong] = LINE;
    expect(planHint(p, marks)).toMatchObject({ kind: 'mistake', edge: wrong });
    const v = l.around.findIndex(list => list.length >= 3), branch = answer.map(() => EMPTY);
    l.around[v].slice(0, 3).forEach(e => { branch[e] = LINE; });
    expect(planHint(p, branch).kind).toBe('clash');
    expect(lineRules.hintMove(p, branch)!.every(([, value]) => value === EMPTY)).toBe(true);
  });
  it('a drag is one undo step, and crosses never count toward the finish', () => {
    const answer = solutionOf(p)!, lines = answer.flatMap((m, e) => m === LINE ? [[e, LINE] as const] : []);
    let s = stepMarks(p, lineRules, freshPayload(p, lineRules), { type: 'set', changes: lines.slice(0, 3) })!;
    expect(s.undo.split(';').length).toBe(1);
    s = stepMarks(p, lineRules, s, { type: 'set', changes: [...lines.slice(3), ...answer.flatMap((m, e) => m === CROSS ? [[e, CROSS] as const] : []).slice(0, 4)] })!;
    expect(lineRules.solved(p, decodeMarks(s, p, lineRules)!.marks)).toBe(true);
    const undone = stepMarks(p, lineRules, s, { type: 'undo' })!;
    expect(decodeMarks(undone, p, lineRules)!.marks.filter(m => m === LINE).length).toBe(3);
  });
});
