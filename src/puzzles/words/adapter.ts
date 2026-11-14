import { squareSymmetries, smallest } from '../semantic';
import { canonical } from '../descriptor';
import type { PuzzleAdapter } from '../types';
import { findWord, straightPath, initialSearch, searchSolution, searchSolved, validSearch, validSearchState, type SearchAction, type SearchPuzzle, type SearchState } from './core';
import { uint } from '../../state/saveBits';

/** Only explicit baked cells are decoded. There is no grid generator in the application. */
export const wordSearchAdapter = (): PuzzleAdapter<SearchPuzzle, SearchState, SearchAction> => ({
  engine: 'word-search', rules: 1, needsCheck: false,
  isPayload: validSearch,
  isAction: (x): x is SearchAction => Array.isArray(x) && x.length === 3 && uint(x[0], 255) && uint(x[1], 255) && uint(x[2], 1),
  encodePayload: p => [p.language, p.cells.map(row => row.map(c => c === 'CH' ? 'c' : c === 'NG' ? 'g' : c).join('')), p.words.map(w => [w.id === w.spelling ? 0 : w.id, w.spelling, w.cells[0], w.cells.at(-1), w.audio === w.spelling.toLowerCase() ? 0 : w.audio]), p.theme, p.list, p.message],
  decodePayload: x => {
    if (!Array.isArray(x) || x.length !== 6 || !Array.isArray(x[1]) || !x[1].every(r => typeof r === 'string') || !Array.isArray(x[2])) return null;
    const cells = x[1].map((r: string) => [...r].map(c => c === 'c' ? 'CH' : c === 'g' ? 'NG' : c));
    if (!cells.length || !cells[0].length) return null;
    const words = [];
    for (const w of x[2]) {
      if (!Array.isArray(w) || w.length !== 5 || typeof w[1] !== 'string' || !uint(w[2],255) || !uint(w[3],255)) return null;
      const path = straightPath(w[2],w[3],cells[0].length);if (!path) return null;
      words.push({id:w[0]===0?w[1]:w[0],spelling:w[1],cells:path,audio:w[4]===0?w[1].toLowerCase():w[4]});
    }
    const p = {language:x[0],cells,words,theme:x[3],list:x[4],message:x[5]};
    return validSearch(p) ? p : null;
  },
  create: () => initialSearch(), validState: (x, d): x is SearchState => validSearchState(x, d.payload),
  reduce: (s, a, d) => findWord(d.payload, s, a),
  actions: (s, d) => d.payload.words.flatMap((w, i) => s.found.some(([j]) => i === j) ? [] : [[w.cells[0], w.cells.at(-1)!, 0] as const]),
  solved: (s, d) => searchSolved(d.payload, s), metrics: s => ({ placements: s.found.length }),
  solve: d => ({ status: 'solved', witness: d.payload.words.map(w => [w.cells[0], w.cells.at(-1)!, 0] as const), metric: 'placements', lower: d.payload.words.length, upper: d.payload.words.length, exact: true }),
  semanticKey: d => {const p=d.payload, flat=p.cells.flat(), transforms=p.cells.length===p.cells[0].length?squareSymmetries(p.cells.length):[flat.map((_,i)=>i)];return smallest(transforms.map(map=>{const grid=Array<string>(flat.length);flat.forEach((c,i)=>{grid[map[i]]=c;});return canonical([p.language,p.cells.length,p.cells[0].length,grid,p.words.map(w=>w.spelling).sort()]);}));}, solutionHash: (_s, d) => searchSolution(d.payload),
});
