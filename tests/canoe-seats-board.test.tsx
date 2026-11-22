import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CanoeBoardProps } from '../src/learn/games/canoe-seats/board';
import { startRound, type CanoeState } from '../src/learn/games/canoe-seats/engine';
import { place } from '../src/learn/games/canoe-seats/rules';
import type { LearnSession } from '../src/learn/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
vi.mock('react-native', () => ({ View: 'View', useWindowDimensions: () => viewport }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' }, Easing: { out: () => 0, in: () => 0, inOut: () => 0, quad: 0 },
  useSharedValue: (value: unknown) => ({ value, get: () => value, set() {} }), useAnimatedStyle: (f: () => unknown) => f(),
  withTiming: (v: number) => v, withSpring: (v: number) => v, withSequence: (...v: number[]) => v.at(-1), withRepeat: (v: number) => v,
}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/Audio', async () => {
  const { createContext } = await import('react');
  return { AudioPreferences: createContext({ sound: false }), hasSpeech: () => false, useSoundControls: () => ({ play: () => false }) };
});
vi.mock('../src/components/ui', () => ({ Button: 'Button', Heading: 'Heading', C: { ink: '#000', teal: '#0a0', blue: '#00f', muted: '#888' }, Copy: 'Copy', PressableScale: 'PressableScale' }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: 'CoachSpot' }));
vi.mock('../src/learn/BoardSpace', () => ({ BoardPrimary: 'BoardPrimary', useBoardSpace: () => null, useBoardGeometry: (_id: string, natural: number) => ({ height: natural, measured: false }) }));
vi.mock('../src/learn/games/canoe-seats/art', () => ({ CLUE_RATIO: 160 / 70, CluePicture: 'CluePicture', Fruit: 'Fruit', Friend: 'Friend', Hat: 'Hat', Hull: 'Hull', ItemArt: 'ItemArt', ink: '#000' }));
const { CanoeBoard } = await import('../src/learn/games/canoe-seats/board');
const { SchoolBoard } = await import('../src/learn/games/canoe-seats/schoolBoard');
const { ChallengeBoard } = await import('../src/learn/games/canoe-seats/challengeBoard');
const canoeChallenge = await import('../src/learn/games/canoe-seats/challenge');
const canoeRules = await import('../src/learn/games/canoe-seats/rules');
const { emptyChallenge } = await import('../src/state/challenge');

const puzzle = { n: 4, attrs: 1, cast: [0, 1, 2, 3], clues: [{ k: 'at' as const, x: 0, s: 0 }, { k: 'next' as const, x: 1, y: 2 }, { k: 'ahead' as const, x: 3, y: 1 }] };
const big = { n: 5, attrs: 3, cast: [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4], clues: Array.from({ length: 13 }, (_, i) => ({ k: 'next' as const, x: i % 5, y: (i % 5) + 5 })) };
let root: ReactTestRenderer | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; Object.assign(viewport, { width: 393, fontScale: 1 }); });
function mount(over: Partial<CanoeBoardProps> = {}) {
  const calls = { place: [] as [number, number][], used: [] as number[], heard: [] as number[], check: 0 };
  const props: CanoeBoardProps = {
    puzzle, pos: [-1, -1, -1, -1], used: 0, lights: true, won: false, missed: false, canCheck: false, active: true, width: 337, title: 'Four friends',
    hear: c => { calls.heard.push(c); return false; }, onPlace: (i, s) => { calls.place.push([i, s]); return true; }, onToggleUsed: c => calls.used.push(c),
    onCheck: () => { calls.check++; }, onUndo: () => {}, onReset: () => {}, canUndo: false, canReset: false, ...over,
  };
  act(() => { root = create(<CanoeBoard {...props} />); });
  return calls;
}
const byId = (id: string) => root!.root.find(n => n.props.testID === id);
const tap = (id: string) => act(() => { byId(id).props.onPress({ nativeEvent: { locationX: 10, locationY: 30 } }); });

describe('Canoe Seats board', () => {
  it('picks up a friend from the shore and seats it with one more tap', () => {
    const calls = mount();
    tap('canoe-token-2');
    expect(byId('canoe-token-2').props.accessibilityState).toEqual({ selected: true });
    expect(byId('canoe-seat-1').props.accessibilityHint).toBe('Double-tap to seat the fish here.');
    tap('canoe-seat-1');
    expect(calls.place).toEqual([[2, 1]]);
  });
  it('picks up a seated friend and sends it back to the shore', () => {
    const calls = mount({ pos: [0, -1, -1, -1] });
    tap('canoe-seat-0');
    const back = root!.root.find(n => n.props.accessibilityLabel === 'Put the turtle back on the shore');
    act(() => back.props.onPress());
    expect(calls.place).toEqual([[0, -1]]);
  });
  it('first tap on a clue hears it (words show when no line can play), the second marks it done', () => {
    const calls = mount();
    tap('canoe-clue-1');
    expect(calls.heard).toEqual([1]);
    expect(JSON.stringify(root!.toJSON())).toContain('The crab sits right next to the fish.');
    tap('canoe-clue-1');
    expect(calls.used).toEqual([1]);
  });
  it('lights a card only when its friends are seated and it is true, and never in Check mode', () => {
    mount({ pos: [0, -1, -1, -1] });
    expect(byId('canoe-clue-0').props.accessibilityLabel).toBe('Clue: The turtle sits in seat 1. (true now)');
    expect(byId('canoe-clue-1').props.accessibilityLabel).toBe('Clue: The crab sits right next to the fish.');
    act(() => root!.unmount()); root = undefined;
    const calls = mount({ pos: [0, 2, 3, 1], lights: false, canCheck: true, missed: true });
    expect(byId('canoe-clue-0').props.accessibilityLabel).toBe('Clue: The turtle sits in seat 1.');
    expect(JSON.stringify(root!.toJSON())).toContain('Not quite yet. Everyone is still in their seats.');
    const check = root!.root.findAll(n => String(n.type) === 'Button').find(b => b.children.join('') === 'Check')!;
    act(() => check.props.onPress());
    expect(calls.check).toBe(1);
  });
  it('clue keepers: the other keeper’s cards lie face down, and the hand-over cover hides them all', () => {
    const keepers = { names: ['Stassie', 'Mom'] as const, keeper: 0 as const, cover: false, owner: (i: number) => (i % 2 ? 1 : 0) as 0 | 1, onPass: vi.fn(), onReveal: vi.fn() };
    mount({ keepers });
    expect(byId('canoe-clue-0')).toBeDefined();
    expect(byId('canoe-clue-hidden-1').props.accessibilityLabel).toBe("Mom's clue, face down");
    act(() => root!.unmount()); root = undefined;
    mount({ keepers: { ...keepers, cover: true, keeper: 1 } });
    expect(root!.root.findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('canoe-clue'))).toHaveLength(0);
    expect(JSON.stringify(root!.toJSON())).toContain('Pass to Mom');
  });
  it('clears outgoing keeper caption, heard, and picked state across pass -> cover -> reveal', () => {
    const k = { names: ['Stassie', 'Mom'] as const, keeper: 0 as 0 | 1, cover: false, owner: (i: number) => (i % 2 ? 1 : 0) as 0 | 1, onPass: vi.fn(), onReveal: vi.fn() };
    const props: CanoeBoardProps = {
      puzzle, pos: [-1, -1, -1, -1], used: 0, lights: true, won: false, missed: false, canCheck: false, active: true, width: 337, title: 'Four friends',
      hear: () => false, onPlace: () => true, onToggleUsed: () => {}, onUndo: () => {}, onReset: () => {}, canUndo: false, canReset: false, keepers: k,
    };
    act(() => { root = create(<CanoeBoard {...props} />); });
    tap('canoe-token-0');
    expect(byId('canoe-token-0').props.accessibilityState).toEqual({ selected: true });
    tap('canoe-clue-0');
    expect(JSON.stringify(root!.toJSON())).toContain('The turtle sits in seat 1.');

    // Pass to keeper 1 (cover active): caption and cards are hidden.
    act(() => root!.update(<CanoeBoard {...props} keepers={{ ...k, keeper: 1, cover: true }} />));
    expect(JSON.stringify(root!.toJSON())).not.toContain('The turtle sits in seat 1.');

    // Keeper 1 reveals their clues: keeper 0's card is face down and keeper 0's caption is absent from rendered output and accessibility tree.
    act(() => root!.update(<CanoeBoard {...props} keepers={{ ...k, keeper: 1, cover: false }} />));
    expect(byId('canoe-clue-hidden-0')).toBeDefined();
    expect(JSON.stringify(root!.toJSON())).not.toContain('The turtle sits in seat 1.');
    const labels = root!.root.findAll(n => typeof n.props.accessibilityLabel === 'string').map(n => n.props.accessibilityLabel as string);
    expect(labels.some(l => l.includes('The turtle sits in seat 1.'))).toBe(false);
    expect(byId('canoe-token-0').props.accessibilityState).toEqual({ selected: false });
  });
  it('lets an accessible user correct a wrong hat and wrong fruit on an occupied Rung H seat while keeping the friend seated', () => {
    // Friends seated 0..4; hats 5 & 6 swapped on seats 0 & 1; fruit 10 & 11 swapped on seats 0 & 1.
    let pos = [0, 1, 2, 3, 4, 1, 0, 2, 3, 4, 1, 0, 2, 3, 4];
    const render = () => <CanoeBoard puzzle={big} pos={pos} used={0} lights={false} won={false} missed={false} canCheck active width={337} title="Full canoe"
      hear={() => false} onPlace={(item, seat) => { pos = place(big, pos, item, seat); return true; }} onToggleUsed={() => {}} onCheck={() => {}} onUndo={() => {}} onReset={() => {}} canUndo={false} canReset />;
    act(() => { root = create(render()); });

    const actions = byId('canoe-seat-0').props.accessibilityActions as { name: string; label: string }[] | undefined;
    expect(actions).toBeDefined();
    const hatAction = actions!.find(a => /blue bucket hat/i.test(a.label));
    const fruitAction = actions!.find(a => /coconut/i.test(a.label));
    expect(actions!.find(a => /turtle/i.test(a.label))).toBeDefined();
    expect(hatAction).toBeDefined();
    expect(fruitAction).toBeDefined();

    // Pick up the wrong hat on seat 0 via accessibility action and swap it to seat 1 without touch coordinates.
    act(() => byId('canoe-seat-0').props.onAccessibilityAction({ nativeEvent: { actionName: hatAction!.name } }));
    expect(byId('canoe-seat-1').props.accessibilityHint).toBe('Double-tap to seat the blue bucket hat here.');
    act(() => byId('canoe-seat-1').props.onPress());
    act(() => root!.update(render()));
    expect(pos.slice(0, 5)).toEqual([0, 1, 2, 3, 4]); // friends never moved
    expect(pos.slice(5, 10)).toEqual([0, 1, 2, 3, 4]); // hats corrected

    // Pick up the wrong fruit on seat 0 via accessibility action and swap it to seat 1 without touch coordinates.
    const actionsAfterHat = byId('canoe-seat-0').props.accessibilityActions as { name: string; label: string }[];
    const fruitAction2 = actionsAfterHat.find(a => /coconut/i.test(a.label))!;
    act(() => byId('canoe-seat-0').props.onAccessibilityAction({ nativeEvent: { actionName: fruitAction2.name } }));
    expect(byId('canoe-seat-1').props.accessibilityHint).toBe('Double-tap to seat the coconut here.');
    act(() => byId('canoe-seat-1').props.onPress());
    act(() => root!.update(render()));
    expect(pos.slice(0, 5)).toEqual([0, 1, 2, 3, 4]); // friends still seated
    expect(pos.slice(5, 10)).toEqual([0, 1, 2, 3, 4]); // hats still corrected
    expect(pos.slice(10, 15)).toEqual([0, 1, 2, 3, 4]); // fruit corrected
  });
  it('places Check immediately above the paged clue cards on AX5 phone H, preserving 4-card pages', () => {
    Object.assign(viewport, { width: 393, fontScale: 3.12 });
    mount({ puzzle: big, pos: Array(15).fill(-1), lights: false, canCheck: false });
    expect(root!.root.findAll(n => typeof n.props.testID === 'string' && /^canoe-clue-\d+$/.test(n.props.testID))).toHaveLength(4);
    const serialized = JSON.stringify(root!.toJSON());
    const checkAt = serialized.indexOf('"Check"'), cluesAt = serialized.indexOf('"canoe-clues"');
    expect(checkAt).toBeGreaterThan(-1);
    expect(cluesAt).toBeGreaterThan(-1);
    expect(checkAt).toBeLessThan(cluesAt);

    // Default text phone keeps cards before Check.
    act(() => root!.unmount()); root = undefined;
    Object.assign(viewport, { width: 393, fontScale: 1 });
    mount({ puzzle: big, pos: Array(15).fill(-1), lights: false, canCheck: false });
    const defSerialized = JSON.stringify(root!.toJSON());
    expect(defSerialized.indexOf('"canoe-clues"')).toBeLessThan(defSerialized.indexOf('"Check"'));
  });
  it('pages rung H’s thirteen cards on a phone, and shows them all on an iPad', () => {
    mount({ puzzle: big, pos: Array(15).fill(-1) });
    expect(root!.root.findAll(n => typeof n.props.testID === 'string' && /^canoe-clue-\d+$/.test(n.props.testID))).toHaveLength(6);
    expect(JSON.stringify(root!.toJSON())).toContain('1 / 3');
    act(() => root!.unmount()); root = undefined;
    Object.assign(viewport, { width: 744 });
    mount({ puzzle: big, pos: Array(15).fill(-1), width: 600 });
    expect(root!.root.findAll(n => typeof n.props.testID === 'string' && /^canoe-clue-\d+$/.test(n.props.testID))).toHaveLength(13);
  });
  it('caps every caption and control at 1.5x and stacks the header at the largest text size', () => {
    Object.assign(viewport, { fontScale: 3.12 });
    mount({ lights: false, onLights: () => {} });
    const header = byId('board-header');
    expect(header.props.style.flexDirection).toBeUndefined();
    for (const n of root!.root.findAll(n => String(n.type) === 'Copy' || String(n.type) === 'Button')) expect(n.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  });
  it('describes the whole canoe for VoiceOver, front to back, with the shore', () => {
    mount({ pos: [1, -1, 0, -1] });
    const canoe = root!.root.find(n => n.props.accessibilityRole === 'image');
    expect(canoe.props.accessibilityLabel).toBe('Canoe with 4 seats. Seat 1, at the front: the fish. Seat 2: the turtle. Seat 3: empty. Seat 4, at the back: empty. On the shore: the crab, the bird.');
  });
});

describe('Canoe Seats help', () => {
  it('looks and thinks from the cards alone, and never reads a keeper’s hidden card aloud', async () => {
    const { canoeHelpRules, canoeView } = await import('../src/learn/games/canoe-seats/help');
    const solo = canoeHelpRules(puzzle, false), keepers = canoeHelpRules(puzzle, false, [0, 2]), view = canoeView(puzzle, [-1, -1, -1, -1], false);
    expect(solo.look(view).text).toMatch(/^Look at this clue first\. The /);
    expect(keepers.look(view).text).toMatch(/^Look at this clue first\./);
    expect(keepers.look(view).text).not.toMatch(/sits|next to|in front/);
    expect(keepers.look(view).focus).toEqual(['clue:0']);
    expect(keepers.think(view).text).not.toMatch(/sits|next to|in front/);
    expect(keepers.think(view).focus).toContain('clue:0');
    expect(solo.draft).toBeNull();
    expect(canoeHelpRules(puzzle, true).draft).not.toBeNull();
  });
  it('SchoolBoard Together handover cancels active Help cue/panel and keeps keeper 0 caption cleared after reveal', async () => {
    let state: CanoeState = startRound(3, () => 0.4);
    const makeSession = (): LearnSession<CanoeState> => ({
      game: 'canoe-seats', version: 1, id: 'canoe-test', revision: 0,
      options: { mode: 'together', pace: 'hard' }, names: ['Stassie', 'Mom'], starter: 0, state,
    });
    const render = () => <SchoolBoard session={makeSession()} update={next => { state = next; }} skills={{}} practice={() => {}} cheer={() => {}} active width={337} height={600} sound={() => {}} stopSound={() => {}} soundOn={false} coach={{ active: false, done: () => {} }} />;
    act(() => { root = create(render()); });

    // Keeper 0 taps clue 2 (their own card: bird sits in seat 3), opens Help, asks Look then Think.
    tap('canoe-clue-2');
    expect(JSON.stringify(root!.toJSON())).toContain('The bird sits in seat 3.');
    const buttonByText = (label: string) => root!.root.findAll(n => String(n.type) === 'Button').find(b => b.children.join('') === label)!;
    act(() => { buttonByText('Help').props.onPress(); });
    await act(async () => { await buttonByText('Look').props.onPress(); });
    act(() => root!.update(render()));
    await act(async () => { await buttonByText('Think').props.onPress(); });
    act(() => root!.update(render()));
    const beforePass = JSON.stringify(root!.toJSON());
    expect(beforePass).toContain('Think: the bird cannot sit in seat 1.');
    expect(beforePass).not.toContain('the fish cannot sit in seat 2');

    // Pass to Mom -> cover hides everything and resets Help/cue.
    act(() => { buttonByText('Pass to Mom').props.onPress(); });
    act(() => root!.update(render()));
    expect(state.cover).toBe(true);
    expect(state.keeper).toBe(1);
    expect(JSON.stringify(root!.toJSON())).not.toContain('The bird sits in seat 3.');
    expect(JSON.stringify(root!.toJSON())).not.toContain('Think: the bird cannot sit in seat 1.');

    // Reveal Mom's clues -> keeper 0's caption and Help cue stay cleared, and Help panel is closed.
    act(() => { buttonByText("I'm Mom: show my clues").props.onPress(); });
    act(() => root!.update(render()));
    const afterReveal = JSON.stringify(root!.toJSON());
    expect(afterReveal).not.toContain('The bird sits in seat 3.');
    expect(afterReveal).not.toContain('Think: the bird cannot sit in seat 1.');
    expect(buttonByText('Help')).toBeDefined();
  });
});

describe('ChallengeBoard Check-mode reserve escape', () => {
  const entry = canoeChallenge.puzzles.find(x => x.ref.bank === 308 && x.ref.puzzle === 14)!;
  const boardPuzzle = entry.descriptor.puzzle;
  const answer = canoeRules.answerOf(boardPuzzle)!;
  const freshState = (): ReturnType<typeof canoeChallenge.canoeStep> extends infer T ? NonNullable<T> : never => ({
    puzzle: boardPuzzle, lights: false, pos: canoeRules.emptySeating(boardPuzzle), used: 0, stack: [],
    placements: 0, checks: 0, misses: 0, checked: false, won: false, actions: 0,
  });
  const actionsOf = (s: { payload: unknown }) => (s.payload as { actions: number[] }).actions;

  async function mountChallengeHost(initialSession: ReturnType<typeof canoeChallenge.registration.start>) {
    let current = initialSession;
    const replay = (s: typeof current) => actionsOf(s).reduce((v, a) => canoeChallenge.canoeStep(v, a)!, freshState());
    function Host() {
      const [session, setSession] = React.useState(current);
      return <ChallengeBoard state={replay(session)} sessionKey={String(session.revision)} active width={337} dispatch={() => {}} onFresh={() => {}}
        commit={async (action, expected) => {
          if (expected !== String(current.revision)) return null;
          const next = canoeChallenge.registration.move(current, action);
          if (!next) return null;
          current = next;
          setSession(next);
          return { key: String(next.revision), state: replay(next) };
        }} />;
    }
    await act(async () => { root = create(<Host />); });
    const button = (text: string) => root!.root.findAll(n => String(n.type) === 'Button').find(b => b.children.join('') === text);
    const press = async (text: string) => {
      const b = button(text);
      expect(b, `missing button "${text}"`).toBeDefined();
      expect(b!.props.disabled, `disabled button "${text}"`).not.toBe(true);
      await act(async () => {
        await b!.props.onPress();
        await Promise.resolve();
        await Promise.resolve();
      });
    };
    return { getSession: () => current, getState: () => replay(current), button, press };
  }

  it('completes a wrong full draft at the 495-action limit through real Help -> Next step -> Check with event helped', async () => {
    let s = canoeChallenge.registration.start(entry.ref, 'alex', 'r2-full-wrong', emptyChallenge(), { supportOff: false, ownRead: false }, []);
    let st = freshState();
    const apply = (a: number) => { s = canoeChallenge.registration.move(s, a)!; st = canoeChallenge.canoeStep(st, a)!; };
    for (let i = 0; i < 15; i++) apply(i * 8 + ((answer[i] + 1) % boardPuzzle.n) + 1);
    while (actionsOf(s).length < canoeChallenge.ORDINARY_LIMIT) apply((st.pos[0] === 0 ? 1 : 0) + 1);
    expect(actionsOf(s).length).toBe(495);

    const host = await mountChallengeHost(s);
    expect(host.button('Undo')!.props.disabled).toBe(true);
    expect(host.button('Reset')!.props.disabled).toBe(true);

    await host.press('Help');
    await host.press('Look');
    await host.press('Think');
    await host.press('One step');
    expect(JSON.stringify(root!.toJSON())).not.toContain('Every box is filled.');
    await host.press('Show me');
    expect(host.button('Next step')).toBeDefined();

    let guard = 0;
    while (host.button('Next step') && guard++ < 20) await host.press('Next step');
    expect(canoeRules.accepts(boardPuzzle, host.getState().pos)).toBe(true);

    await host.press('Check');
    expect(host.getSession().result).toMatchObject({ event: 'helped', awards: 0, dares: [] });
    expect(actionsOf(host.getSession()).length).toBeLessThanOrEqual(512);
  });

  it('completes a wrong full draft even after a missed Check at 495 actions through real Help -> Next step -> Check', async () => {
    let s = canoeChallenge.registration.start(entry.ref, 'alex', 'r2-full-missed-first', emptyChallenge(), { supportOff: false, ownRead: false }, []);
    let st = freshState();
    const apply = (a: number) => { s = canoeChallenge.registration.move(s, a)!; st = canoeChallenge.canoeStep(st, a)!; };
    for (let i = 0; i < 15; i++) apply(i * 8 + ((answer[i] + 1) % boardPuzzle.n) + 1);
    while (actionsOf(s).length < canoeChallenge.ORDINARY_LIMIT) apply((st.pos[0] === 0 ? 1 : 0) + 1);

    const host = await mountChallengeHost(s);
    await host.press('Check');
    expect(host.getSession().result).toBeNull();
    expect(host.getState().misses).toBe(1);
    expect(host.button('Check')!.props.disabled).toBe(true);

    await host.press('Help');
    await host.press('Look');
    await host.press('Think');
    await host.press('One step');
    await host.press('Show me');
    expect(host.button('Next step')).toBeDefined();

    let guard = 0;
    while (host.button('Next step') && guard++ < 20) await host.press('Next step');
    expect(canoeRules.accepts(boardPuzzle, host.getState().pos)).toBe(true);

    await host.press('Check');
    expect(host.getSession().result).toMatchObject({ event: 'helped', awards: 0, dares: [] });
    expect(actionsOf(host.getSession()).length).toBeLessThanOrEqual(512);
  });

  it('completes both empty and partial drafts at the 495-action limit through real Help -> Next step -> Check within 512 actions', async () => {
    for (const seedPartial of [false, true]) {
      let s = canoeChallenge.registration.start(entry.ref, 'alex', seedPartial ? 'r2-partial' : 'r2-empty', emptyChallenge(), { supportOff: false, ownRead: false }, []);
      let st = freshState();
      const apply = (a: number) => { s = canoeChallenge.registration.move(s, a)!; st = canoeChallenge.canoeStep(st, a)!; };
      if (seedPartial) {
        for (let i = 0; i < 5; i++) apply(i * 8 + ((answer[i] + 1) % boardPuzzle.n) + 1);
      }
      while (actionsOf(s).length < canoeChallenge.ORDINARY_LIMIT) apply(canoeChallenge.USED);
      expect(actionsOf(s).length).toBe(495);

      const host = await mountChallengeHost(s);
      await host.press('Help');
      await host.press('Look');
      await host.press('Think');
      await host.press('One step');
      await host.press('Show me');
      expect(host.button('Next step')).toBeDefined();

      let guard = 0;
      while (host.button('Next step') && guard++ < 20) await host.press('Next step');
      expect(canoeRules.accepts(boardPuzzle, host.getState().pos)).toBe(true);

      await host.press('Check');
      expect(host.getSession().result).toMatchObject({ event: 'helped', awards: 0, dares: [] });
      expect(actionsOf(host.getSession()).length).toBeLessThanOrEqual(512);
      act(() => root!.unmount());
      root = undefined;
    }
  });

  it('preserves normal Check-mode draft and separate-example Help while ordinary actions remain available', async () => {
    let s = canoeChallenge.registration.start(entry.ref, 'alex', 'r2-normal', emptyChallenge(), { supportOff: false, ownRead: false }, []);
    let st = freshState();
    const apply = (a: number) => { s = canoeChallenge.registration.move(s, a)!; st = canoeChallenge.canoeStep(st, a)!; };
    for (let i = 0; i < 15; i++) apply(i * 8 + ((answer[i] + 1) % boardPuzzle.n) + 1);
    const draftBefore = [...st.pos];

    const host = await mountChallengeHost(s);
    await host.press('Help');
    await host.press('Look');
    await host.press('Think');
    await host.press('One step');
    expect(JSON.stringify(root!.toJSON())).toContain('Every box is filled. Check when you are ready, or choose Show me.');
    await host.press('Show me');
    expect(JSON.stringify(root!.toJSON())).toContain('Here is the answer, front to back:');
    expect(host.button('Next step')).toBeUndefined();
    expect(host.getState().pos).toEqual(draftBefore);
  });
});
