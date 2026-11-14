import { describe, it, expect } from 'vitest';
import fixture from './fixtures/word-search/bank.json';
import { certify } from '../src/puzzles/checks';
import { wordSearch } from '../scripts/puzzles/families/word-search';
import { families } from '../scripts/puzzles/families';
import { directions, findWord, foundIndex, initialSearch, letters, searchSolved, snapRay, validSearch, type SearchPuzzle } from '../src/puzzles/words/core';
import { searchEngine } from '../src/puzzles/words/game';
import { wordSearchAdapter } from '../src/puzzles/words/adapter';
import { registration } from '../src/challenge/registrations/word-search';
import { challengeFor } from '../src/challenge/catalog';
import { coveEntries } from '../src/cove/catalog';
const puzzles = fixture.puzzles as SearchPuzzle[], p = puzzles[0];

describe('baked Word Search rules', () => {
  it('G6-01 accepts all eight directions, either endpoint order, exactly once', () => {
    for (let i = 0; i < 8; i++) {
      const p = puzzles[i + 1], w = p.words[0], cols = p.cells[0].length;
      expect(validSearch(p)).toBe(true);
      const start = w.cells[0], end = w.cells.at(-1)!;
      expect(snapRay(start, end, cols, p.cells.length).direction).toEqual(directions[i]);
      expect(foundIndex(p, end, start)).toBe(0);
      const s = findWord(p, initialSearch(), [start, end, 1]);
      expect(searchSolved(p, s)).toBe(true);
      expect(s.found).toEqual([[0, 1]]);
      expect(findWord(p, s, [end, start, 0])).toBe(s);
    }
  });
  it('locks to the first ray, clamps at the edge, and refuses bent paths', () => {
    const first = snapRay(0, 7, 6, 6);
    expect(first.cells).toEqual([0, 7]);
    expect(snapRay(0, 5, 6, 6, first.direction).cells).toEqual([0, 7, 14, 21]);
    expect(foundIndex(p, 0, 8)).toBe(-1);
    expect(findWord(p, initialSearch(), [0, 0, 0])).toEqual(initialSearch());
  });
  it('G6-02 merges two finds independently and deduplicates a shared word', () => {
    const state = searchEngine.create(p, { version: 1 }, { ownRead: false, supportOff: false });
    const ray = (i: number, h: 0 | 1): [number, number, 0 | 1] => [p.words[i].cells[0], p.words[i].cells.at(-1)!, h];
    const next = searchEngine.step(state, ['find-many', [ray(0, 0), ray(1, 1)]], p)!;
    expect(next.state.found).toEqual([[0, 0], [1, 1]]);
    const same = searchEngine.step(state, ['find-many', [ray(0, 0), ray(0, 1)]], p)!;
    expect(same.state.found).toEqual([[0, 0]]);
  });
  it('G6-03 hearing is not help; help, undo and redo retain the audit', () => {
    let state = searchEngine.create(p, { version: 1 }, { ownRead: false, supportOff: false });
    const heard = searchEngine.step(state, ['hear', 0], p)!;
    expect(heard.event).toBe('read-aloud');expect(heard.state.helped).toBe(false);
    state = searchEngine.step(heard.state, ['help'], p)!.state;
    expect(state.helped).toBe(true);expect(state.found.length).toBe(1);
    state = searchEngine.step(state, ['undo'], p)!.state;
    expect(state.helped).toBe(true);expect(state.found).toEqual([]);
    state = searchEngine.step(state, ['redo'], p)!.state;
    expect(state.found.length).toBe(1);
    expect(state.helped).toBe(true);
  });
  it('preserves CH/NG digraph cells and teaching accents in answer matching', () => {
    // Source-backed teaching spellings are adopted only through W1; tokenization itself is content-free.
    expect(letters('CHÅNG', 'ch')).toEqual(['CH', 'Å', 'NG']);
    expect(letters('CHANG', 'en')).toEqual(['C', 'H', 'A', 'N', 'G']);
  });
  it('checks hidden-message leftovers exactly and rejects malformed recovery data', () => {
    const used = new Set(p.words.flatMap(w => w.cells)), message = p.cells.flat().filter((_, i) => !used.has(i)).join('');
    expect(validSearch({ ...p, message })).toBe(true);
    expect(validSearch({ ...p, message: message.slice(1) })).toBe(false);
    expect(validSearch({ ...p, cells: [p.cells[0], []] })).toBe(false);
    expect(validSearch({ ...p, words: [...p.words, p.words[0]] })).toBe(false);
  });
  it('round-trips the adapter and replays its complete witness without mutations', () => {
    const a = wordSearchAdapter(), before = JSON.stringify(p), d = {format: 1 as const, seed: 1, rng: 1 as const, band: 'paddling', layout: 'island', template: 'island', payload: p, objectives: [], limits: [], par: null, teaches: [], speech: null};
    expect(a.decodePayload(a.encodePayload(p))).toEqual(p);
    expect(((a.encodePayload(p) as [string,string[],unknown[][]])[2][0][4])).toBe(0);
    expect(a.decodePayload(['en',['AB','CD'],[[0,null,0,1,0]],'Theme','words',null])).toBeNull();
    const proof=certify(wordSearch,wordSearch.bands[0],d,{budget:10000,seenExact:new Set(),seenSemantic:new Set()});expect(proof.ok).toBe(true);
    const solved = a.solve(d, 1000);expect(solved.status).toBe('solved');
    if (solved.status !== 'solved') return;
    let s = a.create(d);for (const action of solved.witness) s = a.reduce(s, action, d);
    expect(a.solved(s, d)).toBe(true);expect(JSON.stringify(p)).toBe(before);
  });
  it('G6-06 keeps fixtures, bands and dares unpublished in the shipping catalog', () => {
    expect(fixture.fixture).toBe(true);expect(registration.puzzles).toEqual([]);expect(registration.packed?.bands ?? []).toEqual([]);
    expect(registration.catalog.banks.size).toBe(0);expect(registration.catalog.dares.size).toBe(0);
    expect(families.some(f=>f.id==='word-search')).toBe(false);
    expect(challengeFor('word-search')).toBeUndefined();expect(coveEntries().some(e => e.game === 'word-search')).toBe(false);
  });
});
