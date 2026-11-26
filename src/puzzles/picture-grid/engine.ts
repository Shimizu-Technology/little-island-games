export const EMPTY = 0, FILL = 1, CROSS = 2;
export const MAX_SIZE = 25;
export const PICTURE_GRID = 'picture-grid';
export type Mark = typeof EMPTY | typeof FILL | typeof CROSS;
export type LineAxis = 'row' | 'column';
export type PictureClues = { size: number; rows: readonly (readonly number[])[]; columns: readonly (readonly number[])[] };
export type PictureGrid = PictureClues & { name: string; palette: number };
export const picturePalettes = [
  ['#DB6259', '#A93F57', '#F29770'], ['#21867E', '#165765', '#43A686'], ['#D88D31', '#B05D30', '#F3B641'],
  ['#627AB6', '#44558F', '#799BDB'], ['#9761A9', '#684688', '#BB80B2'],
] as const;
export const pictureBands = [
  { id: 'easy', title: 'Easy', tier: 1, sizes: [5], minRounds: 1, slot: 110 },
  { id: 'medium', title: 'Medium', tier: 2, sizes: [8, 10], minRounds: 1, slot: 111 },
  { id: 'hard', title: 'Hard', tier: 3, sizes: [12], minRounds: 4, slot: 112 },
  { id: 'expert', title: 'Expert', tier: 4, sizes: [15], minRounds: 6, slot: 113 },
] as const;
export type PictureBand = (typeof pictureBands)[number];

export const validSize = (size: unknown): size is number => typeof size === 'number' && Number.isInteger(size) && size >= 1 && size <= MAX_SIZE;
export const emptyMarks = (size: number): Mark[] => Array<Mark>(size * size).fill(EMPTY);
export const cellOf = (size: number, axis: LineAxis, index: number, offset: number) => axis === 'row' ? index * size + offset : offset * size + index;
export const lineOf = (size: number, axis: LineAxis, index: number, marks: readonly Mark[]) =>
  Array.from({ length: size }, (_, offset) => marks[cellOf(size, axis, index, offset)]);

export function runs(line: readonly Mark[]): number[] {
  const out: number[] = [];
  let length = 0;
  for (const mark of line) {
    if (mark === FILL) length++;
    else if (length) { out.push(length); length = 0; }
  }
  if (length) out.push(length);
  return out;
}

export function cluesOf(size: number, marks: readonly Mark[]): PictureClues {
  const lines = (axis: LineAxis) => Array.from({ length: size }, (_, i) => runs(lineOf(size, axis, i, marks)));
  return { size, rows: lines('row'), columns: lines('column') };
}

export function lineSatisfied(clues: readonly number[], line: readonly Mark[]): boolean {
  const now = runs(line);
  return clues.length === now.length && clues.every((v, i) => v === now[i]);
}

/** Crosses are an aid. All the filled runs must match, and untouched blanks are allowed. */
export function solved(picture: PictureClues, marks: readonly Mark[]): boolean {
  const { size, rows, columns } = picture;
  return marks.length === size * size && rows.every((clue, i) => lineSatisfied(clue, lineOf(size, 'row', i, marks)))
    && columns.every((clue, i) => lineSatisfied(clue, lineOf(size, 'column', i, marks)));
}
