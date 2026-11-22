/**
 * Canoe Seats sizes. Pure, so the floors are tested without a screen.
 * Legibility first: a seat picture never drops below its floor to fit; the page scrolls instead.
 */
export const SEAT_FLOOR_PHONE = 56, SEAT_FLOOR_TABLET = 64, SEAT_MAX_PHONE = 76, SEAT_MAX_TABLET = 112;
export const TABLET_WIDTH = 600;
/** Hull padding around the seats: the bow and stern points, and the rim. */
export const HULL_PAD = 0.28;
export const seatFloor = (windowWidth: number) => (windowWidth >= TABLET_WIDTH ? SEAT_FLOOR_TABLET : SEAT_FLOOR_PHONE);
const seatMax = (windowWidth: number) => (windowWidth >= TABLET_WIDTH ? SEAT_MAX_TABLET : SEAT_MAX_PHONE);
/** The widest seat the drawing width allows, between the floor and the comfortable maximum. */
export function seatForWidth(width: number, n: number, windowWidth: number): number {
  const byWidth = Math.floor(width / (n + HULL_PAD * 2));
  return Math.max(seatFloor(windowWidth), Math.min(seatMax(windowWidth), byWidth));
}
/** Height of the canoe drawing: a friend, with room above for a hat and below for fruit, then the hull. */
export function canoeHeight(seat: number, attrs: number): number {
  return Math.round(seat * (attrs >= 2 ? 1.34 : 1.06) + (attrs >= 3 ? seat * 0.34 : 0) + seat * 0.42);
}
export const canoeWidth = (seat: number, n: number) => Math.round(seat * (n + HULL_PAD * 2));
/** The seat that fits a measured drawing height, never below the floor. */
export function seatForHeight(height: number, attrs: number, windowWidth: number): number {
  let seat = seatMax(windowWidth);
  while (seat > seatFloor(windowWidth) && canoeHeight(seat, attrs) > height) seat--;
  return seat;
}
/** Phones keep two columns of clue cards; wider boards take three. Rung H pages its cards on a phone. */
export const clueColumns = (width: number) => (width >= 560 ? 3 : 2);
export const CLUE_PAGE_PHONE = 8;
/**
 * A phone pages its cards so Check stays in view: a full canoe (friends, hats and fruit) needs more room
 * for the shore, and at the largest text sizes the frame's own header grows, so hats and fruit page by four.
 */
export const cluePageSize = (width: number, attrs: number, clues: number, large = false) =>
  width >= 560 ? clues : large ? (attrs >= 2 ? 4 : 6) : attrs >= 3 ? 6 : CLUE_PAGE_PHONE;
export function cluePages(clues: number, width: number, attrs = 1, large = false): number {
  return Math.ceil(clues / cluePageSize(width, attrs, clues, large));
}
export const clueCardHeight = (width: number) => (width >= 560 ? 84 : 70);
/** Shore tokens: one row per kind of item, large enough to pick up. */
export const tokenSize = (windowWidth: number, attrs = 1) => (windowWidth >= TABLET_WIDTH ? 64 : attrs >= 2 ? 48 : 52);
