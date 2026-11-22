import { describe, expect, it } from 'vitest';
import {
  accepts, answerOf, chainsAlone, clueText, countBySearch, countSeatings, emptySeating, grade, holdsAt, items, mostUseful, nextPlacement, oneImpossible, perms, place,
  puzzleTuple, tuplePuzzle, validPuzzle, validSeating, type CanoePuzzle, type Clue,
} from '../src/learn/games/canoe-seats/rules';
import { canoeSeatsAdapter, decodeAction, encodeAction, minimal, rungRules, semanticKey } from '../src/puzzles/adapters/canoe-seats';
import { canoeSeatsFamily, generateCanoe, rungs } from '../scripts/puzzles/families/canoe-seats';
import { certify } from '../src/puzzles/checks';
import { decodeRow } from '../src/puzzles/descriptor';
import { runBots } from '../src/puzzles/bots';
import { parsePack } from '../src/puzzles/bank';
import { productionDirs, readCatalog, readPackText } from '../scripts/puzzles/pipeline';
import sets from '../src/learn/games/canoe-seats/sets.generated.json';

const { families } = readCatalog(productionDirs), manifest = families.get('canoe-seats')!;
const bandRows = (band: string) => manifest.packs.filter(p => manifest.bands[p[5]] === band).flatMap(p => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows);
const decode = (row: string, band: string) => decodeRow(row, band, canoeSeatsAdapter)!;
/** Literal enumeration of every seating, with no pruning at all: the plainest possible count. */
function bruteCount(p: CanoePuzzle): { count: number; first: number[] | null } {
  const P = perms(p.n), pos = emptySeating(p);
  let count = 0, first: number[] | null = null;
  const walk = (a: number) => {
    if (a === p.attrs) { if (p.clues.every(c => holdsAt(c, p.n, pos[c.x], c.y === undefined ? 0 : pos[c.y]))) { count++; first ??= [...pos]; } return; }
    for (const perm of P) { for (let v = 0; v < p.n; v++) pos[a * p.n + v] = perm[v]; walk(a + 1); }
  };
  walk(0);
  return { count, first };
}

describe('clue meanings', () => {
  it('reads each kind of clue exactly as its picture says, with seat 1 at the front', () => {
    const n = 5;
    expect(holdsAt({ k: 'at', x: 0, s: 1 }, n, 1, 0)).toBe(true);
    expect([0, 1, 2, 3, 4].filter(a => holdsAt({ k: 'end', x: 0 }, n, a, 0))).toEqual([0, 4]);
    expect([0, 1, 2, 3, 4].filter(a => holdsAt({ k: 'mid', x: 0 }, n, a, 0))).toEqual([1, 2, 3]);
    expect(holdsAt({ k: 'next', x: 0, y: 1 }, n, 2, 3)).toBe(true);
    expect(holdsAt({ k: 'next', x: 0, y: 1 }, n, 2, 4)).toBe(false);
    expect(holdsAt({ k: 'far', x: 0, y: 1 }, n, 0, 2)).toBe(true);
    expect(holdsAt({ k: 'far', x: 0, y: 1 }, n, 1, 2)).toBe(false);
    expect(holdsAt({ k: 'ahead', x: 0, y: 1 }, n, 0, 4)).toBe(true);
    expect(holdsAt({ k: 'ahead', x: 0, y: 1 }, n, 3, 3)).toBe(false);
    expect(holdsAt({ k: 'gap', x: 0, y: 1 }, n, 4, 2)).toBe(true);
    expect(holdsAt({ k: 'same', x: 0, y: 5 }, n, 3, 3)).toBe(true);
    expect(holdsAt({ k: 'diff', x: 0, y: 5 }, n, 3, 3)).toBe(false);
  });
  it('speaks every clue as one plain sentence', () => {
    const p: CanoePuzzle = { n: 5, attrs: 3, cast: [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4], clues: [] };
    expect(clueText(p, { k: 'at', x: 0, s: 1 })).toBe('The turtle sits in seat 2.');
    expect(clueText(p, { k: 'ahead', x: 1, y: 2 })).toBe('The crab sits somewhere in front of the fish.');
    expect(clueText(p, { k: 'same', x: 3, y: 7 })).toBe('The bird and the gold straw hat share a seat.');
    expect(clueText(p, { k: 'gap', x: 10, y: 4 })).toBe('There is exactly one seat between the banana and the gecko.');
  });
});

describe('encoding and structure', () => {
  const base: CanoePuzzle = { n: 4, attrs: 2, cast: [0, 3, 5, 7, 1, 0, 4, 2], clues: [{ k: 'at', x: 0, s: 2 }, { k: 'same', x: 1, y: 6 }, { k: 'ahead', x: 4, y: 3 }, { k: 'far', x: 2, y: 3 }] };
  it('round-trips the pack tuple exactly', () => {
    expect(puzzleTuple(base)).toEqual([4, 2, '03571042', 'Sa3,Wbg,Aed,Fcd']);
    expect(tuplePuzzle(puzzleTuple(base))).toEqual(base);
  });
  it('refuses clues a person could read two ways or that say nothing', () => {
    const bad: Clue[][] = [
      [{ k: 'far', x: 0, y: 4 }], // "not next to" a hat its wearer might have on
      [{ k: 'same', x: 0, y: 1 }], // two friends never share a seat
      [{ k: 'at', x: 0, s: 4 }], // no seat 5 in a four-seat canoe
      [{ k: 'next', x: 0, y: 0 }],
      [{ k: 'at', x: 0, s: 1 }, { k: 'at', x: 0, s: 1 }],
    ];
    for (const clues of bad) expect(validPuzzle({ ...base, clues })).toBe(false);
    expect(validPuzzle({ ...base, cast: [0, 0, 5, 7, 1, 0, 4, 2] })).toBe(false);
    expect(validPuzzle({ n: 2, attrs: 1, cast: [0, 1], clues: [{ k: 'end', x: 0 }] })).toBe(false);
    for (const t of [[4, 2, '0357104', 'Sa3'], [4, 2, '03571042', 'Sa3,'], [4, 2, '03571042', 'Qab'], [6, 1, '012345', 'Sa1'], [4, 2, '03571042', 'Sa3,Fae']]) expect(tuplePuzzle(t)).toBeNull();
  });
  it('seats an item by swapping with whoever of its kind was there, and sends it ashore', () => {
    const p = base, pos = emptySeating(p);
    const a = place(p, pos, 0, 1), b = place(p, a, 1, 1);
    expect(b.slice(0, 4)).toEqual([-1, 1, -1, -1]);
    expect(place(p, b, 1, 1)).toBe(b);
    const c = place(p, place(p, b, 0, 3), 1, 3);
    expect(c.slice(0, 2)).toEqual([1, 3]);
    expect(place(p, c, 4, 3)[4]).toBe(3); // a hat shares the friend's seat
    expect(place(p, c, 0, -1)[0]).toBe(-1);
    expect(validSeating(p, [0, 0, -1, -1, -1, -1, -1, -1])).toBe(false);
  });
  it('encodes placements in one small number each', () => {
    for (const [item, seat] of [[0, -1], [0, 0], [14, 4], [7, 2]]) expect(decodeAction(encodeAction(item, seat))).toEqual({ item, seat });
    expect(canoeSeatsAdapter.isAction(encodeAction(14, 4))).toBe(true);
    expect(canoeSeatsAdapter.isAction(6)).toBe(false);
  });
});

describe('uniqueness: every seating checked, two ways', () => {
  it('the staged exhaustive count equals a literal count of every seating, on generated boards of every rung', () => {
    for (const band of Object.keys(rungs)) {
      let checked = 0;
      for (let seed = 1; checked < (band === 'h' ? 2 : 6) && seed < 400; seed++) {
        const d = generateCanoe(seed * 31, band as keyof typeof rungs);
        if (!d) continue;
        checked++;
        const p = d.payload, brute = bruteCount(p), staged = countSeatings(p, 99, 1e9);
        expect(staged.status).toBe('counted');
        if (staged.status !== 'counted') continue;
        expect(brute.count).toBe(1);
        expect(staged.count).toBe(1);
        expect(staged.first).toEqual(brute.first);
        expect(staged.seatings).toBe(perms(p.n).length ** p.attrs);
        // The same board with one clue gone fits more than one seating, by both counts.
        const loose = { ...p, clues: p.clues.slice(1) };
        if (loose.clues.length) { expect(bruteCount(loose).count).toBeGreaterThan(1); expect((countBySearch(loose, 99) as { count: number }).count).toBeGreaterThan(1); }
      }
      expect(checked, band).toBeGreaterThan(0);
    }
  });
  it('counts boards with no answer and boards with many', () => {
    const none: CanoePuzzle = { n: 3, attrs: 1, cast: [0, 1, 2], clues: [{ k: 'at', x: 0, s: 0 }, { k: 'at', x: 1, s: 0 }] };
    expect(countSeatings(none, 9)).toMatchObject({ status: 'counted', count: 0 });
    expect(countBySearch(none, 9)).toEqual({ status: 'counted', count: 0 });
    const many: CanoePuzzle = { n: 3, attrs: 1, cast: [0, 1, 2], clues: [{ k: 'end', x: 0 }] };
    expect(countSeatings(many, 99)).toMatchObject({ count: 4 });
    expect(countBySearch(many, 99)).toEqual({ status: 'counted', count: 4 });
    expect(bruteCount(many).count).toBe(4);
  });
});

describe('the shipped bank', () => {
  const sample = (band: string, every: number) => bandRows(band).filter((_, i) => i % every === 0);
  it('every sampled row is unique by exhaustion, minimal, and graded by the person-style solver to the same answer', () => {
    for (const band of manifest.bands) for (const row of sample(band, band === 'h' ? 64 : 40)) {
      const d = decode(row, band), p = d.payload, exhaustive = countSeatings(p, 2), g = grade(p);
      expect(exhaustive).toMatchObject({ status: 'counted', count: 1 });
      expect(g, row).not.toBeNull();
      expect(g!.answer).toEqual((exhaustive as { first: number[] }).first);
      expect(minimal(p)).toBe(true);
      if (!d.template.startsWith('teach-')) expect(rungRules[band].tiers).toContain(g!.tier);
    }
  });
  it('makes difficulty rise by reasoning, not seat count alone', () => {
    const med = (band: string, f: (p: CanoePuzzle) => number) => { const v = sample(band, 10).map(r => f(decode(r, band).payload)).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
    const steps = (p: CanoePuzzle) => grade(p)!.steps, whatIfs = (p: CanoePuzzle) => grade(p)!.whatIfs;
    // D and E both seat five friends; E alone needs "what if".
    expect(sample('d', 10).every(r => chainsAlone(decode(r, 'd').payload))).toBe(true);
    expect(sample('e', 10).every(r => !chainsAlone(decode(r, 'e').payload))).toBe(true);
    const order = ['a', 'b', 'c', 'd', 'f', 'g', 'h'].map(b => med(b, steps));
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(med('h', whatIfs)).toBeGreaterThanOrEqual(3);
    expect(med('g', whatIfs)).toBeGreaterThanOrEqual(2);
  });
  it('lets no dumb player beat any top-rung board, even the one watching the clue lights', () => {
    for (const band of ['e', 'f', 'g', 'h']) for (const row of sample(band, 50)) {
      const d = decode(row, band);
      expect(d.limits).toEqual([{ metric: 'placements', max: items(d.payload) }]);
      expect(runBots(canoeSeatsAdapter, d).some(b => b.beat), row).toBe(false);
    }
  });
  it('re-certifies a sample through the kit gates, and rejects a forged ambiguous row', () => {
    const ctx = { budget: 200_000, seenExact: new Set<string>(), seenSemantic: new Set<string>() };
    for (const band of canoeSeatsFamily.bands) for (const row of bandRows(band.id).slice(0, 3)) expect(certify(canoeSeatsFamily, band, decode(row, band.id), ctx).ok).toBe(true);
    const d = decode(bandRows('d')[5], 'd'), loose = { ...d, payload: { ...d.payload, clues: d.payload.clues.slice(1) } };
    const result = certify(canoeSeatsFamily, canoeSeatsFamily.bands[3], loose, { budget: 200_000, seenExact: new Set(), seenSemantic: new Set() });
    expect(result.ok).toBe(false);
  });
  it('keeps each teaching row to one new kind of clue beside plain seat clues', () => {
    for (const band of ['b', 'c', 'd', 'f']) {
      const teach = bandRows(band).map(r => decode(r, band)).filter(d => d.template.startsWith('teach-') && d.template !== 'teach-whatif');
      expect(teach.length, band).toBeGreaterThan(0);
      for (const d of teach) {
        const kind = d.template.slice(6);
        expect(d.payload.clues.filter(c => c.k === kind)).toHaveLength(1);
        expect(d.payload.clues.every(c => c.k === kind || c.k === 'at')).toBe(true);
      }
    }
  });
  it('copies School and Challenge rows byte for byte from the packs', () => {
    const all = new Set(manifest.bands.flatMap(bandRows));
    const levels = Object.values(sets.levels as Record<string, { teach: Record<string, string[]>; rows: string[] }>);
    for (const level of levels) for (const row of [...Object.values(level.teach).flat(), ...level.rows]) expect(all.has(row)).toBe(true);
    for (const group of sets.challenge) for (const row of group.rows) expect(all.has(row)).toBe(true);
  });
  it('names each puzzle by its exact cast, so A has real variety', () => {
    const keys = new Set(bandRows('a').map(r => semanticKey(decode(r, 'a').payload)));
    expect(keys.size).toBe(bandRows('a').length);
  });
});

describe('help reads only the clue cards', () => {
  const rows = ['c', 'e', 'g', 'h'].map(b => decode(bandRows(b)[7], b).payload);
  it('points at a card and crosses out a seat that is truly impossible', () => {
    for (const p of rows) {
      const card = mostUseful(p), cross = oneImpossible(p)!, answer = answerOf(p)!;
      expect(card).toBeGreaterThanOrEqual(0);
      expect(answer[cross.item]).not.toBe(cross.seat);
    }
  });
  it('seats one item toward the answer from any draft, and every step leads there', () => {
    for (const p of rows) {
      let pos = emptySeating(p);
      // A messy draft: everything in the wrong order.
      for (let i = 0; i < items(p); i++) pos = place(p, pos, i, (i + 1) % p.n);
      for (let k = 0; k < items(p) * 2 && !accepts(p, pos); k++) { const m = nextPlacement(p, pos)!; pos = place(p, pos, m.item, m.seat); }
      expect(accepts(p, pos)).toBe(true);
      expect(nextPlacement(p, pos)).toBeNull();
    }
  });
});
