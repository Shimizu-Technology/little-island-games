import { gridGeometry, type GridSpec } from './model';

/** Public corner captions are presentation metadata, never saved puzzle state. */
export type CornerClue = { text: string; left: number; top: number; width: number; fontSize: number; lineHeight: number; notesInset?: number; notesBottomInset?: number };
export type CornerClues = (cell: number, fontScale: number) => ReadonlyMap<number, CornerClue>;
export type Rect = { left: number; top: number; width: number; height: number };
export const noteMetrics = (cell: number) => ({ fontSize: Math.max(8, cell * .19), lineHeight: cell * .25 });
/** A caption owns its corner. Fixed-width notes use the free areas beside and below it. */
export function cornerNoteLayout(cell: number, symbols: readonly string[], clue: CornerClue, mask?: number) {
  const original = noteMetrics(cell), font = { ...original, fontSize: Math.max(10, original.fontSize) };
  const lineHeight = Math.max(font.fontSize, font.lineHeight);
  const caption: Rect = { left: 0, top: 0, width: clue.width, height: clue.fontSize };
  const inset = clue.notesInset ?? 0, bottom = cell - (clue.notesBottomInset ?? 0);
  const indices = symbols.flatMap((_, i) => mask === undefined || mask & 1 << i ? [i] : []);
  type Box = Rect & { symbolIndex: number };
  const pack = (values: number[], area: Rect): Box[] | null => {
    if (!values.length) return [];
    const choices = [...new Set([Math.min(3, values.length), 2, 1, ...values.map((_, i) => i + 1)])].filter(n => n <= values.length);
    for (const columns of choices) {
      const rows = Math.ceil(values.length / columns), height = rows * lineHeight, width = area.width / columns;
      // ui-monospace/monospace digits: .65 em includes space around each fixed-width glyph.
      if (height > area.height + 1e-6 || values.some(i => symbols[i].length * .65 * font.fontSize > width)) continue;
      const top = area.top + (area.height - height) / 2;
      return values.map((symbolIndex, i) => ({ symbolIndex, left: area.left + i % columns * width, top: top + Math.floor(i / columns) * lineHeight, width, height: lineHeight }));
    }
    return null;
  };
  if (clue.width <= cell && inset * 2 < cell) {
    const below: Rect = { left: inset, top: caption.height, width: cell - inset * 2, height: bottom - caption.height };
    const allBelow = pack(indices, below);
    if (allBelow) return { fits: true as const, caption, boxes: allBelow, ...font, lineHeight };
    const left = Math.max(inset, caption.width);
    const beside: Rect = { left, top: 0, width: cell - inset - left, height: caption.height };
    for (let n = 1; n <= indices.length; n++) {
      const top = pack(indices.slice(0, n), beside), lower = pack(indices.slice(n), below);
      if (top && lower) return { fits: true as const, caption, boxes: [...top, ...lower], ...font, lineHeight };
    }
  }
  return { fits: false as const, caption, ...font, lineHeight };
}
export const cornersNeedEnlarging = (cell: number, symbols: readonly string[], notes: readonly number[], clues?: ReadonlyMap<number, CornerClue>) =>
  !!clues && [...clues].some(([i, clue]) => !!notes[i] && !cornerNoteLayout(cell, symbols, clue, notes[i]).fits);

/** Apply the existing 44-pt enlarged-cell path only when corner notes cannot fit. */
export function cornerGridGeometry(width: number, height: number, spec: GridSpec, zoom: boolean, notes: readonly number[], fitCorners?: ReadonlyMap<number, CornerClue>) {
  const fit = gridGeometry(width, height, spec, false), noteZoom = cornersNeedEnlarging(fit.cell, spec.symbols, notes, fitCorners);
  const base = gridGeometry(width, height, spec, zoom || noteZoom), cell = noteZoom ? Math.max(44, base.cell) : base.cell;
  return { noteZoom, geometry: noteZoom ? { ...base, cell, width: cell * spec.columns, height: cell * spec.rows, needsZoom: true } : base };
}
