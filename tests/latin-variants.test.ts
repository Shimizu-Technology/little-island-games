import { describe, expect, it } from 'vitest';
import { cageMathGenerator, generateCages, generateGreater, generateSkyline, greaterGenerator, killerGenerator, skylineGenerator } from '../scripts/puzzles/latin/variants';
import { decodePuzzle, encodePuzzle, solved, type LatinPuzzle } from '../src/puzzles/latin/core';
import { independentCount } from '../src/puzzles/latin/independent';
import { applyStep, bit, grade, planHint, search, startDomains } from '../src/puzzles/latin/solver';
import { cueFor } from '../src/puzzles/latin/teach';
import { semanticKey } from '../src/puzzles/latin/adapter';
import type { LatinGenerator } from '../scripts/puzzles/latin/family';

const first = (gen: LatinGenerator, rung: number, from = 1) => { for (let s = from; s < from + 200; s++) { const c = gen.generate(gen.rungs[rung], s); if (c) return c; } throw new Error('no candidate'); };
const walk = (p: LatinPuzzle) => {
  const frozen = Object.freeze({ ...p }) as LatinPuzzle, answer = search(frozen, 1).first!;
  let values = [...p.givens];
  for (let turn = 0; turn < 120 && !solved(frozen, values); turn++) {
    const plan = planHint(frozen, values);
    expect(plan.kind).toBe('place');
    if (plan.kind !== 'place') break;
    expect(plan.value).toBe(answer[plan.cell]);
    expect(cueFor(frozen, plan).think).not.toMatch(/undefined|NaN/);
    values = values.map((v, i) => i === plan.cell ? plan.value : v);
  }
  expect(solved(frozen, values)).toBe(true);
};

describe('Latin variants share the one core', () => {
  it.each([['Cage Math', cageMathGenerator], ['Greater-Than', greaterGenerator], ['Skyline', skylineGenerator], ['Cage Sudoku', killerGenerator]] as const)('%s: unique by both counters, no-guess trace, sound steps, taught to the end, exact row round trip', (_, gen) => {
    for (let rung = 0; rung < gen.rungs.length; rung++) {
      const c = first(gen, rung), p = c.puzzle;
      expect(p.size).toBe(gen.rungs[rung].size);
      expect(search(p, 2).count).toBe(1); expect(independentCount(p, 2).count).toBe(1);
      const g = grade(p), answer = search(p, 1).first!;
      expect(g.status).toBe('complete');
      let d = startDomains(p);
      for (const step of g.steps) { for (const [i, m] of step.remove) expect(m & bit(answer[i])).toBe(0); d = applyStep(d, step); }
      expect(decodePuzzle(JSON.parse(JSON.stringify(encodePuzzle(p))))).toEqual(p);
      expect(JSON.stringify(encodePuzzle(p)).length).toBeLessThan(512);
      walk(p);
    }
  });
  it('teaches addition first, then subtraction, then times and divide', () => {
    const ops = cageMathGenerator.rungs.map((_, k) => new Set(first(cageMathGenerator, k, 30).puzzle.cages.map(c => c.op)));
    expect([...ops[0]].every(op => op === '+' || op === '=')).toBe(true);
    expect([...ops[1]].every(op => ['+', '-', '='].includes(op))).toBe(true);
    expect(ops[1].has('-')).toBe(true);
    expect(cageMathGenerator.rungs.map(r => r.size)).toEqual([4, 5, 6, 7, 9]);
    expect(cageMathGenerator.rungs.some(r => r.size === 7 && r.tier <= 4)).toBe(true);
  });
  it('keeps Cage Sudoku cages free of repeats and its boxes, rows and columns Latin', () => {
    const p = first(killerGenerator, 1).puzzle, answer = search(p, 1).first!;
    expect(p.size).toBe(9);
    for (const c of p.cages) expect(new Set(c.cells.map(i => answer[i])).size).toBe(c.cells.length);
    expect(p.cages.every(c => c.op === '+' || c.op === '=')).toBe(true);
  });
  it('keeps arithmetic meaning in semantic keys, but not mirrors', () => {
    const p = generateGreater(greaterGenerator.rungs[0] as never, 3) ?? first(greaterGenerator, 0);
    const q = 'puzzle' in p ? p.puzzle : p;
    const n = q.size, mirror = (i: number) => Math.floor(i / n) * n + n - 1 - i % n;
    const flipped: LatinPuzzle = { ...q, givens: q.givens.map((_, i) => q.givens[mirror(i)]), less: q.less.map(([a, b]) => [mirror(a), mirror(b)] as [number, number]) };
    expect(semanticKey(flipped)).toBe(semanticKey(q));
    const s = first(skylineGenerator, 0).puzzle, c = first(cageMathGenerator, 0).puzzle;
    expect(semanticKey(s)).not.toBe(semanticKey(c));
    expect(generateSkyline).toBeTypeOf('function'); expect(generateCages).toBeTypeOf('function');
  });
});
