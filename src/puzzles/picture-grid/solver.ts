import { CROSS, EMPTY, FILL, cellOf, emptyMarks, lineOf, pictureBands, type LineAxis, type Mark, type PictureBand, type PictureClues } from './engine';

export type LineProof = { forced: Mark[]; singlePlacement: boolean };

/** Walk every possible line through a small DAG of (next run, next cell) states.
 * A reachable edge whose destination can finish belongs to a legal placement.
 * Its cells contribute to the union of all possible fills and crosses.
 */
export function proveLine(clues: readonly number[], line: readonly Mark[]): LineProof | null {
  const size = line.length, runs = clues.length;
  const width = size + 1;
  const paths = new Uint8Array((runs + 1) * width);
  const reachable = new Uint8Array(paths.length);
  const crosses = new Uint8Array(width);
  const possibilities = new Uint8Array(size);
  for (let i = 0; i < size; i++) crosses[i + 1] = crosses[i] + Number(line[i] === CROSS);
  const runEnd = (run: number, offset: number) => {
    if (run >= runs) return -1;
    const end = offset + clues[run];
    const separator = run + 1 < runs;
    if (end > size || crosses[end] !== crosses[offset] || (separator && (end === size || line[end] === FILL))) return -1;
    return end + Number(separator);
  };
  paths[runs * width + size] = 1;
  for (let run = runs; run >= 0; run--) {
    for (let i = size - 1; i >= 0; i--) {
      const at = run * width + i;
      const next = runEnd(run, i);
      const skip = line[i] === FILL ? 0 : paths[at + 1];
      const place = next < 0 ? 0 : paths[(run + 1) * width + next];
      paths[at] = Math.min(2, skip + place);
    }
  }
  if (!paths[0]) return null;
  reachable[0] = 1;
  for (let run = 0; run <= runs; run++) {
    for (let i = 0; i < size; i++) {
      const at = run * width + i;
      if (!reachable[at]) continue;
      if (line[i] !== FILL && paths[at + 1]) {
        reachable[at + 1] = 1;
        possibilities[i] |= CROSS;
      }
      const next = runEnd(run, i);
      if (next < 0 || !paths[(run + 1) * width + next]) continue;
      reachable[(run + 1) * width + next] = 1;
      const end = i + clues[run];
      for (let j = i; j < end; j++) possibilities[j] |= FILL;
      if (next > end) possibilities[end] |= CROSS;
    }
  }
  return { forced: Array.from(possibilities, mask => mask === FILL || mask === CROSS ? mask : EMPTY), singlePlacement: paths[0] === 1 };
}

export type Deduction = { axis: LineAxis; index: number; singlePlacement: boolean; marks: readonly (readonly [cell: number, mark: Mark])[] };

/** One public pass. Each line is evaluated against the same incoming board. */
export function inspectLines(picture: PictureClues, board: readonly Mark[]) {
  const deductions: Deduction[] = [];
  const { size, rows, columns } = picture;
  for (const [axis, clues] of [['row', rows], ['column', columns]] as const) {
    for (let index = 0; index < size; index++) {
      const line = lineOf(size, axis, index, board);
      const proof = proveLine(clues[index], line);
      if (!proof) return { deductions, conflict: { axis, index } };
      const marks: Deduction['marks'] = proof.forced.flatMap((mark, offset) =>
        mark && !line[offset] ? [[cellOf(size, axis, index, offset), mark] as const] : []);
      if (marks.length) deductions.push({ axis, index, singlePlacement: proof.singlePlacement, marks });
    }
  }
  return { deductions, conflict: null };
}

export type PictureProof = {
  status: 'unique' | 'stalled' | 'contradiction';
  marks: readonly Mark[];
  rounds: number;
  trace: readonly (readonly Deduction[])[];
};

/** Every assignment is forced in all solutions. A complete consistent trace is a uniqueness proof. */
export function provePicture(picture: PictureClues): PictureProof {
  let marks = emptyMarks(picture.size);
  const trace: Deduction[][] = [];
  while (true) {
    const { deductions, conflict } = inspectLines(picture, marks);
    if (conflict) return { status: 'contradiction', marks, rounds: trace.length, trace };
    if (!deductions.length) return { status: marks.includes(EMPTY) ? 'stalled' : 'unique', marks, rounds: trace.length, trace };
    const next = [...marks];
    for (const { marks: forced } of deductions) {
      for (const [cell, mark] of forced) {
        if (next[cell] && next[cell] !== mark) return { status: 'contradiction', marks, rounds: trace.length, trace };
        next[cell] = mark;
      }
    }
    trace.push(deductions);
    marks = next;
  }
}

export function gradePicture(size: number, proof: PictureProof): PictureBand | null {
  if (proof.status !== 'unique') return null;
  return pictureBands.find(b => (b.sizes as readonly number[]).includes(size) && proof.rounds >= b.minRounds) ?? null;
}
