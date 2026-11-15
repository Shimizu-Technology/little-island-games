/** Public corner captions are presentation metadata, never saved puzzle state. */
export type CornerClue = { text: string; left: number; top: number; width: number; fontSize: number; lineHeight: number };
export type CornerClues = (cell: number, fontScale: number) => ReadonlyMap<number, CornerClue>;
export type Rect = { left: number; top: number; width: number; height: number };
export const noteMetrics = (cell: number) => ({ fontSize: Math.max(8, cell * .19), lineHeight: cell * .25 });
/** A caption owns the top strip. Notes stay at least their original size and never occupy that strip. */
export function cornerNoteLayout(cell: number, symbols: readonly string[], clue: CornerClue) {
  const original = noteMetrics(cell), font = { ...original, fontSize: Math.max(10, original.fontSize) };
  const lineHeight = Math.max(font.fontSize, font.lineHeight);
  const caption: Rect = { left: 0, top: 0, width: cell, height: clue.lineHeight };
  // Prefer the familiar three columns. Narrow areas use fewer per row; additional columns
  // are used only when they fit at the unchanged font and avoid an unnecessary zoom.
  const choices = [...new Set([3, 2, 1, ...Array.from({ length: symbols.length }, (_, i) => i + 1)])];
  for (const columns of choices) {
    const rows = Math.ceil(symbols.length / columns), height = rows * lineHeight;
    if (clue.width > cell || symbols.some(s => s.length * .7 * font.fontSize > cell / columns) || height + caption.height > cell + 1e-6) continue;
    const notes: Rect = { left: 0, top: caption.height + (cell - caption.height - height) / 2, width: cell, height };
    const boxes = symbols.map((_, i) => ({ left: i % columns * cell / columns, top: notes.top + Math.floor(i / columns) * lineHeight, width: cell / columns, height: lineHeight }));
    return { fits: true as const, caption, notes, boxes, columns, ...font, lineHeight };
  }
  return { fits: false as const, caption, ...font, lineHeight };
}
export const cornersNeedEnlarging = (cell: number, symbols: readonly string[], notes: readonly number[], clues?: ReadonlyMap<number, CornerClue>) =>
  !!clues && [...clues].some(([i, clue]) => !!notes[i] && !cornerNoteLayout(cell, symbols, clue).fits);
