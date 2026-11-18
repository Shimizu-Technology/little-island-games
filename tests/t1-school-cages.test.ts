import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { engine, taskAt } from '../src/learn/games/logic-lagoon/engine';
import { schoolCage } from '../src/learn/games/logic-lagoon/school-cages';
import { makeRegistration } from '../src/learn/games/logic-lagoon/challenge';
import { emptyChallenge } from '../src/state/challenge';
import { createBankLoader } from '../src/puzzles/loader';
import { catalogRoot } from '../src/puzzles/catalog';
import { lagoonLatinAdapter } from '../src/puzzles/adapters/lagoon-latin';
import { decodeRow } from '../src/puzzles/descriptor';
import { decodePuzzle, encodePuzzle } from '../src/puzzles/latin/core';
import { grade } from '../src/puzzles/latin/solver';
import { independentCount } from '../src/puzzles/latin/independent';
import { semanticHash } from '../src/puzzles/semantic';
import { clueSinglesBot } from '../scripts/puzzles/logic-lagoon/clue-bot';
import { optionsAtLevel } from '../src/learn/levelOptions';
import frozen from './fixtures/t1-catalog2-fingerprints.json';
import data from '../src/learn/games/logic-lagoon/supply-v3.json';
import facts from '../src/learn/games/logic-lagoon/packs.generated.json';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const rows = JSON.parse(data.cages) as { source: [number, number, string]; puzzle: unknown }[];

it('catalog 2 keeps every accepted level and seed mapping', () => {
  for (const [level, seed, index, fingerprint] of frozen.rows) {
    const s = { version: 2 as const, catalog: 2 as const, level: +level, seed: +seed, index: +index, total: 4 as const, board: null, helped: false };
    expect(sha(JSON.stringify(taskAt(s)))).toBe(fingerprint);
  }
});

it('all 1,600 School cages have original packed identities, unique solutions and combination work', () => {
  expect(rows).toHaveLength(1600);
  const seen = new Set<string>(), packs = new Map<number, string[]>();
  const challenge = new Set(readFileSync('src/content/puzzles/assets/p260.lipuzzle', 'utf8').trimEnd().split('\n').slice(1).map(line => semanticHash(lagoonLatinAdapter.semanticKey(decodeRow(line, 'cages', lagoonLatinAdapter)!))));
  for (const row of rows) {
    const [slot, index, hash] = row.source;
    expect([268, 269]).toContain(slot);
    if (!packs.has(slot)) packs.set(slot, readFileSync(`src/content/puzzles/assets/p${slot}.lipuzzle`, 'utf8').trimEnd().split('\n').slice(1));
    const line = packs.get(slot)![index];
    expect(sha(line)).toBe(hash); expect(JSON.parse(line)[3]).toEqual(row.puzzle);
    const p = decodePuzzle(row.puzzle)!;
    expect(p.kind).toBe('killer'); expect(p.size).toBe(4); expect(p.givens.some(Boolean)).toBe(false);
    expect(grade(p)).toMatchObject({ status: 'complete', ceiling: 'cage-sum' });
    expect(independentCount(p)).toMatchObject({ status: 'counted', count: 1 });
    expect(clueSinglesBot(p).solved).toBe(false);
    const d = { payload: p } as Parameters<typeof lagoonLatinAdapter.semanticKey>[0];
    const key = semanticHash(lagoonLatinAdapter.semanticKey(d));
    expect(challenge.has(key)).toBe(false);
    expect(seen.has(key)).toBe(false); seen.add(key);
  }
});

it('sequential seeds cover 400 distinct four-cage base rounds before a symmetry is reused', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 400; seed++) for (let index = 0; index < 4; index++) {
    const p = schoolCage(seed, index), key = JSON.stringify(encodePuzzle(p));
    expect(seen.has(key)).toBe(false); seen.add(key);
    expect(encodePuzzle(schoolCage(seed + 3200, index))).toEqual(encodePuzzle(p));
  }
  expect(seen.size).toBe(1600);
  const o = optionsAtLevel({ mode: 'solo', pace: 'easy' }, 5);
  const s = engine.create(o, { rng: () => 17 / 0xffffffff, skills: {}, starter: 0, today: 1 });
  expect(s.version === 2 && s.catalog).toBe(3); expect(engine.validate(s, o)).toBe(true);
  expect(engine.validate({ ...s, catalog: 4 }, o)).toBe(false);
});

it('School-only banks have no Challenge choose, prepare or start route', async () => {
  const loader = createBankLoader({ root: catalogRoot(), transport: { read: async asset => readFileSync(`src/content/puzzles/assets/${asset}.lipuzzle`, 'utf8') } });
  const game = makeRegistration(() => loader);
  expect(game.packed!.bands.map(b => b.bank)).toEqual([260, 261, 262]);
  for (const f of facts.filter(f => f.band === 'school-cages')) {
    expect(game.catalog.banks.get(f.slot)).toMatchObject({ awards: 0, cove: false, family: 'logic-lagoon' });
    const d = await loader.entry(lagoonLatinAdapter, 'logic-lagoon', f.first);
    await expect(game.packed!.choose(f.slot, emptyChallenge())).rejects.toThrow();
    await expect(game.packed!.prepare(d.ref)).rejects.toThrow('Unknown Lagoon bank');
    expect(() => game.start(d.ref, 'family', 'school-only', emptyChallenge(), { supportOff: false, ownRead: false }, [])).toThrow();
  }
});
