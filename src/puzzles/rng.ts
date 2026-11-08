/**
 * RNG revision 1: sfc32 seeded from one uint32, with 15 discarded outputs. Changing this file's
 * algorithm or draw order needs a new revision: descriptors name the revision that made them.
 */
export const RNG_REVISION = 1;
export type Rng = { uint32(): number; below(limit: number): number; shuffle<T>(items: readonly T[]): T[] };

export function createRng(seed: number): Rng {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('RNG seed must be a uint32.');
  let a = seed | 0, b = 0x9e3779b9 | 0, c = 0x243f6a88 | 0, d = 1;
  const uint32 = () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let i = 0; i < 15; i++) uint32();
  /** Unbiased, by rejection. Each retry consumes one draw, which is part of the revision. */
  const below = (limit: number) => {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 0x100000000) throw new Error('RNG limit must be 1 to 2^32.');
    const reject = 0x100000000 - (0x100000000 % limit);
    for (;;) {
      const n = uint32();
      if (n < reject) return n % limit;
    }
  };
  const shuffle = <T,>(items: readonly T[]) => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = below(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { uint32, below, shuffle };
}
