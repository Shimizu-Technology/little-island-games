import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertRootAppendOnly, catalogIssues, type RootIndex } from '../src/puzzles/bank';
import { bakeFamily, productionDirs, readCatalog, verifyCatalog, type CatalogDirs } from '../scripts/puzzles/pipeline';
import { assertClaimable, parseRange, readReservations, reservationFor, reservationIssues, saveCatalogPath, slotClaim, slotRangeIssues, slotRangesFile, usedSlots, type Reservation } from '../scripts/puzzles/slots';
import { familyClaim as latinClaim } from '../scripts/puzzles/latin/bake';
import { familyClaim as edgeClaim } from '../scripts/puzzles/edges/bake';
import { toyCore, toySpec } from './helpers/puzzle-toy';
import type { FamilySpec } from '../src/puzzles/types';
import type { ToyPayload } from './helpers/puzzle-toy';

/** A register shaped like the real one: a group (10–39) holding one slice (20–29), and no reservation for 40–49. */
const register = { format: 1, source: 'test', banks: [
  { owner: 'base', first: 0, last: 9 }, { owner: 'group', first: 10, last: 39 }, { owner: 'slice', first: 20, last: 29, note: 'nested' }, { owner: 'tail', first: 50, last: 511 },
] };
const reservations = register.banks.map(({ owner, first, last }) => ({ owner, first, last })) as Reservation[];

/** A throwaway repository with the real published ref names, set with update-ref as a fetch would. */
function repo() {
  const cwd = mkdtempSync(join(tmpdir(), 'slot-claims-')), dirs: CatalogDirs = { content: join(cwd, 'content'), receipts: join(cwd, 'receipts') };
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  execFileSync('mkdir', ['-p', dirs.content]);
  writeFileSync(slotRangesFile(dirs), JSON.stringify(register));
  writeFileSync(join(cwd, 'save.json'), JSON.stringify({ banks: [{ slot: 12, entries: 3 }] }));
  const commit = (message: string) => { git('add', '-A'); git('commit', '-q', '-m', message); return git('rev-parse', 'HEAD').trim(); };
  const publish = (at: string) => { git('update-ref', 'refs/remotes/origin/main', at); git('update-ref', 'refs/remotes/origin/program/4.0', at); };
  const sources = { cwd, saveCatalog: 'save.json' };
  const claim = (range: string, owner?: string) => { const r = parseRange(range); return slotClaim(dirs, readCatalog(dirs).families.values(), r, owner ?? reservationFor(reservations, r).owner, sources); };
  const root = () => readCatalog(dirs).root;
  // Both refs start at a commit with the register and no catalog, as main did before the puzzle kit.
  publish(commit('register'));
  return { cwd, dirs, git, commit, publish, sources, claim, root, done: () => rmSync(cwd, { recursive: true, force: true }) };
}
const family = (id: string, offset: number, bands = ['open'], target = 8): FamilySpec<ToyPayload> => toySpec({ id, bands: bands.map(b => ({ id: b, target, floor: 1, advanced: false })),
  generate: (seed, band) => toyCore({ seed, band: band.id, payload: { goal: ((seed + offset) % 40) + 1 }, layout: seed % 2 ? 'a' : 'b', template: `t${seed % 4}` }) });
/** Takes a family out of the working root, as the unpublish tool does before a re-bake. */
const unlist = (dirs: CatalogDirs, id: string) => {
  const file = join(dirs.content, 'root.json'), root = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, `${JSON.stringify({ ...root, families: root.families.filter((f: [string]) => f[0] !== id) })}\n`);
};

describe('the slot register', () => {
  it('accepts disjoint or nested reservations inside the caps, and nothing else', () => {
    expect(reservationIssues(register)).toEqual([]);
    const banks = (extra: object) => ({ ...register, banks: [...register.banks, extra] });
    expect(reservationIssues(banks({ owner: 'cross', first: 25, last: 34 })).join()).toMatch(/overlap without one holding/);
    expect(reservationIssues(banks({ owner: 'twin', first: 20, last: 29 })).join()).toMatch(/same range/);
    expect(reservationIssues(banks({ owner: 'slice', first: 40, last: 41 })).join()).toMatch(/owners repeat/);
    expect(reservationIssues(banks({ owner: 'big', first: 0, last: 512 })).join()).toMatch(/malformed/);
    expect(reservationIssues(banks({ owner: 'odd', first: 44, last: 45, extra: 1 })).join()).toMatch(/malformed/);
    expect(reservationIssues({ ...register, format: 2 })).toEqual(['Slot ranges file is malformed.']);
  });
  it('parses first-last or one slot, inside 0–511', () => {
    expect(parseRange('260-279')).toEqual({ first: 260, last: 279 });
    expect(parseRange('77')).toEqual({ first: 77, last: 77 });
    for (const bad of ['279-260', '510-512', '-3', 'a-b', '1-2-3']) expect(() => parseRange(bad), bad).toThrow(/not first-last/);
  });
  it('gives a range to the innermost reservation holding it, and refuses one that crosses or holds another slice', () => {
    expect(reservationFor(reservations, { first: 20, last: 29 }).owner).toBe('slice');
    expect(reservationFor(reservations, { first: 22, last: 22 }).owner).toBe('slice');
    expect(reservationFor(reservations, { first: 30, last: 39 }).owner).toBe('group');
    expect(() => reservationFor(reservations, { first: 25, last: 34 })).toThrow(/crosses slice's reservation 20–29/);
    expect(() => reservationFor(reservations, { first: 10, last: 39 })).toThrow(/holds slice's reservation 20–29/);
    expect(() => reservationFor(reservations, { first: 40, last: 41 })).toThrow(/outside every recorded reservation/);
    expect(() => reservationFor(reservations, { first: 38, last: 41 })).toThrow(/outside every recorded reservation/);
  });
  it('flags a pack slot outside every reservation', () => {
    expect(slotRangeIssues(reservations, [{ slot: 9, what: 'a' }, { slot: 44, what: 'pack of toy' }])).toEqual(['Slot 44 (pack of toy) is outside every recorded reservation.']);
  });
});

describe('claiming reserved slots below the high-water mark', () => {
  it('claims below nextSlot without moving either counter back, and registered allocation requires an owner', { timeout: 60_000 }, () => {
    const r = repo();
    try {
      // A registered catalog requires an explicit owner, even at its initial slot.
      expect(bakeFamily(family('toy', 0), { dirs: r.dirs, sourceSha: 'base', claim: r.claim('0-9') }).slots).toEqual([0]);
      r.publish(r.commit('published toy'));
      // A slice high in the register bakes first and takes the counters past everyone below it.
      const before = r.root(), high = bakeFamily(family('toy-high', 3), { dirs: r.dirs, sourceSha: 'high', claim: r.claim('300-309') });
      expect(high.slots).toEqual([300]);
      const afterHigh = r.root();
      expect(afterHigh).toMatchObject({ nextSlot: 301, nextOrdinal: 300 * 1024 + 8 });
      assertRootAppendOnly(before, afterHigh);
      // The slice below it still gets its own slots, ordinals from each slot's own block.
      const low = bakeFamily(family('toy-low', 7, ['one', 'two']), { dirs: r.dirs, sourceSha: 'low', claim: r.claim('20-29') });
      expect(low).toMatchObject({ published: true, slots: [20, 21] });
      const afterLow = r.root(), manifest = readCatalog(r.dirs).families.get('toy-low')!;
      expect(manifest.packs.map(p => [p[0], p[1]])).toEqual([[20, 20 * 1024], [21, 21 * 1024]]);
      expect(afterLow).toMatchObject({ nextSlot: 301, nextOrdinal: 300 * 1024 + 8 });
      assertRootAppendOnly(afterHigh, afterLow);
      // The high-water mark cannot silently allocate another reserved slot.
      expect(() => bakeFamily(family('unclaimed', 11), { dirs: r.dirs })).toThrow(/explicit owner claim/);
      expect(bakeFamily(family('toy-next', 11), { dirs: r.dirs, sourceSha: 'next', claim: r.claim('301-309') }).slots).toEqual([301]);
      const { root, families } = readCatalog(r.dirs);
      assertRootAppendOnly(afterLow, root);
      expect(catalogIssues(root, families.values())).toEqual([]);
      expect(verifyCatalog(r.dirs, ['toy', 'toy-high', 'toy-low', 'toy-next'].map((id, i) => family(id, [0, 3, 7, 11][i], id === 'toy-low' ? ['one', 'two'] : ['open'])) as FamilySpec<unknown>[], { byteModel: false }).errors).toEqual([]);
    } finally { r.done(); }
  });

  it('refuses a used, retired or published slot, and a save-catalog bank', { timeout: 60_000 }, () => {
    const r = repo();
    try {
      bakeFamily(family('toy', 0), { dirs: r.dirs, sourceSha: 'base', claim: r.claim('22-29') });
      bakeFamily(family('gone', 5), { dirs: r.dirs, sourceSha: 'gone', claim: r.claim('26-29') });
      writeFileSync(join(r.cwd, 'save.json'), JSON.stringify({ banks: [{ slot: 12, entries: 3 }, { slot: 25, entries: 2 }] }));
      r.publish(r.commit('published toy, gone and bank 25'));
      // The branch drops both of its own copies; the published tips still hold them.
      unlist(r.dirs, 'gone');
      writeFileSync(join(r.cwd, 'save.json'), JSON.stringify({ banks: [{ slot: 12, entries: 3 }] }));
      const used = (range: string) => () => bakeFamily(family('new', 9), { dirs: r.dirs, sourceSha: 'new', claim: r.claim(range) });
      const snapshot = () => [readFileSync(join(r.dirs.content, 'root.json'), 'utf8'), readdirSync(join(r.dirs.content, 'assets')).sort()];
      const kept = snapshot();
      expect(used('22-29')).toThrow(/Slot 22 cannot be claimed: it is a pack of toy\./);
      expect(used('26-29')).toThrow(/Slot 26 cannot be claimed: it is a pack of gone published at origin\/program\/4\.0/);
      expect(used('25-29')).toThrow(/Slot 25 cannot be claimed: it is an inline save-catalog bank published at origin\/program\/4\.0/);
      expect(used('12-19')).toThrow(/Slot 12 cannot be claimed: it is an inline save-catalog bank\./);
      // Nothing moved for any refusal.
      expect(snapshot()).toEqual(kept);
      // A retired pack is used for good.
      const retired = usedSlots(r.dirs, [{ family: 'old', packs: [[27, 27 * 1024, 4, 100, 'a'.repeat(64), 0, 1, 1]], retired: [27] }], r.sources);
      expect(() => assertClaimable({ range: { first: 20, last: 29 }, owner: 'slice', used: retired }, 27)).toThrow(/it is a retired pack of old/);
      // The free slot next to them is still claimable, even with a stale packed bank left by an
      // unpublished in-place re-bake: the working pack, not its save-catalog mirror, decides.
      writeFileSync(join(r.cwd, 'save.json'), JSON.stringify({ banks: [{ slot: 12, entries: 3 }, { slot: 23, engine: 'toy', family: 'new', first: 23552, count: 8, packHash: 'b'.repeat(64) }] }));
      expect(bakeFamily(family('new', 9), { dirs: r.dirs, sourceSha: 'new', claim: r.claim('23-24') }).slots).toEqual([23]);
    } finally { r.done(); }
  });

  it("refuses slots outside the caller's range, and ranges outside the register", { timeout: 60_000 }, () => {
    const r = repo();
    try {
      expect(() => r.claim('25-34')).toThrow(/crosses slice's reservation/);
      expect(() => r.claim('40-45')).toThrow(/outside every recorded reservation/);
      // The range must be the caller's own: a group cannot take its slice's slots, nor one slice another's.
      expect(() => r.claim('20-29', 'group')).toThrow(/Slot range 20–29 is slice's, not group's/);
      expect(() => r.claim('30-39', 'slice')).toThrow(/Slot range 30–39 is group's, not slice's/);
      // Two bands need two packs; a one-slot range has room for only the first, so nothing publishes.
      expect(() => bakeFamily(family('toy', 0, ['one', 'two']), { dirs: r.dirs, sourceSha: 'two', claim: r.claim('29') })).toThrow(/Slot 30 is outside the claimed range 29 \(slice\)/);
      expect(r.root()).toMatchObject({ nextSlot: 0, nextOrdinal: 0, families: [] });
      expect(() => assertClaimable(r.claim('20-29'), 19)).toThrow(/outside the claimed range 20–29/);
      // A family's packs ascend, so an append claims above its last pack.
      bakeFamily(family('toy', 0), { dirs: r.dirs, sourceSha: 'one', claim: r.claim('28-29') });
      expect(() => bakeFamily(family('toy', 0, ['open'], 16), { dirs: r.dirs, sourceSha: 'append', seedBase: 99, claim: r.claim('20-27') })).toThrow(/below toy's last pack 28/);
      expect(bakeFamily(family('toy', 0, ['open'], 16), { dirs: r.dirs, sourceSha: 'append', seedBase: 99, claim: r.claim('29') }).slots).toEqual([29]);
    } finally { r.done(); }
  });
});

describe('the published catalog under the register', () => {
  const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const files = () => [join(productionDirs.content, 'root.json'), saveCatalogPath, join(productionDirs.content, 'assets.generated.ts'), ...readdirSync(join(productionDirs.content, 'assets')).sort().map(f => join(productionDirs.content, 'assets', f))].map(f => [f, sha(f)]);
  // HEAD stands in for the published refs, so the test needs no fetch and reads what this commit carries.
  const sources = { refs: ['HEAD'] };
  it('keeps every pack and save bank inside a recorded reservation, with no inline bank on a pack', () => {
    const ranges = readReservations(productionDirs), { root, families } = readCatalog(productionDirs);
    const packs = [...families.values()].flatMap(m => m.packs.map(p => ({ slot: p[0], what: `pack of ${m.family}` })));
    const banks = (JSON.parse(readFileSync(saveCatalogPath, 'utf8')) as { banks: { slot: number; entries?: unknown }[] }).banks;
    expect(catalogIssues(root, families.values())).toEqual([]);
    expect(slotRangeIssues(ranges, packs)).toEqual([]);
    expect(slotRangeIssues(ranges, banks.map(b => ({ slot: b.slot, what: 'save-catalog bank' })))).toEqual([]);
    expect(banks.filter(b => 'entries' in b && packs.some(p => p.slot === b.slot))).toEqual([]);
    // Mirrors the lead's SLOTS.md, including the wave-1 slices nested in their groups.
    const owner = (first: number, last: number) => reservationFor(ranges, { first, last }).owner;
    expect([owner(40, 59), owner(60, 79), owner(80, 99), owner(100, 109), owner(110, 199), owner(260, 279), owner(280, 297), owner(420, 429), owner(440, 449), owner(500, 511)])
      .toEqual(['g3-latin', 'g5-edges', 'g6-word-search', 'g7a-solitaire', 'other-cove', 't1-logic-lagoon', 'thinking', 'n1a', 'r1a', 'a1-arcade']);
  });
  it('lets G6, G7a, T1 and G5\'s free tail claim below nextSlot, refuses published slots, and changes no published byte', () => {
    const before = files(), { root, families } = readCatalog(productionDirs), claim = (range: string) => { const r = parseRange(range); return slotClaim(productionDirs, families.values(), r, reservationFor(readReservations(productionDirs), r).owner, sources); };
    // Derived from the catalog this commit carries, so a slice that correctly bakes into its own range (G6, G7a, T1)
    // turns its first slot into an expected refusal instead of breaking the gate.
    const taken = new Set([...[...families.values()].flatMap(m => m.packs.map(p => p[0])),
      ...(JSON.parse(readFileSync(saveCatalogPath, 'utf8')) as { banks: { slot: number }[] }).banks.map(b => b.slot)]);
    for (const range of ['80-99', '100-109', '260-279', '77-79', '73']) {
      const { first, last } = parseRange(range), free = Array.from({ length: last - first + 1 }, (_, i) => first + i).find(s => !taken.has(s));
      if (taken.has(first)) expect(() => assertClaimable(claim(range), first), range).toThrow(/cannot be claimed/);
      if (free !== undefined) expect(() => assertClaimable(claim(range), free), range).not.toThrow();
    }
    expect(() => assertClaimable(claim('40-59'), 40)).toThrow(/it is a pack of sudoku/);
    expect(() => assertClaimable(claim('7-19'), 7)).toThrow(/save-catalog bank/);
    expect(() => assertClaimable(claim('420-429'), 425)).toThrow(/save-catalog bank/);
    // The Latin and edge bakes now check a claim, not the catalog's next slot.
    expect(() => latinClaim(productionDirs, 'sudoku', undefined, sources)).toThrow(/Slot 40 cannot be claimed: it is a pack of sudoku/);
    expect(edgeClaim(productionDirs, 'pearl-loop', '77-79', sources).range).toEqual({ first: 77, last: 79 });
    expect(() => edgeClaim(productionDirs, 'pearl-loop', '80-81', sources)).toThrow(/Slot range 80–81 is g6-word-search's, not g5-edges's/);
    expect(readCatalog(productionDirs).root).toEqual(root satisfies RootIndex);
    expect(files()).toEqual(before);
  });
});

it('refuses an unclaimed non-T1 bake at nextSlot270 before generation and leaves the catalog untouched', () => {
 const r=repo();try {
  writeFileSync(slotRangesFile(r.dirs),JSON.stringify({format:1,source:'lead test',banks:[{owner:'t1-logic-lagoon',first:260,last:279}]}));
  const root={...r.root(),nextSlot:270,nextOrdinal:270*1024};writeFileSync(join(r.dirs.content,'root.json'),JSON.stringify(root));
  const before=readFileSync(join(r.dirs.content,'root.json'),'utf8');let generated=false;
  const spec=family('not-t1',7),generate=spec.generate;spec.generate=(...args)=>{generated=true;return generate(...args);};
  expect(()=>bakeFamily(spec,{dirs:r.dirs})).toThrow(/Slot 270.*t1-logic-lagoon.*explicit owner claim/);
  expect(generated).toBe(false);expect(readFileSync(join(r.dirs.content,'root.json'),'utf8')).toBe(before);
 }finally{r.done();}
});
