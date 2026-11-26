/** Phase 2A: Puzzles (Cove) in the Clean 4.0 design (docs/LITTLE_ISLAND_4_DESIGN.md, Puzzles (Cove)). */
import React, { useContext } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { emptySave } from '../src/state/validation';
import { emptyLocal, defaults } from '../src/cove/local';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
import type { RoundChoices } from '../src/cove/CoveRound';
import { GridInteraction } from '../src/puzzles/grid/preferences';
import { theme } from '../src/ui/theme';

const fixture = vi.hoisted(() => ({
  local: {} as ReturnType<typeof import('../src/cove/useCoveLocal').useCoveLocal>, save: {} as ReturnType<typeof import('../src/state/validation').emptySave>,
  entries: undefined as ChallengeEntry[] | undefined, params: {} as Record<string, string>, covePerson: vi.fn(async () => true), push: vi.fn(), openGame: vi.fn(),
  rounds: [] as { card: ChallengeCard; partner: string | null; replace?: boolean; choices: RoundChoices }[], realRound: false,
}));
vi.mock('react-native', () => ({ ScrollView: 'section', View: 'div', TextInput: 'input', FlatList: 'list', Pressable: 'button', Platform: { OS: 'ios' }, AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, StyleSheet: { create: <T,>(s: T) => s, flatten: (s: unknown) => s, absoluteFill: {} }, useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('react-native-reanimated', async () => (await import('./helpers/cove-ui')).reanimated);
vi.mock('expo-haptics', async () => (await import('./helpers/cove-ui')).haptics);
vi.mock('expo-router', async () => { const { useEffect } = await import('react'); return { useIsFocused: () => true, useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]), useLocalSearchParams: () => fixture.params, router: { push: fixture.push, back: vi.fn(), canGoBack: () => true, replace: vi.fn() } }; });
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false, easeOut: 0, nativeDriver: true }));
vi.mock('../src/personalization/Portrait', () => ({ Portrait: () => null }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Audio', () => ({ useSoundControls: () => ({ play() {} }) }));
vi.mock('../src/challenge/SessionGate', () => ({ SessionGate: ({ render }: { render: () => React.ReactNode }) => render() }));
vi.mock('../src/cove/useCoveLocal', () => ({ useCoveLocal: () => fixture.local }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ ready: true, epoch: 1, save: fixture.save, covePerson: fixture.covePerson, selectLearner: vi.fn(), challengeOpen: vi.fn(), challengeSave: vi.fn(async () => true), challengeDiscard: vi.fn() }) }));
vi.mock('../src/hub/navigation', () => ({ openGame: fixture.openGame }));
vi.mock('../src/cove/catalog', async () => { const actual = await vi.importActual<typeof import('../src/cove/catalog')>('../src/cove/catalog'); return { ...actual, coveEntries: (e?: readonly ChallengeEntry[]) => e ? actual.coveEntries(e) : fixture.entries ?? actual.coveEntries() }; });
vi.mock('../src/cove/CoveRound', async () => {
  const actual = await vi.importActual<typeof import('../src/cove/CoveRound')>('../src/cove/CoveRound');
  return { ...actual, CoveRound: (props: { card: ChallengeCard; partner: string | null; replace?: boolean; choices: RoundChoices }) => { if (fixture.realRound) return <actual.CoveRound {...props as Parameters<typeof actual.CoveRound>[0]}/>; fixture.rounds.push(props); return <article data-hash={props.card.ref.hash} data-partner={props.partner} data-replace={String(!!props.replace)}/>; } };
});

const { default: CoveScreen } = await import('../src/cove/CoveScreen');
const { CoveRound } = await vi.importActual<typeof import('../src/cove/CoveRound')>('../src/cove/CoveRound');
const shelf = await import('../src/cove/shelf');
const { challengeEntries } = await import('../src/challenge/catalog');
const real = (game: string) => challengeEntries.find(e => e.game === game)!;

const card = (game: string, puzzle: number, tier = 1): ChallengeCard => ({ tier: tier as 1, title: `Fixture ${puzzle}`, ref: { bank: 10, puzzle, engine: game, rules: 1, hash: `${game.length.toString(16)}${puzzle}`.padEnd(64, 'a') }, source: { kind: 'endless', bank: 10, puzzle }, path: 'endless', dares: [] });
const inline = (game: string, tiers = [1, 2, 3]): ChallengeEntry => ({ game, cove: true, puzzles: tiers.map((t, i) => card(game, i, t)), codec: 'fixture', contextFor: () => 'fixture', start: () => { throw new Error('Fixture only'); }, move: () => null, render: () => null, controls: { help: () => null, reset: () => null }, catalog: { banks: new Map(), codecs: new Map(), contexts: new Set(), dares: new Map() } });
const paused = (game: string, ref: ChallengeCard['ref'], partner: string | null = null, ordinal = 1): ChallengeSession => ({ version: 1, owner: 'family', game, id: `paused-${game}`, ordinal, revision: 1, puzzle: ref, codec: 'fixture', payload: {}, selectedDares: [], partner, result: null, credited: false });
const withLearner = () => ({ ...emptySave(), learning: { version: 1, active: 'family', people: [{ id: 'family', name: 'Family', avatar: 'crab', skills: {}, choices: {}, notes: {} }, { id: 'mele', name: 'Mele', avatar: 'crab', skills: {}, choices: {}, notes: {} }] } } as unknown as ReturnType<typeof emptySave>);
let screen: ReactTestRenderer | undefined;
const mount = async (node: React.ReactElement = <CoveScreen/>) => { await act(async () => { screen = create(node); }); return screen!; };
const byTestID = (id: string) => screen!.root.findAll(n => n.props.testID === id && typeof n.type === 'string');
const press = (id: string) => act(async () => byTestID(id)[0].props.onPress());
const words = (n: ReactTestInstance | string): string => typeof n === 'string' ? n : n.children.map(words).join(' ');
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); fixture.params = {}; fixture.rounds = []; fixture.realRound = false; fixture.entries = undefined; fixture.save = emptySave(); fixture.covePerson.mockClear(); fixture.push.mockClear(); fixture.openGame.mockClear(); fixture.local = { data: emptyLocal(), ready: true, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn(async () => true) }; });
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; vi.unstubAllGlobals(); });

describe('plain difficulty words', () => {
  it('maps tiers 1–6 to the kit words with real size tags, and keeps the numeric band', async () => {
    // The same six words as the kit's DIFFICULTY_WORDS (kept in shelf.ts so it stays free of React Native).
    const kit = (await import('node:fs')).readFileSync('src/ui/DifficultyPills.tsx', 'utf8').match(/DIFFICULTY_WORDS = (\[[^\]]+\])/)![1];
    expect(shelf.DIFFICULTY_WORDS).toEqual(JSON.parse(kit.replace(/'/g, '"')));
    expect(shelf.difficultyOptionsFor(real('sudoku'))).toEqual([{ key: 1, label: 'Easy', tag: '4×4' }, { key: 2, label: 'Medium', tag: '6×6' }, { key: 3, label: 'Hard', tag: '9×9' }, { key: 4, label: 'Expert', tag: '9×9' }, { key: 5, label: 'Master', tag: '9×9' }, { key: 6, label: 'Master+', tag: '9×9' }]);
    // A game shows only the levels it has: Cage Sudoku has two.
    expect(shelf.difficultyOptionsFor(real('killer')).map(o => `${o.label} ${o.tag}`)).toEqual(['Hard 6×6', 'Master 9×9']);
    for (const entry of challengeEntries.filter(e => e.cove)) for (const o of shelf.difficultyOptionsFor(entry)) expect(`${o.label} ${o.tag ?? ''}`).not.toMatch(/Paddling|Shallows|Lagoon|Reef|Deep|Trench/);
    expect(shelf.plainTitle('Klondike draw 1 · Paddling')).toBe('Klondike draw 1');
    expect(shelf.bankNames([{ title: 'Lagoon' }, { title: 'Tide Pool' }] as never)).toEqual(['Set 1', 'Set 2']);
    expect(shelf.nearestTier(real('killer'), 1)).toBe(3);
  });
});

describe('the 4.0 shelf never hides saved work', () => {
  it('lists only registered shelf games in five sections, with Reef Sweep as a Challenge shortcut and School originals', () => {
    const sections = shelf.shelfSections({ originals: [{ id: 'slip-tide', name: 'Slip Tide' }, { id: 'canoe-seats', name: 'Canoe Seats' }], registered: game => challengeEntries.some(e => e.game === game) });
    const ids = Object.fromEntries(sections.map(s => [s.title, s.tiles.map(t => `${t.kind}:${t.id}`)]));
    expect(ids.Numbers).toEqual(['cove:sudoku', 'cove:killer']);
    expect(ids.Logic).toEqual(['cove:bridges', 'cove:loop', 'shortcut:reef-sweep']);
    expect(ids.Cards).toEqual(['cove:solitaire']);
    expect(ids.Originals).toEqual(['school:slip-tide', 'school:canoe-seats']);
    // Deferred games stay registered Cove entries (saves, pins and links resolve), they are just not tiles.
    const all = sections.flatMap(s => s.tiles.map(t => t.id));
    for (const deferred of ['cage-math', 'greater-than', 'skyline', 'pearl-loop']) { expect(all).not.toContain(deferred); expect(challengeEntries.some(e => e.game === deferred && e.cove)).toBe(true); }
    expect(shelf.SHORTCUTS['reef-sweep'].route).toEqual({ pathname: '/challenge', params: { game: 'reef-sweep' } });
  });
  it('a paused deferred game and a pin for it show in Continue, and its link opens its start sheet with Continue first', async () => {
    const deferred = inline('cage-math'), saved = paused('cage-math', deferred.puzzles[1].ref);
    fixture.entries = [inline('sudoku'), deferred];
    fixture.save = { ...withLearner(), challenge: { ...emptyChallenge(), paused: [saved] } };
    fixture.local.data.pins.family = [{ from: 'mele', ref: deferred.puzzles[2].ref }];
    await mount();
    expect(byTestID('cove-tile-cage-math')).toHaveLength(0);
    expect(byTestID(`cove-continue-${saved.id}`)[0].props.accessibilityLabel).toBe('Continue · Cage Math');
    expect(byTestID(`cove-continue-pin-${deferred.puzzles[2].ref.hash}`)[0].props.accessibilityLabel).toBe('Cage Math, from Mele');
    // Continue reopens that exact attempt.
    await press(`cove-continue-${saved.id}`);
    expect(fixture.rounds.at(-1)).toMatchObject({ card: { ref: saved.puzzle }, replace: false });
    await act(async () => screen!.unmount()); screen = undefined;
    fixture.params = { game: 'cage-math' };
    await mount();
    expect(screen!.root.findByType('aside').props['data-title']).toBe('Cage Math');
    expect(byTestID('start-continue')).toHaveLength(1); expect(byTestID('start-new')).toHaveLength(1);
  });
  it('an unknown game link lands calmly on Puzzles with nothing preselected', async () => {
    fixture.entries = [inline('sudoku')]; fixture.params = { game: 'not-a-game' };
    await mount();
    expect(screen!.root.findAllByType('aside')).toHaveLength(0);
    expect(byTestID('cove-tile-sudoku')).toHaveLength(1);
  });
  it('Choose a puzzle still resumes a paused puzzle that is hidden from new choices', async () => {
    const sudoku = inline('sudoku'), saved = paused('sudoku', sudoku.puzzles[0].ref);
    fixture.entries = [sudoku]; fixture.save = { ...emptySave(), challenge: { ...emptyChallenge(), paused: [saved] } };
    fixture.local.data.hidden = [saved.puzzle.hash];
    await mount();
    expect(byTestID(`cove-continue-${saved.id}`)).toHaveLength(1);
    await press(`cove-continue-${saved.id}`);
    expect(fixture.rounds.at(-1)!.card.ref).toEqual(saved.puzzle);
  });
});

describe('Puzzles home', () => {
  it('has no paragraphs, counts or band words; long-press favorites; Today deals a Medium puzzle', async () => {
    fixture.entries = [inline('sudoku'), inline('bridges')];
    await mount();
    const all = words(screen!.root);
    expect(all).not.toMatch(/Think as long|Every band|Tide Table|Bands, packs|Cove choices|puzzles ·|Paddling|Shallows|Keep going/);
    await act(async () => byTestID('cove-tile-sudoku')[0].props.onLongPress());
    expect(fixture.local.change).toHaveBeenCalledWith({ type: 'favorite', game: 'sudoku' });
    // Today is the existing tideTable's Medium pick for today's date.
    const pick = (await import('../src/cove/catalog')).tideTable((await import('../src/puzzles/today')).civilDate(new Date()), fixture.entries).find(p => p.size === 'Medium')!;
    await press('cove-today');
    expect(fixture.rounds.at(-1)!.card).toBe(pick.card);
  });
  it('Reef Sweep clears a Puzzles-only identity, then opens /challenge?game=reef-sweep', async () => {
    fixture.save = { ...emptySave(), cove: { version: 1, active: 'cove-leon', people: { 'cove-leon': { name: 'Leon', challenge: emptyChallenge(true) } } } };
    await mount();
    await act(async () => { byTestID('cove-tile-reef-sweep')[0].props.onPress(); await Promise.resolve(); });
    expect(fixture.covePerson).toHaveBeenCalledWith({ type: 'select', id: null }, 1);
    expect(fixture.push).toHaveBeenCalledWith({ pathname: '/challenge', params: { game: 'reef-sweep' } });
  });
});

describe('start sheet', () => {
  it('Continue resumes the saved attempt with its partner; New puzzle asks first by replacing through the round', async () => {
    const sudoku = inline('sudoku'), saved = paused('sudoku', sudoku.puzzles[2].ref, 'mele');
    fixture.entries = [sudoku]; fixture.params = { game: 'sudoku' };
    fixture.save = { ...withLearner(), challenge: { ...emptyChallenge(), paused: [saved] } };
    fixture.local.data.people.family = { ...defaults(), band: 1 };
    await mount();
    // The saved partner shows as Play together.
    expect(byTestID('mode-Play together')[0].props['aria-checked']).toBe(true);
    await press('start-continue');
    expect(fixture.rounds.at(-1)).toMatchObject({ card: { ref: saved.puzzle }, partner: 'mele', replace: false });
    await act(async () => screen!.unmount()); screen = undefined; fixture.rounds = [];
    await mount();
    await press('start-new');
    const round = fixture.rounds.at(-1)!;
    expect(round.replace).toBe(true); expect(round.card.ref).not.toEqual(saved.puzzle); expect(round.card.tier).toBe(1);
  });
  it('picking Play together then a face plays with that partner; On my own plays alone', async () => {
    fixture.entries = [inline('sudoku')]; fixture.params = { game: 'sudoku' }; fixture.save = withLearner();
    await mount();
    expect(byTestID('mode-On my own')[0].props['aria-checked']).toBe(true);
    await press('mode-Play together');
    await press('start-play');
    expect(fixture.rounds.at(-1)!.partner).toBe('mele');
  });
});

describe('board HUD and More', () => {
  const session = (game: string, partner: string | null = null) => paused(game, inline(game).puzzles[0].ref, partner);
  const round = async (entry: ChallengeEntry, choices: RoundChoices = {}, partner: string | null = null) => {
    fixture.save = { ...withLearner(), settings: { ...emptySave().settings, sound: false }, challenge: { ...emptyChallenge(), paused: [session(entry.game, partner)] } } as never;
    return mount(<CoveRound entry={entry} card={entry.puzzles[0]} partner={null} width={361} onBrowse={vi.fn()} onClose={vi.fn()} choices={choices}/>);
  };
  it('is one HUD row (56 pt in the kit) above the board; Undo and Hint send the engine actions', async () => {
    expect(theme.hud.height).toBe(56);
    const move = vi.fn(() => null), entry = { ...inline('sudoku'), helpUI: 'board' as const, move, render: () => <p>board</p> };
    await round(entry);
    const page = screen!.root.findByType('div' as never);
    expect(page.children[0]).toBeDefined();
    expect(byTestID('hud')[0].props['data-subtitle']).toBe('Easy');
    await press('hud-undo'); await press('hud-hint');
    expect(move.mock.calls.map(c => (c as unknown[])[1])).toEqual([{ type: 'undo' }, { type: 'hint' }]);
    // Nothing to undo and no hint left: the engine declines both, and the board says nothing.
    expect(JSON.stringify(screen!.toJSON())).not.toContain('could not be made');
  });
  it('More is an undimmed small sheet; the board shrinks above it; Mistakes, Choose, New and Roles are wired', async () => {
    const widths: number[] = [], onMistakes = vi.fn(), onNew = vi.fn();
    const entry = { ...inline('sudoku'), helpUI: 'board' as const, render: (_s: unknown, _d: unknown, _a: unknown, width: number) => { widths.push(width); return <p>board</p>; } };
    await round(entry, { mistakes: 'Friendly', onMistakes, onNew, onSend: vi.fn(async () => true) }, 'mele');
    // The board measured 600 pt tall at full width: with More open it scales to the 488 pt left above the sheet.
    await act(async () => byTestID('cove-board')[0].props.onLayout({ nativeEvent: { layout: { height: 600 } } }));
    await press('hud-more');
    const sheet = screen!.root.findByType('aside');
    expect(sheet.props['data-mode']).toBe('small');
    expect(widths.at(-1)).toBe(Math.floor(361 * (852 - Math.floor(852 * 0.4) - 24) / 600));
    expect(byTestID('mistakes-Friendly')[0].props['aria-checked']).toBe(true);
    await press('mistakes-Plain'); expect(onMistakes).toHaveBeenCalledWith('Plain');
    for (const item of ['Restart this puzzle', 'New puzzle', 'Choose a puzzle', 'Send to…', 'Roles', 'How to play']) expect(byTestID(`more-${item}`), item).toHaveLength(1);
    await press('more-New puzzle'); expect(onNew).toHaveBeenCalled();
  });
  it('Roles are left out when playing alone', async () => {
    await round({ ...inline('sudoku'), helpUI: 'board' as const, render: () => <p>board</p> });
    await press('hud-more');
    expect(byTestID('more-Roles')).toHaveLength(0);
  });
  it('a grid touch locks the board scroll and still tells the enclosing host', async () => {
    const outer = vi.fn();
    function Board() { const hold = useContext(GridInteraction); return React.createElement('button' as unknown as React.FC<Record<string, unknown>>, { testID: 'grab', onPress: () => hold(true), onLongPress: () => hold(false) }); }
    const entry = { ...inline('sudoku'), helpUI: 'board' as const, render: () => <Board/> };
    fixture.save = { ...withLearner(), challenge: { ...emptyChallenge(), paused: [session('sudoku')] } } as never;
    await mount(<GridInteraction.Provider value={outer}><CoveRound entry={entry} card={entry.puzzles[0]} partner={null} width={361} onBrowse={vi.fn()} onClose={vi.fn()}/></GridInteraction.Provider>);
    const scroll = () => screen!.root.findAll(n => n.type === ('section' as never) && n.props.keyboardShouldPersistTaps === 'handled')[0];
    expect(scroll().props.scrollEnabled).toBe(true);
    await press('grab'); expect(scroll().props.scrollEnabled).toBe(false); expect(outer).toHaveBeenCalledWith(true);
    await act(async () => byTestID('grab')[0].props.onLongPress()); expect(scroll().props.scrollEnabled).toBe(true);
  });
});
