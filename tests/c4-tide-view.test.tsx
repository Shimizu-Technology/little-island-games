import React, { createContext } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Board } from '../src/learn/games/tide-logic/view';
import { ChallengeBoard } from '../src/learn/games/tide-logic/challenge-view';
import { tidePuzzles } from '../src/learn/games/tide-logic/challenge-content';
import { HELP, RUN, answerOf, challengeEngine, pick, setBlock, type Action, type State } from '../src/learn/games/tide-logic/challenge-engine';
import { engine, type LegacyTide, type TideV3 } from '../src/learn/games/tide-logic/engine';
import { currentRow, frameOf, run } from '../src/learn/games/tide-logic/school';
import { BoardSpaceProvider } from '../src/learn/BoardSpace';
import { FRAMES, goalSentence, usesRuleWords } from '../src/learn/games/tide-logic/rules';

const must = <T,>(x: T | null): T => { if (x === null) throw new Error('refused'); return x; };
const setRuleState = (s: TideV3, rule: number[]): TideV3 => ({ ...s, rule: [...rule] });
const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
vi.mock('react-native', () => ({ View: 'div', ScrollView: 'scroll', useWindowDimensions: () => viewport }));
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Path: 'path', Rect: 'rect', Text: 'text' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', Heading: 'h', PressableScale: 'button', C: { ink: '#183F39', teal: '#246858', soft: '#E5EFE5', paper: '#FFF', cream: '#FFF8EA', line: '#DDD' } }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
const heard = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn() }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({ sound: true }), useSoundControls: () => ({ play: heard.play, stop: heard.stop }) }));
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
const sources = vi.hoisted(() => ({} as Record<string, number>));
vi.mock('../src/content/learnAudio', () => ({ learnSources: sources }));

let tree: ReactTestRenderer | undefined;
beforeEach(() => { viewport.width = 393; viewport.height = 852; viewport.fontScale = 1; heard.play.mockClear(); });
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); vi.useRealTimers(); });
const mount = async (element: React.ReactElement) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  await act(async () => { tree = create(element); });
};
const asBoard = (p: unknown) => p as React.ComponentProps<typeof Board>;
const text = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : text(c)).join('');
const buttons = () => tree!.root.findAllByType('button');
const labelled = (name: string) => buttons().find(b => b.props.label === name || text(b) === name || text(b).startsWith(name));
const press = async (name: string) => act(async () => { const b = labelled(name); expect(b, name).toBeDefined(); b!.props.onPress(); });
const words = () => tree!.root.findAllByType('p').map(text);
const options = (level: number) => ({ mode: 'solo' as const, pace: (['easy', 'medium', 'hard'] as const)[Math.min(level, 3) - 1], ...(level === 4 ? { stage: 'stretch' as const } : level === 5 ? { stage: 'deep' as const } : {}) });
const round = (level: number) => engine.create(options(level), { skills: {}, rng: () => .3, starter: 0, today: 0 }) as TideV3;
const props = (state: TideV3 | LegacyTide) => ({ session: { game: 'tide-logic' as const, version: 1 as const, id: 'r', revision: 0, options: options(state.level), state }, update: vi.fn(), practice: vi.fn(), assistance: vi.fn(), cheer: vi.fn(), sound: vi.fn(), stopSound: vi.fn(), soundOn: true, skills: {}, width: 353, height: 600, active: true, coach: { active: false, done: vi.fn() } });

it('School Level 3 shows the goal in everyday words, builds a rule block by block with a tap tone, and runs it', async () => {
  const s = round(3), p = props(s), row = currentRow(s)!, f = frameOf(3);
  await mount(<Board {...asBoard(p)} />);
  const goal = goalSentence(f, row.target)!;
  expect(words()).toContain(goal); expect(usesRuleWords(goal)).toBe(false);
  await press('Choose first, currently empty');
  await press(f.slots[0].options[row.target[0]]);
  expect(p.update).toHaveBeenCalledTimes(1);
  expect((p.update.mock.calls[0][0] as TideV3).rule[0]).toBe(row.target[0]);
  expect(p.sound).toHaveBeenCalledWith('tap', true);
  // A whole right rule runs; the belt then steps one catch at a time.
  const ready = props({ ...s, rule: [...row.target] });
  await act(async () => tree!.update(<Board {...asBoard(ready)} />));
  await press('▶ Run the belt');
  expect((ready.update.mock.calls[0][0] as TideV3).running).toBe(0);
  expect(ready.cheer).toHaveBeenCalledWith('right');
});
it('a wrong run names the first wrong catch and its buckets; Help then climbs one rung per press', async () => {
  const s = round(3), row = currentRow(s)!, wrong = [...row.target]; wrong[3] = 1 - wrong[3];
  const p = props({ ...s, rule: wrong });
  await mount(<Board {...asBoard(p)} />);
  await press('▶ Run the belt');
  expect(words().some(w => /^Catch \d+, the .+, would go (LEFT|RIGHT), but it belongs (LEFT|RIGHT)\./.test(w))).toBe(true);
  expect(p.practice).toHaveBeenCalledWith('think.code-logic', false);
  await press('Help: look');
  expect(p.assistance).toHaveBeenCalledTimes(1);
  expect((p.update.mock.calls.at(-1)![0] as TideV3).hint).toBe(1);
});
it('Level 4 draws the real bell: the builder asks which catch rings, and the counter starts at 0', async () => {
  await mount(<Board {...asBoard(props(round(4)))} />);
  expect(labelled('Choose when, currently empty')).toBeDefined();
  expect(words().some(w => w.startsWith('Counter: 0'))).toBe(true);
  await press('Choose when, currently empty');
  expect(labelled('on the catch before')).toBeDefined(); expect(labelled('on this catch')).toBeDefined();
});
it('Level 5 asks the trace question about its chosen catch before the belt can run', async () => {
  const s = round(5), row = currentRow(s)!;
  await mount(<Board {...asBoard(props({ ...s, rule: [...row.target] }))} />);
  expect(words().some(w => w.startsWith(`TRACE IT · Catch ${row.trace! + 1}`))).toBe(true);
  expect(labelled('▶ Run the belt')!.props.disabled).toBe(true);
});
it('a saved version 2 round still opens the board it was made with', async () => {
  const legacy: LegacyTide = { version: 2, level: 4, seed: 14177, index: 0, total: 4, rule: { first: '', join: '', second: '', action: '' }, running: -1, helped: false };
  await mount(<Board {...asBoard(props(legacy))} />);
  expect(labelled('Show rule')).toBeDefined();
  expect(labelled('Help: look')).toBeUndefined();
});
it.each([1, 3.12])('every School level keeps the belt, the rule builder and Run together at font scale %s', async scale => {
  viewport.fontScale = scale;
  for (let level = 1; level <= 5; level++) {
    await mount(<Board {...asBoard(props(round(level)))} />);
    const root = tree!.root;
    expect(root.findAll(n => typeof n.type === 'function' && n.type.name === 'Cargo').length).toBe(currentRow(round(level))!.belt.length);
    expect(root.findAll(n => n.props.testID === 'tide-rule').length).toBeGreaterThan(0);
    expect(labelled('▶ Run the belt')).toBeDefined(); expect(labelled('↶ Undo')).toBeDefined(); expect(labelled('Clear')).toBeDefined();
    await act(async () => tree!.unmount()); tree = undefined;
  }
});

const challengeProps = (state: State) => ({ state, dispatch: vi.fn(), active: true, width: 353 });
const freshState = (p: (typeof tidePuzzles)[number]) => challengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
const after = (p: (typeof tidePuzzles)[number], actions: Action[]) => actions.reduce((s, a) => challengeEngine.step(s, a, p.descriptor)!.state, freshState(p));
it('Challenge write: the goal sentence, a rule builder with its bracket, and Run, Undo, Clear and Help', async () => {
  const p = tidePuzzles.find(x => x.descriptor.frame === 'three')!, q = challengeProps(freshState(p));
  await mount(<ChallengeBoard {...q} />);
  const goal = goalSentence(FRAMES.three, p.descriptor.target)!;
  expect(words()).toContain(goal); expect(usesRuleWords(goal)).toBe(false);
  expect(words()).toContain('('); expect(words()).toContain(')');
  await press('Choose first, currently empty');
  await press('blue');
  expect(q.dispatch).toHaveBeenCalledWith(setBlock(0, 0));
  expect(heard.play).toHaveBeenCalledWith('tap', true);
  for (const name of ['▶ Run the belt', '↶ Undo', 'Clear', 'Help']) expect(labelled(name)).toBeDefined();
});
it('Challenge find: every catch shows where it was sorted; no goal sentence gives the rule away', async () => {
  const p = tidePuzzles.find(x => x.descriptor.kind === 'find' && x.descriptor.frame === 'not')!;
  await mount(<ChallengeBoard {...challengeProps(freshState(p))} />);
  expect(words()).toContain('Read the sorted belt. Build a rule that sorts every catch the same way.');
  expect(words().filter(w => w === '← left' || w === 'right →')).toHaveLength(p.descriptor.belt.length);
});
it('Challenge trace: two buttons per catch send it left or right, and Check is the run', async () => {
  const p = tidePuzzles.find(x => x.descriptor.kind === 'trace')!, q = challengeProps(freshState(p));
  await mount(<ChallengeBoard {...q} />);
  await press('Send catch 1 right');
  expect(q.dispatch).toHaveBeenCalledWith(pick(0, 1));
  expect(labelled('Check')!.props.disabled).toBe(true);
});
it('after a miss the board names the counterexample, and Help shows its rung from the engine', async () => {
  const p = tidePuzzles.find(x => x.descriptor.frame === 'not' && x.descriptor.kind === 'write')!, d = p.descriptor, bad = [...d.target]; bad[3] = 1 - bad[3];
  const missed = after(p, [...bad.map((o, i) => setBlock(i, o)), RUN]);
  await mount(<ChallengeBoard {...challengeProps(missed)} />);
  expect(words().some(w => /^Catch \d+, the .+, goes (LEFT|RIGHT) with your rule, but it belongs (LEFT|RIGHT)\./.test(w))).toBe(true);
  await act(async () => tree!.update(<ChallengeBoard {...challengeProps(after(p, [...bad.map((o, i) => setBlock(i, o)), RUN, HELP]))} />));
  expect(tree!.root.findAll(n => n.props.testID === 'tide-hint').length).toBeGreaterThan(0);
});
it.each([[393, 852, 1], [393, 852, 3.12], [1133, 744, 3.12]])('every Challenge kind keeps the belt, the rule and its controls at %s×%s, font scale %s', async (w, h, scale) => {
  viewport.width = w; viewport.height = h; viewport.fontScale = scale;
  for (const kind of ['write', 'find', 'trace'] as const) {
    const p = tidePuzzles.find(x => x.descriptor.kind === kind)!;
    await mount(<ChallengeBoard {...challengeProps(freshState(p))} width={w > h ? 1093 : 353} />);
    expect(tree!.root.findAll(n => n.props.testID === 'tide-challenge-belt').length).toBeGreaterThan(0);
    expect(tree!.root.findAll(n => n.props.testID === 'tide-rule').length).toBeGreaterThan(0);
    expect(labelled(kind === 'trace' ? 'Check' : '▶ Run the belt')).toBeDefined();
    // Chrome text caps at 1.5×, so the controls never balloon past the board at AX5.
    for (const b of buttons()) expect(b.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
    await act(async () => tree!.unmount()); tree = undefined;
  }
});
it('Hear rules appears only once the lead has voiced its line', async () => {
  const p = tidePuzzles.find(x => x.descriptor.kind === 'find')!;
  await mount(<ChallengeBoard {...challengeProps(freshState(p))} />);
  expect(labelled('Hear rules')).toBeUndefined();
  await act(async () => tree!.unmount()); tree = undefined;
  sources['c4-tide-find-rules'] = 1;
  await mount(<ChallengeBoard {...challengeProps(freshState(p))} />);
  await press('Hear rules');
  expect(heard.play).toHaveBeenCalledWith('c4-tide-find-rules', true);
  delete sources['c4-tide-find-rules'];
});
it('at AX5 on a phone in portrait the belt stays one sideways row, with labels capped, so the rule and Run stay in view', async () => {
  viewport.fontScale = 3.12;
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => setTimeout(() => f(0), 0) as unknown as number); vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  await mount(<BoardSpaceProvider space={{ width: 353, height: 600, large: true }}><Board {...asBoard(props(round(5)))} /></BoardSpaceProvider>);
  const belt = tree!.root.findAll(n => String(n.type) === 'scroll' && n.props.testID === 'tide-cargo-scroll');
  expect(belt).toHaveLength(1); expect(belt[0].props.horizontal).toBe(true);
  const labels = tree!.root.findAllByType('p').filter(n => /^\d+ · (big|small)$/.test(text(n)));
  expect(labels.length).toBe(currentRow(round(5))!.belt.length);
  for (const l of labels) expect(l.props.maxFontSizeMultiplier).toBe(1.3);
});
it('on a phone the Challenge belt is one sideways row, and a trace puts its rule above the belt', async () => {
  const p = tidePuzzles.find(x => x.descriptor.kind === 'trace')!;
  viewport.fontScale = 3.12;
  await mount(<ChallengeBoard {...challengeProps(freshState(p))} />);
  const scroll = tree!.root.findAll(n => String(n.type) === 'scroll')[0];
  expect(scroll.props.horizontal).toBe(true);
  const order = tree!.root.findAll(n => n.props.testID === 'tide-rule' || n.props.testID === 'tide-challenge-belt').map(n => n.props.testID);
  expect(order[0]).toBe('tide-rule');
});
it('a winning run plays every catch to its bucket even though the frame shows the solved board inactive', async () => {
  vi.useFakeTimers();
  const p = tidePuzzles.find(x => x.descriptor.kind === 'trace')!, d = p.descriptor;
  const before = after(p, answerOf(d).map((side, i) => pick(i, side as 0 | 1)));
  await mount(<ChallengeBoard {...challengeProps(before)} />);
  const won = challengeEngine.step(before, RUN, d)!.state;
  await act(async () => tree!.update(<ChallengeBoard {...challengeProps(won)} active={false} />));
  expect(words()).toContain('Watch every catch land.');
  for (let i = 0; i <= d.belt.length; i++) await act(async () => { vi.advanceTimersByTime(30); });
  expect(words()).toContain('Every catch traced right.');
  expect(heard.play).toHaveBeenCalledWith('win', true);
});
it('in a wide landscape board the belt panel stretches to its column, so it wraps rather than spilling under the rule', async () => {
  viewport.width = 852; viewport.height = 393; viewport.fontScale = 3.12;
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => setTimeout(() => f(0), 0) as unknown as number); vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  await mount(<BoardSpaceProvider space={{ width: 760, height: 330, large: true }}><Board {...asBoard({ ...props(round(4)), width: 760 })} /></BoardSpaceProvider>);
  const panel = tree!.root.findAll(n => n.props.testID === 'tide-belt-panel')[0];
  expect(panel.props.style.alignSelf).toBe('stretch');
  expect(tree!.root.findAll(n => String(n.type) === 'scroll' && n.props.testID === 'tide-cargo-scroll')).toHaveLength(0);
});
it('School chrome caps at 1.5x and the goal at 2x, so Run stays with the belt at AX5', async () => {
  viewport.fontScale = 3.12;
  const s = round(5);
  await mount(<Board {...asBoard(props({ ...s, rule: [...currentRow(s)!.target] }))} />);
  for (const b of buttons()) expect(b.props.maxFontSizeMultiplier, text(b)).toBeLessThanOrEqual(1.5);
  expect(tree!.root.findAll(n => n.props.testID === 'tide-goal')[0].props.maxFontSizeMultiplier).toBe(2);
  const trace = tree!.root.findAllByType('p').find(n => text(n).startsWith('TRACE IT'))!;
  expect(trace.props.maxFontSizeMultiplier).toBe(1.5);
});
it('a miss is said by the belt (not a vague line), the counter never repeats the catch line, and ELSE shows one arrow', async () => {
  const s = round(4), row = currentRow(s)!, wrong = [1 - row.target[0], row.target[1], row.target[2]];
  const p = props({ ...s, rule: wrong });
  await mount(<Board {...asBoard(p)} />);
  await press('▶ Run the belt');
  const miss = tree!.root.findAll(n => n.props.testID === 'tide-miss')[0];
  expect(text(miss)).toMatch(/^Catch \d+, the .+, would go (LEFT|RIGHT), but it belongs (LEFT|RIGHT)\./);
  expect(words().some(w => /found a bug/.test(w))).toBe(false);
  expect(words().filter(w => w.startsWith('ELSE')).every(w => (w.match(/[←→]/g) ?? []).length === 1)).toBe(true);
  const running = must(run(setRuleState(s, row.target))).state;
  await act(async () => tree!.update(<Board {...asBoard(props({ ...running, running: 2 }))} />));
  expect(words().some(w => w.startsWith('Next:'))).toBe(false);
});
