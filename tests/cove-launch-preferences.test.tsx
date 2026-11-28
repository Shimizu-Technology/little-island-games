import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import CoveScreen from '../src/cove/CoveScreen';
import { emptyChallenge } from '../src/state/challenge';
import { emptySave } from '../src/state/validation';
import { emptyLocal, defaults } from '../src/cove/local';
import type { RoundChoices } from '../src/cove/CoveRound';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
vi.mock('../src/atmosphere/AtmosphereHeader', () => ({ AtmosphereHeader: () => null }));
vi.mock('../src/atmosphere/GlobalWeatherLayer', () => ({ GlobalWeatherLayer: () => null, AtmosphereSky: () => null }));

const fixture = vi.hoisted(() => ({ local: {} as ReturnType<typeof import('../src/cove/useCoveLocal').useCoveLocal>, save: {} as ReturnType<typeof emptySave>, entries: [] as ChallengeEntry[], covePerson: vi.fn() }));
vi.mock('react-native', () => ({ ScrollView: 'section', View: 'div', TextInput: 'input', FlatList: 'list', useWindowDimensions: () => ({ width: 320, height: 667, fontScale: 1 }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('expo-router', async () => { const { useEffect } = await import('react'); return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]), useLocalSearchParams: () => ({ game: 'sudoku' }), router: {} }; });
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/cove/PeoplePicker', () => ({ PeoplePicker: () => null, FaceButton: () => null, solvingPeople: () => [{ id: 'family', name: 'Family practice' }] }));
vi.mock('../src/cove/CoveRound', () => ({ CoveRound: ({ card, choices }: { card: ChallengeCard; choices: RoundChoices }) => <section data-tier={card.tier} data-hash={card.ref.hash}><button onClick={() => choices.onGrownUps?.()}>Grown-ups</button></section> }));
vi.mock('../src/cove/useCoveLocal', () => ({ useCoveLocal: () => fixture.local }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ ready: true, epoch: 1, save: fixture.save, covePerson: fixture.covePerson }) }));
vi.mock('../src/hub/navigation', () => ({ openGame: vi.fn() }));
vi.mock('../src/cove/catalog', async () => ({ ...await vi.importActual('../src/cove/catalog'), coveEntries: () => fixture.entries }));
const cards = [1, 6, 6].map((tier, i) => ({ tier, title: `Fixture ${i}`, ref: { bank: 10, puzzle: i, engine: 'sudoku', rules: 1, hash: String(i).repeat(64) } })) as ChallengeCard[];
const sudoku = (): ChallengeEntry => ({ game: 'sudoku', cove: true, puzzles: cards, codec: 'fixture', contextFor: () => 'fixture', start: () => { throw new Error('Fixture only'); }, move: () => null, render: () => null, controls: { help: () => null, reset: () => null }, catalog: { banks: new Map(), codecs: new Map(), contexts: new Set(), dares: new Map() } });
const byTestID = (screen: ReactTestRenderer, id: string) => screen.root.findAll(n => n.props.testID === id && n.type === 'button');
const pressTest = (screen: ReactTestRenderer, id: string) => act(async () => byTestID(screen, id)[0].props.onPress());

it('waits for local choices, then a game link opens its start sheet on the remembered difficulty and plays a visible puzzle there', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); fixture.save = emptySave(); fixture.entries = [sudoku()];
  const data = { ...emptyLocal(), people: { family: { ...defaults(), band: 6 } }, hidden: [cards[1].ref.hash] };
  fixture.local = { data, ready: false, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn(async () => true) }; let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<CoveScreen/>); });
    expect(screen.root.findAllByType('aside')).toHaveLength(0); expect(screen.root.findAllByProps({ 'data-tier': 6 })).toHaveLength(0);
    fixture.local = { ...fixture.local, ready: true };
    await act(async () => screen.update(<CoveScreen/>));
    // The sheet: name, only the difficulties Sudoku has here (plain words), Master+ remembered, one coral Play.
    const sheet = screen.root.findByType('aside');
    expect(sheet.props['data-title']).toBe('Sudoku');
    expect(byTestID(screen, 'difficulty-1')[0].props.accessibilityLabel).toBe('Easy'); expect(byTestID(screen, 'difficulty-6')[0].props['aria-checked']).toBe(true);
    expect(byTestID(screen, 'start-continue')).toHaveLength(0); expect(byTestID(screen, 'start-play')).toHaveLength(1);
    // Only one person here, so there is no mode row.
    expect(byTestID(screen, 'mode-Play together')).toHaveLength(0);
    await pressTest(screen, 'start-play');
    const board = screen.root.findByProps({ 'data-tier': 6 }); expect(board.props['data-hash']).toBe(cards[2].ref.hash);
  } finally { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
});

it('a first-time person starts on Easy, and one tap on Hard is remembered as their band', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); fixture.save = emptySave();
  fixture.entries = [{ ...sudoku(), puzzles: [1, 2, 3].map((tier, i) => ({ ...cards[0], tier, ref: { ...cards[0].ref, puzzle: i, hash: String(i + 3).repeat(64) } })) as ChallengeCard[] }];
  const change = vi.fn(async () => true); fixture.local = { data: emptyLocal(), ready: true, error: '', load: vi.fn(), reset: vi.fn(), change }; let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<CoveScreen/>); });
    expect(byTestID(screen, 'difficulty-1')[0].props['aria-checked']).toBe(true);
    await pressTest(screen, 'difficulty-3');
    expect(change).toHaveBeenCalledWith({ type: 'preferences', owner: 'family', value: { band: 3 } });
    await pressTest(screen, 'start-play');
    expect(screen.root.findByProps({ 'data-tier': 3 })).toBeDefined();
  } finally { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
});

it('clears a Cove-only identity when the route loses focus through Back', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); fixture.save = { ...emptySave(), cove: { version: 1, active: 'cove-leon', people: { 'cove-leon': { name: 'Leon', challenge: emptyChallenge(true) } } } };
  fixture.local = { data: emptyLocal(), ready: false, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn() };
  fixture.covePerson.mockReset(); let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<CoveScreen/>); });
    await act(async () => screen.unmount());
    expect(fixture.covePerson).toHaveBeenCalledWith({ type: 'select', id: null }, 1);
  } finally { vi.unstubAllGlobals(); }
});

it('17 keeps fill-notes behind the grown-up gate even for Grown-up readers', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); fixture.save = emptySave(); fixture.entries = [sudoku()];
  fixture.local = { data: { ...emptyLocal(), people: { family: { ...defaults(), reader: 'Grown-up' } } }, ready: true, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn(async () => true) }; let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<CoveScreen/>); });
    await pressTest(screen, 'start-play');
    await act(async () => screen.root.findAllByType('button').find(b => b.children.includes('Grown-ups'))!.props.onClick());
    const sheet = () => screen.root.findAllByType('aside').find(a => a.props['data-title'] === 'Grown-ups')!;
    expect(sheet().findAllByType('switch')).toHaveLength(0);
    const question = JSON.stringify(sheet().findAllByType('span').map(s => s.children)), [a, b] = question.match(/(\d+)","? × ","?(\d+)/)?.slice(1).map(Number) ?? [];
    expect(question).toContain('What is');
    await act(async () => sheet().findByProps({ accessibilityLabel: 'Grown-up answer' }).props.onChangeText(String(a * b)));
    await act(async () => sheet().findAllByType('button').find(n => n.children.includes('Open'))!.props.onPress());
    expect(sheet().findAllByType('switch')).toHaveLength(1);
  } finally { await act(async () => screen?.unmount()); vi.unstubAllGlobals(); }
});
