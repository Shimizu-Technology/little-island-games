import { FILL, type LineAxis, type Mark, type PictureClues } from './engine';
import { inspectLines } from './solver';

export type PictureHint = {
  kind: 'deduction' | 'conflict'; axis: LineAxis; index: number; cell?: number; mark?: Mark; message: string;
};

/** This interface only needs the two sets of clues and the player's marks. */
export function pictureHint(clues: PictureClues, marks: readonly Mark[]): PictureHint | null {
  const { deductions, conflict } = inspectLines(clues, marks);
  if (conflict) return { kind: 'conflict', ...conflict, message: `Check ${conflict.axis} ${conflict.index + 1}. Its marks don’t fit.` };
  const step = deductions[0];
  if (!step) return null;
  const { axis, index, singlePlacement } = step;
  const line = axis === 'row' ? clues.rows[index] : clues.columns[index];
  const [cell, mark] = step.marks[0];
  const place = `${axis} ${index + 1}`;
  const row = Math.floor(cell / clues.size) + 1;
  const column = cell % clues.size + 1;
  const action = `Row ${row}, column ${column} must be ${mark === FILL ? 'filled' : 'crossed out'}.`;
  let reason = `Every fit for ${place} ${mark === FILL ? 'fills this square' : 'leaves this square blank'}.`;
  if (!line.length) reason = `${place[0].toUpperCase()}${place.slice(1)} is empty.`;
  else if (singlePlacement) reason = `Look at ${place}. ${line.length === 1 ? `The ${line[0]} fits` : 'The groups fit'} in one place.`;
  return { kind: 'deduction', axis, index, cell, mark, message: `${action} ${reason}` };
}
