import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { BANK_CAPS, assertFamilyAppendOnly, assertRootAppendOnly, emptyRoot, encodePack, locate, manifestAsset, parsePack, validFamily, validRoot, type FamilyManifest, type PackRow, type RootIndex } from '../src/puzzles/bank';
import { certify } from '../src/puzzles/checks';
import { BYTE_MODEL, modelBytes, modelEntries, modelFloor, verifyByteModel } from '../scripts/puzzles/byte-model';
import { capTemplates, generatedAssets, orderLayouts, splitPacks } from '../scripts/puzzles/pipeline';
import { openBand, toyCore, toySpec } from './helpers/puzzle-toy';

const hash = 'a'.repeat(64), other = 'b'.repeat(64);
const pack = (slot: number, first: number, count: number, band = 0): PackRow => [slot, first, count, 100, hash, band, 1, 1];
const family = (over: Partial<FamilyManifest> = {}): FamilyManifest => ({ format: 1, family: 'sudoku', engine: 'sudoku', bands: ['paddling', 'shallows'], packs: [pack(0, 0, 10), pack(1, 10, 20, 1)], retired: [], daily: [{ version: 1, bands: [['paddling', [[0, 10]]], ['shallows', [[10, 20]]]] }], speech: { count: 0, hash: null }, ...over });
const root = (over: Partial<RootIndex> = {}): RootIndex => ({ format: 1, revision: 1, nextSlot: 2, nextOrdinal: 30, families: [['sudoku', manifestAsset('sudoku', hash), hash, 30, 2, 400]], ...over });

describe('bank format', () => {
  it('states the ledger caps', () => {
    expect(BANK_CAPS).toMatchObject({ slots: 512, packEntries: 1024, packBytes: 131072, rootBytes: 16384, familyBytes: 16384, catalogBytes: 28 * 1048576, decodedBytes: 4 * 1048576, decodedPacks: 2 });
  });
  it('accepts well-formed directories', () => { expect(validFamily(family())).toBe(true); expect(validRoot(root())).toBe(true); expect(validRoot(emptyRoot())).toBe(true); });
  it.each<[string, unknown]>([
    ['unknown key', { ...family(), extra: 1 }],
    ['slots out of order', family({ packs: [pack(1, 0, 10), pack(0, 10, 20, 1)] })],
    ['slot above 511', family({ packs: [pack(512, 0, 10)] })],
    ['overlapping ordinals', family({ packs: [pack(0, 0, 10), pack(1, 5, 20, 1)] })],
    ['pack above 1024 entries', family({ packs: [pack(0, 0, 1025)] })],
    ['pack above 128 KiB', family({ packs: [[0, 0, 10, 131073, hash, 0, 1, 1]] })],
    ['bad hash', family({ packs: [[0, 0, 10, 100, 'nope', 0, 1, 1]] })],
    ['band out of range', family({ packs: [pack(0, 0, 10, 2)] })],
    ['rng revision', family({ packs: [[0, 0, 10, 100, hash, 0, 1, 2]] })],
    ['retired slot that does not exist', family({ retired: [9] })],
    ['duplicate band', family({ bands: ['paddling', 'paddling'] })],
    ['unsorted daily pool', family({ daily: [{ version: 1, bands: [['paddling', [[5, 1], [2, 1]]]] }] })],
    ['speech count without hash', family({ speech: { count: 2, hash: null } })],
    ['R6: a daily range outside every pack', family({ daily: [{ version: 1, bands: [['paddling', [[900000, 16]]]] }] })],
    ['R6: a daily range running past its pack', family({ daily: [{ version: 1, bands: [['shallows', [[10, 21]]]] }] })],
    ['R6: a daily range in another band', family({ daily: [{ version: 1, bands: [['paddling', [[10, 5]]]] }] })],
    ['R6: a daily range across a hole', family({ packs: [pack(0, 0, 10), pack(1, 20, 10)], daily: [{ version: 1, bands: [['paddling', [[5, 20]]]] }] })],
    ['R6: two rows for one band in a pool', family({ daily: [{ version: 1, bands: [['paddling', [[0, 5]]], ['paddling', [[5, 5]]]] }] })],
    ['R7: an ordinal past the supported range', family({ packs: [pack(0, 2147483647, 1)], daily: [] })],
  ])('rejects a family manifest with %s', (_, value) => expect(validFamily(value)).toBe(false));
  it.each<[string, unknown]>([
    ['unknown key', { ...root(), extra: 1 }],
    ['too many slots', root({ nextSlot: 513 })],
    ['wrong asset name', root({ families: [['sudoku', 'f-sudoku-zzz', hash, 30, 2, 400]] })],
    ['duplicate families', root({ families: [root().families[0], root().families[0]] })],
    ['R7: an allocation counter past the supported range', root({ nextOrdinal: 2147483648 })],
  ])('rejects a root index with %s', (_, value) => expect(validRoot(value)).toBe(false));
  it('R6: accepts a daily range spanning touching packs of one band', () => {
    expect(validFamily(family({ packs: [pack(0, 0, 10), pack(1, 10, 10)], daily: [{ version: 1, bands: [['paddling', [[5, 10]]]] }] }))).toBe(true);
  });
  it('finds any ordinal without scanning', () => {
    const m = family();
    expect(locate(m, 0)).toMatchObject({ index: 0, row: m.packs[0] });
    expect(locate(m, 29)).toMatchObject({ index: 19, row: m.packs[1] });
    expect(locate(m, 30)).toBeNull();
  });
  it('checks a pack header against the manifest row', () => {
    const header = { format: 1 as const, family: 'sudoku', slot: 3, first: 40, count: 2, band: 'shallows', rules: 1, rng: 1 };
    const row: PackRow = [3, 40, 2, 100, hash, 1, 1, 1], m = family();
    expect(parsePack(encodePack(header, ['[1]', '[2]']), row, m)?.rows).toEqual(['[1]', '[2]']);
    expect(parsePack(encodePack({ ...header, slot: 4 }, ['[1]', '[2]']), row, m)).toBeNull();
    expect(parsePack(encodePack(header, ['[1]']), row, m)).toBeNull();
    expect(parsePack('not json', row, m)).toBeNull();
  });
  it('never lets a published slot, band order or daily pool change', () => {
    const before = family();
    expect(() => assertFamilyAppendOnly(before, family({ packs: [...before.packs, pack(2, 30, 5)] }))).not.toThrow();
    expect(() => assertFamilyAppendOnly(before, family({ packs: [before.packs[0]] }))).toThrow(/slot 1/);
    expect(() => assertFamilyAppendOnly(before, family({ packs: [[0, 0, 10, 100, other, 0, 1, 1], before.packs[1]] }))).toThrow(/slot 0/);
    expect(() => assertFamilyAppendOnly(before, family({ bands: ['shallows', 'paddling'] }))).toThrow(/reordered/);
    expect(() => assertFamilyAppendOnly(before, family({ daily: [{ version: 1, bands: [['paddling', [[0, 9]]]] }] }))).toThrow(/Daily pool/);
    expect(() => assertFamilyAppendOnly(family({ retired: [0] }), family())).toThrow(/revived/);
    expect(() => assertRootAppendOnly(root(), root({ nextSlot: 1 }))).toThrow(/backward/);
    expect(() => assertRootAppendOnly(root(), root({ families: [] }))).toThrow(/lost/);
  });
  it('generates a lazy asset table', () => {
    const m = family();
    const code = generatedAssets(root(), new Map([['sudoku', m]]));
    expect(code).toContain(`"p0": () => require("./assets/p0.lipuzzle")`);
    expect(code).toContain(`"p1": () => require("./assets/p1.lipuzzle")`);
    expect(code).toContain('f-sudoku-');
  });
  it('registers the asset type with the Expo Metro config', () => {
    const config = createRequire(import.meta.url)('../metro.config.js') as { resolver: { assetExts: string[] } };
    expect(config.resolver.assetExts).toContain('lipuzzle');
    expect(config.resolver.assetExts).toContain('m4a');
  });
});
const entries = (rows: [layout: string, template: string][]) => rows.map(([layout, template], i) => {
  const r = certify(toySpec(), openBand, toyCore({ seed: i, payload: { goal: (i % 40) + 1 }, layout, template, par: null }), { budget: 100, seenExact: new Set(), seenSemantic: new Set() });
  if (!r.ok) throw new Error(r.reason);
  return r.entry;
});
describe('pack layout rules', () => {
  it('never places one layout twice in a row', () => {
    const layouts = ['a', 'a', 'a', 'b', 'b', 'c', 'a', 'd', 'b', 'c'];
    const { ordered, dropped } = orderLayouts(entries(layouts.map(l => [l, 't'])));
    expect(dropped).toEqual([]);
    for (let i = 1; i < ordered.length; i++) expect(ordered[i].core.layout).not.toBe(ordered[i - 1].core.layout);
  });
  it('drops the excess when one layout is too common to separate, rather than breaking the rule', () => {
    const { ordered, dropped } = orderLayouts(entries([['a', 't'], ['a', 't'], ['a', 't'], ['b', 't']]));
    expect(ordered.length).toBe(3);
    expect(dropped.length).toBe(1);
  });
  it('holds any template family to a quarter of what ships', () => {
    const rows = Array.from({ length: 20 }, (_, i): [string, string] => ['l', i < 12 ? 'common' : `t${i % 4}`]);
    const { kept } = capTemplates(entries(rows));
    const counts = new Map<string, number>();
    for (const e of kept) counts.set(e.core.template, (counts.get(e.core.template) ?? 0) + 1);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(Math.max(1, Math.floor(kept.length * 0.25)));
  });
  it('splits on entries and on bytes', () => {
    const many = entries(Array.from({ length: 2050 }, () => ['l', 't']));
    const byCount = splitPacks(many, 80);
    expect(byCount.map(p => p.length)).toEqual([1024, 1024, 2]);
    expect(() => splitPacks([{ ...many[0] }], 80)).toThrow(/certified/);
    expect(() => splitPacks([many[0]], BANK_CAPS.packBytes)).toThrow(/larger than a pack/);
  });
});
describe('byte model', () => {
  it('matches the ledger counts and stays inside the catalog cap', () => {
    expect(modelEntries()).toBe(65083);
    expect(modelFloor()).toBe(14839);
    expect(BYTE_MODEL.length).toBeLessThanOrEqual(70);
    expect(modelBytes()).toBeLessThanOrEqual(BANK_CAPS.catalogBytes);
  });
  it('flags a family over its modelled row size or count, and an unmodelled family', () => {
    expect(verifyByteModel([{ family: 'sudoku', entries: 100, rowBytes: 25_600 }])).toEqual([]);
    expect(verifyByteModel([{ family: 'sudoku', entries: 100, rowBytes: 25_601 }])[0]).toMatch(/above the 256/);
    expect(verifyByteModel([{ family: 'sudoku', entries: 4097, rowBytes: 1 }])[0]).toMatch(/4096 target/);
    expect(verifyByteModel([{ family: 'mystery', entries: 1, rowBytes: 1 }])[0]).toMatch(/not in the byte model/);
  });
});
