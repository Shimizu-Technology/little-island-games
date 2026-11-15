import { expect, it } from 'vitest';
import { cornerNoteLayout, cornersNeedEnlarging, noteMetrics, type CornerClue, type Rect } from '../src/puzzles/grid/cornerNotes';
import * as noteGeometry from '../src/puzzles/grid/cornerNotes';
import { gridGeometry, type GridSpec } from '../src/puzzles/grid/model';

const overlaps = (a: Rect, b: Rect) => a.left < b.left + b.width - 1e-6 && b.left < a.left + a.width - 1e-6 && a.top < b.top + b.height - 1e-6 && b.top < a.top + a.height - 1e-6;
const caption = (cell: number, scale: number, text: string, kind: 'killer'|'cage-math' = 'killer'): CornerClue => {
  const fontSize = Math.max(11, Math.min(16, cell * .27)) * Math.min(scale, 1.2);
  const inset = Math.max(3, cell * .08);
  return { text, left: 5, top: 4, width: text.length * fontSize * .7 + 1, fontSize, lineHeight: fontSize * 1.15, notesInset: kind === 'killer' ? inset + 1 : 2, notesBottomInset: kind === 'killer' ? inset - .2 : 1 };
};

it.each([1, 3.12].flatMap(scale => [26, 32, 36, 40, 42, 50.667, 56, 68].flatMap(cell => [4, 6, 9].flatMap(n => (['killer','cage-math'] as const).map(kind => ({ scale, cell, n, kind }))))))('reserves every caption and keeps all notes legible for $kind at $cell pt / $n symbols / scale $scale', ({ scale, cell, n, kind }) => {
  const symbols = Array.from({ length: n }, (_, i) => String(i + 1));
  const spec: GridSpec = { rows: n, columns: n, symbols, givens: Array(n * n).fill(0), kind: 'digits' };
  for (const text of ['=6', '10+', '17−', '120×', '12÷']) {
    const clues = new Map([[0, caption(cell, scale, text, kind)]]), notes = [(1 << n) - 1];
    const enlarge = cornersNeedEnlarging(cell, symbols, notes, clues);
    const actual = (noteGeometry.cornerGridGeometry?.(cell * n, 1400, spec, false, notes, clues).geometry ?? gridGeometry(cell * n, 1400, spec, enlarge)).cell;
    const layout = cornerNoteLayout(actual, symbols, caption(actual, scale, text, kind));
    expect(layout.fits, `${text} at ${actual}`).toBe(true);
    if (!layout.fits) throw new Error();
    expect(layout.fontSize).toBeGreaterThanOrEqual(10);
    expect(layout.fontSize).toBeGreaterThanOrEqual(noteMetrics(actual).fontSize);
    expect(layout.boxes).toHaveLength(n);
    for (let i = 0; i < layout.boxes.length; i++) {
      const box = layout.boxes[i];
      expect(overlaps(box, layout.caption)).toBe(false);
      const inset = Math.max(3, actual * .08);
      expect(box.left).toBeGreaterThanOrEqual((kind === 'killer' ? inset + 1 : 2) - 1e-6); expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.left + box.width).toBeLessThanOrEqual(actual - (kind === 'killer' ? inset + 1 : 2) + 1e-6);
      expect(box.top + box.height).toBeLessThanOrEqual(actual - (kind === 'killer' ? inset - .2 : 1) + 1e-6);
      expect(box.width).toBeGreaterThanOrEqual(layout.fontSize * .65);
      expect(box.height).toBeGreaterThanOrEqual(layout.fontSize);
      for (const other of layout.boxes.slice(i + 1)) expect(overlaps(box, other)).toBe(false);
    }
  }
});

it.each([26, 32, 36, 40, 42, 56, 68])('plain Sudoku has exactly its previous geometry at %s pt', cell => {
  expect(noteMetrics(cell)).toEqual({ fontSize: Math.max(8, cell * .19), lineHeight: cell * .25 });
  expect(cornersNeedEnlarging(cell, ['1','2','3','4','5','6','7','8','9'], [511])).toBe(false);
  expect(cornersNeedEnlarging(cell, ['1','2','3','4','5','6','7','8','9'], [511], new Map())).toBe(false);
  const spec: GridSpec = { rows:9,columns:9,kind:'digits',symbols:['1','2','3','4','5','6','7','8','9'],givens:Array(81).fill(0) };
  if (noteGeometry.cornerGridGeometry) for (const zoom of [false,true]) expect(noteGeometry.cornerGridGeometry(cell*9,1400,spec,zoom,[511]).geometry).toEqual(gridGeometry(cell*9,1400,spec,zoom));
});

it('does not enlarge a corner-clue board when no pencil notes need room', () => {
  expect(cornersNeedEnlarging(26, ['1','2','3','4','5','6'], [0], new Map([[0, caption(26, 3.12, '10+')]]))).toBe(false);
});

it('sparse corner notes use only their active symbols and do not enlarge unnecessarily', () => {
 const symbols=['1','2','3','4','5','6','7','8','9'], clue=caption(32,3.12,'10+');
 const layout=cornerNoteLayout(32,symbols,clue,1<<7);
 expect(layout.fits).toBe(true);
 if(!layout.fits)throw new Error();
 expect(layout.boxes.map(b=>b.symbolIndex)).toEqual([7]);
 expect(cornersNeedEnlarging(32,symbols,[1<<7],new Map([[0,clue]]))).toBe(false);
 expect(cornersNeedEnlarging(32,symbols,[511],new Map([[0,clue]]))).toBe(true);
});
