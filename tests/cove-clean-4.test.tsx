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
import { useBoardHud, type BoardCommands } from '../src/cove/boardHud';
import { theme } from '../src/ui/theme';

const fixture = vi.hoisted(() => ({
  local: {} as ReturnType<typeof import('../src/cove/useCoveLocal').useCoveLocal>, save: {} as ReturnType<typeof import('../src/state/validation').emptySave>,
  entries: undefined as ChallengeEntry[] | undefined, params: {} as Record<string, string>, covePerson: vi.fn(async () => true), push: vi.fn(), openGame: vi.fn(), challengeSave: vi.fn(async (_s: unknown, _e?: unknown) => true),
  rounds: [] as { card: ChallengeCard; partner: string | null; replace?: boolean; choosing?: boolean; onBrowse: () => void; choices: RoundChoices }[], realRound: false,
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
vi.mock('../src/state/Store', () => ({ useStore: () => ({ ready: true, epoch: 1, save: fixture.save, covePerson: fixture.covePerson, selectLearner: vi.fn(), challengeOpen: vi.fn(), challengeSave: fixture.challengeSave, challengeDiscard: vi.fn() }) }));
vi.mock('../src/hub/navigation', () => ({ openGame: fixture.openGame }));
vi.mock('../src/cove/catalog', async () => { const actual = await vi.importActual<typeof import('../src/cove/catalog')>('../src/cove/catalog'); return { ...actual, coveEntries: (e?: readonly ChallengeEntry[]) => e ? actual.coveEntries(e) : fixture.entries ?? actual.coveEntries() }; });
vi.mock('../src/cove/CoveRound', async () => {
  const actual = await vi.importActual<typeof import('../src/cove/CoveRound')>('../src/cove/CoveRound');
  return { ...actual, CoveRound: (props: typeof fixture.rounds[number]) => { if (fixture.realRound) return <actual.CoveRound {...props as unknown as Parameters<typeof actual.CoveRound>[0]}/>; fixture.rounds.push(props); return <article data-hash={props.card.ref.hash} data-partner={props.partner} data-replace={String(!!props.replace)} data-choosing={String(!!props.choosing)}/>; } };
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
const byLabel = (label: string) => screen!.root.findAll(n => n.props.accessibilityLabel === label && typeof n.type === 'string');
const pressLabel = (label: string) => act(async () => { const b = byLabel(label)[0]; expect(b, label).toBeDefined(); b.props.onPress(); });
const aside = (title: string) => screen!.root.findAll(n => n.type === ('aside' as never) && n.props['data-title'] === title)[0];
/** The chooser's header (difficulty pills and set chips) is a FlatList header prop here: find the element whose props match. */
const header = (match: (props: Record<string, unknown>) => boolean) => {
  const walk = (el: unknown): Record<string, unknown> | undefined => { if (!el || typeof el !== 'object') return; if (Array.isArray(el)) { for (const c of el) { const f = walk(c); if (f) return f; } return; } const props = (el as { props?: Record<string, unknown> }).props; return props && (match(props) ? props : walk(props.children)); };
  return walk(screen!.root.findByType('list' as never).props.ListHeaderComponent)!;
};
const settle = () => act(async () => { for (let i = 0; i < 6; i++) await new Promise(r => setTimeout(r, 0)); });
/** A stand-in board that hands the HUD commands the way the real boards do. */
function Board({ commands, onDispatch }: { commands: BoardCommands; onDispatch?: () => void }) { useBoardHud(commands); return React.createElement('button' as unknown as React.FC<Record<string, unknown>>, { testID: 'board-move', onPress: onDispatch }); }
const terminal = { event: 'independent', awards: 0, dares: [], cost: null, solution: 'f'.repeat(64) } as const;
/** A real round over a fixture engine whose one move solves the puzzle; the mocked Store applies accepted saves. */
const solvable = (game = 'sudoku'): ChallengeEntry => {
  const base = inline(game);
  return { ...base, helpUI: 'board', catalog: { ...base.catalog, codecs: new Map([['fixture', { evaluate: () => terminal } as never]]) }, move: s => ({ ...s, revision: s.revision + 1, result: terminal as never }),
    render: (_s, dispatch) => <Board commands={{}} onDispatch={() => dispatch({ type: 'solve' })}/> };
};
const applySaves = () => fixture.challengeSave.mockImplementation(async (next: unknown) => {
  const s = next as ChallengeSession, c = fixture.save.challenge!;
  fixture.save = { ...fixture.save, challenge: { ...c, paused: s.result ? c.paused.filter(p => p.id !== s.id) : c.paused.map(p => p.id === s.id ? s : p) } };
  return true;
});
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); fixture.params = {}; fixture.rounds = []; fixture.realRound = false; fixture.entries = undefined; fixture.save = emptySave(); fixture.covePerson.mockClear(); fixture.challengeSave.mockReset(); fixture.challengeSave.mockImplementation(async () => true); fixture.push.mockClear(); fixture.openGame.mockClear(); fixture.local = { data: emptyLocal(), ready: true, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn(async () => true) }; });
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
  it('Choose a puzzle opens over the mounted round, leaves hidden puzzles out, and closing it returns to the same paused round', async () => {
    const sudoku = inline('sudoku', [1, 1, 1]), saved = paused('sudoku', sudoku.puzzles[0].ref);
    fixture.entries = [sudoku]; fixture.save = { ...emptySave(), challenge: { ...emptyChallenge(), paused: [saved] } };
    fixture.local.data.hidden = [saved.puzzle.hash, sudoku.puzzles[1].ref.hash];
    await mount();
    expect(byTestID(`cove-continue-${saved.id}`)).toHaveLength(1);
    await press(`cove-continue-${saved.id}`);
    const resumed = fixture.rounds.at(-1)!;
    expect(resumed.card.ref).toEqual(saved.puzzle); expect(resumed.replace).toBe(false);
    await act(async () => resumed.onBrowse());
    // The chooser is its own large sheet; the round under it is the same mount, told that More should step aside.
    expect(aside('Choose a puzzle').props['data-mode']).toBe('large');
    const round = screen!.root.findByType('article' as never);
    expect(round.props['data-hash']).toBe(saved.puzzle.hash); expect(round.props['data-choosing']).toBe('true');
    // Neither hidden puzzle is a new choice: only puzzle 3 is offered.
    expect(screen!.root.findByType('list' as never).props.data.map((c: { number: number }) => c.number)).toEqual([3]);
    await act(async () => aside('Choose a puzzle').findAll(n => n.props.testID === 'sheet-close')[0].props.onPress());
    expect(aside('Choose a puzzle')).toBeUndefined();
    expect(screen!.root.findByType('article' as never).props['data-choosing']).toBe('false');
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
    // Continue shows its own saved difficulty and partner; the pills below are labelled as the New puzzle choices.
    expect(words(byTestID('start-saved')[0])).toBe('Hard · with Mele');
    expect(byTestID('start-continue')[0].props.accessibilityLabel).toBe('Continue, Hard · with Mele');
    expect(byTestID('difficulty-1')[0].props['aria-checked']).toBe(true);
    expect(words(byTestID('start-new-heading')[0])).toBe('For a new puzzle');
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
  it('Play together survives the chooser offered when a difficulty has nothing new left', async () => {
    const sudoku = inline('sudoku', [1, 2]);
    fixture.entries = [sudoku]; fixture.params = { game: 'sudoku' }; fixture.save = withLearner(); fixture.local.data.hidden = [sudoku.puzzles[0].ref.hash];
    await mount();
    await press('mode-Play together');
    await press('start-play'); await settle();
    expect(words(byTestID('start-status')[0])).toBe('No other puzzle here.');
    await press('start-choose');
    await act(async () => (header(p => typeof p.onChange === 'function').onChange as (k: number) => void)(2));
    await act(async () => screen!.root.findByType('list' as never).props.data[0].onPress());
    expect(fixture.rounds.at(-1)).toMatchObject({ card: { ref: sudoku.puzzles[1].ref }, partner: 'mele', replace: true });
  });
});

describe('board HUD and More', () => {
  const session = (game: string, partner: string | null = null) => paused(game, inline(game).puzzles[0].ref, partner);
  const round = async (entry: ChallengeEntry, choices: RoundChoices = {}, partner: string | null = null) => {
    fixture.save = { ...withLearner(), settings: { ...emptySave().settings, sound: false }, challenge: { ...emptyChallenge(), paused: [session(entry.game, partner)] } } as never;
    return mount(<CoveRound entry={entry} card={entry.puzzles[0]} partner={null} width={361} onBrowse={vi.fn()} onClose={vi.fn()} choices={choices}/>);
  };
  it('is one HUD row (56 pt in the kit) above the board; Undo and Hint run the board’s own commands, never a raw engine action', async () => {
    expect(theme.hud.height).toBe(56);
    const move = vi.fn(() => null), hint = vi.fn(), undo = vi.fn();
    const entry = { ...inline('sudoku'), helpUI: 'board' as const, move, render: () => <Board commands={{ hint: { run: hint }, undo: { run: undo } }}/> };
    await round(entry);
    expect(byTestID('hud')[0].props['data-subtitle']).toBe('Easy');
    await press('hud-undo'); await press('hud-hint');
    expect(undo).toHaveBeenCalledTimes(1); expect(hint).toHaveBeenCalledTimes(1);
    expect(move).not.toHaveBeenCalled();
  });
  it('a board that keeps its own Hint and Undo gets none in the HUD, and an unavailable command dims its HUD button', async () => {
    const move = vi.fn(() => null);
    await round({ ...inline('sudoku'), helpUI: 'board' as const, move, render: () => <p>board</p> });
    expect(byTestID('hud-undo')).toHaveLength(0); expect(byTestID('hud-hint')).toHaveLength(0);
    await act(async () => screen!.unmount()); screen = undefined;
    await round({ ...inline('sudoku'), helpUI: 'board' as const, move, render: () => <Board commands={{ hint: { run: vi.fn(), disabled: true }, undo: { run: vi.fn(), disabled: true } }}/> });
    expect(byTestID('hud-undo')[0].props.disabled).toBe(true); expect(byTestID('hud-hint')[0].props.disabled).toBe(true);
    expect(move).not.toHaveBeenCalled();
  });
  it('More is an undimmed small sheet; the board shrinks above it; Mistakes, Restart, Choose, New and Roles are wired', async () => {
    const widths: number[] = [], onMistakes = vi.fn(), onNew = vi.fn(), reset = vi.fn();
    const entry = { ...inline('sudoku'), helpUI: 'board' as const, render: (_s: unknown, _d: unknown, _a: unknown, width: number) => { widths.push(width); return <Board commands={{ reset: { run: reset } }}/>; } };
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
    // Restart is the board's own reset of this attempt: no new attempt is saved.
    await press('more-Restart this puzzle'); await press('more-restart-confirm');
    expect(reset).toHaveBeenCalledTimes(1); expect(fixture.challengeSave).not.toHaveBeenCalled();
    await press('hud-more'); await press('more-New puzzle'); expect(onNew).toHaveBeenCalled();
  });
  it('the board never shrinks below its minimum above More, and the room is the screen’s own measured height', async () => {
    const widths: number[] = [];
    const entry = { ...inline('sudoku'), helpUI: 'board' as const, render: (_s: unknown, _d: unknown, _a: unknown, width: number) => { widths.push(width); return <p>board</p>; } };
    await round(entry);
    await act(async () => byTestID('cove-board')[0].props.onLayout({ nativeEvent: { layout: { height: 2000 } } }));
    await press('hud-more');
    expect(widths.at(-1)).toBe(280);
    await act(async () => screen!.root.findAll(n => n.props.onLayout && n.props.style?.flex === 1)[0].props.onLayout({ nativeEvent: { layout: { height: 700 } } }));
    expect(widths.at(-1)).toBe(280);
  });
  it('Mistakes appear only for boards that read them', async () => {
    await round({ ...inline('bridges'), helpUI: 'board' as const, render: () => <p>board</p> }, { mistakes: 'Friendly', onMistakes: vi.fn() });
    await press('hud-more');
    expect(byTestID('mistakes-Friendly')).toHaveLength(0);
  });
  it('a refused pin says so inside Send to…, keeping the faces', async () => {
    const onSend = vi.fn(async () => false);
    await round({ ...inline('sudoku'), helpUI: 'board' as const, render: () => <p>board</p> }, { onSend });
    await press('hud-more'); await press('more-Send to…');
    await pressLabel('Send to Mele'); await settle();
    expect(onSend).toHaveBeenCalledWith('mele', expect.objectContaining({ engine: 'sudoku' }));
    expect(words(byTestID('more-send-error')[0])).toBe('This puzzle could not be sent to Mele. They may have too many puzzles waiting. Nothing changed.');
    expect(byLabel('Send to Mele')).toHaveLength(1);
    expect(JSON.stringify(screen!.toJSON())).not.toContain('Sent to');
  });
  it('a Send reply from an earlier visit never shows in a reopened Send to…', async () => {
    const replies: ((ok: boolean) => void)[] = [], onSend = vi.fn(() => new Promise<boolean>(resolve => { replies.push(resolve); }));
    await round({ ...inline('sudoku'), helpUI: 'board' as const, render: () => <p>board</p> }, { onSend });
    await press('hud-more'); await press('more-Send to…');
    await pressLabel('Send to Mele');
    await pressLabel('Back'); await press('more-Send to…');
    await act(async () => replies[0](false)); await settle();
    expect(byTestID('more-send-error')).toHaveLength(0); expect(byLabel('Send to Mele')).toHaveLength(1);
    // A success from a closed visit does not replace the faces either; this visit's own reply still shows.
    await pressLabel('Send to Mele');
    await press('sheet-close'); await press('hud-more'); await press('more-Send to…');
    await act(async () => replies[1](true)); await settle();
    expect(JSON.stringify(screen!.toJSON())).not.toContain('Sent to'); expect(byLabel('Send to Mele')).toHaveLength(1);
    await pressLabel('Send to Mele');
    await act(async () => replies[2](false)); await settle();
    expect(byTestID('more-send-error')).toHaveLength(1);
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

describe('Continue strip', () => {
  it('keeps every paused puzzle and pin reachable: four in the strip, the rest under See all, deferred packed games and hidden pins included', async () => {
    const games = ['sudoku', 'bridges', 'loop', 'solitaire'].map(g => inline(g)), cage = real('cage-math'), band = cage.packed!.bands[0];
    const cageRef = { bank: band.bank, puzzle: 0, engine: 'cage-math', rules: cage.catalog.banks.get(band.bank)!.rules, hash: 'c'.repeat(64) };
    fixture.entries = [...games, cage];
    const sessions = [...games.map((g, i) => paused(g.game, g.puzzles[0].ref, null, i + 2)), paused('cage-math', cageRef, null, 1)];
    fixture.save = { ...withLearner(), challenge: { ...emptyChallenge(), paused: sessions } };
    const hiddenPin = games[0].puzzles[1].ref, otherPin = games[1].puzzles[2].ref;
    fixture.local.data.pins.family = [{ from: 'mele', ref: hiddenPin }, { from: 'mele', ref: otherPin }];
    fixture.local.data.hidden = [hiddenPin.hash];
    await mount();
    const strip = byTestID('cove-continue')[0];
    expect(strip.findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('cove-continue-') && typeof n.type === 'string').map(n => n.props.testID)).toEqual(['cove-continue-paused-solitaire', 'cove-continue-paused-loop', 'cove-continue-paused-bridges', 'cove-continue-paused-sudoku', 'cove-continue-all']);
    expect(byTestID('cove-continue-all')[0].props.accessibilityLabel).toBe('See all 7 paused puzzles and pins');
    await press('cove-continue-all');
    const list = byTestID('cove-continue-list')[0], keys = list.findAll(n => typeof n.type === 'string' && typeof n.props.testID === 'string' && n.props.testID.startsWith('cove-continue-') && n !== list).map(n => n.props.testID);
    expect(keys).toEqual(['solitaire', 'loop', 'bridges', 'sudoku', 'cage-math'].map(g => `cove-continue-paused-${g}`).concat(`cove-continue-pin-${hiddenPin.hash}`, `cove-continue-pin-${otherPin.hash}`));
    expect(list.findAll(n => n.props.testID === 'cove-continue-paused-cage-math')[0].props.accessibilityLabel).toBe('Continue · Cage Math');
    // The pin to a puzzle hidden later still opens that exact puzzle.
    await act(async () => list.findAll(n => n.props.testID === `cove-continue-pin-${hiddenPin.hash}` && typeof n.type === 'string')[0].props.onPress());
    expect(fixture.rounds.at(-1)).toMatchObject({ card: { ref: hiddenPin }, replace: true });
    expect(aside('Continue')).toBeUndefined();
  });
});

describe('new deals never reopen a hidden or identical puzzle', () => {
  const band = (bank: number, count: number, tier = 1) => ({ kind: 'band' as const, bank, path: 'endless' as const, tier: tier as 1, title: `Set ${bank}`, count });
  const ref = (bank: number, puzzle: number) => ({ bank, puzzle, engine: 'bridges', rules: 1, hash: `${bank}${puzzle}`.padEnd(64, 'b') });
  const packedEntry = (bands: ReturnType<typeof band>[], choose: (bank: number, avoid?: ChallengeCard['ref']) => Promise<ChallengeCard['ref']>, extra: object = {}): ChallengeEntry => ({ ...inline('bridges', []), packed: {
    bands, choose: (bank, _p, avoid) => choose(bank, avoid), prepare: async () => {}, card: r => { const b = bands.find(x => x.bank === r.bank); return b && { ref: r, tier: b.tier, title: `${b.title} ${r.puzzle + 1}`, source: { kind: 'endless', bank: b.bank, puzzle: r.puzzle }, path: 'endless', dares: [] }; }, ...extra,
  } as ChallengeEntry['packed'] });
  it('inline: a difficulty with only hidden or paused puzzles says so and offers Choose a puzzle', async () => {
    const sudoku = inline('sudoku', [1, 1, 2]);
    fixture.entries = [sudoku]; fixture.params = { game: 'sudoku' }; fixture.local.data.hidden = [sudoku.puzzles[1].ref.hash];
    fixture.save = { ...emptySave(), challenge: { ...emptyChallenge(), paused: [paused('sudoku', sudoku.puzzles[0].ref)] } };
    await mount();
    await press('start-new'); await settle();
    expect(fixture.rounds).toHaveLength(0);
    expect(words(byTestID('start-status')[0])).toBe('No other puzzle here.');
    await press('start-choose');
    expect(aside('Choose a puzzle')).toBeDefined();
  });
  it('inline: with every puzzle hidden, Play opens nothing', async () => {
    const sudoku = inline('sudoku', [1]);
    fixture.entries = [sudoku]; fixture.params = { game: 'sudoku' }; fixture.local.data.hidden = [sudoku.puzzles[0].ref.hash];
    await mount();
    await press('start-play'); await settle();
    expect(fixture.rounds).toHaveLength(0);
    expect(words(byTestID('start-status')[0])).toBe('No other puzzle here.');
  });
  it('packed: a singleton bank that can only return the paused ref moves on to another bank at the same difficulty', async () => {
    const entry = packedEntry([band(10, 1), band(11, 3), band(12, 3, 2)], async bank => bank === 10 ? ref(10, 0) : bank === 11 ? ref(11, 1) : ref(12, 0));
    fixture.entries = [entry]; fixture.params = { game: 'bridges' };
    fixture.save = { ...emptySave(), challenge: { ...emptyChallenge(), paused: [paused('bridges', ref(10, 0))] } };
    await mount();
    await press('start-new'); await settle();
    expect(fixture.rounds.at(-1)!.card.ref).toEqual(ref(11, 1));
  });
  it('packed: a chooser fallback that returns a hidden or identical card is refused, never another difficulty', async () => {
    const entry = packedEntry([band(10, 1), band(11, 3), band(12, 3, 2)], async bank => bank === 10 ? ref(10, 0) : bank === 11 ? ref(11, 2) : ref(12, 0));
    fixture.entries = [entry]; fixture.params = { game: 'bridges' }; fixture.local.data.hidden = [ref(11, 2).hash];
    fixture.save = { ...emptySave(), challenge: { ...emptyChallenge(), paused: [paused('bridges', ref(10, 0))] } };
    await mount();
    await press('start-new'); await settle();
    expect(fixture.rounds).toHaveLength(0);
    expect(words(byTestID('start-status')[0])).toBe('No other puzzle here.');
  });
  it('packed: a hidden-row lookup that fails opens nothing and says so in the sheet', async () => {
    const choose = vi.fn(async () => ref(11, 0)), entry = packedEntry([band(11, 3)], choose, { hiddenRows: async () => { throw new Error('offline'); }, chooseVisible: choose });
    fixture.entries = [entry]; fixture.params = { game: 'bridges' }; fixture.local.data.hidden = ['d'.repeat(64)];
    await mount();
    await press('start-play'); await settle();
    expect(fixture.rounds).toHaveLength(0); expect(choose).not.toHaveBeenCalled();
    expect(words(byTestID('start-status')[0])).toBe('This puzzle could not open. Your saved work is kept. Try again.');
  });
  it('a packed row still loading when the chooser closes or its set changes never opens', async () => {
    const loads: ((r: ChallengeCard['ref']) => void)[] = [], saved = paused('bridges', ref(11, 0));
    const entry = packedEntry([band(11, 3), band(13, 3)], async () => ref(11, 0), { open: (bank: number, i: number) => new Promise(resolve => { loads.push(() => resolve(ref(bank, i))); }) });
    fixture.entries = [entry]; fixture.save = { ...emptySave(), challenge: { ...emptyChallenge(), paused: [saved] } };
    await mount();
    await press(`cove-continue-${saved.id}`);
    const rounds = fixture.rounds.length, row = (i: number) => act(async () => screen!.root.findByType('list' as never).props.data[i].onPress());
    await act(async () => fixture.rounds.at(-1)!.onBrowse());
    await row(1);
    await act(async () => aside('Choose a puzzle').findAll(n => n.props.testID === 'sheet-close')[0].props.onPress());
    await act(async () => loads[0](ref(11, 1))); await settle();
    expect(fixture.rounds.at(-1)!.card.ref).toEqual(saved.puzzle); expect(aside('Choose a puzzle')).toBeUndefined();
    await act(async () => fixture.rounds.at(-1)!.onBrowse());
    await row(2); await act(async () => (header(p => p.testID === 'set-13').onPress as () => void)());
    await act(async () => loads[1](ref(11, 2))); await settle();
    expect(fixture.rounds.at(-1)!.card.ref).toEqual(saved.puzzle); expect(aside('Choose a puzzle')).toBeDefined();
    // The chooser still opens the row that is chosen and left to load.
    await row(0);
    await act(async () => loads[2](ref(13, 0))); await settle();
    expect(fixture.rounds.length).toBeGreaterThan(rounds); expect(fixture.rounds.at(-1)!.card.ref).toEqual(ref(13, 0));
  });
  it('closing the sheet while a packed deal is opening cancels it: no board opens later', async () => {
    let release!: (r: ChallengeCard['ref']) => void;
    const entry = packedEntry([band(11, 3)], () => new Promise(resolve => { release = resolve; }));
    fixture.entries = [entry]; fixture.params = { game: 'bridges' };
    await mount();
    await press('start-play');
    expect(words(byTestID('start-status')[0])).toBe('Opening your puzzle…');
    await press('sheet-close');
    await act(async () => release(ref(11, 0))); await settle();
    expect(fixture.rounds).toHaveLength(0);
  });
});

describe('Continue links', () => {
  it('resume=1 reopens the exact paused attempt in one tap; a plain game link still opens the start sheet', async () => {
    const sudoku = inline('sudoku'), saved = paused('sudoku', sudoku.puzzles[2].ref, 'mele');
    fixture.entries = [sudoku]; fixture.save = { ...withLearner(), challenge: { ...emptyChallenge(), paused: [saved] } };
    fixture.params = { game: 'sudoku', resume: '1' };
    await mount();
    expect(fixture.rounds.at(-1)).toMatchObject({ card: { ref: saved.puzzle }, partner: 'mele', replace: false });
    expect(screen!.root.findAllByType('aside')).toHaveLength(0);
    await act(async () => screen!.unmount()); screen = undefined; fixture.rounds = [];
    fixture.params = { game: 'sudoku' };
    await mount();
    expect(fixture.rounds).toHaveLength(0); expect(aside('Sudoku')).toBeDefined();
  });
  it('resume=1 with nothing paused falls back to the start sheet', async () => {
    fixture.entries = [inline('sudoku')]; fixture.params = { game: 'sudoku', resume: '1' };
    await mount();
    expect(fixture.rounds).toHaveLength(0); expect(byTestID('start-play')).toHaveLength(1);
  });
  it('the map Continue and the named Resume shortcut ask for the resume intent', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/hub/HubScreen.tsx', 'utf8')).toContain("params: { game: coveResume.game, resume: '1' }");
    const hub = readFileSync('src/cove/HubCove.tsx', 'utf8');
    expect(hub).toContain("params: { person: last.person, game: last.session.game, resume: '1' }");
    expect(hub).toContain("params: { game: resume.game, resume: '1' }");
  });
});

describe('a finish waiting for its partner choice, and the finished state', () => {
  const open = async () => {
    const entry = solvable(), saved = paused('sudoku', entry.puzzles[0].ref);
    fixture.realRound = true; fixture.entries = [entry]; applySaves();
    fixture.save = { ...withLearner(), settings: { ...emptySave().settings, sound: false }, challenge: { ...emptyChallenge(), paused: [saved] } } as never;
    await mount();
    await press(`cove-continue-${saved.id}`);
    await press('board-move'); await settle();
    return saved;
  };
  it('More keeps New, Restart, Choose and Grown-ups disabled until the finish is saved, through a refused save too', async () => {
    await open();
    expect(byLabel('Solved together with Mele')).toHaveLength(1);
    await press('hud-more');
    expect(words(aside('More'))).toContain('Save your finish first.');
    for (const item of ['New puzzle', 'Choose a puzzle', 'Grown-ups']) expect(byTestID(`more-${item}`)[0].props.disabled, item).toBe(true);
    await press('sheet-close');
    fixture.challengeSave.mockImplementationOnce(async () => false);
    await pressLabel('Solved together with Mele'); await settle();
    expect(JSON.stringify(screen!.toJSON())).toContain('Your finish has not saved yet. Keep this screen open and try again.');
    expect(byLabel('Solved together with Mele')).toHaveLength(1);
    await press('hud-more');
    expect(byTestID('more-New puzzle')[0].props.disabled).toBe(true);
    expect(fixture.save.challenge!.paused).toHaveLength(1);
  });
  it('a New puzzle deal still loading when the round reaches its finish never replaces that finish', async () => {
    let deliver!: (r: ChallengeCard['ref']) => void;
    const base = solvable(), at = (puzzle: number) => ({ bank: 10, puzzle, engine: 'sudoku', rules: 1, hash: `c${puzzle}`.padEnd(64, 'c') });
    const band = { kind: 'band' as const, bank: 10, path: 'endless' as const, tier: 1 as const, title: 'Set 10', count: 3 };
    const entry: ChallengeEntry = { ...base, puzzles: [], packed: { bands: [band], choose: () => new Promise(resolve => { deliver = resolve; }), prepare: async () => {}, card: ref => ({ ref, tier: 1, title: `Set 10 ${ref.puzzle + 1}`, source: { kind: 'endless', bank: 10, puzzle: ref.puzzle }, path: 'endless', dares: [] }) } as ChallengeEntry['packed'] };
    const saved = paused('sudoku', at(0));
    fixture.realRound = true; fixture.entries = [entry]; applySaves();
    fixture.save = { ...withLearner(), settings: { ...emptySave().settings, sound: false }, challenge: { ...emptyChallenge(), paused: [saved] } } as never;
    await mount();
    await press(`cove-continue-${saved.id}`);
    await press('hud-more'); await press('more-New puzzle'); await settle();
    expect(deliver).toBeDefined();
    await press('board-move'); await settle();
    expect(byLabel('Solved together with Mele')).toHaveLength(1);
    await act(async () => deliver(at(1))); await settle();
    expect(byLabel('Solved together with Mele')).toHaveLength(1);
    expect(JSON.stringify(screen!.toJSON())).not.toContain('Start a new puzzle?');
    expect(fixture.save.challenge!.paused).toEqual([saved]);
  });
  it('HUD Back during an in-flight finish save waits: a refused save stays retryable, a saved one leaves', async () => {
    await open();
    let reply!: (ok: boolean) => void;
    const held = () => new Promise<boolean>(resolve => { reply = resolve; });
    fixture.challengeSave.mockImplementationOnce(held);
    await pressLabel('Solved together with Mele');
    await press('hud-back');
    expect(byLabel('Solved together with Mele')).toHaveLength(1);
    await act(async () => reply(false)); await settle();
    expect(byLabel('Solved together with Mele')).toHaveLength(1);
    expect(JSON.stringify(screen!.toJSON())).toContain('Your finish has not saved yet. Keep this screen open and try again.');
    fixture.challengeSave.mockImplementationOnce(held);
    await pressLabel('Solved together with Mele');
    await press('hud-back');
    expect(byLabel('Solved together with Mele')).toHaveLength(1);
    await act(async () => reply(true)); await settle();
    expect(byLabel('Solved together with Mele')).toHaveLength(0); expect(byTestID('cove-finish')).toHaveLength(0); expect(byTestID('hud-more')).toHaveLength(0);
  });
  it('closing Choose a puzzle after a committed finish returns to the finished card and never restarts the puzzle', async () => {
    await open();
    await pressLabel('Solved together with Mele'); await settle();
    expect(fixture.save.challenge!.paused).toEqual([]);
    expect(words(byTestID('cove-finish')[0])).toContain('Together with  Mele');
    const saves = fixture.challengeSave.mock.calls.length;
    await press('hud-more'); await press('more-Choose a puzzle');
    expect(aside('Choose a puzzle')).toBeDefined(); expect(aside('More')).toBeUndefined();
    await act(async () => aside('Choose a puzzle').findAll(n => n.props.testID === 'sheet-close')[0].props.onPress()); await settle();
    expect(words(byTestID('cove-finish')[0])).toContain('Together with  Mele');
    expect(fixture.challengeSave.mock.calls.length).toBe(saves);
    expect(JSON.stringify(screen!.toJSON())).not.toContain('could not');
    // More comes back where it was.
    expect(aside('More')).toBeDefined();
  });
});

describe('plain titles inside boards', () => {
  it('real boards get plain difficulty and their exact size; Bridges shows a size range at Start', () => {
    const sudoku = real('sudoku'), lagoon = sudoku.packed!.bands.find(b => b.tier === 3)!;
    const at = (entry: ChallengeEntry, bank: number) => ({ bank, puzzle: 0, engine: entry.game, rules: 1, hash: 'a'.repeat(64) });
    expect(shelf.boardTitle(sudoku, at(sudoku, lagoon.bank), 3)).toBe('Hard · 9×9');
    const bridges = real('bridges'), easy = shelf.difficultyOptionsFor(bridges).find(o => o.key === 1)!;
    const sizes = bridges.packed!.bands.filter(b => b.tier === 1).map(b => shelf.bankFacts(bridges, b)!.size);
    expect(new Set(sizes).size).toBeGreaterThan(1);
    expect(easy.tag).toMatch(/^\d+×\d+–\d+×\d+$/);
    const first = bridges.packed!.bands.find(b => b.tier === 1)!;
    expect(shelf.playLabel(bridges, at(bridges, first.bank), 1)).toBe(`Easy ${shelf.bankFacts(bridges, first)!.size}`);
    for (const entry of challengeEntries.filter(e => e.cove && e.packed)) for (const b of entry.packed!.bands) expect(shelf.boardTitle(entry, at(entry, b.bank), b.tier)).not.toMatch(/Paddling|Shallows|Lagoon|Reef|Deep|Trench/);
    const solitaire = real('solitaire'), klondike = solitaire.packed!.bands.find(b => /^Klondike draw 1/.test(b.title) && b.tier === 1)!;
    expect(shelf.boardTitle(solitaire, at(solitaire, klondike.bank), 1)).toBe('Klondike draw 1 · Easy');
  });
});
