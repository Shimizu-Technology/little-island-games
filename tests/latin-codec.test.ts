import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { blankSudoku } from '../scripts/puzzles/latin/sudoku';
import { decodeGrid } from '../src/puzzles/grid/model';
import { freshPayload, gridSpec, latinStep, viewOf, type LatinEvent, type LatinPayload } from '../src/puzzles/latin/registration';
import { planHint, search } from '../src/puzzles/latin/solver';
import type { LatinPuzzle } from '../src/puzzles/latin/core';
import { jsonBytes } from '../src/state/saveBits';

const corpus = JSON.parse(readFileSync('tests/fixtures/latin-sudoku-corpus.json', 'utf8')) as [string, number, string, string][];
const hard = corpus.find(r => r[0] === 'trench')!;
const p = Object.freeze({ ...blankSudoku(9), givens: [...hard[2]].map(Number) }) as LatinPuzzle;
const answer = search(p, 1).first!;
const step = (payload: LatinPayload, ...events: LatinEvent[]) => events.reduce<LatinPayload>((x, e) => { const next = latinStep(p, x, e); expect(next).not.toBeNull(); return next!; }, payload);
const empty = p.givens.map((v, i) => v ? -1 : i).filter(i => i >= 0);

describe('Latin checkpoint codec', () => {
  it('a taught move places the number even while notes are on, and records help (R7)', () => {
    const notes = step(freshPayload(p), { type: 'pencil' });
    const plan = planHint(p, p.givens);
    expect(plan.kind).toBe('place');
    const after = step(notes, { type: 'hint' }), view = viewOf(p, after)!;
    if (plan.kind === 'place') { expect(view.state.values[plan.cell]).toBe(plan.value); expect(view.state.notes[plan.cell]).toBe(0); expect(view.state.selected).toBe(plan.cell); }
    expect(view.state.pencil).toBe(true);
    expect(view.helps).toBe(1);
  });
  it('help alone records assistance without touching the board; reset keeps both audits', () => {
    const helped = step(freshPayload(p), { type: 'help' });
    expect(helped.board).toEqual(freshPayload(p).board);
    expect(viewOf(p, helped)!.helps).toBe(1);
    const placed = step(helped, { type: 'select', cell: empty[0] }, { type: 'write', cells: [empty[0]], value: answer[empty[0]] }, { type: 'reset' });
    const view = viewOf(p, placed)!;
    expect(view.state.values).toEqual(p.givens); expect(view.helps).toBe(1); expect(view.resets).toBe(1);
  });
  it('rejects writes to givens and unknown events, and returns the same payload for a no-op', () => {
    const fresh = freshPayload(p), given = p.givens.findIndex(Boolean);
    expect(latinStep(p, fresh, { type: 'write', cells: [given], value: 1 })).toBe(fresh);
    expect(latinStep(p, fresh, { type: 'check' } as unknown as LatinEvent)).toBeNull();
    expect(latinStep(p, fresh, { type: 'select', cell: 0 })).toBe(fresh);
  });
  it('fills public candidate notes as one undoable step', () => {
    const filled = step(freshPayload(p), { type: 'fill-notes' }), state = decodeGrid(filled.board, gridSpec(p))!;
    for (const i of empty) expect(state.notes[i] & (1 << (answer[i] - 1))).not.toBe(0);
    const undone = decodeGrid(step(filled, { type: 'undo' }).board, gridSpec(p))!;
    expect(undone.notes.every(n => n === 0)).toBe(true);
  });
  it('keeps a worst-case 9×9 draft (every note, a long history, many helps) inside one session row', () => {
    let payload = freshPayload(p);
    payload = step(payload, { type: 'pencil' });
    for (let round = 0; round < 3; round++) for (const i of empty) for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9]) payload = step(payload, { type: 'write', cells: [i], value: v, selected: i });
    for (let k = 0; k < 200; k++) payload = step(payload, k % 2 ? { type: 'help' } : { type: 'reset' });
    const session = { version: 1, owner: 'cove-someone-with-a-long-name', game: 'sudoku', id: 'cove-cove-someone-with-a-long-name-2147483646', ordinal: 2147483646, revision: 2147483647, puzzle: { bank: 47, puzzle: 1023, engine: 'sudoku', rules: 1, hash: 'f'.repeat(64) }, codec: 'latin-sudoku-1', payload, selectedDares: [], partner: 'cove-another-long-name', result: { event: 'together', awards: 0, dares: [], cost: null, solution: 'e'.repeat(64) }, credited: false };
    expect(jsonBytes(session)).toBeLessThanOrEqual(4096);
    expect(viewOf(p, payload)!.helps).toBe(100);
    expect(viewOf(p, payload)!.resets).toBe(100);
  });
});
