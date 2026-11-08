import { describe, expect, it } from 'vitest';
import { RNG_REVISION, createRng } from '../src/puzzles/rng';

// A separate BigInt implementation, so the frozen vectors cannot simply echo the code under test.
function sfc32BigInt(seed: number, count: number): number[] {
  const m = 0xffffffffn;
  let a = BigInt(seed), b = 0x9e3779b9n, c = 0x243f6a88n, d = 1n;
  const next = () => {
    const t = (a + b + d) & m;
    d = (d + 1n) & m;
    a = b ^ (b >> 9n);
    b = (c + (c << 3n)) & m;
    c = ((c << 21n) | (c >> 11n)) & m;
    c = (c + t) & m;
    return Number(t);
  };
  for (let i = 0; i < 15; i++) next();
  return Array.from({ length: count }, next);
}
const FROZEN: [number, number[]][] = [
  [0, sfc32BigInt(0, 5)],
  [1, sfc32BigInt(1, 5)],
  [0xffffffff, sfc32BigInt(0xffffffff, 5)],
  [2026, sfc32BigInt(2026, 5)],
];
describe('RNG revision 1', () => {
  it('matches an independent implementation for every checked seed', () => {
    for (const seed of [0, 1, 7, 2026, 0x7fffffff, 0x80000000, 0xffffffff]) {
      const rng = createRng(seed);
      expect(Array.from({ length: 64 }, () => rng.uint32())).toEqual(sfc32BigInt(seed, 64));
    }
  });
  it('keeps its published vectors', () => {
    expect(RNG_REVISION).toBe(1);
    for (const [seed, values] of FROZEN) {
      const rng = createRng(seed);
      expect(values.map(() => rng.uint32())).toEqual(values);
    }
    expect(createRng(1).uint32()).toBe(sfc32BigInt(1, 1)[0]);
  });
  it('draws without modulo bias and consumes one draw per retry', () => {
    const rng = createRng(99), seen = new Set<number>();
    for (let i = 0; i < 2000; i++) { const n = rng.below(7); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThan(7); seen.add(n); }
    expect(seen.size).toBe(7);
    const limit = 0x80000001, raw = sfc32BigInt(5, 8), reject = 0x100000000 - (0x100000000 % limit);
    const expected = raw.find(n => n < reject)! % limit;
    expect(createRng(5).below(limit)).toBe(expected);
  });
  it('shuffles deterministically without touching its input', () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]) as readonly number[];
    const out = createRng(42).shuffle(input);
    expect(out).toEqual(createRng(42).shuffle(input));
    expect([...out].sort((a, b) => a - b)).toEqual([...input]);
  });
  it('rejects anything that is not a uint32 seed or a usable limit', () => {
    for (const seed of [-1, 1.5, 2 ** 32, Number.NaN]) expect(() => createRng(seed)).toThrow();
    expect(() => createRng(1).below(0)).toThrow();
  });
});
