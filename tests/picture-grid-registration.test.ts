import { expect, it } from 'vitest';
import { pictureGridFamily } from '../scripts/puzzles/families/picture-grid';
import { encodePack, manifestAsset, type FamilyManifest, type RootIndex } from '../src/puzzles/bank';
import { encodeRow } from '../src/puzzles/descriptor';
import { createBankLoader } from '../src/puzzles/loader';
import { sha256Hex } from '../src/puzzles/sha256';
import { emptyChallenge, validChallengeSession } from '../src/state/challenge';
import { FILL } from '../src/puzzles/picture-grid/engine';
import { provePicture } from '../src/puzzles/picture-grid/solver';
import { decodePicture } from '../src/puzzles/picture-grid/checkpoint';
import { definePictureGrid, pictureGridBankFacts } from '../src/puzzles/picture-grid/registration';

it('loads the exact packed picture, resumes its checkpoint, and credits a helped finish', async () => {
  const family = pictureGridFamily;
  const band = family.bands[0], descriptors = [family.generate(1, band)!, family.generate(2, band)!];
  const first = 110 * 1024;
  const pack = encodePack({ format: 1, family: family.id, count: 2, first, slot: 110, band: band.id, rules: 1, rng: 1 },
    descriptors.map(descriptor => encodeRow(descriptor, family.adapter)));
  const manifest: FamilyManifest = { family: family.id, engine: family.id, format: 1, bands: [band.id], retired: [], daily: [],
    packs: [[110, first, 2, pack.length, sha256Hex(pack), 0, 1, 1]], speech: { count: 0, hash: null } };
  const manifestText = JSON.stringify(manifest), manifestHash = sha256Hex(manifestText), asset = manifestAsset(family.id, manifestHash);
  const root: RootIndex = { format: 1, revision: 1, nextSlot: 111, nextOrdinal: first + 2,
    families: [[family.id, asset, manifestHash, 2, 1, pack.length + manifestText.length]] };
  const loader = createBankLoader({ root, transport: { read: async key => key === asset ? manifestText : key === 'p110' ? pack : '' } });
  const facts = pictureGridBankFacts(manifest);
  const options = { loader: () => loader, cleanDares: [{ slot: 1700, bank: 110, puzzle: 0, id: 'no-hint', label: 'Solve without a hint' }] };
  const entry = definePictureGrid(facts, options);
  const owner = 'cove-player', progress = emptyChallenge(true);
  const ref = await entry.packed!.choose(110, progress);
  expect(ref).toMatchObject({ bank: 110, puzzle: 0 });
  expect(entry.packed!.card(ref)?.title).toBe('Picture Grid · Easy 1');
  expect((await entry.packed!.choose(110, progress, ref)).puzzle).toBe(1);
  await expect(entry.packed!.prepare({ ...ref, hash: '0'.repeat(64) })).rejects.toThrow('saved fingerprint');

  const launch = { supportOff: false, ownRead: false };
  expect(entry.packed!.card(ref)?.dares).toMatchObject([{ slot: 1700, rule: { kind: 'clean' } }]);
  expect(() => entry.start(ref, owner, 'wrong-dare', progress, launch, [1701])).toThrow();
  let session = entry.start(ref, owner, 'picture-try', progress, launch, [1700]);
  session = entry.move(session, { type: 'hint' })!;
  expect(decodePicture(session.payload)?.helps).toBe(1);
  const saved = JSON.parse(JSON.stringify(session));
  const resumed = definePictureGrid(facts, options);
  await resumed.packed!.prepare(ref);
  expect(validChallengeSession(saved, owner, resumed.catalog, true)).toBe(true);
  session = saved;

  const picture = descriptors[0].payload;
  let cleanSession = resumed.start(ref, owner, 'clean-try', progress, launch, [1700]);
  provePicture(picture).marks.forEach((mark, cell) => {
    if (mark !== FILL) return;
    const paint = { type: 'paint', from: cell, to: cell, mark };
    session = resumed.move(session, paint)!;
    cleanSession = resumed.move(cleanSession, paint)!;
  });
  expect(session.result).toMatchObject({ event: 'helped', dares: [] });
  expect(cleanSession.result).toMatchObject({ event: 'independent', dares: [1700] });
  expect(validChallengeSession(session, owner, resumed.catalog, true)).toBe(true);
  expect(resumed.move(session, { type: 'undo' })).toBeNull();
});

it('bakes the four packs deterministically through the production packer in a scratch catalog', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { bakeFamily, readCatalog, readPackText } = await import('../scripts/puzzles/pipeline');
  const scratch = mkdtempSync(join(tmpdir(), 'li-picture-grid-'));
  try {
    const bake = (label: string) => {
      const dirs = { content: join(scratch, label, 'content'), receipts: join(scratch, label, 'receipts') };
      const report = bakeFamily(pictureGridFamily, {
        dirs, claim: { owner: 'g4a-picture-grid', range: { first: 110, last: 139 }, used: new Map() },
        maxAttempts: 32,
      });
      expect(report).toMatchObject({ status: 'complete', published: true, slots: [110, 111, 112, 113] });
      const catalog = readCatalog(dirs), manifest = catalog.families.get(pictureGridFamily.id)!;
      const packs = report.slots.map(slot => readPackText(dirs, slot));
      return { root: catalog.root, manifest, packs, facts: pictureGridBankFacts(manifest) };
    };
    const first = bake('first');
    expect(first.facts.map(bank => bank.count)).toEqual([30, 28, 9, 11]);
    expect(bake('repeat')).toEqual(first);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
