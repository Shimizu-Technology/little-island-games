/** Mulberry32, independent of platform and wall clock. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state = (state + 0x6d2b79f5) | 0; let t = Math.imul(state ^ state >>> 15, state | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const next = [...items], random = seededRandom(seed);
  for (let i = next.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [next[i], next[j]] = [next[j], next[i]]; }
  return next;
}
