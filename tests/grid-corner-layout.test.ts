import { expect, it } from 'vitest';
import { cornerNoteLayout, cornersNeedEnlarging, noteMetrics, type CornerClue, type Rect } from '../src/puzzles/grid/cornerNotes';
import { gridGeometry, type GridSpec } from '../src/puzzles/grid/model';

const overlaps = (a: Rect, b: Rect) => a.left < b.left + b.width - 1e-6 && b.left < a.left + a.width - 1e-6 && a.top < b.top + b.height - 1e-6 && b.top < a.top + a.height - 1e-6;
const caption = (cell: number, scale: number, text: string): CornerClue => {
  const fontSize = Math.max(11, Math.min(16, cell * .27)) * Math.min(scale, 1.2);
  return { text, left: 5, top: 4, width: text.length * fontSize * .7 + 1, fontSize, lineHeight: fontSize * 1.15 };
};

it.each([1, 3.12].flatMap(scale => [26, 32, 36, 40, 42, 50.667, 56, 68].flatMap(cell => [4, 6, 9].map(n => ({ scale, cell, n })))))('reserves every caption and keeps all notes legible at $cell pt / $n symbols / scale $scale', ({ scale, cell, n }) => {
  const symbols = Array.from({ length: n }, (_, i) => String(i + 1));
  const spec: GridSpec = { rows: n, columns: n, symbols, givens: Array(n * n).fill(0), kind: 'digits' };
  for (const text of ['=6', '10+', '17−', '120×', '12÷']) {
    const clues = new Map([[0, caption(cell, scale, text)]]), notes = [(1 << n) - 1];
    const enlarge = cornersNeedEnlarging(cell, symbols, notes, clues);
    const actual = gridGeometry(cell * n, 1400, spec, enlarge).cell;
    const layout = cornerNoteLayout(actual, symbols, caption(actual, scale, text));
    expect(layout.fits, `${text} at ${actual}`).toBe(true);
    if (!layout.fits) throw new Error();
    expect(layout.fontSize).toBeGreaterThanOrEqual(10);
    expect(layout.fontSize).toBeGreaterThanOrEqual(noteMetrics(actual).fontSize);
    expect(layout.boxes).toHaveLength(n);
    for (let i = 0; i < layout.boxes.length; i++) {
      const box = layout.boxes[i];
      expect(overlaps(box, layout.caption)).toBe(false);
      expect(box.left).toBeGreaterThanOrEqual(0); expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.left + box.width).toBeLessThanOrEqual(actual + 1e-6);
      expect(box.top + box.height).toBeLessThanOrEqual(actual + 1e-6);
      expect(box.width).toBeGreaterThanOrEqual(layout.fontSize * .7);
      expect(box.height).toBeGreaterThanOrEqual(layout.fontSize);
      for (const other of layout.boxes.slice(i + 1)) expect(overlaps(box, other)).toBe(false);
    }
  }
});

it.each([26, 32, 36, 40, 42, 56, 68])('plain Sudoku has exactly its previous geometry at %s pt', cell => {
  expect(noteMetrics(cell)).toEqual({ fontSize: Math.max(8, cell * .19), lineHeight: cell * .25 });
  expect(cornersNeedEnlarging(cell, ['1','2','3','4','5','6','7','8','9'], [511])).toBe(false);
  expect(cornersNeedEnlarging(cell, ['1','2','3','4','5','6','7','8','9'], [511], new Map())).toBe(false);
});

it('does not enlarge a corner-clue board when no pencil notes need room', () => {
  expect(cornersNeedEnlarging(26, ['1','2','3','4','5','6'], [0], new Map([[0, caption(26, 3.12, '10+')]]))).toBe(false);
});
