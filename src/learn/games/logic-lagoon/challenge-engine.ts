import type { ReplayEngine } from '../../../challenge/types';
import { plain, exactKeys, uint } from '../../../state/saveBits';
import { createGrid, gridAction, type GridState, type GridAction } from '../../../puzzles/grid/model';
import { solved, type LatinPuzzle } from '../../../puzzles/latin/core';
import { grade, planHint } from '../../../puzzles/latin/solver';
import { sha256Hex } from '../../../puzzles/sha256';
import { specFor } from './engine';
export type Descriptor = { puzzle: LatinPuzzle; title: string; symbols?: string[] };
export type Initial = { version: 1 };
export type Action = ['w', number, number] | ['s', number] | ['t', number] | ['p'] | ['u'] | ['d'] | ['h'] | ['v'] | ['c'] | ['z'];
export type State = { descriptor: Descriptor; grid: GridState; helps: number; checked: number | null; wrong: number | null };
export const toAction = (a: GridAction): Action => a.type === 'write' ? ['w', a.cells[0], a.value] : a.type === 'select' ? ['s', a.cell] : a.type === 'tool' ? ['t', a.value] : [a.type === 'pencil' ? 'p' : a.type === 'undo' ? 'u' : 'd'];
export const challengeEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (x): x is Initial => plain(x) && exactKeys(x, ['version']) && x.version === 1,
  create: d => ({ descriptor: d, grid: createGrid(specFor(d.puzzle)), helps: 0, checked: null, wrong: null }),
  validAction: (x): x is Action => Array.isArray(x) && (x.length === 1 && ['p', 'u', 'd', 'h', 'v', 'c', 'z'].includes(x[0]) || x.length === 2 && ['s', 't'].includes(x[0]) && uint(x[1], 35) || x.length === 3 && x[0] === 'w' && uint(x[1], 35) && uint(x[2], 6)),
  step: (s, a, d) => {
    const p = d.puzzle, spec = specFor(p), tag = a[0];
    if (tag === 'h') return { state: { ...s, helps: s.helps + 1 }, event: 'help' };
    if (tag === 'c') {
      const g = grade(p), answer = g.status === 'complete' ? g.domains.map(m => Math.log2(m) + 1) : [];
      const correct = solved(p, s.grid.values);
      return { state: { ...s, checked: correct ? s.grid.edits : null, wrong: correct ? 0 : s.grid.values.filter((v, i) => v !== answer[i]).length }, event: 'check', correct };
    }
    if (tag === 'z') return { state: { ...s, grid: { ...createGrid(spec), edits: s.grid.edits + 1 }, checked: null, wrong: null }, event: 'reset' };
    let action: GridAction;
    if (tag === 'v') {
      const h = planHint(p, s.grid.values), cell = h.kind === 'place' || h.kind === 'mistake' ? h.cell : h.kind === 'clash' ? h.erase : -1;
      if (cell < 0) return null;
      const grid = gridAction({ ...s.grid, pencil: false }, { type: 'write', cells: [cell], value: h.kind === 'place' ? h.value : 0 }, spec);
      return { state: { ...s, grid: { ...grid, pencil: s.grid.pencil }, helps: s.helps + 1, checked: null, wrong: null }, event: 'help' };
    }
    if (tag === 'w') action = { type: 'write', cells: [a[1]], value: a[2] };
    else if (tag === 's') action = { type: 'select', cell: a[1] };
    else if (tag === 't') action = { type: 'tool', value: a[1] };
    else action = { type: tag === 'p' ? 'pencil' : tag === 'u' ? 'undo' : 'redo' };
    const grid = gridAction(s.grid, action, spec);
    return grid === s.grid ? null : { state: { ...s, grid, checked: grid.edits === s.grid.edits ? s.checked : null, wrong: grid.edits === s.grid.edits ? s.wrong : null }, event: 'edit' };
  },
  inspect: (s, d) => ({ solved: s.checked === s.grid.edits && solved(d.puzzle, s.grid.values), metrics: { placements: s.grid.edits }, edits: s.grid.edits, solution: solved(d.puzzle, s.grid.values) ? sha256Hex(s.grid.values.join('')) : null, objectives: [] }),
};
