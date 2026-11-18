import { decodePuzzle, type LatinPuzzle } from '../../../puzzles/latin/core';
import { squareSymmetries } from '../../../puzzles/semantic';
import data from './supply-v3.json';
type Row = { source: [number, number, string]; puzzle: unknown; teaches: string };
let pool: Row[] | undefined;
function cages(): Row[] {
  if (!pool) {
    // Import one compact string; build the row table only when Level 5 is opened.
    // This stays synchronous and pure on both Metro/Hermes and the Node proof tools.
    pool = JSON.parse(data.cages) as Row[];
    if (pool.length !== 1600) throw new Error('Invalid School cage catalog.');
  }
  return pool;
}
const maps = squareSymmetries(4);
/** Four distinct base rows per round. Eight symmetries add variety, never extra supply. */
export function schoolCage(seed: number, index: number): LatinPuzzle {
  const rows = cages(), rounds = rows.length / 4, block = (seed >>> 0) % rounds;
  const p = decodePuzzle(rows[block * 4 + index % 4].puzzle);
  if (!p || p.kind !== 'killer' || p.size !== 4 || p.box !== 2) throw new Error('Invalid School cage row.');
  const map = maps[Math.floor((seed >>> 0) / rounds) % maps.length];
  const givens = [...p.givens], mask = [...p.mask];
  p.givens.forEach((v, i) => { givens[map[i]] = v; }); p.mask.forEach((v, i) => { mask[map[i]] = v; });
  return { ...p, givens, mask, cages: p.cages.map(c => ({ ...c, cells: c.cells.map(i => map[i]).sort((a, b) => a - b) })).sort((a, b) => a.cells[0] - b.cells[0]) };
}
