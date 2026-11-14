import type { ReplayEngine } from '../../challenge/types';
import { uint } from '../../state/saveBits';
import { findWord, initialSearch, searchSolution, searchSolved, type SearchPuzzle, type SearchState } from './core';
export type Action = readonly ['find', number, number, 0 | 1] | readonly ['find-many', [number, number, 0 | 1][]] | readonly ['help'] | readonly ['hear', number] | readonly ['undo'] | readonly ['redo'];
export type Initial = { version: 1 };
export type State = SearchState & { puzzle: SearchPuzzle; helped: boolean; heard: boolean; redo: [number, 0 | 1][] };
export const searchEngine: ReplayEngine<SearchPuzzle, Initial, Action, State> = {
  initial: () => ({ version: 1 }), validInitial: (x): x is Initial => !!x && typeof x === 'object' && Object.keys(x).length === 1 && (x as Initial).version === 1,
  create: puzzle => ({ ...initialSearch(), puzzle, helped: false, heard: false, redo: [] }),
  validAction: (a): a is Action => Array.isArray(a) && (a.length === 1 && ['help', 'undo', 'redo'].includes(a[0]) || a.length === 2 && a[0] === 'find-many' && Array.isArray(a[1]) && a[1].length > 0 && a[1].length <= 2 && a[1].every((f: unknown) => Array.isArray(f) && f.length === 3 && uint(f[0], 255) && uint(f[1], 255) && uint(f[2], 1)) || a.length === 2 && a[0] === 'hear' && uint(a[1], 23) || a.length === 4 && a[0] === 'find' && uint(a[1], 255) && uint(a[2], 255) && uint(a[3], 1)),
  step: (s, a, p) => {
    if (a[0] === 'hear') return a[1] < p.words.length ? { state: { ...s, heard: true }, event: 'read-aloud' } : null;
    if (a[0] === 'undo') return s.found.length ? { state: { ...s, found: s.found.slice(0, -1), redo: [...s.redo, s.found.at(-1)!], turn: s.found.at(-1)![1], edits: s.edits + 1 }, event: 'edit' } : null;
    if (a[0] === 'redo') { const next = s.redo.at(-1); return next ? { state: { ...s, found: [...s.found, next], redo: s.redo.slice(0, -1), turn: next[1] === 0 ? 1 : 0, edits: s.edits + 1 }, event: 'edit' } : null; }
    if (a[0] === 'find-many') { let next: SearchState = s; for (const f of a[1]) next = findWord(p, next, f); return next === s ? null : { state: { ...s, ...next, redo: [] }, event: 'edit' }; }
    const word = a[0] === 'help' ? p.words.find((_, i) => !s.found.some(([j]) => i === j)) : undefined;
    if (a[0] === 'help' && !word) return null;
    const next = a[0] === 'find' ? findWord(p, s, [a[1], a[2], a[3]]) : findWord(p, s, [word!.cells[0], word!.cells.at(-1)!, s.turn]);
    return next === s ? null : { state: { ...s, ...next, helped: s.helped || a[0] === 'help', redo: [] }, event: a[0] === 'help' ? 'help' : 'edit' };
  },
  inspect: (s, p) => ({ solved: searchSolved(p, s), metrics: { placements: s.found.length }, edits: s.edits, solution: searchSolved(p, s) ? searchSolution(p) : null, objectives: searchSolved(p, s) ? ['all-found'] : [] }),
};
