/** Shared, pure number tools. Shells are pretend market manipulatives, never rewards. */
export const COINS = [1, 5, 10, 25] as const;
export type Pieces = { tens: number; ones: number; coins: [number, number, number, number] };
export const emptyPieces = (): Pieces => ({ tens: 0, ones: 0, coins: [0, 0, 0, 0] });
export const integer = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
export const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const keys = (v: Record<string, unknown>, expected: string[]) =>
  Object.keys(v).length === expected.length && Object.keys(v).every((k) => expected.includes(k));
export const coinTotal = (coins: readonly number[]) => coins.reduce((sum, count, i) => sum + count * COINS[i], 0);
export const pieceTotal = (p: Pieces, money = false) => (money ? coinTotal(p.coins) : 10 * p.tens + p.ones);
export const splitNumber = (n: number) => ({ tens: Math.floor(n / 10), ones: n % 10 });
export function validPieces(v: unknown, max: number, money: boolean): v is Pieces {
  if (
    !object(v) ||
    !keys(v, ["tens", "ones", "coins"]) ||
    !integer(v.tens, 0, Math.floor(max / 10)) ||
    !integer(v.ones, 0, max) ||
    !Array.isArray(v.coins) ||
    v.coins.length !== 4 ||
    !v.coins.every((n, i) => integer(n, 0, Math.floor(max / COINS[i])))
  )
    return false;
  const p = v as Pieces;
  return pieceTotal(p, money) <= max && (money ? p.tens === 0 && p.ones === 0 : p.coins.every((n) => n === 0));
}
export function adjustPieces(
  p: Pieces,
  part: "tens" | "ones" | 0 | 1 | 2 | 3,
  delta: 1 | -1,
  max: number,
  money: boolean
): Pieces {
  const next: Pieces = { ...p, coins: [...p.coins] };
  if (typeof part === "number") next.coins[part] += delta;
  else next[part] += delta;
  return validPieces(next, max, money) ? next : p;
}
/** A contiguous serpentine path, never a circular or unnumbered track. */
export function pathRows(first: number, last: number, columns: number): number[][] {
  const rows: number[][] = [];
  for (let n = first; n <= last; n += columns) {
    const row = Array.from({ length: Math.min(columns, last - n + 1) }, (_, i) => n + i);
    rows.push(rows.length % 2 ? row.reverse() : row);
  }
  return rows;
}
