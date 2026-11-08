import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { PuzzleBrowser } from '../src/cove/PuzzleBrowser';
import { presentCove } from '../src/cove/presentation';
import { infoFor } from '../src/cove/catalog';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
import { emptyChallenge } from '../src/state/challenge';
vi.mock('react-native', () => ({ View: 'div', FlatList: 'list' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2' }));
it('16 and 18 badges reader suitability while virtualizing every open puzzle', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const cards = Array.from({ length: 1024 }, (_, puzzle) => ({ tier: 1, title: `Fixture ${puzzle}`, ref: { bank: 10, puzzle, engine: 'sudoku', rules: 1, hash: puzzle.toString(16).padStart(64, '0') } })) as ChallengeCard[];
  const entry: ChallengeEntry = { game: 'sudoku', cove: true, puzzles: cards, codec: 'browser-fixture', contextFor: () => 'browser', start: () => { throw new Error('Metadata fixture only'); }, move: () => null, render: () => null, controls: { help: () => null, reset: () => null }, catalog: { banks: new Map(), dares: new Map(), contexts: new Set(), codecs: new Map() } };
  presentCove(entry, { info: infoFor('sudoku'), details: () => ({ specifics: '9 by 9', techniques: ['single'], template: 'test', readers: ['Grown-up'] }) });
  let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<PuzzleBrowser entry={entry} progress={emptyChallenge()} initialBand={1} hidden={[]} reader="Little" onChoose={() => {}} onBand={() => {}} onBack={() => {}} onRemix={() => {}}/>); });
    const list = screen.root.findByType('list' as React.ElementType); expect(list.props.initialNumToRender).toBe(12); expect(list.props.data).toHaveLength(24);
    let row!: ReactTestRenderer; await act(async () => { row = create(list.props.renderItem({ item: cards[0], index: 0 })); });
    expect(JSON.stringify(row.toJSON())).toContain('Read along together'); expect(JSON.stringify(row.toJSON())).toContain('Grown-up');
    await act(async () => row.unmount());
    let header!: ReactTestRenderer; await act(async () => { header = create(list.props.ListHeaderComponent); });
    await act(async () => header.root.findAllByType('button').find(b => b.children.includes('All puzzles'))!.props.onPress());
    expect(screen.root.findByType('list' as React.ElementType).props.data).toHaveLength(1024);
    await act(async () => header.unmount());
  } finally { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); }
});
