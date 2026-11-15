/**
 * How the reading boundary refuses. In development a refusal throws, so the mistake is loud; in a release it does
 * nothing here and the caller shows `REFUSED_TASK_TEXT` with nothing to press, no speech and no credit.
 */
const dev = () => (globalThis as { __DEV__?: unknown }).__DEV__ === true;
export function refuse(why: string) {
  if (dev()) throw new Error(`${why}. Reading content comes only from src/learn/reading/provenance.ts (inherited, pinned) or src/learn/reading/tasks.ts (admitted), by id.`);
}
/** What a board shows instead of refused reading content: the Challenge's existing "could not open" words. */
export const REFUSED_TASK_TEXT = "This puzzle could not open. Your saved work is kept. Try again, or choose another puzzle.";
