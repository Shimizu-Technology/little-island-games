import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { civilDate, fnv1a32, keepActive, ordinalAt, pickFromManifest, pickToday, poolLength, todayKey, validCivilDate } from '../src/puzzles/today';
import type { DailyRange, FamilyManifest } from '../src/puzzles/bank';

// An independent BigInt FNV-1a over real UTF-8 bytes.
function fnvBig(text: string): number {
  let hash = 0x811c9dc5n;
  for (const byte of Buffer.from(text, 'utf8')) hash = ((hash ^ BigInt(byte)) * 0x01000193n) & 0xffffffffn;
  return Number(hash);
}
const calendar = (year: number, month: number, day: number) => ({ getFullYear: () => year, getMonth: () => month - 1, getDate: () => day });
const ranges: DailyRange[] = [[100, 16], [300, 8], [900, 32]];
describe('FNV-1a', () => {
  it('matches the published test values', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });
  it('matches an independent implementation, including non-ASCII text', () => {
    for (const text of ['Håfa', 'ñåmu', '漢字', '😀 tide', todayKey('sudoku', 'shallows', '2028-02-29')]) expect(fnv1a32(text)).toBe(fnvBig(text));
  });
  it('keeps frozen date vectors', () => {
    const vectors: [string, string, string, number][] = [
      ['sudoku', 'shallows', '2026-11-09', 2190570279],
      ['sudoku', 'shallows', '2028-02-29', 527631527],
      ['sudoku', 'trench', '2028-03-01', 748079281],
      ['maze', 'paddling', '2000-02-29', 310459425],
      ['maze', 'paddling', '1999-12-31', 3794520289],
      ['word-search', 'reef', '2100-02-28', 3625647062],
    ];
    for (const [g, t, d, hash] of vectors) expect(fnv1a32(todayKey(g, t, d))).toBe(hash);
  });
});
describe('civil date', () => {
  it('uses numeric calendar fields, zero padded', () => {
    expect(civilDate(calendar(2026, 1, 5))).toBe('2026-01-05');
    expect(civilDate(calendar(2028, 2, 29))).toBe('2028-02-29');
    expect(civilDate(calendar(999, 12, 31))).toBe('0999-12-31');
  });
  it('follows the calendar of the device, so a zone change can move the day', () => {
    const instant = new Date(Date.UTC(2026, 10, 9, 15, 30));
    const guam = new Date(instant.getTime() + 10 * 3600_000), honolulu = new Date(instant.getTime() - 10 * 3600_000);
    const utcFields = (d: Date) => ({ getFullYear: () => d.getUTCFullYear(), getMonth: () => d.getUTCMonth(), getDate: () => d.getUTCDate() });
    expect(civilDate(utcFields(guam))).toBe('2026-11-10');
    expect(civilDate(utcFields(honolulu))).toBe('2026-11-09');
  });
  it.each(['2027-02-29', '2100-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '2026-1-1', 'today', '2026-11-09T00:00'])('rejects %s', date => expect(validCivilDate(date)).toBe(false));
  it.each(['2028-02-29', '2000-02-29', '2026-12-31'])('accepts %s', date => expect(validCivilDate(date)).toBe(true));
});
describe("today's pick", () => {
  it('is the same offline for the same date, game, tier and pool', () => {
    expect(pickToday('sudoku', 'reef', '2026-11-09', 1, ranges)).toEqual(pickToday('sudoku', 'reef', '2026-11-09', 1, ranges));
  });
  it('lands on a pool member, using the specified hash', () => {
    const pick = pickToday('sudoku', 'reef', '2026-11-09', 1, ranges)!;
    const expected = ordinalAt(ranges, fnvBig('LI-TODAY-V1|sudoku|reef|2026-11-09') % poolLength(ranges));
    expect(pick).toEqual({ game: 'sudoku', tier: 'reef', date: '2026-11-09', pool: 1, ordinal: expected });
  });
  it('changes across leap day boundaries and between tiers', () => {
    const leap = ['2028-02-28', '2028-02-29', '2028-03-01'].map(d => pickToday('maze', 'reef', d, 1, ranges)!.ordinal);
    expect(new Set(leap).size).toBeGreaterThan(1);
    expect(pickToday('maze', 'reef', '2028-02-29', 1, ranges)!.ordinal).not.toBe(pickToday('maze', 'shallows', '2028-02-29', 1, ranges)!.ordinal);
  });
  it('spreads across a pool over a year', () => {
    const seen = new Set<number>();
    for (let day = 1; day <= 365; day++) {
      const date = new Date(Date.UTC(2027, 0, day));
      seen.add(pickToday('sudoku', 'reef', date.toISOString().slice(0, 10), 1, ranges)!.ordinal);
    }
    expect(seen.size).toBeGreaterThan(35);
  });
  it('walks ranges in order and rejects an index past the end', () => {
    expect(ordinalAt(ranges, 0)).toBe(100);
    expect(ordinalAt(ranges, 16)).toBe(300);
    expect(ordinalAt(ranges, 55)).toBe(931);
    expect(() => ordinalAt(ranges, 56)).toThrow();
  });
  it('returns nothing rather than a guess for a bad date, id or empty pool', () => {
    expect(pickToday('sudoku', 'reef', '2026-02-30', 1, ranges)).toBeNull();
    expect(pickToday('Bad Id', 'reef', '2026-11-09', 1, ranges)).toBeNull();
    expect(pickToday('sudoku', 'reef', '2026-11-09', 1, [])).toBeNull();
  });
  it('keeps the puzzle in play across midnight and a clock change', () => {
    const before = pickToday('sudoku', 'reef', '2026-11-09', 1, ranges);
    const after = pickToday('sudoku', 'reef', '2026-11-10', 1, ranges);
    expect(keepActive(before, after)).toBe(before);
    expect(keepActive(null, after)).toBe(after);
    const rolledBack = pickToday('sudoku', 'reef', '2020-01-01', 1, ranges);
    expect(keepActive(before, rolledBack)).toBe(before);
  });
  it('uses only the frozen pool from a manifest, so later banks cannot reshuffle it', () => {
    const manifest = { family: 'sudoku', daily: [{ version: 1, bands: [['reef', ranges]] }, { version: 2, bands: [['reef', [[0, 3]]]] }] } as unknown as FamilyManifest;
    expect(pickFromManifest(manifest, 'reef', '2026-11-09')).toEqual(pickToday('sudoku', 'reef', '2026-11-09', 1, ranges));
    expect(pickFromManifest(manifest, 'reef', '2026-11-09', 2)?.pool).toBe(2);
    expect(pickFromManifest(manifest, 'nowhere', '2026-11-09')).toBeNull();
  });
});
describe('house rules for puzzle banks', () => {
  const source = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const path = join(dir, e.name);
    return e.isDirectory() ? source(path) : /\.(ts|tsx|json)$/.test(e.name) ? [path] : [];
  });
  const code = [...source('src/puzzles'), ...source('src/content/puzzles')].map(f => [f, readFileSync(f, 'utf8')] as const);
  it.each([
    ['a streak', /streak/i],
    ['a daily completion record', /lastPlayed|last_played|playedOn|dailyDone|dayCount/i],
    ['a missed-day idea', /\bmissed\b/i],
    ['a countdown or waiting timer', /countdown|comeBack|come back tomorrow/i],
    ['a lock', /\b(locked|isLocked|unlockAt|paywall)\b/i],
    ['currency or loot', /\b(coins?|gems?|lootbox|currency)\b/i],
    ['network calls', /\bfetch\(/],
  ])('has no %s in the kit, outside the web asset read', (name, pattern) => {
    for (const [file, text] of code) {
      if (name === 'network calls' && file.endsWith('bankAssets.web.ts')) continue;
      expect(pattern.test(text), `${file} matches ${pattern}`).toBe(false);
    }
  });
  it('gives the web transport only bundled asset URLs', () => {
    expect(readFileSync('src/puzzles/bankAssets.web.ts', 'utf8')).toMatch(/Asset\.fromModule\(load\(\)\)\.uri/);
  });
  it('is never imported by a route or a screen until a registration lands', () => {
    const routes = [...source('src/app'), ...source('src/screens')];
    for (const file of routes) expect(readFileSync(file, 'utf8').includes('src/puzzles') || /from ["'](\.\.?\/)+puzzles\//.test(readFileSync(file, 'utf8')), file).toBe(false);
  });
});
