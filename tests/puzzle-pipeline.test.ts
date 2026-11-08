import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { packAsset } from '../src/puzzles/bank';
import { bakeFamily, productionDirs, readCatalog, sweepOrphans, verifyCatalog, type CatalogDirs } from '../scripts/puzzles/pipeline';
import { logicProofFamily, mazeProofFamily } from '../scripts/puzzles/proof-families';
import { families } from '../scripts/puzzles/families';
import { toySpec } from './helpers/puzzle-toy';
import type { FamilySpec } from '../src/puzzles/types';

const dirs = (): CatalogDirs => { const base = mkdtempSync(join(tmpdir(), 'puzzle-bake-')); return { content: join(base, 'content'), receipts: join(base, 'receipts') }; };
const verify = (d: CatalogDirs, specs: FamilySpec<never>[] | FamilySpec<unknown>[], options = {}) => verifyCatalog(d, specs as FamilySpec<unknown>[], { byteModel: false, ...options });
const snapshot = (d: CatalogDirs) => {
  const assets = join(d.content, 'assets');
  return { root: readFileSync(join(d.content, 'root.json'), 'utf8'), assets: existsSync(assets) ? readdirSync(assets).sort().map(f => [f, readFileSync(join(assets, f), 'utf8')]) : [] };
};
const toy = (target: number, floor = 1) => toySpec({ bands: [{ id: 'open', target, floor, advanced: false }] });

describe('real banks through the whole pipeline', () => {
  it('bakes, publishes and independently re-proves real mazes and Logic Lagoon grids', () => {
    const d = dirs(), maze = mazeProofFamily(), logic = logicProofFamily();
    const a = bakeFamily(maze, { dirs: d, sourceSha: 'test', maxAttempts: 4000 }), b = bakeFamily(logic, { dirs: d, sourceSha: 'test', maxAttempts: 600 });
    expect(a).toMatchObject({ status: 'complete', published: true });
    expect(b.published).toBe(true);
    expect(b.rejects['duplicate-semantic']).toBeGreaterThan(0);
    const result = verify(d, [maze, logic]);
    expect(result.errors).toEqual([]);
    expect(result.stats.replayed).toBe(result.stats.entries);
    expect(result.stats.botRuns).toBeGreaterThanOrEqual(result.stats.entries * 5);
    const receipt = JSON.parse(readFileSync(join(d.receipts, 'proof-maze', 'slot-0000.json'), 'utf8'));
    expect(receipt).toMatchObject({ family: 'proof-maze', sourceSha: 'test', machineGates: true, allShippingGates: false, review: { ids: [], complete: false }, native: [], rng: 1 });
    expect(receipt.distinct.semantic).toBe(receipt.distinct.exact);
    expect(receipt.bytes.gzip).toBeLessThan(receipt.bytes.raw);
    expect(Object.keys(receipt.bots)).toContain('scan');
    expect(receipt.proofHashes.witness).toMatch(/^[0-9a-f]{64}$/);
  });
  it('produces identical packs from the same seeds', () => {
    const one = dirs(), two = dirs();
    bakeFamily(toy(16), { dirs: one, sourceSha: 'x' });
    bakeFamily(toy(16), { dirs: two, sourceSha: 'x' });
    expect(snapshot(one)).toEqual(snapshot(two));
  });
  it('shuts out a shipping build until a human review is recorded', () => {
    const d = dirs(), spec = toy(16);
    bakeFamily(spec, { dirs: d });
    expect(verify(d, [spec]).errors).toEqual([]);
    expect(verify(d, [spec], { shipping: true }).errors.join()).toMatch(/no completed human review/);
  });
});
describe('band quotas after trimming', () => {
  it('keeps baking until the trimmed result fills the band', () => {
    // Early seeds are all one template and one layout, so raw accepts reach 8 long before the band is really full.
    const spec = toySpec({ bands: [{ id: 'open', target: 8, floor: 8, advanced: false }], generate: seed => ({ ...toySpec().generate(seed, spec.bands[0])!, layout: seed <= 12 ? 'same' : seed % 2 ? 'a' : 'b', template: seed <= 12 ? 'common' : `t${seed % 4}` }) });
    const d = dirs(), report = bakeFamily(spec, { dirs: d });
    expect(report).toMatchObject({ status: 'complete', published: true, accepted: { open: 8 } });
    expect(verify(d, [spec]).errors).toEqual([]);
  });
});
describe('min-count failure', () => {
  it('leaves the accepted bank byte-identical and never writes filler', () => {
    const d = dirs(), good = toy(16);
    expect(bakeFamily(good, { dirs: d, sourceSha: 'first' }).published).toBe(true);
    const before = snapshot(d);
    const failing = toySpec({ bands: [{ id: 'open', target: 200, floor: 200, advanced: false }], generate: () => null });
    const report = bakeFamily(failing, { dirs: d, maxAttempts: 300 });
    expect(report).toMatchObject({ status: 'exhausted', published: false });
    expect(report.reason).toMatch(/Below floor/);
    expect(report.rejects.construction).toBe(300);
    expect(snapshot(d)).toEqual(before);
    const attempts = readdirSync(join(d.receipts, 'toy')).filter(f => f.startsWith('attempt-'));
    expect(attempts.length).toBeGreaterThan(1);
  });
  it('reports exhaustion by attempts and by deadline, separately from success', () => {
    const d = dirs();
    let clock = 0;
    const spec = toySpec({ bands: [{ id: 'open', target: 30, floor: 40, advanced: false }] });
    const report = bakeFamily(spec, { dirs: d, deadlineMs: 5, now: () => (clock += 1) });
    expect(report).toMatchObject({ status: 'exhausted', published: false });
    const body = JSON.parse(readFileSync(join(d.receipts, 'toy', readdirSync(join(d.receipts, 'toy'))[0]), 'utf8'));
    expect(body.timedOut).toBe(true);
    const short = bakeFamily(toy(16, 4), { dirs: dirs(), maxAttempts: 8 });
    expect(short.status).toBe('exhausted');
    expect(short.published).toBe(true);
  });
  it('counts a solver timeout as exhausted, never as an unsolvable puzzle', () => {
    const spec = toySpec({ adapter: { ...toySpec().adapter, solve: () => ({ status: 'budget-exhausted', nodes: 5 }) }, bands: [{ id: 'open', target: 5, floor: 0, advanced: false }] });
    const report = bakeFamily(spec, { dirs: dirs(), maxAttempts: 20 });
    expect(report.rejects['solver-budget']).toBe(20);
    expect(report.rejects.unsolved).toBeUndefined();
  });
});
describe('atomic publish', () => {
  it('survives a failure right before commit with the old catalog whole', () => {
    const d = dirs();
    bakeFamily(toy(16), { dirs: d });
    const before = snapshot(d);
    expect(() => bakeFamily(toySpec({ id: 'toy-two', bands: [{ id: 'open', target: 8, floor: 1, advanced: false }] }), { dirs: d, beforeCommit: () => { throw new Error('disk full'); } })).toThrow('disk full');
    expect(snapshot(d)).toEqual(before);
    expect(readdirSync(d.content).filter(n => n.startsWith('.staging'))).toEqual([]);
  });
  it('appends new entries to new slots and leaves published slots alone', () => {
    const d = dirs(), small = toy(16, 1);
    bakeFamily(small, { dirs: d });
    const { root: first, families: firstFamilies } = readCatalog(d);
    const firstPack = readFileSync(join(d.content, 'assets', `${packAsset(0)}.lipuzzle`), 'utf8');
    const report = bakeFamily(toy(32, 1), { dirs: d, seedBase: 1000 });
    expect(report.published).toBe(true);
    const { root: second, families: secondFamilies } = readCatalog(d);
    expect(second.revision).toBe(first.revision + 1);
    expect(secondFamilies.get('toy')!.packs.slice(0, firstFamilies.get('toy')!.packs.length)).toEqual(firstFamilies.get('toy')!.packs);
    expect(report.slots[0]).toBe(first.nextSlot);
    expect(readFileSync(join(d.content, 'assets', `${packAsset(0)}.lipuzzle`), 'utf8')).toBe(firstPack);
    expect(secondFamilies.get('toy')!.daily).toEqual(firstFamilies.get('toy')!.daily);
    expect(verify(d, [toy(32, 1)]).errors).toEqual([]);
  });
  it('refuses to rewrite an existing receipt', () => {
    const d = dirs(), spec = toy(16);
    bakeFamily(spec, { dirs: d });
    const again = dirs();
    bakeFamily(spec, { dirs: again });
    writeFileSync(join(again.receipts, 'toy', 'slot-0001.json'), 'tampered');
    expect(() => bakeFamily(toySpec({ id: 'toy', bands: [{ id: 'open', target: 32, floor: 1, advanced: false }] }), { dirs: { ...again, content: mkdtempSync(join(tmpdir(), 'puzzle-other-')) } })).toThrow(/immutable/);
  });
  it('sweeps only files the root index cannot reach', () => {
    const d = dirs();
    bakeFamily(toy(16), { dirs: d });
    const orphan = join(d.content, 'assets', 'p400.lipuzzle');
    writeFileSync(orphan, 'left over');
    expect(verify(d, [toy(16)]).errors.join()).toMatch(/Unreferenced asset/);
    expect(sweepOrphans(d)).toEqual(['p400.lipuzzle']);
    expect(existsSync(join(d.content, 'assets', 'p0.lipuzzle'))).toBe(true);
  });
});
describe('verify catches what a bake could not', () => {
  const baked = () => { const d = dirs(), spec = toy(16); bakeFamily(spec, { dirs: d }); return { d, spec, file: join(d.content, 'assets', 'p0.lipuzzle') }; };
  it('a changed byte', () => {
    const { d, spec, file } = baked();
    writeFileSync(file, readFileSync(file, 'utf8').replace('"a"', '"b"'));
    expect(verify(d, [spec]).errors.join()).toMatch(/hash or length mismatch/);
  });
  it('a missing pack', () => {
    const { d, spec, file } = baked();
    writeFileSync(file, '');
    expect(verify(d, [spec]).errors.length).toBeGreaterThan(0);
  });
  it('a family with no registered spec', () => {
    const { d } = baked();
    expect(verify(d, []).errors.join()).toMatch(/without a registered family spec/);
  });
  it('a missing receipt', () => {
    const { d, spec } = baked();
    const receipt = join(d.receipts, 'toy', 'slot-0000.json');
    writeFileSync(receipt, '');
    expect(verify(d, [spec], {}).errors).toEqual([]);
    expect(() => verify(d, [spec], { shipping: true })).toThrow();
  });
  it('a stale generated asset table', () => {
    const { d, spec } = baked();
    writeFileSync(join(d.content, 'assets.generated.ts'), '// old\n');
    expect(verify(d, [spec]).errors.join()).toMatch(/stale/);
  });
});
describe('committed catalog', () => {
  it('stays empty until owner slices register real families', () => {
    expect(families).toEqual([]);
    expect(readCatalog(productionDirs).root.families).toEqual([]);
    expect(verifyCatalog(productionDirs, families).errors).toEqual([]);
  });
});
