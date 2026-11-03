/** A clearly horizontal drag. Mostly vertical drags belong to the page's own scrolling. */
export const isPageSwipe = (dx: number, dy: number) => Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.5;
/** Page a swipe lands on (left swipe = next), clamped to the book; undefined when too short. */
export const swipeTarget = (dx: number, index: number, count: number) =>
  Math.abs(dx) > 50 ? Math.min(count - 1, Math.max(0, index + (dx < 0 ? 1 : -1))) : undefined;
