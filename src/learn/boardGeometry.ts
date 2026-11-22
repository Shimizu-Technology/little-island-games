import { BUTTON_ROW } from '../puzzles/grid/budget';
import { canoeHeight, SEAT_FLOOR_PHONE } from './games/canoe-seats/layout';

/** Real inner card dimensions, after the safe areas, pinned header and card inset. */
export type BoardSpace = { width: number; height: number; large: boolean; reveal?: boolean; layoutKey?: string; anchorReady?: boolean };
export type BoardGeometry = { height: number; chrome: number; overflow: number; fits: boolean };

/**
 * Reserve the measured controls first. A board gives up drawing space before a primary
 * action leaves the viewport. Its floor wins over fitting: never scale a touch target
 * below its minimum or conceal controls when the screen cannot contain both.
 * `null` is the unchanged layout for Challenge and other hosts that have not opted in.
 */
export function fitSchoolBoard(space: BoardSpace | null, natural: number, minimum: number, chrome: number): BoardGeometry {
  const height = space === null ? natural : Math.max(minimum, Math.min(natural, Math.floor(space.height - chrome)));
  const overflow = space === null ? 0 : Math.max(0, height + chrome - space.height);
  return { height, chrome, overflow, fits: overflow === 0 };
}

/** Drawing floors. Interactive grids supply their cell-derived floor instead. */
export const SCHOOL_BOARD_MIN = {
  'crab-commands': 150, 'beep-bot': 160, 'hafa-adai': BUTTON_ROW,
  'reef-race': 260, 'weather-watch': 150, 'shell-math': 44,
  'tide-pool': 90, 'float-sink': 100, 'tide-logic': 56,
  'logic-lagoon': BUTTON_ROW, 'slip-tide': BUTTON_ROW,
  'treasure-algebra': 250, 'program-editor': 140,
  // O2 (lead-approved 16 Nov): legibility first. The canoe never draws a seat picture below 56 pt on a phone;
  // the board passes its own per-rung, per-device floor (64 pt on iPad) as the hook's minimum.
  'canoe-seats': canoeHeight(SEAT_FLOOR_PHONE, 1),
  // S1a: Star Station's scene labels are sized to the text floor whatever the drawing's height; 120 keeps the
  // Moon spots, scales and readings clear of each other at AX (tests/s1a-inquiry-board.test.tsx).
  'space-station': 120,
  // N1b: the hop line keeps its numbers, flag and frog readable down to this height; Quick Practice's optional number line likewise.
  'number-hop': 92, 'quick-practice': 64,
  // C2c: the sand canvas keeps its length labels at 12 pt or more down to this height (tests/c2c-turtle-view.test.tsx).
  'turtle-draw': 200,
} as const;
export type SchoolBoard = keyof typeof SCHOOL_BOARD_MIN;

/** Content y is in the ScrollView, whose measured height already excludes pinned chrome. */
export function measuredBoardSpace(viewport: number, top: number, inset: number, bottom: number) {
  return Math.max(0, viewport - top - inset - bottom);
}

/** Lead-approved 15 Nov: short landscape uses the same non-animated reveal as AX. */
export const revealBoardOnEntry = (large: boolean, windowHeight: number) => large || windowHeight < 500;

/** Entry/rotation AX reveal is scoped to measured boards and Shell's existing path. */
export const MEASURED_SCHOOL_BOARDS = new Set<string>(Object.keys(SCHOOL_BOARD_MIN).filter(id => id !== 'program-editor'));
export const schoolEntryReveal = (id: string, large: boolean, height: number) => height < 500 || large && MEASURED_SCHOOL_BOARDS.has(id);

/** The board card: 16-pt page gutters, a 2-pt border, and 12-pt padding on a phone or 22 pt from 600 pt (LearnFrame). */
export const boardCardPadding = (width: number) => width < 600 ? 12 : 22;
/** From 768 × 600 the islander stands beside the card. Companion.tsx draws a 168-pt islander, 168 × 80 / 132 wide, 8 pt away. */
export const companionBeside = (width: number, height: number) => width >= 768 && height >= 600;
export const COMPANION_COLUMN = 168 * 80 / 132 + 8;
/** F-frame-3: the card's real content width, which a board is told before (or instead of) measuring it. */
export function boardCardInner(width: number, left: number, right: number, beside: boolean) {
  return Math.min(width - left - right, 1280) - 2 * (16 + 2 + boardCardPadding(width)) - (beside ? COMPANION_COLUMN : 0);
}

/**
 * F-frame-3 fix 1: a ScrollView layout event reports the native window it was laid out for through its own width, which is
 * the window less the safe-area sides. Window dimensions and layout events reach JS in either order, so a measured offset
 * belongs to the current window only when its viewport's width says so; a board never reveals against the previous
 * window's offsets.
 */
export const layoutMatchesWindow = (layoutWidth: number, width: number, left: number, right: number) =>
  Math.abs(layoutWidth - (width - left - right)) <= 2;

/** A measured box, in the coordinates of the row that holds it. */
export type Box = { x: number; y: number; width: number; height: number };
/**
 * F-frame-3 fix 1: whether a phone's cheer line, drawn over the bottom-right corner of its row, leaves every in-flow box
 * of that row clear (by `gap` points all round). The line holds no layout space, so when a long mode label or learner
 * name leaves no clear corner it is not drawn rather than painted over the text. Unmeasured is not clear.
 */
export function cheerPillClear(row: Pick<Box, 'width' | 'height'> | null, boxes: (Box | null)[], pill: Pick<Box, 'width' | 'height'> | null, gap = 6) {
  if (!row || !pill || row.width <= 0 || pill.width <= 0 || pill.width > row.width) return false;
  const left = row.width - pill.width - gap, top = row.height - pill.height - gap;
  return boxes.every(b => b !== null && (b.x + b.width <= left || b.y + b.height <= top));
}
