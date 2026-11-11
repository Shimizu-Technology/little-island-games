import React from 'react';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { defineReplayGame, type PackedReplay } from '../src/challenge/replay';
import { engine, registration as inlineOnly, puzzle, type Action, type Descriptor } from './helpers/challenge-replay';
import { emptyChallenge } from '../src/state/challenge';
import { BankError } from '../src/puzzles/loader';

/** A packed bank for a different game, through a loader double: the seam is not Slip-specific. */
const rows = ['row-a', 'row-b', 'row-c'], hashes = rows.map(r => createHash('sha256').update(r).digest('hex'));
const opened: number[] = [];
const loader = () => ({
  entry: async () => { throw new Error('open() decodes rows for this adopter'); },
  savedHash: async (_bank: unknown, index: number) => hashes[index],
}) as never;
const packed = (over: Partial<PackedReplay<Descriptor>> = {}): PackedReplay<Descriptor> => ({
  family: 'maze-family', awards: 1, loader,
  banks: [{ slot: 450, first: 9000, count: 3, packHash: 'c'.repeat(64), rules: 1, path: 'endless', tier: 2, title: 'Maze band' }],
  open: async (_l, ordinal) => { opened.push(ordinal); return { ref: { bank: 450, puzzle: ordinal - 9000, engine: 'maze-packed', rules: 1, hash: hashes[ordinal - 9000] }, descriptor: { seed: ordinal } }; },
  describe: () => ({ awards: [{ rule: { kind: 'par', metric: 'steps', max: 40 }, help: 'independent' }, null] }),
  ...over,
});
const define = (over: Partial<PackedReplay<Descriptor>> = {}, inline = false) => defineReplayGame({
  game: 'maze-packed', codec: 'maze-packed-v1', context: 'mazep', cove: false, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: inline ? [{ ...puzzle, ref: { ...puzzle.ref, engine: 'maze-packed', bank: 450 }, source: { kind: 'endless', bank: 450, puzzle: 0 }, dares: [] }] : [],
  objectives: [], engine, Board: () => <div />, controls: { help: () => ({ type: 'help' } as Action), reset: () => ({ type: 'reset' } as Action) }, packed: packed(over),
});

describe('packed replay seam (generic)', () => {
  it('leaves inline-only registrations exactly as they were: no packed seam, only inline banks', () => {
    expect('packed' in inlineOnly).toBe(false);
    expect([...inlineOnly.catalog.banks.values()].every(b => 'entries' in b)).toBe(true);
    expect(inlineOnly.contextFor(puzzle.ref)).toBe('maze-1');
  });
  it('registers immutable packed bank facts, offers the bank whole, and plays a lazily opened entry', async () => {
    const r = define();
    expect(r.catalog.banks.get(450)).toEqual({ slot: 450, engine: 'maze-packed', rules: 1, first: 9000, count: 3, family: 'maze-family', packHash: 'c'.repeat(64), awards: 1, cove: false });
    expect([...r.catalog.contexts]).toEqual(['mazep-2']);
    expect(r.packed!.bands).toEqual([{ kind: 'band', bank: 450, path: 'endless', tier: 2, title: 'Maze band', count: 3 }]);
    const ref = await r.packed!.choose(450, emptyChallenge());
    expect(ref).toEqual({ bank: 450, puzzle: 0, engine: 'maze-packed', rules: 1, hash: hashes[0] });
    expect(r.packed!.card(ref)).toMatchObject({ title: 'Maze band 1', tier: 2, dares: [], source: { kind: 'endless', bank: 450, puzzle: 0 } });
    const s = r.start(ref, 'alex', 'm-1', emptyChallenge(), { supportOff: false, ownRead: false }, []);
    expect(r.catalog.codecs.get('maze-packed-v1')!.validate(s)).toBe(true);
    expect(r.contextFor(ref)).toBe('mazep-2');
  });
  it('refuses a saved ref whose hash differs from the opened row, before anything becomes playable', async () => {
    const r = define();
    await expect(r.packed!.prepare({ bank: 450, puzzle: 1, engine: 'maze-packed', rules: 1, hash: 'd'.repeat(64) })).rejects.toBeInstanceOf(BankError);
    expect(() => r.start({ bank: 450, puzzle: 1, engine: 'maze-packed', rules: 1, hash: 'd'.repeat(64) }, 'alex', 'm', emptyChallenge(), { supportOff: false, ownRead: false }, [])).toThrow();
    await expect(r.packed!.prepare({ bank: 450, puzzle: 1, engine: 'other', rules: 1, hash: hashes[1] })).rejects.toBeInstanceOf(BankError);
  });
  it('rejects award rules outside the bank mask and bank slots that collide with inline banks', async () => {
    const r = define({ describe: () => ({ awards: [null, { rule: { kind: 'par', metric: 'steps', max: 4 }, help: 'independent' }] }) });
    await expect(r.packed!.choose(450, emptyChallenge())).rejects.toBeInstanceOf(BankError);
    expect(() => define({}, true)).toThrow('Invalid packed bank registration.');
    expect(() => define({ banks: [{ slot: 450, first: 9000, count: 0, packHash: 'c'.repeat(64), rules: 1, path: 'endless', tier: 2, title: 'x' }] })).toThrow();
  });
  it('does not reopen a resident entry; its content check is refreshed instead', async () => {
    const r = define({ banks: [{ slot: 450, first: 9000, count: 3, packHash: 'c'.repeat(64), rules: 1, path: 'endless', tier: 2, title: 'Maze band' }] });
    const refs = await Promise.all([0, 1, 2].map(i => r.packed!.choose(450, { ...emptyChallenge(), recent: i ? [[450, i - 1]] : [] })));
    expect(refs.map(x => x.puzzle)).toEqual([0, 1, 2]);
    opened.length = 0;
    await r.packed!.prepare(refs[0]);
    expect(opened).toEqual([]);
  });
});
