import React, { createContext } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registration as sudoku } from '../src/challenge/registrations/sudoku';
import { dealPacked, hiddenPackedCount, packedOpen, shownCount, suggestedPacked } from '../src/cove/catalog';
import { PackedBrowser } from '../src/cove/PackedBrowser';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';

vi.mock('../src/puzzles/bankAssets', async () => { const { readFileSync } = await import('node:fs'); return { bankTransport: { read: async (name: string) => readFileSync(`src/content/puzzles/assets/${name}.lipuzzle`, 'utf8') } }; });
vi.mock('react-native', () => ({ FlatList: ({ ListHeaderComponent, data, renderItem }: { ListHeaderComponent: React.ReactNode; data: number[]; renderItem: (x: { item: number }) => React.ReactNode }) => React.createElement('flatlist', null, ListHeaderComponent, ...data.map(item => React.createElement(React.Fragment, { key: item }, renderItem({ item })))), View: 'div', Platform: { OS: 'ios' } }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', C: {}, styles: {} }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play() {} }) }));

const settle = () => act(async () => { for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0)); });
const text = (screen: ReactTestRenderer) => JSON.stringify(screen.toJSON());
const label = (n: { children: unknown[] }) => n.children.filter(c => typeof c === 'string').join('');
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('Hide this puzzle works for packed puzzles (review R5)', () => {
  const first = sudoku.packed!.bands[0];
  it('finds the hidden entry in its bank, and dealing skips it', async () => {
    const ref = await packedOpen(sudoku)!.open!(first.bank, 0), hidden = [ref.hash], fresh = emptyChallenge();
    expect([...await packedOpen(sudoku)!.hiddenRows!(first.bank, hidden)]).toEqual([0]);
    expect(await hiddenPackedCount(sudoku, hidden)).toBe(1);
    // Before: a fresh person is dealt Sprout 1. Hidden: never, from Next, the tile or the Tide Table.
    expect((await dealPacked(sudoku, first.bank, fresh))!.ref.puzzle).toBe(0);
    expect((await dealPacked(sudoku, first.bank, fresh, hidden))!.ref.puzzle).not.toBe(0);
    expect((await suggestedPacked(sudoku, fresh, 1, hidden))!.ref.hash).not.toBe(ref.hash);
    expect(shownCount(sudoku, hidden, 1)).toBe(shownCount(sudoku) - 1);
  });
  it('keeps Continue for a saved attempt on a hidden puzzle', async () => {
    const ref = await packedOpen(sudoku)!.open!(first.bank, 0);
    const saved = { game: 'sudoku', puzzle: ref, result: null, credited: false } as unknown as ChallengeSession;
    expect((await suggestedPacked(sudoku, { ...emptyChallenge(), paused: [saved] }, 1, [ref.hash]))!.ref.hash).toBe(ref.hash);
  });
  it('the band browser leaves it out of the list and the counts', async () => {
    const ref = await packedOpen(sudoku)!.open!(first.bank, 0);
    let screen!: ReactTestRenderer;
    await act(async () => { screen = create(<PackedBrowser entry={sudoku} progress={emptyChallenge()} initialBand={first.tier} hidden={[ref.hash]} onChoose={() => {}} onBand={() => {}} onBack={() => {}}/>); });
    try {
      await settle();
      expect(text(screen)).toContain(`${first.count - 1} puzzles · 0 finished · 1 hidden on this device`);
      await act(async () => { (screen.root.findAllByType('button').find(b => label(b as never) === `All ${first.count - 1}`)!.props.onPress as () => void)(); });
      const rows = screen.root.findAllByType('button').map(b => label(b as never)).filter(l => l.startsWith(`${first.title} `));
      expect(rows).toHaveLength(first.count - 1);
      expect(rows).not.toContain(`${first.title} 1`);
      expect(rows[0]).toBe(`${first.title} 2`);
    } finally { await act(async () => screen.unmount()); }
  });
});
