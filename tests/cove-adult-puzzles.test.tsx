/** Track 3: Adult Puzzles & Grown-Up Challenge Cove (Build 9). */
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { emptySave } from '../src/state/validation';
import { emptyLocal, defaults } from '../src/cove/local';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
import { PUZZLE_TILE_ART } from '../src/art/illustrated';

const fixture = vi.hoisted(() => ({
  local: {} as ReturnType<typeof import('../src/cove/useCoveLocal').useCoveLocal>,
  save: {} as ReturnType<typeof import('../src/state/validation').emptySave>,
  entries: undefined as ChallengeEntry[] | undefined,
  params: {} as Record<string, string>,
  covePerson: vi.fn(async () => true),
  push: vi.fn(),
  openGame: vi.fn(),
  rounds: [] as { entry: ChallengeEntry; card: ChallengeCard; partner: string | null; replace?: boolean }[],
}));

vi.mock('react-native', () => ({
  ScrollView: 'section', View: 'div', TextInput: 'input', FlatList: 'list', Pressable: 'button', Image: 'img',
  Platform: { OS: 'ios' },
  AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
  StyleSheet: { create: <T,>(s: T) => s, flatten: (s: unknown) => s, absoluteFill: {} },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('react-native-reanimated', async () => (await import('./helpers/cove-ui')).reanimated);
vi.mock('expo-haptics', async () => (await import('./helpers/cove-ui')).haptics);
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react');
  return {
    useIsFocused: () => true,
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
    useLocalSearchParams: () => fixture.params,
    router: { push: fixture.push, back: vi.fn(), canGoBack: () => true, replace: vi.fn() },
  };
});
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false, easeOut: 0, nativeDriver: true }));
vi.mock('../src/personalization/Portrait', () => ({ Portrait: () => null }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Audio', () => ({ useSoundControls: () => ({ play() {} }) }));
vi.mock('../src/challenge/SessionGate', () => ({ SessionGate: ({ render }: { render: () => React.ReactNode }) => render() }));
vi.mock('../src/cove/useCoveLocal', () => ({ useCoveLocal: () => fixture.local }));
vi.mock('../src/state/Store', () => ({
  useStore: () => ({
    ready: true, epoch: 1, save: fixture.save, covePerson: fixture.covePerson,
    selectLearner: vi.fn(), challengeOpen: vi.fn(), challengeSave: vi.fn(async () => true), challengeDiscard: vi.fn(),
  }),
}));
vi.mock('../src/hub/navigation', () => ({ openGame: fixture.openGame }));
vi.mock('../src/cove/catalog', async () => {
  const actual = await vi.importActual<typeof import('../src/cove/catalog')>('../src/cove/catalog');
  return { ...actual, coveEntries: (e?: readonly ChallengeEntry[]) => e ? actual.coveEntries(e) : fixture.entries ?? actual.coveEntries() };
});
vi.mock('../src/cove/CoveRound', async () => {
  const actual = await vi.importActual<typeof import('../src/cove/CoveRound')>('../src/cove/CoveRound');
  return {
    ...actual,
    CoveRound: (props: typeof fixture.rounds[number]) => {
      fixture.rounds.push(props);
      return <article data-game={props.entry.game} data-bank={String(props.card.ref.bank)} data-tier={String(props.card.tier)} data-hash={props.card.ref.hash}/>;
    },
  };
});

const { default: CoveScreen } = await import('../src/cove/CoveScreen');
const shelf = await import('../src/cove/shelf');
const { challengeEntries } = await import('../src/challenge/catalog');
const real = (game: string) => challengeEntries.find(e => e.game === game)!;

const makePackedStub = (entry: ChallengeEntry): ChallengeEntry => {
  const packed = entry.packed!;
  const choose = vi.fn(async (bank: number) => ({
    bank,
    puzzle: 0,
    engine: entry.game,
    rules: 1,
    hash: `${bank.toString(16)}0`.padEnd(64, 'a'),
  }));
  return {
    ...entry,
    packed: {
      ...packed,
      choose,
      chooseVisible: choose,
      hiddenRows: async () => new Set<number>(),
      prepare: async () => {},
      open: async (bank: number, index: number) => ({
        bank,
        puzzle: index,
        engine: entry.game,
        rules: 1,
        hash: `${bank.toString(16)}${index.toString(16)}`.padEnd(64, 'a'),
      }),
    } as ChallengeEntry['packed'],
  };
};

let screen: ReactTestRenderer | undefined;
const mount = async () => { await act(async () => { screen = create(<CoveScreen/>); }); return screen!; };
const byTestID = (id: string) => screen!.root.findAll(n => n.props.testID === id && typeof n.type === 'string');
const press = (id: string) => act(async () => { expect(byTestID(id)[0], id).toBeDefined(); byTestID(id)[0].props.onPress(); });
const words = (n: ReactTestInstance | string): string => typeof n === 'string' ? n : n.children.map(words).join(' ');
const settle = () => act(async () => { for (let i = 0; i < 6; i++) await new Promise(r => setTimeout(r, 0)); });
const aside = (title: string) => screen!.root.findAll(n => n.type === ('aside' as never) && n.props['data-title'] === title)[0];

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fixture.params = {};
  fixture.rounds = [];
  fixture.entries = undefined;
  fixture.save = emptySave();
  fixture.covePerson.mockClear();
  fixture.push.mockClear();
  fixture.openGame.mockClear();
  fixture.local = { data: emptyLocal(), ready: true, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn(async () => true) };
});
afterEach(async () => {
  if (screen) await act(async () => screen!.unmount());
  screen = undefined;
  vi.unstubAllGlobals();
});

describe('Unlocked adult games and storybook tile art', () => {
  it('surfaces cage-math, greater-than, skyline, pearl-loop, and freecell on the shelf with illustrated WebP art', async () => {
    for (const id of ['cage-math', 'greater-than', 'skyline', 'pearl-loop', 'freecell']) {
      expect(PUZZLE_TILE_ART[id], id).toBe(`assets/art/puzzles/${id}.webp`);
      expect(shelf.tileInfoFor(id).provenance, id).toBe('Original levels, clues and pictures');
      expect(shelf.TIPS[id]?.length, id).toBeGreaterThan(0);
    }
    await mount();
    for (const id of ['cage-math', 'greater-than', 'skyline', 'pearl-loop', 'freecell', 'solitaire']) {
      expect(byTestID(`cove-tile-${id}`), id).toHaveLength(1);
    }
  });
});

describe('FreeCell first-class tile and Solitaire Draw 1 / Draw 3 selector', () => {
  it('FreeCell opens a FreeCell-scoped StartSheet and deals ONLY from FreeCell banks (slots 106–109)', async () => {
    const solitaire = makePackedStub(real('solitaire'));
    fixture.entries = [solitaire];
    await mount();

    await press('cove-tile-freecell');
    expect(aside('FreeCell')).toBeDefined();
    expect(byTestID('variant-draw-1')).toHaveLength(0);
    expect(byTestID('variant-draw-3')).toHaveLength(0);
    // Exact FreeCell tiers: Easy (1), Hard (3), Master (5), Master+ (6)
    expect(shelf.difficultyOptionsFor(solitaire, 'freecell').map(o => o.label)).toEqual(['Easy', 'Hard', 'Master', 'Master+']);
    for (const tier of [1, 3, 5, 6]) expect(byTestID(`difficulty-${tier}`)).toHaveLength(1);
    expect(byTestID('difficulty-2')).toHaveLength(0);
    expect(byTestID('difficulty-4')).toHaveLength(0);

    // Selecting Master+ shows FreeCell's exact authentic tier summary
    await press('difficulty-6');
    expect(words(byTestID('start-tier-summary')[0])).toBe('All cards are face up. Compare longer plans before using your free spaces.');

    // Favorite star toggles 'freecell' cleanly
    await press('start-favorite');
    expect(fixture.local.change).toHaveBeenCalledWith({ type: 'favorite', game: 'freecell' });

    // Playing deals from FreeCell Trench bank 109
    await press('start-play'); await settle();
    expect(fixture.rounds.at(-1)!.card.ref.bank).toBe(109);

    // Verify every FreeCell tier maps strictly to slots 106–109
    for (const [tier, expectedSlot] of [[1, 106], [3, 107], [5, 108], [6, 109]] as const) {
      const bands = solitaire.packed!.bands.filter(b => b.tier === tier && shelf.matchesVariant(b, 'freecell'));
      expect(bands.map(b => b.bank)).toEqual([expectedSlot]);
    }
  });

  it('Solitaire StartSheet shows Draw 1 / Draw 3 chips and deals from the chosen Klondike bank', async () => {
    const solitaire = makePackedStub(real('solitaire'));
    fixture.entries = [solitaire];
    await mount();

    await press('cove-tile-solitaire');
    expect(aside('Solitaire')).toBeDefined();
    expect(byTestID('variant-draw-1')[0].props['aria-checked']).toBe(true);
    expect(byTestID('variant-draw-3')[0].props['aria-checked']).toBe(false);

    // Switch to Draw 3 and Master+ (tier 6) -> deals slot 105 (Klondike draw 3 · Trench)
    await press('variant-draw-3');
    expect(byTestID('variant-draw-3')[0].props['aria-checked']).toBe(true);
    await press('difficulty-6');
    await press('start-play'); await settle();
    expect(fixture.rounds.at(-1)!.card.ref.bank).toBe(105);

    // Re-open Solitaire, switch back to Draw 1, tier 3 -> deals slot 101 (Klondike draw 1 · Lagoon)
    await act(async () => screen!.unmount()); screen = undefined; fixture.rounds = [];
    await mount();
    await press('cove-tile-solitaire');
    await press('variant-draw-1');
    await press('difficulty-3');
    await press('start-play'); await settle();
    expect(fixture.rounds.at(-1)!.card.ref.bank).toBe(101);
  });

  it('shows the exact paused variant label on Continue for FreeCell and Klondike Draw 3', async () => {
    const solitaire = makePackedStub(real('solitaire'));
    const freecellRef = { bank: 108, puzzle: 0, engine: 'solitaire', rules: 1, hash: 'f'.repeat(64) };
    const savedFreeCell: ChallengeSession = {
      version: 1, owner: 'family', game: 'solitaire', id: 'paused-fc', ordinal: 1, revision: 1,
      puzzle: freecellRef, codec: 'solitaire-v1', payload: {}, selectedDares: [], partner: null, result: null, credited: false,
    };
    fixture.entries = [solitaire];
    fixture.save = { ...emptySave(), challenge: { ...emptyChallenge(), paused: [savedFreeCell] } };
    await mount();

    // Continue strip card labels FreeCell properly
    expect(byTestID('cove-continue-paused-fc')[0].props.accessibilityLabel).toBe('Continue · FreeCell');

    await press('cove-tile-freecell');
    expect(words(byTestID('start-saved')[0])).toBe('FreeCell · Master · On my own');
    await press('start-continue');
    expect(fixture.rounds.at(-1)!.card.ref).toEqual(freecellRef);
  });
});

describe('Grown-up Challenge mode and rich tier summaries', () => {
  it('filters to grown-up games (hiding School originals), switches Today to Grown-up Today (tier >= 5), and pre-selects grown-up tiers', async () => {
    const packed = ['sudoku', 'killer', 'cage-math', 'greater-than', 'skyline', 'pearl-loop', 'bridges', 'loop', 'picture-grid', 'solitaire'].map(g => makePackedStub(real(g)));
    fixture.entries = packed;
    fixture.local.data.people.family = { ...defaults(), band: 1 };
    await mount();

    // Default mode is All puzzles: School originals and Today are present
    expect(byTestID('cove-mode-all')[0].props['aria-checked']).toBe(true);
    expect(byTestID('cove-mode-grownup')[0].props['aria-checked']).toBe(false);
    expect(byTestID('cove-tile-slip-tide')).toHaveLength(1);
    expect(byTestID('cove-today')[0].props.accessibilityLabel).toBe('Today');

    // Toggle Grown-up Challenge
    await press('cove-mode-grownup');
    expect(byTestID('cove-mode-grownup')[0].props['aria-checked']).toBe(true);
    // School originals (kid-tier-only) are hidden
    expect(byTestID('cove-tile-slip-tide')).toHaveLength(0);
    expect(byTestID('cove-tile-canoe-seats')).toHaveLength(0);
    // Grown-up games + Reef Sweep + FreeCell + Solitaire stay visible
    for (const id of ['sudoku', 'killer', 'cage-math', 'greater-than', 'bridges', 'loop', 'pearl-loop', 'skyline', 'reef-sweep', 'solitaire', 'freecell']) {
      expect(byTestID(`cove-tile-${id}`), id).toHaveLength(1);
    }
    // Today becomes Grown-up Today and deals a Tier >= 5 puzzle
    expect(byTestID('cove-today')[0].props.accessibilityLabel).toBe('Grown-up Today');
    const pick = shelf.grownUpToday('2026-11-27', packed)!;
    const pickTier = pick.card?.tier ?? pick.entry.packed!.bands.find(b => b.bank === pick.bank)!.tier;
    expect(pickTier).toBeGreaterThanOrEqual(5);

    // Tapping Cage Math in Grown-up Challenge mode pre-selects Master+ (tier 6) instead of remembered band 1
    await press('cove-tile-cage-math');
    expect(aside('Cage Math')).toBeDefined();
    expect(byTestID('difficulty-6')[0].props['aria-checked']).toBe(true);
    expect(words(byTestID('start-tier-summary')[0])).toBe('9×9 for grown-ups, all four operations.');

    // Closing and tapping Sudoku pre-selects Master (tier 5), switching to Master+ shows Trench summary
    await press('sheet-close');
    await press('cove-tile-sudoku');
    expect(byTestID('difficulty-5')[0].props['aria-checked']).toBe(true);
    await press('difficulty-6');
    expect(words(byTestID('start-tier-summary')[0])).toBe('9×9 for grown-ups: wings, fish and colour chains.');

    // Closing and tapping Skyline (max tier 4) pre-selects Expert (tier 4)
    await press('sheet-close');
    await press('cove-tile-skyline');
    expect(byTestID('difficulty-4')[0].props['aria-checked']).toBe(true);
    expect(words(byTestID('start-tier-summary')[0])).toBe('6×6 rooftops with some edge numbers missing.');

    // Closing and tapping Grown-up Today deals a tier >= 5 puzzle
    await press('sheet-close');
    await press('cove-today'); await settle();
    expect(fixture.rounds.at(-1)!.card.tier).toBeGreaterThanOrEqual(5);
  });

  it('respects a remembered grown-up band (>= 4) in Grown-up Challenge mode', () => {
    expect(shelf.grownUpTier(real('sudoku'), 1)).toBe(5);
    expect(shelf.grownUpTier(real('sudoku'), 4)).toBe(4);
    expect(shelf.grownUpTier(real('sudoku'), 6)).toBe(6);
    expect(shelf.grownUpTier(real('cage-math'), 1)).toBe(6);
    expect(shelf.grownUpTier(real('cage-math'), 4)).toBe(4);
    expect(shelf.grownUpTier(real('greater-than'), 1)).toBe(6);
    expect(shelf.grownUpTier(real('skyline'), 1)).toBe(4);
    expect(shelf.grownUpTier(real('pearl-loop'), 1)).toBe(5);
    expect(shelf.grownUpTier(real('solitaire'), 1, 'freecell')).toBe(5);
    expect(shelf.grownUpTier(real('solitaire'), 6, 'freecell')).toBe(6);
  });
});

describe('R1–R5 review regressions', () => {
  it('R1: PackedBrowser keeps draw-3, draw-1, and freecell locked across tier changes and selected cells', async () => {
    const { PackedBrowser } = await import('../src/cove/PackedBrowser');
    const { ChooseGrid } = await import('../src/cove/ChooseGrid');
    const entry = makePackedStub(real('solitaire'));

    const cases: readonly {
      variant: 'draw-3' | 'draw-1' | 'freecell';
      initial: number;
      steps: readonly [tier: number, bank: number][];
    }[] = [
      { variant: 'draw-3', initial: 6, steps: [[6, 105], [3, 104], [1, 103]] },
      { variant: 'draw-1', initial: 6, steps: [[6, 102], [3, 101], [1, 100]] },
      { variant: 'freecell', initial: 6, steps: [[6, 109], [5, 108], [3, 107], [1, 106]] },
    ];

    for (const { variant, initial, steps } of cases) {
      const chosen: ChallengeCard[] = [];
      await act(async () => {
        screen = create(<PackedBrowser entry={entry} progress={emptyChallenge()} initialBand={initial} variant={variant} onChoose={c => chosen.push(c)} onBand={vi.fn()}/>);
      });
      for (const [tier, bank] of steps) {
        let grid = screen!.root.findByType(ChooseGrid);
        if (grid.props.tier !== tier) {
          await act(async () => grid.props.onTier(tier));
          grid = screen!.root.findByType(ChooseGrid);
        }
        expect(grid.props.sets.map((s: { key: string }) => s.key), `${variant}@${tier}`).toEqual([String(bank)]);
        expect(grid.props.cells[0].key, `${variant}@${tier}`).toBe(`${bank}:0`);
        await act(async () => grid.props.cells[0].onPress());
        await settle();
        expect(chosen.at(-1)?.ref.bank, `${variant}@${tier} chosen`).toBe(bank);
      }
      await act(async () => screen!.unmount());
      screen = undefined;
    }
  });

  it('R3: grownUpToday / grownUpTodayPool enforce strict tier >= 5 and positive count > 0', () => {
    const skyline = makePackedStub(real('skyline'));
    expect(shelf.grownUpTodayPool('2026-11-27', [skyline])).toEqual([]);
    expect(shelf.grownUpToday('2026-11-27', [skyline])).toBeUndefined();

    const emptyTier5 = makePackedStub(real('sudoku'));
    emptyTier5.packed = {
      ...emptyTier5.packed!,
      bands: emptyTier5.packed!.bands.filter(b => b.tier === 5).map(b => ({ ...b, count: 0 })),
    };
    expect(shelf.grownUpTodayPool('2026-11-27', [emptyTier5])).toEqual([]);
    expect(shelf.grownUpToday('2026-11-27', [emptyTier5])).toBeUndefined();
  });

  it('R2: Grown-up Today falls back across remaining eligible tier >= 5 banks when 2026-01-04 bank 108 (64 hidden) is exhausted', async () => {
    const { civilDate } = await import('../src/puzzles/today');
    const entries = challengeEntries.filter(e => e.cove).map(entry => entry.packed ? makePackedStub(entry) : entry);
    const eligible = shelf.shelfEntries(entries);
    const date = '2026-01-04';
    const primary = shelf.grownUpToday(date, eligible);
    expect(primary?.entry.game).toBe('solitaire');
    expect(primary?.bank).toBe(108);

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${date}T12:00:00Z`));
    try {
      expect(civilDate(new Date())).toBe(date);
      fixture.entries = entries.map(entry => entry.game === 'solitaire' ? {
        ...entry,
        packed: { ...entry.packed!, hiddenRows: async (bank: number) => new Set(bank === 108 ? Array.from({ length: 64 }, (_, i) => i) : []) },
      } as ChallengeEntry : entry);
      fixture.local.data.hidden = Array.from({ length: 64 }, (_, i) => i.toString(16).padStart(64, '0'));
      await mount();
      await press('cove-mode-grownup');
      await press('cove-today');
      await settle();
      expect(fixture.rounds).toHaveLength(1);
      expect(fixture.rounds[0].card.tier).toBeGreaterThanOrEqual(5);
      expect(fixture.rounds[0].card.ref.bank).not.toBe(108);

      // Even if every tier >= 5 Solitaire bank is hidden, fallback moves to another adult game's tier >= 5 bank.
      await act(async () => screen!.unmount()); screen = undefined; fixture.rounds = [];
      fixture.entries = entries.map(entry => entry.game === 'solitaire' ? {
        ...entry,
        packed: { ...entry.packed!, hiddenRows: async (bank: number) => new Set(Array.from({ length: entry.packed!.bands.find(b => b.bank === bank)?.count ?? 0 }, (_, i) => i)) },
      } as ChallengeEntry : entry);
      await mount();
      await press('cove-mode-grownup');
      await press('cove-today');
      await settle();
      expect(fixture.rounds).toHaveLength(1);
      expect(fixture.rounds[0].entry.game).not.toBe('solitaire');
      expect(fixture.rounds[0].card.tier).toBeGreaterThanOrEqual(5);

      // When the entire eligible tier >= 5 pool is hidden, reports "No other puzzle here." without opening a round.
      await act(async () => screen!.unmount()); screen = undefined; fixture.rounds = [];
      const sudokuOnly = makePackedStub(real('sudoku'));
      fixture.entries = [{
        ...sudokuOnly,
        packed: { ...sudokuOnly.packed!, hiddenRows: async (bank: number) => new Set(Array.from({ length: sudokuOnly.packed!.bands.find(b => b.bank === bank)?.count ?? 0 }, (_, i) => i)) },
      } as ChallengeEntry];
      await mount();
      await press('cove-mode-grownup');
      await press('cove-today');
      await settle();
      expect(fixture.rounds).toHaveLength(0);
      expect(words(screen!.root)).toContain('No other puzzle here.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('R4: Continue cards and pins include exact Draw 1 / Draw 3 variant while keeping FreeCell and solitaire save id intact', async () => {
    const solitaire = makePackedStub(real('solitaire'));
    const refDraw3 = { bank: 104, puzzle: 0, engine: 'solitaire', rules: 1, hash: 'd'.repeat(64) };
    const refDraw1 = { bank: 101, puzzle: 0, engine: 'solitaire', rules: 1, hash: '1'.repeat(64) };
    const refFreeCell = { bank: 108, puzzle: 0, engine: 'solitaire', rules: 1, hash: 'f'.repeat(64) };
    const pinDraw3 = { bank: 104, puzzle: 1, engine: 'solitaire', rules: 1, hash: 'e'.repeat(64) };
    const pinDraw1 = { bank: 100, puzzle: 0, engine: 'solitaire', rules: 1, hash: 'a'.repeat(64) };

    fixture.entries = [solitaire];
    fixture.save = {
      ...emptySave(),
      challenge: {
        ...emptyChallenge(),
        paused: [
          { version: 1, owner: 'family', game: 'solitaire', id: 'paused-d3', ordinal: 3, revision: 1, puzzle: refDraw3, codec: 'solitaire-v1', payload: {}, selectedDares: [], partner: null, result: null, credited: false },
          { version: 1, owner: 'family', game: 'solitaire', id: 'paused-d1', ordinal: 2, revision: 1, puzzle: refDraw1, codec: 'solitaire-v1', payload: {}, selectedDares: [], partner: null, result: null, credited: false },
          { version: 1, owner: 'family', game: 'solitaire', id: 'paused-fc', ordinal: 1, revision: 1, puzzle: refFreeCell, codec: 'solitaire-v1', payload: {}, selectedDares: [], partner: null, result: null, credited: false },
        ],
      },
    };
    fixture.local.data.pins.family = [
      { from: 'family', ref: pinDraw3 },
      { from: 'family', ref: pinDraw1 },
    ];

    await mount();
    const d3Card = byTestID('cove-continue-paused-d3')[0];
    expect(d3Card.props.accessibilityLabel).toBe('Continue · Solitaire · Draw 3');
    expect(words(d3Card)).toContain('Solitaire · Draw 3');

    const d1Card = byTestID('cove-continue-paused-d1')[0];
    expect(d1Card.props.accessibilityLabel).toBe('Continue · Solitaire · Draw 1');
    expect(words(d1Card)).toContain('Solitaire · Draw 1');

    const fcCard = byTestID('cove-continue-paused-fc')[0];
    expect(fcCard.props.accessibilityLabel).toBe('Continue · FreeCell');
    expect(words(fcCard)).toContain('FreeCell');

    const pinD3Card = byTestID(`cove-continue-pin-${pinDraw3.hash}`)[0];
    expect(pinD3Card.props.accessibilityLabel).toBe('Solitaire · Draw 3, from Family practice');
    expect(words(pinD3Card)).toContain('Solitaire · Draw 3');

    // Open "See all" to check the 5th item (pinDraw1) too
    await press('cove-continue-all');
    const pinD1Card = byTestID(`cove-continue-pin-${pinDraw1.hash}`)[0];
    expect(pinD1Card.props.accessibilityLabel).toBe('Solitaire · Draw 1, from Family practice');
    expect(words(pinD1Card)).toContain('Solitaire · Draw 1');
  });

  it('R5: tierSummary returns a non-empty accurate description for every registered Cove shelf game, variant, and offered tier (including Picture Grid 1..4)', async () => {
    const { coveEntries } = await import('../src/cove/catalog');
    const shelfList = shelf.shelfEntries(coveEntries(challengeEntries));
    expect(shelfList.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const entry of shelfList) {
      const variants: ('draw-1' | 'draw-3' | 'freecell' | undefined)[] = entry.game === 'solitaire'
        ? [undefined, 'draw-1', 'draw-3', 'freecell']
        : [undefined];
      for (const variant of variants) {
        const tiers = shelf.tiersOf(entry, variant);
        expect(tiers.length, `${entry.game}:${variant ?? 'default'}`).toBeGreaterThan(0);
        for (const tier of tiers) {
          const summary = shelf.tierSummary(entry, tier, variant);
          if (!summary?.trim()) missing.push(`${entry.game}:${variant ?? 'default'}:${tier}`);
        }
      }
    }
    expect(missing).toEqual([]);

    // Explicit Picture Grid size accuracy check against manifest bands (slots 110–113)
    const pic = real('picture-grid');
    expect(shelf.tierSummary(pic, 1)).toContain('5×5');
    expect(shelf.tierSummary(pic, 2)).toContain('8×8');
    expect(shelf.tierSummary(pic, 2)).toContain('10×10');
    expect(shelf.tierSummary(pic, 3)).toContain('12×12');
    expect(shelf.tierSummary(pic, 4)).toContain('15×15');

    // Verify StartSheet renders Picture Grid tier summaries for tiers 1..4
    fixture.entries = [makePackedStub(pic)];
    await mount();
    await press('cove-tile-picture-grid');
    for (const tier of [1, 2, 3, 4]) {
      await press(`difficulty-${tier}`);
      expect(words(byTestID('start-tier-summary')[0])).toBe(shelf.tierSummary(pic, tier));
    }
  });
});
