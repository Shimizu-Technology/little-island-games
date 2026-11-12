/**
 * Controlled life at rest (rule 42, HM-11). The schedule matches `rigIdle`: four blinks in an
 * 18 s cycle, never more than 6 s apart, and a 0.4% breath. The resting SVG never re-renders:
 * a closed-eye copy swaps in by opacity and the breath is a wrapper scale, both on the UI thread.
 * The clock is not a 60 fps loop: it ticks only at blink edges and in 250 ms breath steps
 * (one step is under 0.1% of a friend's height), so a resting room costs almost nothing.
 */
export const LIFE_PERIOD = 18000;
export const BREATH_PERIOD = 3600;
export const BREATH_SCALE = 0.004;
const blinks = [[3100, 120], [7900, 150], [13700, 110], [17800, 140]] as const;
/** Each friend starts at a different place in the cycle, so they never blink together. */
export const lifeSeed = (slot: number) => [0, 5200, 10400][slot] ?? 0;
export function lifeBlink(clock: number, seed: number): boolean {
  "worklet";
  const phase = (((clock + seed) % LIFE_PERIOD) + LIFE_PERIOD) % LIFE_PERIOD;
  for (const [at, duration] of blinks) if (phase >= at && phase < at + duration) return true;
  return false;
}
/** 0…1, eased so the breath has no visible corner. */
export function lifeBreath(clock: number, seed: number): number {
  "worklet";
  return (1 - Math.cos(((clock + seed) * Math.PI * 2) / BREATH_PERIOD)) / 2;
}
/** The longest wait for a blink from any moment of the cycle, including the blink itself. */
export function longestBlinkWait(): number {
  let longest = 0;
  for (let i = 0; i < blinks.length; i++) {
    const [at] = blinks[i], [next] = blinks[(i + 1) % blinks.length];
    longest = Math.max(longest, ((next - at + LIFE_PERIOD) % LIFE_PERIOD) || LIFE_PERIOD);
  }
  return longest;
}
export const BREATH_STEP_MS = 250;
/** Milliseconds until the life clock next needs to move: the next blink edge of any friend, or the next breath step. */
export function nextLifeTick(clock: number, seeds: readonly number[]): number {
  let wait = BREATH_STEP_MS - (((clock % BREATH_STEP_MS) + BREATH_STEP_MS) % BREATH_STEP_MS) || BREATH_STEP_MS;
  for (const seed of seeds) {
    const phase = (((clock + seed) % LIFE_PERIOD) + LIFE_PERIOD) % LIFE_PERIOD;
    for (const [at, duration] of blinks)
      for (const edge of [at, at + duration]) {
        const until = (((edge - phase) % LIFE_PERIOD) + LIFE_PERIOD) % LIFE_PERIOD;
        if (until > 0 && until < wait) wait = until;
      }
  }
  return wait;
}
