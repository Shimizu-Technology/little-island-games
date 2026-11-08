import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BANK_CAPS, encodePack, manifestAsset, type FamilyManifest, type PackRow, type RootIndex } from '../src/puzzles/bank';
import { encodeRow } from '../src/puzzles/descriptor';
import { BankError, createBankLoader, type BankTransport } from '../src/puzzles/loader';
import { toyAdapter, toyCore } from './helpers/puzzle-toy';

const sha = (t: string) => createHash('sha256').update(t).digest('hex');
function catalog(packCount = 4, rows = 8) {
  const adapter = toyAdapter(), files = new Map<string, string>(), packs: PackRow[] = [];
  for (let slot = 0; slot < packCount; slot++) {
    const first = slot * rows;
    const lines = Array.from({ length: rows }, (_, i) => encodeRow(toyCore({ seed: first + i, payload: { goal: first + i + 1 }, layout: i % 2 ? 'a' : 'b' }), adapter));
    const text = encodePack({ format: 1, family: 'toy', slot, first, count: rows, band: 'open', rules: 1, rng: 1 }, lines);
    files.set(`p${slot}`, text);
    packs.push([slot, first, rows, Buffer.byteLength(text), sha(text), 0, 1, 1]);
  }
  const manifest: FamilyManifest = { format: 1, family: 'toy', engine: 'toy', bands: ['open'], packs, retired: [], daily: [], speech: { count: 0, hash: null } };
  const text = JSON.stringify(manifest), hash = sha(text), asset = manifestAsset('toy', hash);
  files.set(asset, text);
  const root: RootIndex = { format: 1, revision: 1, nextSlot: packCount, nextOrdinal: packCount * rows, families: [['toy', asset, hash, packCount * rows, packCount, text.length]] };
  const reads: string[] = [];
  const transport: BankTransport = { read: async name => { reads.push(name); const f = files.get(name); if (f === undefined) throw new Error('missing'); return f; } };
  return { adapter, files, root, manifest, reads, transport, asset, hash };
}
const kinds = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return e instanceof BankError ? e.kind : 'other'; } };
describe('bank loader', () => {
  it('reads nothing until a family is entered', () => {
    const { root, transport, reads } = catalog();
    createBankLoader({ root, transport });
    expect(reads).toEqual([]);
  });
  it('opens a family, then one pack, and decodes the row with its own hash', async () => {
    const { root, transport, adapter, reads, files } = catalog();
    const loader = createBankLoader({ root, transport });
    const d = await loader.entry(adapter, 'toy', 9);
    expect(d.payload.goal).toBe(10);
    expect(d.ref).toEqual({ bank: 1, puzzle: 1, engine: 'toy', rules: 1, hash: sha(files.get('p1')!.split('\n')[2]) });
    expect(reads.filter(r => r.startsWith('f-'))).toHaveLength(1);
    expect(reads.filter(r => r.startsWith('p'))).toEqual(['p1']);
  });
  it('holds two packs at most, keeping the most recently opened', async () => {
    const { root, transport, adapter, reads } = catalog();
    const loader = createBankLoader({ root, transport });
    await loader.entry(adapter, 'toy', 0);
    await loader.entry(adapter, 'toy', 8);
    await loader.entry(adapter, 'toy', 0); // pack 0 is now the most recent
    expect(loader.decodedPacks()).toEqual([1, 0]);
    await loader.entry(adapter, 'toy', 16);
    expect(loader.decodedPacks()).toEqual([0, 2]);
    expect(reads.filter(r => r === 'p0')).toHaveLength(1);
  });
  it('serves a warm pack without another read', async () => {
    const { root, transport, adapter, reads } = catalog();
    const loader = createBankLoader({ root, transport });
    await loader.entry(adapter, 'toy', 0);
    const count = reads.length;
    await loader.entry(adapter, 'toy', 1);
    expect(reads.length).toBe(count);
    expect(loader.timings().map(t => t.kind)).toEqual(['cold', 'warm']);
  });
  it('shares one read between concurrent requests for a pack', async () => {
    const { root, transport, adapter, reads } = catalog();
    const loader = createBankLoader({ root, transport });
    await Promise.all([loader.entry(adapter, 'toy', 0), loader.entry(adapter, 'toy', 1), loader.entry(adapter, 'toy', 2)]);
    expect(reads.filter(r => r === 'p0')).toHaveLength(1);
  });
  it('reads one pack at a time', async () => {
    const { root, manifest, files } = catalog();
    let open = 0, peak = 0;
    const transport: BankTransport = { read: async name => { open++; peak = Math.max(peak, open); await new Promise(r => setTimeout(r, 1)); open--; return files.get(name)!; } };
    const loader = createBankLoader({ root, transport });
    await Promise.all(manifest.packs.slice(0, 4).map(row => loader.pack(manifest, row)));
    expect(peak).toBe(1);
  });
  it.each<[string, (files: Map<string, string>) => void, string]>([
    ['a changed pack byte', files => files.set('p0', files.get('p0')!.replace('"b"', '"c"')), 'hash-mismatch'],
    ['a missing pack', files => files.delete('p0'), 'read-failed'],
    ['an oversized pack', files => files.set('p0', 'x'.repeat(BANK_CAPS.packBytes + 1)), 'too-large'],
  ])('rejects %s and admits nothing', async (_, damage, kind) => {
    const { root, transport, adapter, files } = catalog();
    damage(files);
    const loader = createBankLoader({ root, transport });
    expect(await kinds(loader.entry(adapter, 'toy', 0))).toBe(kind);
    expect(loader.decodedPacks()).toEqual([]);
  });
  it('rejects a manifest that fails its hash or is too large', async () => {
    const bad = catalog();
    bad.files.set(bad.asset, bad.files.get(bad.asset)!.replace('toy', 'yot'));
    expect(await kinds(createBankLoader({ root: bad.root, transport: bad.transport }).family('toy'))).toBe('hash-mismatch');
    const big = catalog();
    big.files.set(big.asset, 'x'.repeat(BANK_CAPS.familyBytes + 1));
    expect(await kinds(createBankLoader({ root: big.root, transport: big.transport }).family('toy'))).toBe('too-large');
  });
  it('rejects a well-hashed manifest that is not a manifest', async () => {
    const c = catalog(), text = '{"nope":1}', hash = sha(text), asset = manifestAsset('toy', hash);
    c.files.set(asset, text);
    const root: RootIndex = { ...c.root, families: [['toy', asset, hash, 1, 1, 1]] };
    expect(await kinds(createBankLoader({ root, transport: c.transport }).family('toy'))).toBe('malformed');
  });
  it('rejects an unknown family, an unknown ordinal and the wrong engine revision', async () => {
    const { root, transport, adapter } = catalog();
    const loader = createBankLoader({ root, transport });
    expect(await kinds(loader.family('none'))).toBe('unknown');
    expect(await kinds(loader.entry(adapter, 'toy', 9999))).toBe('unknown');
    expect(await kinds(loader.entry(toyAdapter({ rules: 2 }), 'toy', 0))).toBe('malformed');
    expect(await kinds(loader.entry(toyAdapter({ engine: 'other' }), 'toy', 0))).toBe('malformed');
  });
  it('stops a cancelled request without poisoning the next one', async () => {
    const { root, transport, adapter } = catalog();
    const loader = createBankLoader({ root, transport });
    expect(await kinds(loader.entry(adapter, 'toy', 0, { cancelled: true }))).toBe('cancelled');
    expect((await loader.entry(adapter, 'toy', 0)).payload.goal).toBe(1);
  });
  it('abandons work and frees packs on release', async () => {
    const { root, transport, adapter, manifest } = catalog();
    const loader = createBankLoader({ root, transport });
    await loader.entry(adapter, 'toy', 0);
    expect(loader.decodedPacks()).toEqual([0]);
    const pending = loader.pack(manifest, manifest.packs[1]);
    loader.release();
    expect(await kinds(pending)).toBe('cancelled');
    expect(loader.decodedPacks()).toEqual([]);
    expect((await loader.entry(adapter, 'toy', 8)).payload.goal).toBe(9);
  });
  describe('R10: release cancels work at every await', () => {
    const held = (files: Map<string, string>, stops: (name: string) => boolean) => {
      let open = () => {};
      const gate = new Promise<void>(resolve => { open = resolve; });
      const reads: string[] = [];
      const transport: BankTransport = { read: async name => { reads.push(name); if (stops(name)) await gate; const f = files.get(name); if (f === undefined) throw new Error('missing'); return f; } };
      return { transport, reads, open: () => open() };
    };
    const settle = () => new Promise(resolve => setTimeout(resolve, 0));
    it('cancels an entry when release lands during the family read', async () => {
      const c = catalog(), h = held(c.files, name => name.startsWith('f-'));
      const loader = createBankLoader({ root: c.root, transport: h.transport });
      const pending = loader.entry(c.adapter, 'toy', 0);
      await settle();
      loader.release();
      h.open();
      expect(await kinds(pending)).toBe('cancelled');
      expect(loader.decodedPacks()).toEqual([]);
      expect(h.reads.filter(r => r.startsWith('p'))).toEqual([]);
    });
    it('does not cache a manifest that was read before the release', async () => {
      const c = catalog(), h = held(c.files, name => name.startsWith('f-'));
      const loader = createBankLoader({ root: c.root, transport: h.transport });
      const pending = loader.family('toy');
      await settle();
      loader.release();
      h.open();
      expect(await kinds(pending)).toBe('cancelled');
      await loader.family('toy');
      expect(h.reads.filter(r => r.startsWith('f-'))).toHaveLength(2);
    });
    it('cancels when release lands during a hashing pause of the manifest', async () => {
      const c = catalog(60, 1);
      let clock = 0, released = false;
      const loader = createBankLoader({ root: c.root, transport: c.transport, budgetMs: 1, now: () => (clock += 1), pause: async () => { if (!released) { released = true; loader.release(); } } });
      expect(await kinds(loader.entry(c.adapter, 'toy', 0))).toBe('cancelled');
      expect(loader.decodedPacks()).toEqual([]);
      expect(released).toBe(true);
    });
    it('cancels when release lands during a hashing pause of the pack', async () => {
      const c = catalog(1, 1000);
      let clock = 0, armed = false, released = false;
      const loader = createBankLoader({ root: c.root, transport: c.transport, budgetMs: 1, now: () => (clock += 1), pause: async () => { if (armed && !released) { released = true; loader.release(); } } });
      await loader.family('toy');
      armed = true;
      expect(await kinds(loader.entry(c.adapter, 'toy', 0))).toBe('cancelled');
      expect(loader.decodedPacks()).toEqual([]);
    });
    it('keeps the starting generation from the family through the pack', async () => {
      const c = catalog(), h = held(c.files, name => name.startsWith('p'));
      const loader = createBankLoader({ root: c.root, transport: h.transport });
      const pending = loader.entry(c.adapter, 'toy', 0);
      await settle();
      expect(h.reads.filter(r => r.startsWith('p'))).toEqual(['p0']);
      loader.release();
      h.open();
      expect(await kinds(pending)).toBe('cancelled');
      expect(loader.decodedPacks()).toEqual([]);
    });
    it('gives a request made after release its own read, not the abandoned one', async () => {
      const c = catalog(), h = held(c.files, name => name === 'p0');
      const loader = createBankLoader({ root: c.root, transport: h.transport });
      const old = loader.pack(c.manifest, c.manifest.packs[0]);
      await settle();
      loader.release();
      const fresh = loader.pack(c.manifest, c.manifest.packs[0]);
      h.open();
      expect(await kinds(old)).toBe('cancelled');
      expect(await kinds(fresh)).toBe('ok');
      expect(loader.decodedPacks()).toEqual([0]);
    });
  });
  it('R2-1 cancels a warm entry between awaited continuations', async () => {
    const c = catalog(), loader = createBankLoader({ root: c.root, transport: c.transport });
    await loader.entry(c.adapter, 'toy', 0);
    const pending = loader.entry(c.adapter, 'toy', 0);
    queueMicrotask(() => loader.release());
    expect(await kinds(pending)).toBe('cancelled');
    expect(loader.decodedPacks()).toEqual([]);
  });
  it('recovers after a failed read: the queue is not stuck', async () => {
    const c = catalog(), original = c.files.get('p0')!;
    c.files.delete('p0');
    const loader = createBankLoader({ root: c.root, transport: c.transport });
    expect(await kinds(loader.entry(c.adapter, 'toy', 0))).toBe('read-failed');
    c.files.set('p0', original);
    expect((await loader.entry(c.adapter, 'toy', 0)).payload.goal).toBe(1);
  });
  it('checks a pack in slices of at most the budget', async () => {
    const c = catalog(2, 3000);
    // Each clock read is one unit. A whole slice between two pauses reads it once per step, plus the check.
    let clock = 0, reads = 0;
    const slices: number[] = [];
    const loader = createBankLoader({ root: c.root, transport: c.transport, budgetMs: 8, now: () => { clock += 1; reads += 1; return clock; }, pause: async () => { slices.push(reads); reads = 0; } });
    await loader.pack(c.manifest, c.manifest.packs[0]);
    expect(slices.length).toBeGreaterThan(1);
    expect(Math.max(...slices.slice(1))).toBeLessThanOrEqual(9);
  });
  it('keeps the timing ring bounded', async () => {
    const { root, transport, adapter } = catalog(1, 2);
    const loader = createBankLoader({ root, transport });
    for (let i = 0; i < 400; i++) await loader.entry(adapter, 'toy', 0);
    expect(loader.timings().length).toBe(256);
  });
});

it('freezes verified family, pack and entry facts against cache mutation',async()=>{
 const c=catalog(),loader=createBankLoader({root:c.root,transport:c.transport});
 const m=await loader.family('toy');expect(()=>{m.packs[0][4]='f'.repeat(64);}).toThrow();
 const p=await loader.pack(m,m.packs[0]);expect(()=>{(p.rows as string[])[0]='forged';}).toThrow();
 const d=await loader.entry(c.adapter,'toy',0);expect(()=>{d.ref.hash='f'.repeat(64);}).toThrow();expect(()=>{d.payload.goal=999;}).toThrow();
});
it('a warm externally supplied pack cannot substitute for the root-verified saved-ref chain',async()=>{
 const c=catalog(),loader=createBankLoader({root:c.root,transport:c.transport});
 const forgedText=c.files.get('p0')!.replace(',1]',',999]'), row=[...c.manifest.packs[0]] as PackRow;row[3]=Buffer.byteLength(forgedText);row[4]=sha(forgedText);
 const original=c.files.get('p0')!;c.files.set('p0',forgedText);await loader.pack(c.manifest,row);c.files.set('p0',original);
 const bank={slot:0,engine:'toy',rules:1,first:0,count:8,family:'toy',packHash:c.manifest.packs[0][4],awards:0,cove:true};
 expect(await loader.savedHash(bank,0)).toBe(sha(original.split('\n')[1]));
});
