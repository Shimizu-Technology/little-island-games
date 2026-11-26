import { describe, expect, it, vi } from 'vitest';
import { packsFor, tideTable, coveEntries, mixedPack, completion, suggested, infoFor, completionLookup } from '../src/cove/catalog';
import { defaults, emptyLocal, localAction, localRepository, validLocal } from '../src/cove/local';
import { emptyChallenge, type ChallengeProgress } from '../src/state/challenge';
import * as bits from '../src/state/saveBits';
import { pack } from '../src/state/saveBits';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
import { places } from '../src/hub/model';
import { DIFFICULTY_WORDS, difficultyWord } from '../src/cove/shelf';
const card = (puzzle: number, tier = 1): ChallengeCard => ({ ref: { bank: 10, puzzle, engine: 'sudoku', rules: 1, hash: puzzle.toString(16).padStart(64, '0') }, source: { kind: 'endless', bank: 10, puzzle }, path: 'endless', tier: tier as 1, title: `Row deductions ${puzzle}`, dares: [] });
const cards = Array.from({ length: 64 }, (_, i) => card(i, i < 32 ? 1 : 2));
const entry = { game: 'sudoku', cove: true, puzzles: cards, codec: 'fixture-only', contextFor: () => 'fixture', start: () => { throw new Error('metadata-only fixture'); }, move: () => null, render: () => null, controls: { help: () => null, reset: () => null }, catalog: { dares: new Map(), codecs: new Map(), contexts: new Set(), banks: new Map([[10, { slot: 10, engine: 'sudoku', rules: 1, cove: true, entries: cards.map((p, ordinal) => ({ hash: p.ref.hash, ordinal })), awards: cards.map(() => 0) }]]) } } as ChallengeEntry;
const solvedProgress = (): ChallengeProgress => ({ ...emptyChallenge(), banks: [[10, pack(cards.map(() => 5), 3), pack(cards.map(() => 0), 2)]] });
describe('Cove shelves, bands, packs and neutral history', () => {
  it('adds only the eighth door and leaves registration gating honest', () => {
    expect(places.at(-1)).toMatchObject({ id: 'cove', hint: 'Think as long as you like' });
    expect(coveEntries([entry, { ...entry, game: 'not-built', cove: false }])).toEqual([entry]);
    // Six tiers keep their numbers in the save; the UI says them in plain words.
    expect(DIFFICULTY_WORDS).toEqual(['Easy', 'Medium', 'Hard', 'Expert', 'Master', 'Master+']);
    expect([1, 2, 3, 4, 5, 6].map(difficultyWord)).toEqual([...DIFFICULTY_WORDS]);
  });
  it.each([16, 24, 31, 32, 33, 40, 48, 65, 960])('packs %s immutable refs into 16–32 without inventing catalog entries', count => {
    const input = Array.from({ length: count }, (_, i) => card(i)), before = JSON.stringify(input), packs = packsFor(input);
    expect(packs.flat()).toEqual(input); expect(JSON.stringify(input)).toBe(before);
    for (const pack of packs) expect(pack.length).toBeGreaterThanOrEqual(16);
    expect(packs.every(p => p.length <= 32)).toBe(true);
  });
  it('keeps a small catalog usable without manufacturing puzzles to meet pack size', () => expect(packsFor([card(0)])).toEqual([[card(0)]]));
  it('suggests a persons own unfinished ref before their band and never clears finished history', () => {
    const progress = solvedProgress(), before = JSON.stringify(progress);
    expect(suggested(entry, progress, 2)).toBe(cards[32]);
    progress.paused = [{ game: 'sudoku', puzzle: cards[5].ref, result: null, credited: false } as never];
    expect(suggested(entry, progress, 2)).toBe(cards[5]);
    expect(completion(progress, cards[4].ref, entry)).toBe(5);
    progress.paused = []; expect(JSON.stringify(progress)).toBe(before);
  });
  it('offers three date-only shortcuts, gentler Monday, invalid date fails closed', () => {
    const picks = tideTable('2026-11-09', [entry]);
    expect(picks.map(p => p.size)).toEqual(['Small', 'Medium', 'Large']); expect(picks[0].card!.tier).toBe(1);
    expect(tideTable('2026-11-09', [entry])).toEqual(picks);
    expect(tideTable('2026-02-29', [entry])).toEqual([]); expect(tideTable('2026-11-09', [])).toEqual([]);
    expect(picks.every(p => p.card && entry.puzzles.includes(p.card))).toBe(true);
  });
  it('builds a varied mixed replay only from solved refs with two techniques and four templates', () => {
    const progress = solvedProgress(), before = JSON.stringify(progress), metadata = (p: ChallengeCard) => ({ technique: String(p.ref.puzzle % 2), template: String(p.ref.puzzle % 4) });
    const mixed = mixedPack(entry, progress, metadata, 9); expect(mixed.length).toBeGreaterThanOrEqual(16);
    expect(mixed.every(p => cards.includes(p))).toBe(true); expect(new Set(mixed.map(p => p.ref.hash)).size).toBe(mixed.length);
    for (const template of ['0', '1', '2', '3']) expect(mixed.filter(p => metadata(p).template === template).length / mixed.length).toBeLessThanOrEqual(.25);
    expect(mixedPack(entry, emptyChallenge(), metadata)).toEqual([]);
    expect(mixedPack(entry, progress, () => ({ technique: 'one', template: 'one' }))).toEqual([]); expect(JSON.stringify(progress)).toBe(before);
  });
});
describe('validated device-local Cove choices', () => {
  it('separates reader, band and mistakes by owner; adult fill notes defaults off', () => {
    const start = emptyLocal(), after = localAction(start, { type: 'preferences', owner: 'family', value: { ...defaults(), band: 6 } });
    expect(after.people.family.reader).toBe('Growing'); expect(after.people.family.fillNotes).toBe(false); expect(start.people).toEqual({});
    expect(localAction(after, { type: 'preferences', owner: 'child', value: { ...defaults(), fillNotes: true } })).toBe(after);
    expect(validLocal({ ...start, unexpected: true })).toBe(false);
  });
  it('pins quietly without discarding an earlier full set, hides without touching content', () => {
    let data = emptyLocal();
    for (let i = 0; i < 8; i++) data = localAction(data, { type: 'pin', to: 'cove-leon', pin: { from: 'family', ref: cards[i].ref } });
    expect(localAction(data, { type: 'pin', to: 'cove-leon', pin: { from: 'family', ref: cards[9].ref } })).toBe(data);
    const hidden = localAction(data, { type: 'hide', hash: cards[0].ref.hash }); expect(hidden.hidden).toEqual([cards[0].ref.hash]); expect(hidden.pins).toBe(data.pins);
    expect(localAction(hidden, { type: 'unhide' }).hidden).toEqual([]);
  });
  it('preserves corrupt and future originals without overwriting them', async () => {
    const map = new Map([['cove-device-v1', '{bad']]), repo = localRepository({ get: async key => map.get(key) ?? null, set: async (key, value) => { map.set(key, value); } });
    await expect(repo.read()).rejects.toThrow('original has been kept'); expect(map.get('cove-device-v1')).toBe('{bad'); expect([...map.keys()].some(k => k.startsWith('cove-preserved-'))).toBe(true);
    await expect(repo.write({ type: 'favorite', game: 'sudoku' })).rejects.toThrow('not loaded');
  });
  it('publishes after a successful write and serializes rapid updates without lost favorites', async () => {
    const map = new Map<string, string>(); let fail = false;
    const repo = localRepository({ get: async key => map.get(key) ?? null, set: async (key, value) => { if (fail) throw new Error('disk'); map.set(key, value); } });
    await repo.read(); await Promise.all([repo.write({ type: 'favorite', game: 'sudoku' }), repo.write({ type: 'favorite', game: 'bridges' })]);
    expect((await repo.read()).favorites).toEqual(['sudoku', 'bridges']); fail = true;
    await expect(repo.write({ type: 'favorite', game: 'solitaire' })).rejects.toThrow('disk'); expect((await repo.read()).favorites).toEqual(['sudoku', 'bridges']);
  });
});

describe('review regressions: offers and explicit metadata', () => {
  it('14 excludes Together-only history from personal mixed practice', () => {
    const progress = solvedProgress(); progress.banks[0][1] = pack(cards.map(() => 3), 3);
    expect(mixedPack(entry, progress, p => ({ technique: String(p.ref.puzzle % 2), template: String(p.ref.puzzle % 4) }))).toEqual([]);
    progress.banks[0][1] = pack(cards.map(() => 4), 3);
    expect(mixedPack(entry, progress, p => ({ technique: String(p.ref.puzzle % 2), template: String(p.ref.puzzle % 4) }))).toEqual([]);
  });
  it('15 rotates three distinct shelf genres independent of registration order', () => {
    const entries = ['word-search','crossword','word-ladder','sudoku','cage-math','picture-grid','bridges','solitaire'].map(game => ({ ...entry, game }));
    for (let day = 1; day <= 28; day++) {
      const picks = tideTable(`2026-11-${String(day).padStart(2, '0')}`, entries);
      expect(new Set(picks.map(p => infoFor(p.entry.game).row)).size).toBe(3);
    }
  });
  it('18 decodes each bank once for every card lookup', () => {
    const spy = vi.spyOn(bits, 'unpack');
    try { const lookup = completionLookup(solvedProgress(), entry); for (const p of cards) expect(lookup(p.ref)).toBe(5); expect(spy).toHaveBeenCalledTimes(1); }
    finally { spy.mockRestore(); }
  });
  it('19 refuses to invent original provenance for unknown games', () => {
    expect(infoFor('unreviewed-game').provenance).toBeNull();
    expect(() => coveEntries([{ ...entry, game: 'unreviewed-game' }])).toThrow(/provenance/i);
  });
  it('21 prunes removed owners before accepting a new preference', () => {
    let data = emptyLocal(); for (let i = 0; i < 9; i++) data = localAction(data, { type: 'preferences', owner: `old-${i}`, value: {} });
    data = localAction(data, { type: 'prune', owners: ['family'] });
    data = localAction(data, { type: 'preferences', owner: 'family', value: { band: 4 } });
    expect(Object.keys(data.people)).toEqual(['family']); expect(data.people.family.band).toBe(4);
  });
  it('22 preserves a malformed original once across retries', async () => {
    const rows = new Map([['cove-device-v1', '{bad']]), repo = localRepository({ get: async k => rows.get(k) ?? null, set: async (k,v) => { rows.set(k,v); } });
    for (let i = 0; i < 3; i++) await expect(repo.read()).rejects.toThrow();
    expect([...rows.keys()].filter(k => k.startsWith('cove-preserved-'))).toHaveLength(1);
  });
  it('23 notifies retained local-choice subscribers after durable changes', async () => {
    const repo = localRepository({ get: async () => null, set: async () => {} }), changed = vi.fn(); await repo.read();
    const release = repo.subscribe(changed); await repo.write({ type: 'favorite', game: 'sudoku' }); expect(changed).toHaveBeenCalledTimes(1);
    release(); await repo.write({ type: 'favorite', game: 'bridges' }); expect(changed).toHaveBeenCalledTimes(1);
  });
});
