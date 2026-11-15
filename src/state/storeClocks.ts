/**
 * The Store's clocks, kept apart so each is reviewed on its own. `tests/reading-no-timer.test.ts` allows each clock
 * here by its own small function, and each place the Store calls one by that call and the callbacks it passes, so an
 * ordinary Store edit needs no fresh review. None of them is ever time on a task, and none touches a round.
 */
/** Now, in milliseconds: when the saved games began to open, and how long they have taken, for the slow-open notice. */
export function launchClock(): number {
  return Date.now();
}
/** Runs `note` once after `ms`: the notice that saved games are slow to open. */
export function slowOpenNotice(note: () => void, ms: number): ReturnType<typeof setTimeout> {
  return setTimeout(note, ms);
}
/** Settles false after `ms`: how long a backup waits for a write before exporting what was accepted. */
export function flushDeadline(ms: number): { waited: Promise<boolean>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const waited = new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), ms); });
  return { waited, cancel: () => clearTimeout(timer) };
}
/** A new learner's id. */
export function newLearnerId(): string {
  return `learner-${Date.now().toString(36)}`;
}
/** A short wait while a restore finishes, before a blur cleanup looks again. */
export function restorePause(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
