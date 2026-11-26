import { CROSS, FILL, cellOf, emptyMarks, type Mark, type PictureClues } from './engine';
import type { CountResult } from '../types';

/** Certification cross-check: explicitly enumerate runs instead of using the runtime line DAG. */
export function countByPlacements(picture: PictureClues, budget: number): CountResult {
  const { size, rows, columns } = picture;
  const full = (1 << size) - 1;
  let remaining = budget;
  function enumerate(clues: readonly number[]) {
    const masks: number[] = [];
    const suffix = Array<number>(clues.length + 1).fill(0);
    for (let i = clues.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + clues[i] + Number(i + 1 < clues.length);
    function place(run: number, start: number, mask: number) {
      if (--remaining < 0) return;
      if (run === clues.length) { masks.push(mask); return; }
      const bits = (1 << clues[run]) - 1;
      for (let left = start; remaining >= 0 && left <= size - suffix[run]; left++) {
        place(run + 1, left + clues[run] + 1, mask | (bits << left));
      }
    }
    place(0, 0, 0);
    return masks;
  }
  const lines = [...rows.map((clue, index) => ({ axis: 'row' as const, index, masks: enumerate(clue) })),
    ...columns.map((clue, index) => ({ axis: 'column' as const, index, masks: enumerate(clue) }))];
  const marks = emptyMarks(size);
  let changed = true;
  while (changed && remaining >= 0) {
    changed = false;
    for (const line of lines) {
      const cells = Array.from({ length: size }, (_, i) => cellOf(size, line.axis, line.index, i));
      let fills = 0, crosses = 0;
      cells.forEach((cell, i) => {
        if (marks[cell] === FILL) fills |= 1 << i;
        if (marks[cell] === CROSS) crosses |= 1 << i;
      });
      let all = full, any = 0;
      remaining -= line.masks.length;
      if (remaining < 0) return { status: 'budget-exhausted' };
      line.masks = line.masks.filter(mask => {
        if ((mask & fills) !== fills || (mask & crosses) !== 0) return false;
        all &= mask;
        any |= mask;
        return true;
      });
      if (!line.masks.length) return { status: 'counted', count: 0 };
      cells.forEach((cell, i) => {
        if (marks[cell]) return;
        const bit = 1 << i;
        const mark: Mark = all & bit ? FILL : any & bit ? 0 : CROSS;
        if (mark) { marks[cell] = mark; changed = true; }
      });
    }
  }
  return remaining >= 0 && marks.every(Boolean) ? { status: 'counted', count: 1 } : { status: 'budget-exhausted' };
}
