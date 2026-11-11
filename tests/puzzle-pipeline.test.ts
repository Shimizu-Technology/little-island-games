import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { emptyRoot, manifestAsset, packAsset, validFamily, type FamilyManifest, type PackRow, type RootFamily } from '../src/puzzles/bank';
import { pickFromManifest } from '../src/puzzles/today';
import { bakeFamily, generatedAssets, productionDirs, readCatalog, sweepOrphans, verifyCatalog, type CatalogDirs } from '../scripts/puzzles/pipeline';
import { logicProofFamily, mazeProofFamily } from '../scripts/puzzles/proof-families';
import { families } from '../scripts/puzzles/families';
import { BYTE_MODEL } from '../scripts/puzzles/byte-model';
import { toySpec, toyCore } from './helpers/puzzle-toy';
import type { FamilySpec } from '../src/puzzles/types';

const dirs = (): CatalogDirs => { const base = mkdtempSync(join(tmpdir(), 'puzzle-bake-')); return { content: join(base, 'content'), receipts: join(base, 'receipts') }; };
const verify = (d: CatalogDirs, specs: FamilySpec<never>[] | FamilySpec<unknown>[], options = {}) => verifyCatalog(d, specs as FamilySpec<unknown>[], { byteModel: false, ...options });
const snapshot = (d: CatalogDirs) => {
  const assets = join(d.content, 'assets');
  return { root: readFileSync(join(d.content, 'root.json'), 'utf8'), assets: existsSync(assets) ? readdirSync(assets).sort().map(f => [f, readFileSync(join(assets, f), 'utf8')]) : [] };
};
const toy = (target: number, floor = 1) => toySpec({ bands: [{ id: 'open', target, floor, advanced: false }] });
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const receiptFile = (d: CatalogDirs, family = 'toy', slot = 0) => join(d.receipts, family, `slot-${String(slot).padStart(4, '0')}.json`);
type Json = Record<string, any>; // receipts are hand-edited here on purpose
const readReceipt = (d: CatalogDirs, family = 'toy', slot = 0) => JSON.parse(readFileSync(receiptFile(d, family, slot), 'utf8')) as Json;
const writeReceipt = (d: CatalogDirs, body: unknown, family = 'toy', slot = 0) => writeFileSync(receiptFile(d, family, slot), JSON.stringify(body));
const editReceipt = (d: CatalogDirs, edit: (r: Json) => void, family = 'toy', slot = 0) => { const r = readReceipt(d, family, slot); edit(r); writeReceipt(d, r, family, slot); };
const packNative = (r: Json) => ({ id: 'qa-1', build: '4.0.0 (30)', sourceSha: 'a'.repeat(40), scope: 'pack', engine: 'toy', rules: r.rules, family: r.family, slot: r.slot, sha256: r.sha256 });
const approve = (d: CatalogDirs, family = 'toy', slot = 0) => editReceipt(d, r => {
  r.review = { ids: ['review-1'], complete: true, subject: { family: r.family, slot: r.slot, sha256: r.sha256, engine: 'toy', rules: r.rules, kit: r.hashes.kit } };
  r.native = [packNative(r)];
  r.allShippingGates = true;
}, family, slot);
/** Rewrites a published manifest the way a real commit would, so only the rule under test can object. */
function rewriteFamily(d: CatalogDirs, id: string, edit: (m: FamilyManifest) => void) {
  const { root, families: all } = readCatalog(d), manifest = structuredClone(all.get(id)!), row = root.families.find(f => f[0] === id)!, oldBytes = Buffer.byteLength(readFileSync(join(d.content, 'assets', `${row[1]}.lipuzzle`)));
  edit(manifest);
  const text = JSON.stringify(manifest), hash = sha(text), asset = manifestAsset(id, hash);
  rmSync(join(d.content, 'assets', `${row[1]}.lipuzzle`));
  writeFileSync(join(d.content, 'assets', `${asset}.lipuzzle`), text);
  const next = { ...root, families: root.families.map((f): RootFamily => (f[0] === id ? [id, asset, hash, f[3], f[4], f[5] - oldBytes + Buffer.byteLength(text)] : f)) };
  writeFileSync(join(d.content, 'root.json'), `${JSON.stringify(next)}\n`);
  writeFileSync(join(d.content, 'assets.generated.ts'), generatedAssets(next, new Map([...all, [id, manifest]])));
}
const setRoot = (d: CatalogDirs, edit: (root: Json) => void) => { const root = JSON.parse(readFileSync(join(d.content, 'root.json'), 'utf8')) as Json; edit(root); writeFileSync(join(d.content, 'root.json'), `${JSON.stringify(root)}\n`); };

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
    // The first eight accepts share one layout, so raw accepts reach 8 long before the band can really be laid out.
    const spec = toySpec({ bands: [{ id: 'open', target: 8, floor: 8, advanced: false }], generate: seed => ({ ...toySpec().generate(seed, spec.bands[0])!, layout: seed <= 8 ? 'same' : seed % 2 ? 'a' : 'b', template: `t${seed % 16}` }) });
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
  it('a blank or absent receipt', () => {
    const { d, spec } = baked();
    writeFileSync(receiptFile(d), '');
    expect(verify(d, [spec]).errors.join()).toMatch(/receipt/);
    expect(verify(d, [spec], { shipping: true, promised: [] }).errors.join()).toMatch(/receipt/);
    rmSync(receiptFile(d));
    expect(verify(d, [spec]).errors.join()).toMatch(/no receipt/);
  });
  it('a stale generated asset table', () => {
    const { d, spec } = baked();
    writeFileSync(join(d.content, 'assets.generated.ts'), '// old\n');
    expect(verify(d, [spec]).errors.join()).toMatch(/stale/);
  });
});
describe('R2: shipping approval is bound to the exact content', () => {
  const baked = (seedBase = 1) => { const d = dirs(), spec = toy(16); bakeFamily(spec, { dirs: d, seedBase, sourceSha: 'bake' }); return { d, spec }; };
  const shipping = { shipping: true, promised: [] };
  it('rejects a receipt written for something else', () => {
    const { d, spec } = baked();
    writeReceipt(d, { family: 'different-family', slot: 499, sha256: 'stale', review: { complete: true, ids: ['old-review'] }, native: ['old-build'] });
    expect(verify(d, [spec], shipping).errors.join()).toMatch(/receipt/);
    expect(verify(d, [spec]).errors.join()).toMatch(/receipt/);
  });
  it('accepts complete evidence that names this pack', () => {
    const { d, spec } = baked();
    approve(d);
    expect(verify(d, [spec], shipping).errors).toEqual([]);
    expect(verify(d, [spec]).errors).toEqual([]);
  });
  it('rejects an approved receipt copied onto a newly baked pack', () => {
    const old = baked(), fresh = baked(500);
    approve(old.d);
    copyFileSync(receiptFile(old.d), receiptFile(fresh.d));
    expect(verify(fresh.d, [fresh.spec], shipping).errors.join()).toMatch(/receipt/);
  });
  it.each<[string, (r: Json) => void]>([
    ['family', r => { r.family = 'other'; }],
    ['slot', r => { r.slot = 3; }],
    ['band', r => { r.band = 'other'; }],
    ['ordinals', r => { r.ordinals = [1, 16]; }],
    ['rules', r => { r.rules = 2; }],
    ['content hash', r => { r.sha256 = 'f'.repeat(64); }],
    ['raw bytes', r => { r.bytes.raw += 1; }],
    ['gzip bytes', r => { r.bytes.gzip *= 4; }],
    ['kept seeds', r => { r.seeds.kept[0] += 1; }],
    ['distinct counts', r => { r.distinct.semantic -= 1; }],
    ['template histogram', r => { r.histograms.template = {}; }],
    ['layout histogram', r => { r.histograms.layout = {}; }],
    ['solve bounds', r => { r.solve.bounds = [0, 0]; }],
    ['exact count', r => { r.solve.exact = 0; }],
    ['witness aggregate', r => { r.proofHashes.witness = 'f'.repeat(64); }],
    ['bot results', r => { r.bots = {}; }],
    ['speech count', r => { r.speech = 9; }],
    ['machine gates flag', r => { r.machineGates = false; }],
    ['catalog revision', r => { r.catalogRevision = 99; }],
    ['an unknown field', r => { r.extra = 1; }],
    ['a missing field', r => { delete r.provenance; }],
    ['a malformed kit hash', r => { r.hashes.kit = 'stale'; }],
  ])('catches a wrong or malformed %s, even outside a shipping build', (_, edit) => {
    const { d, spec } = baked();
    editReceipt(d, edit);
    expect(verify(d, [spec]).errors.join()).toMatch(/receipt/);
  });
  it.each<[string, (r: Json) => void]>([
    ['another pack', r => { r.review.subject.sha256 = 'f'.repeat(64); }],
    ['another slot', r => { r.review.subject.slot = 9; }],
    ['another rules revision', r => { r.review.subject.rules = 2; }],
    ['another kit revision', r => { r.review.subject.kit = 'f'.repeat(64); }],
    ['nothing at all', r => { r.review.subject = null; }],
    ['no reviewer', r => { r.review.ids = []; }],
  ])('rejects a review naming %s', (_, edit) => {
    const { d, spec } = baked();
    approve(d);
    editReceipt(d, edit);
    expect(verify(d, [spec], shipping).errors.join()).toMatch(/review/);
  });
  it.each<[string, (r: Json) => void]>([
    ['a bare string', r => { r.native = ['old-build']; }],
    ['another pack', r => { r.native[0].sha256 = 'f'.repeat(64); }],
    ['another engine', r => { r.native[0].engine = 'maze'; }],
    ['another rules revision', r => { r.native[0].rules = 2; }],
    ['no build', r => { delete r.native[0].build; }],
    ['no source revision', r => { r.native[0].sourceSha = 'main'; }],
    ['an unknown scope', r => { r.native[0].scope = 'everything'; }],
  ])('rejects native QA that is %s', (_, edit) => {
    const { d, spec } = baked();
    approve(d);
    editReceipt(d, edit);
    expect(verify(d, [spec], shipping).errors.join()).toMatch(/native/);
  });
  const mechanic = (r: Json, maxPackBytes: number) => ({ id: 'qa-2', build: '4.0.0 (30)', sourceSha: 'a'.repeat(40), scope: 'mechanic', engine: 'toy', rules: r.rules, maxPackBytes });
  it('lets native QA cover packs up to the size it actually tested', () => {
    const { d, spec } = baked();
    approve(d);
    editReceipt(d, r => { r.native = [mechanic(r, r.bytes.raw)]; });
    expect(verify(d, [spec], shipping).errors).toEqual([]);
    editReceipt(d, r => { r.native = [mechanic(r, r.bytes.raw - 1)]; });
    expect(verify(d, [spec], shipping).errors.join()).toMatch(/native/);
  });
  it('still names each missing piece of evidence truthfully', () => {
    const { d, spec } = baked();
    const errors = verify(d, [spec], shipping).errors.join();
    expect(errors).toMatch(/no completed human review/);
    expect(errors).toMatch(/no native QA link/);
    approve(d);
    editReceipt(d, r => { r.allShippingGates = false; });
    expect(verify(d, [spec], shipping).errors.join()).toMatch(/shipping gates/);
  });
  it('rejects a receipt claiming every gate without the evidence', () => {
    const { d, spec } = baked();
    editReceipt(d, r => { r.allShippingGates = true; });
    expect(verify(d, [spec]).errors.join()).toMatch(/shipping gates/);
  });
  it('never turns a family-level review flag into approval of a pack that did not exist yet', () => {
    const d = dirs(), spec = toySpec({ bands: [{ id: 'open', target: 16, floor: 1, advanced: false }], review: { ids: ['early'], complete: true } });
    bakeFamily(spec, { dirs: d });
    expect(readReceipt(d).review).toEqual({ ids: ['early'], complete: false, subject: null });
    expect(verify(d, [spec], shipping).errors.join()).toMatch(/no completed human review/);
  });
});
describe('R6: Today pools resolve to real entries of their band', () => {
  it('fails closed on a pool pointing outside the packs', () => {
    const d = dirs(), spec = toy(16);
    bakeFamily(spec, { dirs: d });
    rewriteFamily(d, 'toy', m => { m.daily = [{ version: 1, bands: [['open', [[900000, 16]]]] }]; });
    const asset = JSON.parse(readFileSync(join(d.content, 'root.json'), 'utf8')).families[0][1] as string;
    const manifest = JSON.parse(readFileSync(join(d.content, 'assets', `${asset}.lipuzzle`), 'utf8')) as FamilyManifest;
    expect(validFamily(manifest)).toBe(false);
    expect(() => verify(d, [spec])).toThrow(/invalid/);
  });
  it('every pick from a baked pool is an entry of the named band', () => {
    const d = dirs(), spec = toySpec({ bands: [{ id: 'one', target: 8, floor: 1, advanced: false }, { id: 'two', target: 8, floor: 1, advanced: false }] , generate: (seed, band) => ({ ...toySpec().generate(seed, band)!, band: band.id }) });
    bakeFamily(spec, { dirs: d });
    const manifest = readCatalog(d).families.get('toy')!;
    expect(validFamily(manifest)).toBe(true);
    for (let day = 1; day <= 28; day++) {
      const pick = pickFromManifest(manifest, 'two', `2026-11-${String(day).padStart(2, '0')}`)!;
      const row = manifest.packs.find((p: PackRow) => pick.ordinal >= p[1] && pick.ordinal < p[1] + p[2])!;
      expect(manifest.bands[row[5]]).toBe('two');
    }
  });
});
describe('R7: allocation is a whole-catalog invariant', () => {
  const twoFamilies = () => {
    const d = dirs(), one = toy(16), two = toySpec({ id: 'toy-two', bands: [{ id: 'open', target: 16, floor: 1, advanced: false }] });
    bakeFamily(one, { dirs: d });
    bakeFamily(two, { dirs: d });
    return { d, one, two };
  };
  it('reports counters behind the published ranges', () => {
    const d = dirs(), spec = toy(16);
    bakeFamily(spec, { dirs: d });
    setRoot(d, root => { root.nextSlot = 0; root.nextOrdinal = 0; });
    const errors = verify(d, [spec]).errors.join();
    expect(errors).toMatch(/nextSlot/);
    expect(errors).toMatch(/nextOrdinal/);
  });
  it('refuses to bake on top of such a catalog, leaving every asset alone', () => {
    const d = dirs();
    bakeFamily(toy(16), { dirs: d });
    setRoot(d, root => { root.nextSlot = 0; root.nextOrdinal = 0; });
    const before = snapshot(d);
    expect(() => bakeFamily(toySpec({ id: 'toy-two', bands: [{ id: 'open', target: 8, floor: 1, advanced: false }] }), { dirs: d })).toThrow(/nextSlot/);
    expect(snapshot(d)).toEqual(before);
  });
  it('reports ordinals shared between two families', () => {
    const { d, one, two } = twoFamilies();
    const count = readCatalog(d).families.get('toy-two')!.packs[0][2];
    const file = join(d.content, 'assets', 'p1.lipuzzle'), [header, ...rows] = readFileSync(file, 'utf8').split('\n');
    const moved = [JSON.stringify({ ...JSON.parse(header), first: 0 }), ...rows].join('\n');
    writeFileSync(file, moved);
    rewriteFamily(d, 'toy-two', m => {
      m.packs[0] = [1, 0, count, Buffer.byteLength(moved), sha(moved), 0, 1, 1];
      m.daily = [{ version: 1, bands: [['open', [[0, count]]]] }];
    });
    expect(verify(d, [one, two]).errors.join()).toMatch(/overlap/);
  });
  it('checks the staged candidate before moving anything', () => {
    const d = dirs();
    bakeFamily(toy(16), { dirs: d });
    setRoot(d, root => { root.nextOrdinal = 2147483640; });
    const before = snapshot(d);
    expect(() => bakeFamily(toySpec({ id: 'toy-two', bands: [{ id: 'open', target: 16, floor: 1, advanced: false }] }), { dirs: d })).toThrow();
    expect(snapshot(d)).toEqual(before);
  });
});
describe('R8: verify enforces the floors', () => {
  it('reports a band below the current floor', () => {
    const d = dirs();
    bakeFamily(toy(16), { dirs: d });
    expect(verify(d, [toy(32, 32)]).errors.join()).toMatch(/open has 16 certified.*floor of 32/);
    expect(verify(d, [toy(32, 32)], { shipping: true, promised: [] }).errors.join()).toMatch(/floor of 32/);
  });
  it('reports a registered family that was never published', () => {
    const d = dirs();
    bakeFamily(toy(16), { dirs: d });
    const promised = toySpec({ id: 'promised', bands: [{ id: 'open', target: 8, floor: 4, advanced: false }] });
    expect(verify(d, [toy(16), promised]).errors.join()).toMatch(/promised: band open has 0 certified/);
  });
  it('reports a required band a family never baked', () => {
    const d = dirs();
    bakeFamily(toy(16), { dirs: d });
    const grown = toySpec({ bands: [{ id: 'open', target: 16, floor: 1, advanced: false }, { id: 'deep', target: 8, floor: 2, advanced: false }] });
    expect(verify(d, [grown]).errors.join()).toMatch(/band deep has 0 certified/);
  });
  it('does not count retired packs toward a floor', () => {
    const d = dirs(), spec = toy(16);
    bakeFamily(spec, { dirs: d });
    rewriteFamily(d, 'toy', m => { m.retired = [0]; });
    expect(verify(d, [spec]).errors.join()).toMatch(/open has 0 certified/);
  });
  it('keeps an empty catalog valid until the shipping gate, which lists everything promised', () => {
    const d = dirs();
    mkdirSync(d.content, { recursive: true });
    writeFileSync(join(d.content, 'root.json'), JSON.stringify(emptyRoot()));
    expect(verifyCatalog(d, []).errors).toEqual([]);
    const errors = verifyCatalog(d, [], { shipping: true }).errors;
    expect(errors.join()).toMatch(/sudoku: promised for shipping but not registered/);
    expect(errors.length).toBe(BYTE_MODEL.length);
    expect(verifyCatalog(d, [], { shipping: true, promised: [] }).errors).toEqual([]);
  });
  it('holds a registered family to the shipping floor it was promised', () => {
    const d = dirs(), spec = toy(16);
    bakeFamily(spec, { dirs: d });
    approve(d);
    expect(verify(d, [spec], { shipping: true, promised: [{ family: 'toy', floor: 16 }] }).errors).toEqual([]);
    expect(verify(d, [spec], { shipping: true, promised: [{ family: 'toy', floor: 17 }] }).errors.join()).toMatch(/toy: 16 certified.*shipping floor of 17/);
  });
});
describe('R9: an append keeps the whole band inside its template share', () => {
  const balanced = () => { const d = dirs(), spec = toy(16); bakeFamily(spec, { dirs: d }); return d; };
  const appending = (template: (seed: number) => string, target = 17) => toySpec({ bands: [{ id: 'open', target, floor: 1, advanced: false }], generate: (seed, band) => ({ ...toySpec().generate(seed, band)!, template: template(seed) }) });
  it('leaves the catalog alone and says exhausted when only an over-share template is available', () => {
    const d = balanced(), before = snapshot(d), spec = appending(() => 't1');
    const report = bakeFamily(spec, { dirs: d, seedBase: 21, maxAttempts: 10 });
    expect(report).toMatchObject({ status: 'exhausted', published: false, accepted: { open: 16 } });
    expect(snapshot(d)).toEqual(before);
    expect(verify(d, [spec]).errors).toEqual([]);
  });
  it('publishes the valid candidates of a mixed append', () => {
    const d = balanced(), spec = appending(seed => (seed % 2 ? 't1' : 't9'));
    expect(bakeFamily(spec, { dirs: d, seedBase: 21, maxAttempts: 10 })).toMatchObject({ status: 'complete', published: true, accepted: { open: 17 } });
    expect(verify(d, [spec]).errors).toEqual([]);
  });
  it('re-trims when dropping repeated layouts shrinks the band under its template share', () => {
    const spec = toySpec({ bands: [{ id: 'open', target: 8, floor: 1, advanced: false }], generate: seed => ({ ...toySpec().generate(seed, spec.bands[0])!, layout: seed % 8 ? 'same' : 'other', template: `t${seed % 4}` }) });
    const d = dirs();
    expect(bakeFamily(spec, { dirs: d, maxAttempts: 8 }).published).toBe(true);
    expect(verify(d, [spec]).errors).toEqual([]);
  });
});
describe('committed catalog', () => {
  it('holds only the families owner slices have registered, each verifying clean', () => {
    expect(readCatalog(productionDirs).root.families.map(f => f[0]).sort()).toEqual(families.map(f => f.id).sort());
    expect(verifyCatalog(productionDirs, families).errors).toEqual([]);
  });
});

it('R2-5 excludes retired rows from active bake quotas and preserves a below-floor append',()=>{
 const d=dirs();
 try {
   bakeFamily(toy(16),{dirs:d});bakeFamily(toy(32,16),{dirs:d,seedBase:17});
   rewriteFamily(d,'toy',m=>{m.retired=[0];});
   expect(verify(d,[toy(32,16)]).errors).toEqual([]);
   const before=snapshot(d), base=toy(48,48), spec={...base,generate:(seed:number)=>toyCore({seed,payload:{goal:100+seed},layout:seed%2?'a':'b',template:`t${seed%4}`})};
   const report=bakeFamily(spec,{dirs:d,seedBase:33,maxAttempts:16});
   expect(report).toMatchObject({status:'exhausted',published:false,accepted:{open:32}});
   expect(snapshot(d)).toEqual(before);
   expect(verify(d,[toy(32,16)]).errors).toEqual([]);
 } finally {rmSync(join(d.content,'..'),{recursive:true,force:true});}
});

it('R2-5 can replace retired quota with a complete verifier-clean active band',()=>{
 const d=dirs();
 try {
  bakeFamily(toy(16),{dirs:d});bakeFamily(toy(32,16),{dirs:d,seedBase:17});rewriteFamily(d,'toy',m=>{m.retired=[0];});
  const base=toy(48,48),spec={...base,generate:(seed:number)=>toyCore({seed,payload:{goal:100+seed},layout:seed%2?'a':'b',template:`t${seed%4}`})};
  expect(bakeFamily(spec,{dirs:d,seedBase:33,maxAttempts:32})).toMatchObject({status:'complete',published:true,accepted:{open:48}});
  expect(verify(d,[spec]).errors).toEqual([]);expect(readCatalog(d).families.get('toy')!.retired).toEqual([0]);
 }finally{rmSync(join(d.content,'..'),{recursive:true,force:true});}
});
