import React, { createContext } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Board } from '../src/learn/games/turtle-draw/view';
import { ChallengeBoard } from '../src/learn/games/turtle-draw/challenge-view';
import { challengeEngine, type BuildDescriptor, type PredictDescriptor } from '../src/learn/games/turtle-draw/challenge-engine';
import { turtlePuzzles } from '../src/learn/games/turtle-draw/challenge-content';
import { engine as turtle, task as legacyTask, type TurtleState } from '../src/learn/games/turtle-draw/engine';
import { blockCost } from '../src/learn/games/turtle-draw/dsl';
import { BoardSpaceProvider, BoardSpaceContent } from '../src/learn/BoardSpace';
import { MEASURED_SCHOOL_BOARDS, SCHOOL_BOARD_MIN, schoolEntryReveal } from '../src/learn/boardGeometry';
import { LARGE_TEXT } from '../src/components/wordFit';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
vi.mock('react-native', () => ({ View: 'div', ScrollView: 'scroll', useWindowDimensions: () => viewport }));
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Path: 'path', Rect: 'rect', Text: 'text' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', PressableScale: 'button', C: { ink: '#183F39', teal: '#246858', soft: '#E5EFE5', paper: '#FFF', cream: '#FFF8EA', line: '#DDD' } }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/learn/program/ProgramEditor', () => ({ ProgramEditor: 'block-editor' }));
const heard = vi.hoisted(() => ({ sources: {} as Record<string, number>, play: vi.fn(), stop: vi.fn() }));
vi.mock('../src/content/learnAudio', () => ({ learnSources: heard.sources }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({ sound: true }), useSoundControls: () => ({ play: heard.play, stop: heard.stop }) }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ save: { settings: {} } }) }));
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));

let tree: ReactTestRenderer | undefined;
beforeEach(() => { viewport.width = 393; viewport.height = 852; viewport.fontScale = 1; for (const k of Object.keys(heard.sources)) delete heard.sources[k]; heard.play.mockClear(); });
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); vi.useRealTimers(); });
const mount = async (element: React.ReactElement) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => setTimeout(() => f(0), 0) as unknown as number); vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  await act(async () => { tree = create(element); });
};
const text = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : text(c)).join('');
const as = (p: unknown) => p as React.ComponentProps<typeof Board>;
const buttons = () => tree!.root.findAllByType('button');
const labelled = (name: string) => buttons().find(b => b.props.label === name || b.props.accessibilityLabel === name || text(b) === name);
const press = async (name: string) => act(async () => { const b = labelled(name); expect(b, name).toBeDefined(); b!.props.onPress(); });
const messages = () => tree!.root.findAllByType('p').map(text);
const options = (level: 1 | 2 | 3 | 4 | 5) => ({ mode: 'solo' as const, pace: (['easy', 'medium', 'hard'] as const)[Math.min(level, 3) - 1], ...(level === 4 ? { stage: 'stretch' as const } : level === 5 ? { stage: 'deep' as const } : {}) });
const roundAt = (level: 1 | 2 | 3 | 4 | 5, seed = 0.3) => turtle.create(options(level), { skills: {}, rng: () => seed, starter: 0, today: 0 } as never) as TurtleState;
const props = (state: TurtleState, extra: Record<string, unknown> = {}, id = 'r') => ({ session: { game: 'turtle-draw' as const, version: 1 as const, id, revision: 0, options: options(state.level as 1), state }, update: vi.fn(), practice: vi.fn(), assistance: vi.fn(), cheer: vi.fn(), sound: vi.fn(), stopSound: vi.fn(), soundOn: true, skills: {}, width: 335, height: 600, active: true, coach: { active: false, done: vi.fn() }, ...extra });

it('a new Level 3 round counts every block, adds a block on tap, and holds the limit with a plain reason', async () => {
  const p = props(roundAt(3));
  await mount(<Board {...as(p)} />);
  const limit = p.session.state.tasks[0].limit;
  expect(messages()).toContain(`Your program: 0 of ${limit} blocks`);
  await press('Add forward 60');
  expect(p.update).toHaveBeenCalledTimes(1);
  const saved = p.update.mock.calls[0][0] as TurtleState;
  expect(saved.program).toEqual([{ kind: 'forward', n: 60 }]); expect(saved.version).toBe(2);
  expect(p.sound).toHaveBeenCalledWith('tap', true);
  // A program that wraps a loop around four blocks is five blocks, though it has one block on its top level.
  const full: TurtleState = { ...p.session.state, program: [{ kind: 'repeat', times: 3, body: [{ kind: 'forward', n: 60 }, { kind: 'turn', angle: 120 }, { kind: 'color', color: 'coral' }] }] };
  const q = props(full);
  await act(async () => tree!.update(<Board {...as(q)} />));
  expect(messages()).toContain(`Your program: ${blockCost(full.program)} of ${limit} blocks`);
  expect(blockCost(full.program)).toBe(limit);
  await press('Add forward 70'); await press('Add turn 90 degrees');
  expect(q.update).toHaveBeenCalledTimes(0);
  expect(messages().some(m => /This goal allows \d+/.test(m))).toBe(true);
});

it('Undo takes back the last block, and Hint walks from where you are to one edit while recording assistance', async () => {
  const p = props(roundAt(3));
  await mount(<Board {...as(p)} />);
  expect(labelled('Undo')!.props.disabled).toBe(true);
  await press('Add forward 60');
  const after = p.update.mock.calls[0][0] as TurtleState;
  await act(async () => tree!.update(<Board {...as(props(after, { update: p.update, assistance: p.assistance }))} />));
  expect(labelled('Undo')!.props.disabled).toBe(false);
  await press('Undo');
  const undone = p.update.mock.calls.at(-1)![0] as TurtleState;
  expect(undone.program).toEqual([]);
  await act(async () => tree!.update(<Board {...as(props(undone, { update: p.update, assistance: p.assistance }))} />));
  await press('Hint');
  expect(p.assistance).toHaveBeenCalledTimes(1);
  const hint = () => tree!.root.findAllByProps({ testID: 'turtle-hint' }).map(text).join('');
  expect(hint()).toMatch(/change/i);
  await press('More hint');
  expect(hint()).toMatch(/^Add Repeat ×\d at the start\.$/);
  expect(labelled('More hint')!.props.disabled).toBe(true);
});

it.each([4, 5] as const)('Level %i opens in the K7 block editor with the tray, no songs, and the editor measured as School space', async level => {
  const p = props(roundAt(level));
  await mount(<Board {...as(p)} />);
  const editor = tree!.root.findByType('block-editor' as never);
  expect(editor.props.tray).toBe(p.session.state.tasks[0].limit); expect(editor.props.songs).toBe(false); expect(editor.props.schoolGeometry).toBe(true);
  expect(editor.props.cards).toHaveLength(12);
  const result = await editor.props.onChange(editor.props.program);
  expect(result).toBe(true);
  expect(labelled('Drawing cards')).toBeDefined();
  await press('Drawing cards');
  expect(labelled('Add forward 60')).toBeDefined();
});

it('a fix round starts on the buggy program, which Draw runs and the board names', async () => {
  const state = roundAt(5, 0.99);
  const fix = state.tasks.findIndex(t => t.debug);
  expect(fix).toBeGreaterThanOrEqual(0);
  const s: TurtleState = { ...state, done: fix, program: state.tasks[fix].start! };
  const p = props(s);
  await mount(<Board {...as(p)} />);
  expect(messages().some(m => m.includes('One block is wrong'))).toBe(true);
  await press('Draw ▶');
  expect((p.update.mock.calls[0][0] as TurtleState).running).toBe(true);
});

it('free drawing is untouched: no hint, no Show me, no limit but the shared ones, and nothing is recorded as practice', async () => {
  vi.useFakeTimers();
  const state = roundAt(3), task = state.tasks[0];
  const free: TurtleState = { ...state, free: true, program: [{ kind: 'forward', n: 60 }], cursor: 0, running: true };
  const p = props(free);
  await mount(<Board {...as(p)} />);
  expect(labelled('Hint')).toBeUndefined(); expect(labelled('Show me')).toBeUndefined();
  expect(messages().some(m => m.startsWith('Free drawing'))).toBe(true);
  // A free plan may hold more blocks than the level's goal allows.
  const wide: TurtleState = { ...free, running: false, program: Array.from({ length: task.limit + 6 }, () => ({ kind: 'forward' as const, n: 60 })) };
  await act(async () => tree!.update(<Board {...as(props(wide, { update: p.update }))} />));
  await press('Add turn 90 degrees');
  expect(p.update.mock.calls.at(-1)![0].program).toHaveLength(task.limit + 7);
  await act(async () => tree!.update(<Board {...as(p)} />));
  await act(async () => { vi.advanceTimersByTime(200); });
  expect(p.update).toHaveBeenCalled();
  await act(async () => tree!.update(<Board {...as(props({ ...free, cursor: 0 }, { practice: p.practice, update: p.update, cheer: p.cheer }))} />));
  await act(async () => { vi.advanceTimersByTime(200); });
  expect(p.practice).not.toHaveBeenCalled();
  expect(p.session.state.completed).toEqual([]);
});

it('a saved version 1 round keeps its own board: no Undo, no Hint, the old counter, and no measured drawing', async () => {
  const t = [1, 2, 3, 4].map(i => legacyTask(3, i));
  const legacy: TurtleState = { version: 1, level: 3, tasks: t, done: 0, completed: [], program: [], cursor: 0, running: false, attempts: 0, helped: false, free: false };
  const p = props(legacy);
  await mount(<BoardSpaceProvider space={{ width: 333, height: 520, large: false }}><BoardSpaceContent><Board {...as(p)} /></BoardSpaceContent></BoardSpaceProvider>);
  expect(labelled('Undo')).toBeUndefined(); expect(labelled('Hint')).toBeUndefined();
  expect(messages()).toContain(`Your program: 0 of ${t[0].limit} blocks`);
  expect(tree!.root.findAllByProps({ testID: 'school-turtle-draw-drawing' })).toHaveLength(0);
});

it('a version 2 round is measured School space: its drawing reports its height to the frame, except while the editor is measured instead', async () => {
  const p = props(roundAt(3));
  await mount(<BoardSpaceProvider space={{ width: 333, height: 520, large: false }}><BoardSpaceContent><Board {...as(p)} /></BoardSpaceContent></BoardSpaceProvider>);
  expect(tree!.root.findAllByProps({ testID: 'school-turtle-draw-drawing' }).length).toBeGreaterThan(0);
  const q = props(roundAt(5), {}, 'r5');
  await act(async () => tree!.update(<BoardSpaceProvider space={{ width: 333, height: 520, large: false }}><BoardSpaceContent><Board {...as(q)} /></BoardSpaceContent></BoardSpaceProvider>));
  expect(tree!.root.findAllByProps({ testID: 'school-turtle-draw-drawing' })).toHaveLength(0);
  expect(MEASURED_SCHOOL_BOARDS.has('turtle-draw')).toBe(true); expect(SCHOOL_BOARD_MIN['turtle-draw']).toBe(200);
  expect(schoolEntryReveal('turtle-draw', true, 852)).toBe(true); expect(schoolEntryReveal('turtle-draw', false, 852)).toBe(false); expect(schoolEntryReveal('turtle-draw', false, 499)).toBe(true);
});

it('at the largest text size every control keeps the 1.5× chrome cap and the Draw button sits with the canvas', async () => {
  viewport.fontScale = 3.12; expect(viewport.fontScale).toBeGreaterThanOrEqual(LARGE_TEXT);
  for (const level of [1, 2, 3, 4, 5] as const) {
    const p = props(roundAt(level));
    await mount(<Board {...as(p)} />);
    for (const b of buttons()) if (typeof b.props.children === 'string' || Array.isArray(b.props.children)) expect(b.props.maxFontSizeMultiplier ?? 1.5, text(b)).toBeLessThanOrEqual(1.5);
    expect(labelled('Draw ▶')).toBeDefined();
    const order = tree!.root.findAll(n => ['svg', 'button', 'block-editor'].includes(n.type as string));
    expect(order[0].type).toBe('svg');
    await act(async () => tree!.unmount()); tree = undefined;
  }
});

const challenge = (kind: 'build' | 'predict', tier = 6) => turtlePuzzles.find(p => p.descriptor.kind === kind && p.tier === tier)!.descriptor;
const startState = (d: BuildDescriptor | PredictDescriptor) => challengeEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false });
it('Deep Water predict shows the program and four lettered pictures, checks one, and crosses out a wrong pick', async () => {
  const d = challenge('predict') as PredictDescriptor, dispatch = vi.fn();
  await mount(<ChallengeBoard state={startState(d)} dispatch={dispatch} active width={353} />);
  const pictures = buttons().filter(b => /^Picture [A-D]\./.test(b.props.accessibilityLabel ?? ''));
  expect(pictures).toHaveLength(4);
  expect(labelled('Check my picture')!.props.disabled).toBe(true);
  await act(async () => pictures[1].props.onPress());
  expect(dispatch).toHaveBeenCalledWith(['s', 1]);
  const wrong = [0, 1, 2, 3].find(i => i !== d.answer)!;
  let s = challengeEngine.step(challengeEngine.step(startState(d), ['s', wrong], d)!.state, ['c'], d)!.state;
  await act(async () => tree!.update(<ChallengeBoard state={s} dispatch={dispatch} active width={353} />));
  expect(buttons().find(b => b.props.accessibilityLabel?.startsWith(`Picture ${'ABCD'[wrong]}.`))!.props.accessibilityLabel).toContain('Crossed out');
  expect(messages().some(m => m.startsWith('Not that one'))).toBe(true);
  s = challengeEngine.step(challengeEngine.step(s, ['s', d.answer], d)!.state, ['c'], d)!.state;
  await act(async () => tree!.update(<ChallengeBoard state={s} dispatch={dispatch} active width={353} />));
  // Settled and right: the drawing and the program stay, and the room below goes to what comes next.
  expect(labelled('Check my picture')).toBeUndefined();
  expect(buttons().filter(b => /^Picture [A-D]\./.test(b.props.accessibilityLabel ?? ''))).toHaveLength(0);
  expect(messages().some(m => m.startsWith('Yes!'))).toBe(true);
});

it('Deep Water predict keeps its pictures two by two at the largest text size, and Help crosses out the quick reading', async () => {
  viewport.fontScale = 3.12;
  const d = challenge('predict', 5) as PredictDescriptor;
  let s = startState(d);
  await mount(<ChallengeBoard state={s} dispatch={vi.fn()} active width={353} />);
  const cells = buttons().filter(b => /^Picture [A-D]\./.test(b.props.accessibilityLabel ?? ''));
  expect(cells.every(c => c.props.style.width >= 96)).toBe(true);
  expect(cells.every(c => c.props.style.width * 2 + 10 <= 353)).toBe(true);
  expect(tree!.root.findByProps({ accessibilityLabel: 'Four pictures' }).props.style.width).toBe(cells[0].props.style.width * 2 + 10);
  s = challengeEngine.step(challengeEngine.step(s, ['h'], d)!.state, ['h'], d)!.state;
  await act(async () => tree!.update(<ChallengeBoard state={s} dispatch={vi.fn()} active width={353} />));
  const crossed = buttons().filter(b => (b.props.accessibilityLabel ?? '').includes('Crossed out'));
  expect(crossed).toHaveLength(1);
  expect(crossed[0].props.accessibilityLabel.startsWith(`Picture ${'ABCD'[d.kinds.indexOf('once')]}.`)).toBe(true);
});

it('Deep Water draw-it gives the editor its tray and Deep Water counts, sends edits as replay actions, and walks the Help ladder', async () => {
  const d = challenge('build') as BuildDescriptor, dispatch = vi.fn();
  heard.sources['c2c-turtle-build-rules'] = 1;
  let s = startState(d);
  const commit = vi.fn(async () => ({ key: 'k', state: s }));
  await mount(<ChallengeBoard state={s} dispatch={dispatch} active width={353} commit={commit} sessionKey="k" />);
  const editor = tree!.root.findByType('block-editor' as never);
  expect(editor.props.tray).toBe(d.tray); expect(editor.props.songs).toBe(false); expect(editor.props.counts).toEqual([2, 3, 4, 5, 6, 8, 9]);
  expect(editor.props.cards).toHaveLength(18); expect(editor.props.cards.map((c: { name: string }) => c.name)).toContain('Grow +10');
  await act(async () => { await editor.props.onChange({ version: 1, body: [{ kind: 'command', command: 0 }], songs: [] }); });
  expect(commit).toHaveBeenCalledWith(['e', [[0, [-1, 0], [0, 0]]]], 'k');
  expect(labelled('Go!')!.props.disabled).toBe(true);
  await press('Help'); expect(dispatch).toHaveBeenCalledWith(['h']);
  await press('Hear rules'); expect(heard.play).toHaveBeenCalledWith('c2c-turtle-build-rules', true);
  for (const stage of [1, 2, 3]) {
    s = { ...s, hintStage: stage };
    await act(async () => tree!.update(<ChallengeBoard state={s} dispatch={dispatch} active width={353} commit={commit} sessionKey="k" />));
    expect(tree!.root.findAllByProps({ testID: 'turtle-hint' }).length).toBe(1);
  }
  expect(tree!.root.findAllByProps({ testID: 'turtle-reveal' }).length).toBeGreaterThan(0);
  expect(labelled('More help')!.props.disabled).toBe(true);
});

it('Deep Water boards put header and footer inside the scrolling controls when pinned and stay quiet without a rules recording', async () => {
  const d = challenge('build') as BuildDescriptor;
  await mount(<ChallengeBoard state={startState(d)} dispatch={vi.fn()} active width={353} header={<p>Puzzle title</p>} footer={<button>Another puzzle</button>} />);
  const scroll = tree!.root.findByProps({ accessibilityLabel: 'Turtle program and help' });
  expect(scroll.findAllByType('p').some(n => text(n) === 'Puzzle title')).toBe(true);
  expect(scroll.findAllByType('button').some(n => text(n) === 'Another puzzle')).toBe(true);
  expect(labelled('Hear rules')).toBeUndefined();
});

it('in a wide landscape window the program reads on the left and the four pictures with Check and Help sit together on the right, even at the largest text', async () => {
  viewport.width = 1133; viewport.height = 744; viewport.fontScale = 3.12;
  const d = challenge('predict', 5) as PredictDescriptor;
  await mount(<ChallengeBoard state={startState(d)} dispatch={vi.fn()} active width={1100} />);
  const grid = tree!.root.findByProps({ accessibilityLabel: 'Four pictures' }), column = grid.parent!;
  const row = column.parent!;
  expect(row.props.style.flexDirection).toBe('row');
  expect(column.findAllByType('button').some(b => text(b) === 'Check my picture')).toBe(true);
  expect(column.findAllByType('button').some(b => text(b) === 'Help')).toBe(true);
  expect(row.findAllByProps({ testID: 'turtle-program' }).length).toBeGreaterThan(0);
  expect(column.findAllByProps({ testID: 'turtle-program' })).toHaveLength(0);
  expect(grid.props.style.width).toBeLessThanOrEqual(400);
});

it('on a phone at the largest text the program shrinks to one wrapped line so the four pictures and Check come up with it', async () => {
  viewport.fontScale = 3.12;
  const d = challenge('predict', 5) as PredictDescriptor;
  await mount(<ChallengeBoard state={startState(d)} dispatch={vi.fn()} active width={353} />);
  const program = tree!.root.findAllByProps({ testID: 'turtle-program' }).find(n => typeof n.type === 'string')!;
  expect(program.props.accessibilityLabel).toMatch(/^The program: Repeat\s×5\s\[/);
  expect(program.findAllByType('p')).toHaveLength(1);
  const cells = buttons().filter(b => /^Picture [A-D]\./.test(b.props.accessibilityLabel ?? ''));
  expect(cells.every(c => c.props.style.width === 130)).toBe(true);
  // The explanation moves below the controls.
  const order = tree!.root.findAll(n => n.props.testID === 'turtle-message' || n.props.accessibilityLabel === 'Four pictures').map(n => n.props.testID ?? 'pictures');
  expect(order[0]).toBe('pictures');
});
