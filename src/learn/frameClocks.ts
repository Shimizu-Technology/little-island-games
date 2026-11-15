/**
 * The School host's only timer, kept apart so it is reviewed on its own. `tests/reading-no-timer.test.ts` allows the
 * timer here by this small function, and each place `LearnFrame` calls it by that call and the callbacks it passes,
 * so an ordinary edit elsewhere in `LearnFrame` needs no fresh review. It speaks; it never saves or moves a round.
 */
/** Speaks a line once, a beat after the sound that goes with it. Returns the handle so a newer sound can cancel it. */
export function speakAfter(say: () => void, ms: number): ReturnType<typeof setTimeout> {
  return setTimeout(say, ms);
}
