import { describe, expect, it } from 'vitest';
import { artByBand, pictureGridArtSeed, pictureGridFamily, unpackDrawing } from '../scripts/puzzles/families/picture-grid';
import { certify } from '../src/puzzles/checks';
import { CROSS, EMPTY, FILL, cluesOf, emptyMarks, pictureBands, runs, solved, type Mark } from '../src/puzzles/picture-grid/engine';
import { gradePicture, proveLine, provePicture } from '../src/puzzles/picture-grid/solver';
import { pictureHint } from '../src/puzzles/picture-grid/help';
import { UNDO_STROKES, decodePicture, editPicture, encodePicture, freshPicture, type Paint } from '../src/puzzles/picture-grid/checkpoint';
import { checkDrawing, newDrawing, passDrawing, paintDrawing, revealDrawing } from '../src/puzzles/picture-grid/drawMode';
import { base64, jsonBytes, pack } from '../src/state/saveBits';

describe('Picture Grid certification', () => {
  it('proves and certifies every original drawing, including an independent placement proof', () => {
    const ctx = { seenExact: new Set<string>(), seenSemantic: new Set<string>(), budget: 200_000 };
    const counts: number[] = [];
    pictureGridFamily.bands.forEach((band, bandIndex) => {
      const expected = pictureBands[bandIndex], art = artByBand[expected.id];
      counts.push(art.length);
      expect(band.target).toBe(art.length);
      for (const [index, drawing] of art.entries()) {
        const { marks, picture } = unpackDrawing(drawing);
        const seed = pictureGridArtSeed + bandIndex * 0x1000000 + index;
        const descriptor = pictureGridFamily.generate(seed, band)!;
        expect(descriptor.payload).toEqual(picture);
        const proof = provePicture(picture);
        expect(proof.status, drawing[0]).toBe('unique');
        expect(proof.marks, drawing[0]).toEqual(marks);
        expect(gradePicture(picture.size, proof)).toBe(expected);
        expect(certify(pictureGridFamily, band, descriptor, ctx), drawing[0]).toMatchObject({ ok: true });
      }
    });
    expect(counts[0]).toBeGreaterThanOrEqual(24);
    expect(counts[1]).toBeGreaterThanOrEqual(24);
    expect(counts[2] + counts[3]).toBeGreaterThanOrEqual(16);
    expect(ctx.seenSemantic.size).toBe(counts.reduce((sum, count) => sum + count, 0));
  });

  it('matches brute force for each pattern of public marks on a five-cell line', () => {
    const size = 5;
    const partitions = new Map<string, Mark[][]>();
    for (let bits = 0; bits < 2 ** size; bits++) {
      const solution = Array.from({ length: size }, (_, i) => bits & (1 << i) ? FILL : CROSS);
      const key = JSON.stringify(runs(solution));
      partitions.set(key, [...partitions.get(key) ?? [], solution]);
    }
    for (const [clues, candidates] of partitions) {
      for (let draft = 0; draft < 3 ** size; draft++) {
        const marks = Array.from({ length: size }, (_, i) => Math.floor(draft / 3 ** i) % 3 as Mark);
        const valid = candidates.filter(solution => solution.every((mark, i) => marks[i] === EMPTY || mark === marks[i]));
        const expected = valid.length ? { singlePlacement: valid.length === 1, forced: valid[0].map((mark, i) => valid.every(line => line[i] === mark) ? mark : EMPTY) } : null;
        expect(proveLine(JSON.parse(clues), marks)).toEqual(expected);
      }
    }
  });

  it('takes a bounded line-logic path on a sparse 25-cell line', () => {
    const marks = Array<Mark>(25).fill(EMPTY);
    const ambiguous = proveLine([1, 1, 1, 1, 1, 1, 1], marks);
    expect(ambiguous).toEqual({ forced: marks, singlePlacement: false });
    expect(proveLine([25], marks)?.forced).toEqual(Array(25).fill(FILL));
  });
});

function twinDrawings() {
  const a = emptyMarks(5), b = emptyMarks(5);
  for (let i = 0; i < 5; i++) a[i] = b[i] = FILL;
  a[11] = a[17] = FILL;
  b[12] = b[16] = FILL;
  return [a, b] as const;
}

describe('Public hints and family play', () => {
  it('gives identical cues under twin answers, including when one player mark rules out a twin', () => {
    const [a, b] = twinDrawings();
    const first = { ...cluesOf(5, a), solution: a }, second = { ...cluesOf(5, b), solution: b };
    expect(first.solution).not.toEqual(second.solution);
    const marks = emptyMarks(5);
    expect(pictureHint(first, marks)).toMatchObject({ kind: 'deduction', axis: 'row', index: 0, cell: 0, mark: FILL });
    for (const [cell, mark] of [[0, FILL], [1, FILL], [2, FILL], [3, FILL], [4, FILL], [11, FILL]] as const) {
      marks[cell] = mark;
      expect(pictureHint(first, marks)).toEqual(pictureHint(second, marks));
    }
    expect(pictureHint(first, marks)).toMatchObject({ axis: 'row', index: 1, mark: CROSS });
    marks[0] = CROSS;
    expect(pictureHint(first, marks)).toMatchObject({ kind: 'conflict', axis: 'row', index: 0 });
  });

  it('offers ambiguous art as a family puzzle and accepts the alternative picture', () => {
    const [a, b] = twinDrawings();
    const blank = newDrawing();
    expect(passDrawing(blank)).toBe(blank);
    let drawing = blank;
    a.forEach((mark, cell) => {
      if (mark === FILL) drawing = paintDrawing(drawing, { type: 'paint', from: cell, to: cell, mark });
    });
    expect(checkDrawing(drawing.draft).kind).toBe('open');
    const cover = passDrawing(drawing);
    expect(cover.phase).toBe('cover');
    if (cover.phase !== 'cover') return;
    expect(Object.keys(cover)).toEqual(['phase', 'puzzle']);
    const family = revealDrawing(cover);
    expect(family.draft.marks.every(mark => mark === EMPTY)).toBe(true);
    expect(provePicture(family.puzzle).status).toBe('stalled');
    expect(solved(family.puzzle, b)).toBe(true);
  });
});

describe('Picture Grid checkpoints', () => {
  it('round-trips the complete 512-stroke ring after 1,000 mixed strokes at the 25×25 limit', () => {
    let draft = freshPicture(25);
    const snapshots = [draft.marks];
    for (let i = 0; i < 1000; i++) {
      const line = (i * 7) % 25, horizontal = i % 2 === 0;
      const from = horizontal ? 25 * line : line;
      const to = from + (horizontal ? 24 : 24 * 25);
      const event: Paint = { type: 'paint', from, to, mark: i % 3 as Mark };
      const next = editPicture(draft, event);
      draft = next === draft ? editPicture(draft, { ...event, mark: (event.mark + 1) % 3 as Mark }) : next;
      snapshots.push(draft.marks);
    }
    const save = encodePicture(draft);
    expect(jsonBytes(save) + 696).toBeLessThan(4096);
    const restored = decodePicture(JSON.parse(JSON.stringify(save)), 25)!;
    expect(restored).toEqual(draft);
    expect(restored.undo).toHaveLength(UNDO_STROKES);
    draft = restored;
    for (let i = 999; i >= 1000 - UNDO_STROKES; i--) {
      draft = editPicture(draft, { type: 'undo' });
      expect(draft.marks).toEqual(snapshots[i]);
    }
    expect(editPicture(draft, { type: 'undo' })).toBe(draft);
  });

  it('rejects noncanonical, oversized, illegal and stale payloads', () => {
    const painted = editPicture(freshPicture(5), { type: 'paint', from: 0, to: 4, mark: FILL });
    const valid = encodePicture(painted);
    expect(decodePicture(valid)).toEqual(painted);
    const bad = [
      { ...valid, version: 2 }, { ...valid, size: 26 }, { ...valid, extra: '' },
      { ...valid, history: 'AAAA'.repeat(513) }, { ...valid, history: 'AA==' },
      { ...valid, history: base64([4, 4, FILL]) }, { ...valid, history: base64([0, 16, 3]) },
      { ...valid, history: base64([0, 128, FILL]) }, { ...valid, history: base64([0, 16, EMPTY]) },
      { ...valid, base: valid.cells }, { ...valid, cells: valid.base },
      { ...valid, cells: pack([3, ...emptyMarks(5).slice(1)], 2) },
      { ...valid, edits: 0 }, { ...valid, resets: 1 }, { ...valid, helps: -1 }, { ...valid, showingHint: true },
    ];
    bad.forEach(save => expect(decodePicture(save)).toBeNull());
    expect(decodePicture(valid, 8)).toBeNull();
    expect(editPicture(painted, { type: 'paint', from: 1, to: 5, mark: CROSS })).toBe(painted);
  });

  it('keeps hint and reset counts after edits, undo and restore', () => {
    const picture = unpackDrawing(artByBand.easy[0]).picture;
    let draft = editPicture(freshPicture(5), { type: 'hint' }, picture);
    expect(draft.showingHint).toBe(true);
    expect(editPicture(draft, { type: 'hint' }, picture)).toBe(draft);
    draft = editPicture(draft, { type: 'paint', from: 0, to: 4, mark: CROSS }, picture);
    draft = editPicture(draft, { type: 'undo' }, picture);
    draft = editPicture(draft, { type: 'paint', from: 0, to: 0, mark: FILL }, picture);
    draft = editPicture(draft, { type: 'reset' }, picture);
    expect(decodePicture(encodePicture(draft))).toEqual({ ...freshPicture(5), helps: 1, resets: 1, edits: 4 });
  });
});
