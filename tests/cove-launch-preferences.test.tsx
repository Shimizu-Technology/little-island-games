import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import CoveScreen from '../src/cove/CoveScreen';
import { emptySave } from '../src/state/validation';
import { emptyLocal, defaults } from '../src/cove/local';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
const fixture = vi.hoisted(() => ({ local: {} as ReturnType<typeof import('../src/cove/useCoveLocal').useCoveLocal>, save: {} as ReturnType<typeof emptySave>, entries: [] as ChallengeEntry[] }));
vi.mock('react-native', () => ({ ScrollView: 'section', View: 'div', TextInput: 'input', useWindowDimensions: () => ({ width: 320, height: 667, fontScale: 1 }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('expo-router', () => ({ useLocalSearchParams: () => ({ game: 'sudoku' }), router: {} }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', Sheet: () => null, ToggleRow: 'switch', C: {}, font: undefined }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/hub/Landmarks', () => ({ Landmark: () => null }));
vi.mock('../src/cove/PeoplePicker', () => ({ PeoplePicker: () => null, solvingPeople: () => [{ id: 'family', name: 'Family practice' }] }));
vi.mock('../src/cove/CoveRound', () => ({ CoveRound: ({ card }: { card: ChallengeCard }) => <section data-tier={card.tier} data-hash={card.ref.hash}/> }));
vi.mock('../src/cove/useCoveLocal', () => ({ useCoveLocal: () => fixture.local }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ ready: true, epoch: 1, save: fixture.save }) }));
vi.mock('../src/hub/navigation', () => ({ openGame: vi.fn() }));
vi.mock('../src/cove/catalog', async () => ({ ...await vi.importActual('../src/cove/catalog'), coveEntries: () => fixture.entries }));
it('waits for local choices before opening a game deep link, respects the owner band and hidden refs', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); fixture.save = emptySave();
  const cards = [1, 6, 6].map((tier, i) => ({ tier, title: `Fixture ${i}`, ref: { bank: 10, puzzle: i, engine: 'sudoku', rules: 1, hash: String(i).repeat(64) } })) as ChallengeCard[];
  fixture.entries = [{ game: 'sudoku', cove: true, puzzles: cards, codec: 'fixture', contextFor: () => 'fixture', start: () => { throw new Error('Fixture only'); }, move: () => null, render: () => null, controls: { help: () => null, reset: () => null }, catalog: { banks: new Map(), codecs: new Map(), contexts: new Set(), dares: new Map() } }];
  const data = { ...emptyLocal(), people: { family: { ...defaults(), band: 6 } }, hidden: [cards[1].ref.hash] };
  fixture.local = { data, ready: false, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn() }; let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<CoveScreen/>); }); expect(screen.root.findAllByProps({ 'data-tier': 6 })).toHaveLength(0);
    fixture.local = { ...fixture.local, ready: true };
    await act(async () => screen.update(<CoveScreen/>));
    const board = screen.root.findByProps({ 'data-tier': 6 }); expect(board.props['data-hash']).toBe(cards[2].ref.hash);
  } finally { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
});
