import type { ReplayEngine } from '../../../challenge/types';
import { plain, exactKeys, uint } from '../../../state/saveBits';
import { createGrid, gridAction, type GridState, type GridAction } from '../../../puzzles/grid/model';
import { solved, type LatinPuzzle } from '../../../puzzles/latin/core';
import { grade } from '../../../puzzles/latin/solver';
import { lagoonHint } from './teaching';
import { sha256Hex } from '../../../puzzles/sha256';
import { specFor } from './engine';
export type Descriptor = { puzzle: LatinPuzzle; title: string; symbols?: string[] };
export type Initial = { version: 1 };
export type Action = ['w', number, number, number?] | ['s', number] | ['t', number] | ['p'] | ['u'] | ['d'] | ['h'] | ['v'] | ['c'] | ['z'];
export type State = { descriptor: Descriptor; grid: GridState; helps: number; checked: number | null; wrong: number | null };
export const toAction = (a: GridAction): Action => a.type === 'write' ? (a.selected === undefined ? ['w', a.cells[0], a.value] : ['w', a.cells[0], a.value, a.selected]) : a.type === 'select' ? ['s', a.cell] : a.type === 'tool' ? ['t', a.value] : [a.type === 'pencil' ? 'p' : a.type === 'undo' ? 'u' : 'd'];
const answers = new WeakMap<LatinPuzzle, readonly number[]>();
function answerFor(p: LatinPuzzle): readonly number[] {
  const hit = answers.get(p); if (hit) return hit;
  const g = grade(p), answer = g.status === 'complete' ? g.domains.map(m => Math.log2(m) + 1) : [];
  answers.set(p, answer); return answer;
}
export const challengeEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (x): x is Initial => plain(x) && exactKeys(x, ['version']) && x.version === 1,
  create: d => ({ descriptor: d, grid: { ...createGrid(specFor(d.puzzle)), selected: Math.max(0, d.puzzle.givens.indexOf(0)) }, helps: 0, checked: null, wrong: null }),
  validAction: (x): x is Action => Array.isArray(x) && (x.length === 1 && ['p', 'u', 'd', 'h', 'v', 'c', 'z'].includes(x[0]) || x.length === 2 && ['s', 't'].includes(x[0]) && uint(x[1], 35) || (x.length === 3 || x.length === 4 && uint(x[3], 35)) && x[0] === 'w' && uint(x[1], 35) && uint(x[2], 6)),
  step: (s, a, d) => {
    const p = d.puzzle, spec = specFor(p), tag = a[0];
    if (tag === 'h') return { state: { ...s, helps: Math.min(2147483647, s.helps + 1) }, event: 'help' };
    if (tag === 'c') {
      const answer = answerFor(p);
      const correct = solved(p, s.grid.values);
      return { state: { ...s, checked: correct ? s.grid.edits : null, wrong: correct ? 0 : s.grid.values.filter((v, i) => v !== answer[i]).length }, event: 'check', correct };
    }
    if (tag === 'z') return { state: { ...s, grid: { ...createGrid(spec), selected: Math.max(0, p.givens.indexOf(0)), edits: s.grid.edits + 1 }, checked: null, wrong: null }, event: 'reset' };
    let action: GridAction;
    if (tag === 'v') {
      const h = lagoonHint(p, s.grid.values), cell = h.kind === 'place' || h.kind === 'mistake' ? h.cell : h.kind === 'clash' ? h.erase : -1;
      if (cell < 0) return null;
      const grid = gridAction({ ...s.grid, pencil: false }, { type: 'write', cells: [cell], value: h.kind === 'place' ? h.value : 0 }, spec);
      return { state: { ...s, grid: { ...grid, pencil: s.grid.pencil }, helps: Math.min(2147483647, s.helps + 1), checked: null, wrong: null }, event: 'help' };
    }
    if (tag === 'w') action = { type: 'write', cells: [a[1]], value: a[2], ...(a[3] === undefined ? {} : { selected: a[3] }) };
    else if (tag === 's') action = { type: 'select', cell: a[1] };
    else if (tag === 't') action = { type: 'tool', value: a[1] };
    else action = { type: tag === 'p' ? 'pencil' : tag === 'u' ? 'undo' : 'redo' };
    const grid = gridAction(s.grid, action, spec);
    return grid === s.grid ? null : { state: { ...s, grid, checked: grid.edits === s.grid.edits ? s.checked : null, wrong: grid.edits === s.grid.edits ? s.wrong : null }, event: 'edit' };
  },
  inspect: (s, d) => ({ solved: s.checked === s.grid.edits && solved(d.puzzle, s.grid.values), metrics: { placements: s.grid.edits }, edits: s.grid.edits, solution: solved(d.puzzle, s.grid.values) ? sha256Hex(s.grid.values.join('')) : null, objectives: [] }),
};
/** Preserve catalog-1 replay selection semantics; new checkpoint attempts start on an editable cell. */
export const replayEngine: typeof challengeEngine = {
  ...challengeEngine,
  create: (d, initial, options) => {
    const s = challengeEngine.create(d, initial, options);
    return { ...s, grid: { ...s.grid, selected: 0 } };
  },
  step: (s, a, d) => {
    const next = challengeEngine.step(s, a, d);
    return next && a[0] === 'z' ? { ...next, state: { ...next.state, grid: { ...next.state.grid, selected: 0 } } } : next;
  },
};
