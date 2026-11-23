/**
 * Legibility-first responsive layout helpers for Shell Scale on iPhone 15 and iPad mini 6,
 * across portrait, landscape, and AX5 largest text.
 */

export const SCALE_FLOOR = 170;

export function scaleHeight(width: number, large: boolean): number {
  if (width >= 600) return large ? 200 : 220;
  return large ? 176 : 196;
}

export function shellTokenSize(width: number, n: number, large: boolean): number {
  const cols = Math.min(n, 6);
  const avail = Math.max(240, width - 16);
  const byWidth = Math.floor((avail - (cols - 1) * 8) / cols);
  const cap = width >= 600 ? 68 : large ? 54 : 60;
  return Math.max(46, Math.min(cap, byWidth));
}

export function pearlTokenSize(width: number, n: number, large: boolean): number {
  const cols = n <= 9 ? (width >= 540 ? 9 : 5) : (width >= 600 ? 6 : 4);
  const avail = Math.max(240, width - 16);
  const byWidth = Math.floor((avail - (cols - 1) * 6) / cols);
  const cap = width >= 600 ? 54 : large ? 48 : 50;
  return Math.max(44, Math.min(cap, byWidth));
}
