import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cageOK, conflicts, decodePuzzle, encodePuzzle, solved, validPuzzle, type LatinPuzzle } from '../src/puzzles/latin/core';
import { independentCount } from '../src/puzzles/latin/independent';
import { applyStep, bit, grade, planHint, rank, search, startDomains, techniques } from '../src/puzzles/latin/solver';
import { latinAdapter, semanticKey } from '../src/puzzles/latin/adapter';
import { cueFor, explainStep } from '../src/puzzles/latin/teach';
import { createRng } from '../src/puzzles/rng';
import { certify } from '../src/puzzles/checks';
import { blankSudoku, generateSudoku, sudokuRungs } from '../scripts/puzzles/latin/sudoku';
import { referenceGrade } from '../scripts/puzzles/latin/reference-grader';
import { sudoku } from '../scripts/puzzles/families/sudoku';
import { describe as describeEntry } from '../scripts/puzzles/latin/family';

const corpus = JSON.parse(readFileSync('tests/fixtures/latin-sudoku-corpus.json', 'utf8')) as [string, number, string, string][];
const puzzleOf = (size: number, givens: string): LatinPuzzle => ({ ...blankSudoku(size), givens: [...givens].map(Number) });
const sample = (rung: number, n: number) => { const out = []; for (let s = 0; out.length < n && s < 20000; s++) { const c = generateSudoku(sudokuRungs[rung], (0x50000000 + rung * 0x01000000 + s) >>> 0); if (c) out.push(c); } return out; };

describe('Latin rules core', () => {
  it('counts all 288 4×4 Sudoku grids in both independent counters, and never reports a budget stop as zero', () => {
    const p = blankSudoku(4);
    expect(search(p, 1000).count).toBe(288);
    expect(independentCount(p, 1000).count).toBe(288);
    expect(search(p, 2, 0).status).toBe('budget-exhausted');
    expect(independentCount(p, 2, 0).status).toBe('budget-exhausted');
  });
  it('agrees between the two counters on random clue subsets of 4×4, 6×6 and 9×9 grids, without mutating input', () => {
    const rng = createRng(11);
    for (const n of [4, 6, 9]) {
      const full = search(blankSudoku(n), 1, 1e6, () => rng.uint32() / 2 ** 32).first!;
      for (let k = 0; k < 30; k++) {
        const keep = n === 9 ? 0.32 : 0.35, p = puzzleOf(n, full.map(v => rng.uint32() / 2 ** 32 < keep ? v : 0).join('')), before = JSON.stringify(p);
        const a = search(p, 2, 1e6), b = independentCount(p, 2, 1e6);
        expect(a.status).toBe('counted'); expect(b.status).toBe('counted'); expect(a.count).toBe(b.count);
        expect(JSON.stringify(p)).toBe(before);
      }
    }
  });
  it('checks every cage operator, including unordered subtraction and exact division', () => {
    const c = { cells: [0, 1], target: 2 };
    expect(cageOK({ ...c, op: '-' }, [1, 3])).toBe(true); expect(cageOK({ ...c, op: '/' }, [6, 3])).toBe(true); expect(cageOK({ ...c, op: '/' }, [3, 6])).toBe(true); expect(cageOK({ ...c, op: '/' }, [5, 2])).toBe(false);
    expect(cageOK({ ...c, op: '*', target: 12 }, [3, 4])).toBe(true); expect(cageOK({ ...c, op: '+', target: 7 }, [3, 4])).toBe(true); expect(cageOK({ cells: [0], op: '=', target: 3 }, [3])).toBe(true);
  });
  it('round-trips the compact pack tuple and rejects malformed, oversized or mixed-mode payloads', () => {
    const p = generateSudoku(sudokuRungs[4], 0x05000001)?.puzzle ?? sample(4, 1)[0].puzzle;
    expect(decodePuzzle(encodePuzzle(p))).toEqual(p);
    expect(JSON.stringify(encodePuzzle(p)).length).toBeLessThan(100);
    expect(validPuzzle({ ...p, size: 12 })).toBe(false); expect(validPuzzle({ ...p, box: 0 })).toBe(false); expect(validPuzzle({ ...p, less: [[0, 1]] })).toBe(false);
    expect(validPuzzle({ ...p, givens: p.givens.map((v, i) => i === 0 ? 1 : i === 1 ? 1 : v) })).toBe(false);
    expect(decodePuzzle([0, 9, 'x'])).toBeNull(); expect(decodePuzzle([0, 9, '1'.repeat(81), [], [], [], 0, 9])).toBeNull(); expect(decodePuzzle([7, 9, '0'.repeat(81)])).toBeNull();
  });
  it('reports only public rule clashes, never a comparison with an answer', () => {
    const p = blankSudoku(4), values = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(conflicts(p, values)).toEqual([0, 1]);
    expect(conflicts(p, [1, 2, 0, 0, ...Array(12).fill(0)])).toEqual([]);
  });
});

describe('Named-technique grader', () => {
  it('matches the frozen corpus labels, and the independent reference grader agrees on every one', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(150);
    for (const [, size, givens, ceiling] of corpus) {
      const a = grade(puzzleOf(size, givens)), b = referenceGrade([...givens].map(Number), size);
      expect(a.status).toBe('complete'); expect(b.status).toBe('complete');
      expect([a.ceiling, b.ceiling]).toEqual([ceiling, ceiling]);
    }
    // The corpus spans the whole ladder up to wings and colour chains.
    const labels = new Set(corpus.map(r => r[3]));
    for (const t of ['single', 'hidden-single', 'locked-candidates', 'naked-pair', 'xy-wing', 'simple-coloring']) expect(labels).toContain(t);
  });
  it('never removes the true answer: every step of every trace is sound', () => {
    for (const [, size, givens] of corpus.filter((_, i) => i % 3 === 0)) {
      const p = puzzleOf(size, givens), answer = search(p, 1).first!, g = grade(p);
      let d = startDomains(p);
      for (const step of g.steps) { for (const [i, m] of step.remove) expect(m & bit(answer[i])).toBe(0); d = applyStep(d, step); }
      expect(d.every((m, i) => m === bit(answer[i]))).toBe(true);
    }
  });
  it('labels a stall as a stall, never as an adult rung', () => {
    const empty = grade(blankSudoku(9));
    expect(empty.status).toBe('stalled'); expect(empty.ceiling).toBeNull();
    expect(latinAdapter('sudoku').technique!(describeEntry({ seed: 1, puzzle: blankSudoku(9), template: 'scatter', grade: { status: 'complete', ceiling: 'single', steps: [], domains: [], counts: {} } }, 'trench'), 200000)).toEqual({ status: 'stalled' });
  });
  it('keeps each rung inside its technique window, and its lowest required idea is really required', () => {
    sudokuRungs.forEach((rung, k) => {
      for (const c of sample(k, k === 0 ? 3 : 2)) {
        expect(rank(c.grade.ceiling)).toBeGreaterThanOrEqual(rank(rung.min)); expect(rank(c.grade.ceiling)).toBeLessThanOrEqual(rank(rung.max));
        if (rank(rung.min) > 0) expect(grade(c.puzzle, 400000, c.puzzle.givens, rank(rung.min) - 1).status).toBe('stalled');
        const count = c.puzzle.givens.filter(Boolean).length;
        expect(search(c.puzzle, 2).count).toBe(1);
        expect(count).toBeLessThanOrEqual(rung.size === 9 ? 38 : 20);
      }
    });
  });
});

describe('Hints from the public board only', () => {
  const [, size, givens] = corpus.find(r => r[3] === 'locked-candidates')!;
  const p = Object.freeze(puzzleOf(size, givens)) as LatinPuzzle, answer = search(p, 1).first!;
  it('walks a whole puzzle with taught placements that are always the answer', () => {
    let values = [...p.givens], turns = 0;
    for (; !solved(p, values) && turns < 100; turns++) {
      const plan = planHint(p, values);
      expect(plan.kind).toBe('place');
      if (plan.kind !== 'place') break;
      expect(plan.value).toBe(answer[plan.cell]);
      // A "one number left" hint is true of the visible board, not of numbers deduced but unwritten.
      if (!plan.steps.length) expect([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(v => !values.some((w, j) => w === v && j !== plan.cell && (Math.floor(j / 9) === Math.floor(plan.cell / 9) || j % 9 === plan.cell % 9 || Math.floor(j / 27) === Math.floor(plan.cell / 27) && Math.floor(j % 9 / 3) === Math.floor(plan.cell % 9 / 3))))).toEqual([plan.value]);
      const cue = cueFor(p, plan);
      expect(cue.look.length).toBeGreaterThan(5); expect(cue.think.length).toBeGreaterThan(5); expect(cue.focus).toContain(plan.cell);
      values = values.map((v, i) => i === plan.cell ? plan.value : v);
    }
    expect(solved(p, values)).toBe(true);
  });
  it('clears a visible clash first, then a quiet wrong entry, before teaching anything else', () => {
    const empty = p.givens.findIndex(v => !v), row = Math.floor(empty / 9), clashWith = Array.from({ length: 9 }, (_, c) => row * 9 + c).find(i => p.givens[i])!;
    const clash = p.givens.map((v, i) => i === empty ? p.givens[clashWith] : v);
    expect(planHint(p, clash)).toMatchObject({ kind: 'clash', erase: empty });
    const quiet = p.givens.findIndex((v, i) => !v && [1, 2, 3, 4, 5, 6, 7, 8, 9].some(w => w !== answer[i] && conflicts(p, p.givens.map((x, j) => j === i ? w : x)).length === 0));
    const wrongValue = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(w => w !== answer[quiet] && conflicts(p, p.givens.map((x, j) => j === quiet ? w : x)).length === 0)!;
    expect(planHint(p, p.givens.map((v, i) => i === quiet ? wrongValue : v))).toEqual({ kind: 'mistake', cell: quiet });
  });
  it('explains every named technique in words, naming the cells to look at', () => {
    const seen = new Set<string>();
    for (const [, n, g] of corpus) for (const step of grade(puzzleOf(n, g)).steps) {
      if (seen.has(step.technique)) continue;
      seen.add(step.technique);
      const words = explainStep(puzzleOf(n, g), step);
      expect(words.look).toMatch(/^(Look|Follow)/); expect(words.think.length).toBeGreaterThan(20); expect(words.think).not.toMatch(/undefined|NaN/);
    }
    expect([...seen].every(t => techniques.includes(t as never))).toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(7);
  });
});

describe('Semantic identity', () => {
  const p = puzzleOf(9, corpus.find(r => r[0] === 'tidepool')![2]);
  const remap = (q: LatinPuzzle, f: (r: number, c: number) => [number, number]) => { const g = q.givens.map(() => 0); q.givens.forEach((v, i) => { const [r, c] = f(Math.floor(i / q.size), i % q.size); g[r * q.size + c] = v; }); return { ...q, givens: g }; };
  it('treats renamed digits, mirrors, turns, band swaps and line swaps inside a band as the same puzzle', () => {
    const key = semanticKey(p);
    expect(semanticKey({ ...p, givens: p.givens.map(v => v ? 10 - v : 0) })).toBe(key);
    expect(semanticKey(remap(p, (r, c) => [c, r]))).toBe(key);
    expect(semanticKey(remap(p, (r, c) => [8 - r, 8 - c]))).toBe(key);
    expect(semanticKey(remap(p, (r, c) => [(r + 3) % 9, c]))).toBe(key);
    expect(semanticKey(remap(p, (r, c) => [r, Math.floor(c / 3) * 3 + 2 - c % 3]))).toBe(key);
    const q = puzzleOf(4, corpus[0][2]);
    expect(semanticKey(remap(q, (r, c) => [r ^ 1, c]))).toBe(semanticKey(q));
    expect(semanticKey(puzzleOf(9, corpus.find(r => r[0] === 'reef')![2]))).not.toBe(key);
  });
});

describe('Kit certification', () => {
  it('certifies a generated puzzle from every rung through the real kit gates', () => {
    sudokuRungs.forEach((rung, k) => {
      const c = sample(k, 1)[0], band = sudoku.bands[k];
      const result = certify(sudoku, { ...band, advanced: false }, describeEntry(c, rung.id), { budget: 200000, seenExact: new Set(), seenSemantic: new Set() });
      expect(result).toMatchObject({ ok: true });
    });
  });
});
