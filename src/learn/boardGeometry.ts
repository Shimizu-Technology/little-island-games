import { BUTTON_ROW } from '../puzzles/grid/budget';

/** Real inner card dimensions, after the safe areas, pinned header and card inset. */
export type BoardSpace = { width: number; height: number; large: boolean };
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
  'crab-commands': 150, 'beep-bot': 100, 'hafa-adai': BUTTON_ROW,
  'reef-race': 260, 'weather-watch': 100, 'shell-math': 44,
  'tide-pool': 90, 'float-sink': 100, 'tide-logic': 24,
  'logic-lagoon': BUTTON_ROW, 'slip-tide': BUTTON_ROW,
  'treasure-algebra': 140, 'program-editor': 140,
} as const;
export type SchoolBoard = keyof typeof SCHOOL_BOARD_MIN;

/** Content y is in the ScrollView, whose measured height already excludes pinned chrome. */
export function measuredBoardSpace(viewport: number, top: number, inset: number, bottom: number) {
  return Math.max(0, viewport - top - inset - bottom);
}
