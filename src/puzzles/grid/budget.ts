import { createContext } from 'react';
import { LARGE_TEXT } from '../../components/wordFit';

/** The page chrome around a board that a screen knows and the board does not: safe areas, the frame's bar and its padding. */
export type GridChrome = { top: number; bottom: number; bar: number };
/** Absent (no provider), nothing is reserved, so a board outside the Challenge frame sizes itself as it always did. */
export const GridChromeContext = createContext<GridChrome>({ top: 0, bottom: 0, bar: 0 });

/** A status line at the capped 1.3x: the Copy's 25-pt line height scaled; a row of compact buttons is 44 pt. */
export const STATUS_LINE = 33, BUTTON_ROW = 44, SECTION_GAP = 12, PAD_GAP = 10, PAD_ROW = 56;
/** The board's height before any budget: the share of the window it has always had. */
export const baseBoardHeight = (windowHeight: number) => Math.min(windowHeight * .55, 620);

/**
 * One height budget for everything that must share a screen with a board at accessibility sizes: the safe areas and the
 * frame's bar (`chrome`), the status line and its buttons, the gaps between them, and (when the board has a number pad)
 * the pad's first row. What is left is the room for the board's whole drawing, clue gutters or rim included.
 * Returns null below the accessibility threshold, where no budget applies and drawn sizes equal the base exactly.
 */
export function boardRoom({ windowWidth, windowHeight, fontScale, chrome, pad }: { windowWidth: number; windowHeight: number; fontScale: number; chrome: GridChrome; pad: boolean }): number | null {
  if ((fontScale ?? 1) < LARGE_TEXT) return null;
  // On a narrow window the status line takes up to three lines and its buttons a row of their own; on a wide one the buttons sit beside it.
  const status = windowWidth < 600 ? 3 * STATUS_LINE + 6 + BUTTON_ROW : 2 * STATUS_LINE;
  return windowHeight - chrome.top - chrome.bottom - chrome.bar - status - SECTION_GAP - (pad ? PAD_GAP + PAD_ROW : 0);
}
/** The tallest a lettered or numbered grid's cells (the viewport inside any clue gutters) may be, in points. */
export function gridViewportMax(room: number | null, windowHeight: number, rows: number, gutter: number) {
  const base = baseBoardHeight(windowHeight);
  return room === null ? base : Math.min(base, Math.max(160, room * rows / (rows + 2 * gutter)));
}
/** The height Bridges and Loop give their board (rim included) before dividing by the board's rows: `base` unless a budget is tighter. */
export function edgeBoardHeight(room: number | null, base: number) {
  return room === null ? base : Math.min(base, Math.max(160, room));
}
/** A Bridges cell: the board and its water rim (0.4 of a cell) fit `width` and `room`, within 24 to 84 points. */
export const bridgesCell = (width: number, cols: number, rows: number, room: number) => Math.max(24, Math.min(84, Math.floor(Math.min(width / (cols + 0.4), room / (rows + 0.4)))));
/** A Loop or Pearl Loop cell: the board and its rim (0.64 of a cell) fit `width` and `room`, within 22 to 88 points. */
export const loopCell = (width: number, cols: number, rows: number, room: number) => Math.max(22, Math.min(88, Math.floor(Math.min(width / (cols + 0.64), room / (rows + 0.64)))));
/** The Challenge frame's own heights: its compact bar, and the learner chip that large text moves into the page. */
export const BAR_HEIGHT = 64, CHIP_ROW = 58;
/**
 * What the Challenge frame puts around a grid board, for the budget. A short large-text landscape window scrolls the bar away
 * and the board's own top becomes the page's top, so no bar is reserved there.
 */
export function challengeChrome({ insets, barPinned, short, chip }: { insets: { top: number; bottom: number }; barPinned: boolean; short: boolean; chip: boolean }): GridChrome {
  // Only what must stay in view counts: the page's top padding sits above a pinned bar, and nothing below the keys' first row matters.
  return { top: insets.top + (barPinned ? 6 : 0), bottom: insets.bottom, bar: short ? 0 : BAR_HEIGHT + (chip ? CHIP_ROW : 0) };
}
