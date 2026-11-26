import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateSurface } from '../scripts/puzzles/words/generate.mjs';
import { cellsFor } from '../scripts/words/core.mjs';
import { starterPlan, starterPuzzle, starterPuzzles, starterThemes, starterTiers, starterWords, wordId, collides } from './fixtures/word-search/starter-packs';
import { directions, searchSolved, validSearch, type SearchPuzzle } from '../src/puzzles/words/core';
import { searchEngine } from '../src/puzzles/words/game';
import { wordSearchAdapter } from '../src/puzzles/words/adapter';
import { searchTier, searchTiers } from '../src/puzzles/words/tiers';

const allowlist = JSON.parse(readFileSync('content/pictures/allowlist.json', 'utf8')).words as Record<string, { wordId: string }>;
const supplement = new Set((JSON.parse(readFileSync('content/words/supplement.draft.json', 'utf8')).entries as { spelling: string }[]).map(e => e.spelling));
const pictures = new Set((JSON.parse(readFileSync('content/pictures/manifest.json', 'utf8')).pictures as { word: string }[]).map(p => p.word));

describe('Word Search starter packs (definitions)', () => {
  it('has 16 themes by 4 plain difficulties, 64 puzzles with unique ids', () => {
    expect(starterThemes).toHaveLength(16);
    expect(starterTiers.map(t => t.label)).toEqual(['Easy', 'Medium', 'Hard', 'Expert']);
    const puzzles = starterPuzzles();
    expect(puzzles).toHaveLength(64);
    expect(new Set(puzzles.map(p => p.id)).size).toBe(64);
    expect(new Set(starterThemes.map(t => t.id)).size).toBe(16);
    expect(new Set(starterThemes.map(t => t.title)).size).toBe(16);
  });
  it('maps Easy 6×6 across/down, Medium 9×9 across/down, Hard 12×12 with slants, Expert 15×15 in all directions', () => {
    expect(starterTiers.map(t => [t.size, t.directionCount])).toEqual([[6, 2], [9, 2], [12, 4], [15, 8]]);
    for (const t of starterTiers) { expect(searchTier(t.tier)?.label).toBe(t.label); expect(searchTier(t.tier)?.size).toBe(t.size); }
    expect(searchTiers.map(t => t.label)).toEqual(['Easy', 'Medium', 'Hard', 'Expert', 'Master', 'Master+']);
  });
  it('uses only words already in a public repository list, and clean plain letters', () => {
    for (const theme of starterThemes) {
      expect(new Set(theme.pool).size, theme.id).toBe(theme.pool.length);
      expect(theme.pool.length, theme.id).toBeGreaterThanOrEqual(18);
      for (const w of theme.pool) {
        expect(w, w).toMatch(/^[A-Z]{3,12}$/);
        expect(w in allowlist || supplement.has(w), `${theme.id}: ${w} is not in a permitted list`).toBe(true);
        if (w in allowlist) expect(allowlist[w].wordId).toBe(wordId(w));
      }
    }
  });
  it('is deterministic, fills every tier, and never picks two answers that can be read inside each other', () => {
    for (const p of starterPuzzles(3)) {
      const tier = starterTiers.find(t => t.id === p.tier)!, again = starterPuzzle(starterThemes.find(t => t.id === p.theme)!, tier, p.variant);
      expect(again).toEqual(p);
      expect(p.words).toHaveLength(tier.count);
      for (const w of p.words) expect(w.length >= tier.min && w.length <= tier.max && w.length <= tier.size).toBe(true);
      for (const [i, a] of p.words.entries()) for (const b of p.words.slice(i + 1)) expect(collides(a, b), `${p.id}: ${a}/${b}`).toBe(false);
    }
    expect(starterPuzzle(starterThemes[0], starterTiers[0], 0).words).not.toEqual(starterPuzzle(starterThemes[0], starterTiers[0], 1).words);
  });
  it('keeps Easy words short and kid-friendly, and most Easy answers have dictionary pictures to offer', () => {
    const easy = starterPuzzles().filter(p => p.tier === 'easy').flatMap(p => p.words);
    expect(easy.every(w => w.length <= 5)).toBe(true);
    expect(easy.filter(w => pictures.has(w)).length / easy.length).toBeGreaterThan(.4);
  });
  it('plans slots 80–83 in the shape the baker reads, within its floors and theme-family cap at 8 variants', () => {
    const plan = starterPlan(8), ids = new Set<string>();
    expect(plan.banks.map(b => b.slot)).toEqual([80, 81, 82, 83]);
    expect(plan.banks.map(b => b.tier)).toEqual([1, 2, 3, 4]);
    let total = 0;
    for (const b of plan.banks) {
      expect(b.id).toMatch(/^[a-z][a-z0-9-]{0,23}$/);
      expect(['paddling', 'shallows', 'lagoon', 'reef', 'deep', 'trench']).toContain(b.band);
      expect(b.grids.length).toBeGreaterThan(0);
      for (const g of b.grids) {
        expect(g.family).toMatch(/^[a-z][a-z0-9-]{0,23}$/);
        expect(ids.has(g.id)).toBe(false); ids.add(g.id);
        expect(g.wordIds.length).toBe(g.count); expect(g.wordIds.every(id => b.wordIds.includes(id))).toBe(true);
        expect([2, 4, 8]).toContain(g.directionCount);
      }
      const byFamily = new Map<string, number>(); for (const g of b.grids) byFamily.set(g.family, (byFamily.get(g.family) ?? 0) + 1);
      expect(Math.max(...byFamily.values())).toBeLessThanOrEqual(Math.floor(b.grids.length / 4));
      total += b.grids.length;
    }
    expect(total).toBe(512);
    expect(starterPlan().banks.reduce((n, b) => n + b.grids.length, 0)).toBe(64);
    expect(starterWords().every(w => /^en-[a-z]+$/.test(w.id))).toBe(true);
  });
});

describe('Word Search starter packs (laid out with the real grid generator)', () => {
  // The public layout rules only: an empty scan list stands in for the lead's locked w-guard policy, which still runs at bake.
  const plan = starterPlan(2);
  const rows = plan.banks.flatMap(b => b.grids.map(g => ({ bank: b, g })));
  const built = rows.map(({ bank, g }) => {
    const words = g.wordIds.map(id => ({ id, spelling: id.slice(3).toUpperCase(), language: 'en' }));
    const { surface } = generateSurface({ words, policy: { scan: [] }, seed: g.seed, size: g.size, count: g.count, directionCount: g.directionCount, id: g.id });
    const payload: SearchPuzzle = { language: 'en', cells: surface.cells as string[][], theme: g.theme, list: bank.list, message: null,
      words: surface.listed.map(w => ({ id: w.answer, spelling: w.answer, cells: w.cells.map(([y, x]: number[]) => y * g.size + x), audio: null })) };
    return { bank, g, payload };
  });
  // A palindrome reads the same along its trail both ways, so count distinct trails (sets of cells), not directions.
  const occurrences = (cells: string[][], word: string) => {
    const letters: string[] = cellsFor(word, 'en'), n = cells.length, trails = new Set<string>();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of directions) if (letters.every((l, i) => cells[r + dr * i]?.[c + dc * i] === l)) trails.add(letters.map((_, i) => (r + dr * i) * n + c + dc * i).sort((a, b) => a - b).join());
    return trails.size;
  };
  it('lays out every puzzle: valid, one trail per word, no empty or overlapping words', () => {
    expect(built).toHaveLength(128);
    for (const { g, payload } of built) {
      expect(validSearch(payload), g.id).toBe(true);
      expect(payload.words).toHaveLength(g.count);
      expect(payload.cells.flat().every(c => /^[A-Z]$/.test(c)), g.id).toBe(true);
      for (const w of payload.words) { expect(w.cells.length).toBeGreaterThanOrEqual(3); expect(occurrences(payload.cells, w.spelling), `${g.id} ${w.spelling}`).toBe(1); }
      const spelled = payload.words.map(w => w.cells);
      for (const [i, a] of spelled.entries()) for (const b of spelled.slice(i + 1)) expect(a.join()).not.toBe(b.join());
    }
  });
  it('keeps each tier to its directions: across and down, then slants, then every way', () => {
    for (const { g, payload } of built) {
      const allowed = directions.slice(0, g.directionCount).map(d => d.join());
      for (const w of payload.words) { const d = [Math.sign(Math.floor(w.cells[1] / g.size) - Math.floor(w.cells[0] / g.size)), Math.sign(w.cells[1] % g.size - w.cells[0] % g.size)].join(); expect(allowed, `${g.id} ${w.spelling}`).toContain(d); }
    }
  });
  it('round-trips the packed codec and solves in the shared engine with every word found once', () => {
    const adapter = wordSearchAdapter();
    for (const { g, payload } of built.filter((_, i) => i % 4 === 0)) {
      expect(adapter.decodePayload(adapter.encodePayload(payload)), g.id).toEqual(payload);
      let s = searchEngine.create(payload, { version: 1 }, { ownRead: false, supportOff: false });
      for (const w of payload.words) s = searchEngine.step(s, ['find', w.cells[0], w.cells.at(-1)!, 0], payload)!.state;
      expect(searchSolved(payload, s)).toBe(true);
      expect(searchEngine.step(s, ['find', payload.words[0].cells.at(-1)!, payload.words[0].cells[0], 1], payload)).toBeNull();
    }
  });
});
