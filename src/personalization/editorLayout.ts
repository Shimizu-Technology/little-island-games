/** Grid height that still shows a useful part of a row of tiles. */
export const MIN_GRID = 96;
const MIN_PREVIEW = 92, PREVIEW_PADDING = 24, GAP = 8;
/**
 * Measured, not assumed: large text shrinks the room left over, and the preview gives way before the grid does.
 * When even the smallest preview and the tabs leave no room for the grid, nothing stays pinned and one scroller holds it all, so every item stays reachable.
 */
export function editorLayout({ room, tabs, side, landscape, height }: { room: number; tabs: number; side: boolean; landscape: boolean; height: number }) {
  const wanted = landscape ? 145 : side ? Math.min(290, height * .48) : Math.min(205, height * .27);
  if (!room) return { previewSize: wanted, pinned: true };
  const preferred = Math.max(MIN_PREVIEW, Math.min(wanted, (side ? room : room * (room < 460 ? .32 : .42)) - 28));
  if (side) return { previewSize: Math.min(preferred, Math.max(MIN_PREVIEW, room - PREVIEW_PADDING)), pinned: room >= MIN_PREVIEW + PREVIEW_PADDING && room >= tabs + GAP + MIN_GRID };
  const most = room - tabs - GAP * 2 - MIN_GRID - PREVIEW_PADDING;
  return most >= MIN_PREVIEW ? { previewSize: Math.min(preferred, most), pinned: true } : { previewSize: preferred, pinned: false };
}
