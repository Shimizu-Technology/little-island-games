import { sha256Hex } from './sha256';
/** Renames symbols by first appearance, keeping 0 as blank. Digit swaps are the same puzzle. */
export function relabel(values: readonly number[]): number[] {
  const names = new Map<number, number>([[0, 0]]);
  return values.map(v => {
    if (!names.has(v)) names.set(v, names.size);
    return names.get(v)!;
  });
}
/** Cell index maps for the eight square symmetries. Only use the ones that keep gameplay meaning. */
export function squareSymmetries(size: number): number[][] {
  const at = (f: (r: number, c: number) => [number, number]) =>
    Array.from({ length: size * size }, (_, i) => { const [r, c] = f(Math.floor(i / size), i % size); return r * size + c; });
  const n = size - 1;
  return [at((r, c) => [r, c]), at((r, c) => [c, n - r]), at((r, c) => [n - r, n - c]), at((r, c) => [n - c, r]),
    at((r, c) => [r, n - c]), at((r, c) => [n - r, c]), at((r, c) => [c, r]), at((r, c) => [n - c, n - r])];
}
export const smallest = (keys: readonly string[]) => keys.reduce((a, b) => (b < a ? b : a));
export const semanticHash = (key: string) => sha256Hex(`semantic|${key}`);
