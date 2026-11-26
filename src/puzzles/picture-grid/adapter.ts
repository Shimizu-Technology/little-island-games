import { exactKeys, plain, uint } from '../../state/saveBits';
import { smallest } from '../semantic';
import { sha256Hex } from '../sha256';
import type { PuzzleAdapter } from '../types';
import { FILL, MAX_SIZE, PICTURE_GRID, emptyMarks, picturePalettes, solved, validSize, type Mark, type PictureGrid } from './engine';
import { pictureHint } from './help';
import { countByPlacements } from './independent';
import { gradePicture, provePicture } from './solver';

type Action = readonly [cell: number, mark: Mark];
type State = { marks: readonly Mark[]; edits: number };
const isName = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z][A-Za-z '’-]{0,39}$/.test(value) && value.trim() === value;

function validLines(value: unknown, size: number): value is number[][] {
  return Array.isArray(value) && value.length === size && Array.from(value).every(clue =>
    Array.isArray(clue) && Array.from(clue).every(run => uint(run, size) && run > 0)
    && clue.reduce((sum, run) => sum + run + 1, -1) <= size);
}

export function validPicture(value: unknown): value is PictureGrid {
  if (!plain(value) || !exactKeys(value, ['size', 'rows', 'columns', 'name', 'palette'])
    || !validSize(value.size) || !isName(value.name) || !uint(value.palette, picturePalettes.length - 1)
    || !validLines(value.rows, value.size) || !validLines(value.columns, value.size)) return false;
  const total = (lines: PictureGrid['rows']) => lines.flat().reduce((sum, run) => sum + run, 0);
  const fills = total(value.rows);
  return fills > 0 && fills === total(value.columns);
}

function semanticKey(picture: PictureGrid): string {
  const reverse = <T,>(items: readonly T[]) => [...items].reverse();
  const reverseClues = (lines: PictureGrid['rows']) => lines.map(reverse);
  const keys: string[] = [];
  for (const [rows, columns] of [[picture.rows, picture.columns], [picture.columns, picture.rows]]) {
    keys.push(...[
      [rows, columns],
      [reverseClues(rows), reverse(columns)],
      [reverse(rows), reverseClues(columns)],
      [reverseClues(reverse(rows)), reverseClues(reverse(columns))],
    ].map(pair => JSON.stringify(pair)));
  }
  return smallest(keys);
}

export const answerHash = (marks: readonly Mark[]) => sha256Hex(marks.map(mark => Number(mark === FILL)).join(''));

export const pictureGridAdapter: PuzzleAdapter<PictureGrid, State, Action> = {
  engine: PICTURE_GRID, rules: 1, needsCheck: false,
  isPayload: validPicture,
  isAction: (value): value is Action => Array.isArray(value) && value.length === 2 && uint(value[0], MAX_SIZE ** 2 - 1) && uint(value[1], 2),
  encodePayload: p => [p.size, p.name, p.palette, p.rows, p.columns],
  decodePayload: value => {
    if (!Array.isArray(value) || value.length !== 5) return null;
    const [size, name, palette, rows, columns] = value;
    const picture = { size, name, palette, rows, columns };
    return validPicture(picture) ? picture : null;
  },
  create: d => ({ marks: emptyMarks(d.payload.size), edits: 0 }),
  validState: (value, d): value is State => plain(value) && exactKeys(value, ['marks', 'edits']) && uint(value.edits)
    && Array.isArray(value.marks) && value.marks.length === d.payload.size ** 2 && Array.from(value.marks).every(m => uint(m, 2)),
  reduce: (state, action) => {
    if (!pictureGridAdapter.isAction(action)) return state;
    const [cell, mark] = action;
    if (cell >= state.marks.length || state.marks[cell] === mark) return state;
    const marks = [...state.marks];
    marks[cell] = mark;
    return { marks, edits: state.edits + 1 };
  },
  actions: state => state.marks.flatMap((mark, cell) => ([0, 1, 2] as const).filter(next => next !== mark).map(next => [cell, next] as const)),
  solved: (state, d) => solved(d.payload, state.marks),
  metrics: state => ({ placements: state.edits }),
  semanticKey: d => semanticKey(d.payload),
  solutionHash: state => answerHash(state.marks),
  solve: (d, budget) => {
    const proof = provePicture(d.payload);
    if (proof.status === 'contradiction') return { status: 'unsolved' };
    if (proof.status !== 'unique' || proof.rounds > budget) return { status: 'budget-exhausted', nodes: proof.rounds };
    const witness = proof.marks.flatMap((mark, i) => mark === FILL ? [[i, FILL] as const] : []);
    return { status: 'solved', witness, metric: 'placements', lower: witness.length, upper: witness.length, exact: true };
  },
  count: (d, cap, budget) => {
    if (cap <= 0) return { status: 'counted', count: 0 };
    const proof = provePicture(d.payload);
    if (proof.rounds > budget || proof.status === 'stalled') return { status: 'budget-exhausted' };
    return { status: 'counted', count: Number(proof.status === 'unique') };
  },
  independentCount: (d, cap, budget) => cap <= 0 ? { status: 'counted', count: 0 } : countByPlacements(d.payload, budget),
  technique: (d, budget) => {
    const proof = provePicture(d.payload);
    const band = gradePicture(d.payload.size, proof);
    if (!band || proof.rounds > budget) return { status: 'stalled' };
    return { status: 'complete', ceiling: 'line-logic', steps: proof.rounds, trace: JSON.stringify(proof.trace) };
  },
  hint: (state, d) => {
    const hint = pictureHint(d.payload, state.marks);
    return hint?.cell !== undefined && hint.mark !== undefined ? [hint.cell, hint.mark] : null;
  },
};
