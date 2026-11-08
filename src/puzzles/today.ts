import { asciiId } from '../state/saveBits';
import type { DailyRange, FamilyManifest } from './bank';

/**
 * Today's Puzzle is an ordinary shortcut into normal banks. It keeps no date history and no
 * record of who played: every puzzle stays open on every day, and nothing is lost by skipping one.
 */
export function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  const add = (byte: number) => { hash = Math.imul(hash ^ byte, 0x01000193) >>> 0; };
  for (const c of text) {
    const p = c.codePointAt(0)!;
    if (p < 0x80) add(p);
    else if (p < 0x800) { add(0xc0 | (p >> 6)); add(0x80 | (p & 63)); }
    else if (p < 0x10000) { add(0xe0 | (p >> 12)); add(0x80 | ((p >> 6) & 63)); add(0x80 | (p & 63)); }
    else { add(0xf0 | (p >> 18)); add(0x80 | ((p >> 12) & 63)); add(0x80 | ((p >> 6) & 63)); add(0x80 | (p & 63)); }
  }
  return hash >>> 0;
}
export type CivilCalendar = { getFullYear(): number; getMonth(): number; getDate(): number };
/** The device's own calendar day, from numeric fields so locale text cannot change it. */
export const civilDate = (now: CivilCalendar) =>
  `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
export function validCivilDate(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const year = +m[1], month = +m[2], day = +m[3];
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
export const todayKey = (game: string, tier: string, date: string) => `LI-TODAY-V1|${game}|${tier}|${date}`;
export const poolLength = (ranges: readonly DailyRange[]) => ranges.reduce((n, [, count]) => n + count, 0);
export function ordinalAt(ranges: readonly DailyRange[], index: number): number {
  let left = index;
  for (const [first, count] of ranges) {
    if (left < count) return first + left;
    left -= count;
  }
  throw new Error('Daily pool index is out of range.');
}
export type TodayPick = { game: string; tier: string; date: string; pool: number; ordinal: number };
export function pickToday(game: string, tier: string, date: string, pool: number, ranges: readonly DailyRange[]): TodayPick | null {
  const length = poolLength(ranges);
  if (!asciiId(game) || !asciiId(tier) || !validCivilDate(date) || !length) return null;
  return { game, tier, date, pool, ordinal: ordinalAt(ranges, fnv1a32(todayKey(game, tier, date)) % length) };
}
/** The first pool is the stable one. Later bank additions go in a new pool and never reshuffle this one. */
export function pickFromManifest(manifest: FamilyManifest, tier: string, date: string, version = 1): TodayPick | null {
  const pool = manifest.daily.find(p => p.version === version);
  const band = pool?.bands.find(b => b[0] === tier);
  return band ? pickToday(manifest.family, tier, date, version, band[1]) : null;
}
/** A puzzle already being played stays the same across midnight, a zone change or a clock change. */
export const keepActive = (active: TodayPick | null, fresh: TodayPick | null) => active ?? fresh;
