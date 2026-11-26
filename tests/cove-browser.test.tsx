import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { PuzzleBrowser } from '../src/cove/PuzzleBrowser';
import { presentCove } from '../src/cove/presentation';
import { infoFor } from '../src/cove/catalog';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
import { emptyChallenge } from '../src/state/challenge';
import { pack } from '../src/state/saveBits';
vi.mock('react-native', () => ({ View: 'div', FlatList: 'list', useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }) }));
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
it('16 and 18 Choose a puzzle: one virtualized numbered grid per difficulty, read-along marks, finished ticks and filter', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const cards = Array.from({ length: 1024 }, (_, puzzle) => ({ tier: puzzle < 1000 ? 1 : 2, title: `Fixture ${puzzle}`, ref: { bank: 10, puzzle, engine: 'sudoku', rules: 1, hash: puzzle.toString(16).padStart(64, '0') } })) as ChallengeCard[];
  const entry: ChallengeEntry = { game: 'sudoku', cove: true, puzzles: cards, codec: 'browser-fixture', contextFor: () => 'browser', start: () => { throw new Error('Metadata fixture only'); }, move: () => null, render: () => null, controls: { help: () => null, reset: () => null }, catalog: { banks: new Map([[10, { slot: 10, engine: 'sudoku', rules: 1, cove: true, entries: cards.map((p, ordinal) => ({ hash: p.ref.hash, ordinal })), awards: cards.map(() => 0) }]]), dares: new Map(), contexts: new Set(), codecs: new Map() } } as ChallengeEntry;
  presentCove(entry, { info: infoFor('sudoku'), details: () => ({ specifics: '9 by 9', techniques: ['single'], template: 'test', readers: ['Grown-up'] }) });
  // Puzzle 3 is finished; puzzle 2 is hidden on this device.
  const progress = { ...emptyChallenge(), banks: [[10, pack(cards.map((_, i) => i === 2 ? 5 : 0), 3), pack(cards.map(() => 0), 2)]] } as ReturnType<typeof emptyChallenge>;
  const chosen = vi.fn(), band = vi.fn();
  let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<PuzzleBrowser entry={entry} progress={progress} initialBand={1} hidden={[cards[1].ref.hash]} reader="Little" onChoose={chosen} onBand={band}/>); });
    const list = () => screen.root.findByType('list' as React.ElementType);
    expect(list().props.initialNumToRender).toBe(36); expect(list().props.numColumns).toBeGreaterThanOrEqual(3);
    // Every open puzzle at this difficulty, numbered in place: the hidden one leaves a gap.
    expect(list().props.data).toHaveLength(999); expect(list().props.data.map((c: { number: number }) => c.number).slice(0, 3)).toEqual([1, 3, 4]);
    expect(list().props.data[1]).toMatchObject({ number: 3, finished: true, readAlong: true });
    let cell!: ReactTestRenderer; await act(async () => { cell = create(list().props.renderItem({ item: list().props.data[1] })); });
    expect(cell.root.findByProps({ testID: 'puzzle-3' }).props.accessibilityLabel).toBe('Puzzle 3, finished, read along together');
    await act(async () => cell.root.findByProps({ testID: 'puzzle-3' }).props.onPress()); expect(chosen).toHaveBeenCalledWith(cards[2]);
    await act(async () => cell.unmount());
    let header!: ReactTestRenderer; await act(async () => { header = create(list().props.ListHeaderComponent); });
    await act(async () => header.root.findByProps({ testID: 'filter-finished' }).props.onPress());
    expect(list().props.data.map((c: { number: number }) => c.number)).toEqual([3]);
    await act(async () => header.root.findByProps({ testID: 'difficulty-2' }).props.onPress());
    expect(band).toHaveBeenCalledWith(2);
    expect(JSON.stringify(header.toJSON())).not.toMatch(/Paddling|Shallows|Lagoon|Pack \d/);
    await act(async () => header.unmount());
  } finally { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); }
});
