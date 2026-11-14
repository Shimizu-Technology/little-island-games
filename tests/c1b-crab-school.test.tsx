import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { Board } from '../src/learn/games/crab-commands/view';
import { engine, levels, commands, run, solved, solve, tick, type Command, type CrabState } from '../src/learn/games/crab-commands/engine';
import { execute, nextHint, type Descriptor, type Repair } from '../src/learn/games/crab-commands/challenge-engine';
import { editPlan } from '../src/learn/games/crab-commands/plan-edit';
import { validLearnSession } from '../src/learn/session';
import { emptySave, parseSave } from '../src/state/validation';
import type { LearnSession, Pace } from '../src/learn/types';

vi.mock('react-native', () => {
  class Value { v: number; constructor(v: number) { this.v = v; } setValue(v: number) { this.v = v; } interpolate({ inputRange: [a, b], outputRange: [x, y] }: { inputRange: number[]; outputRange: number[] }) { return x + ((this.v - a) / (b - a)) * (y - x); } }
  class ValueXY { x = new Value(0); y = new Value(0); setValue() {} }
  const animation = { start: (done?: () => void) => done?.(), stop: () => {} };
  return { View: 'div', useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), Animated: { View: 'div', Value, ValueXY, timing: () => animation, sequence: () => animation, loop: () => animation } };
});
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Ellipse: 'ellipse', G: 'g', Path: 'path', Rect: 'rect', Text: 'text' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', IconButton: 'button', PressableScale: 'button', C: { ink: '#183F39', teal: '#0F7C70', soft: '#E5EFE5', paper: '#FFF', cream: '#FFF8EA', line: '#DDD' } }));
vi.mock('../src/components/motion', () => ({ easeInOut: () => 0, nativeDriver: false, useReducedMotion: () => true }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/learn/games/tide-pool/view', () => ({ CreatureArt: () => null }));

const label: Record<Command, string> = { up: 'Up', right: 'Right', down: 'Down', left: 'Left', forward: 'Walk', 'turn-left': 'Turn left', 'turn-right': 'Turn right', repeat: 'Again ×2' };
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); });
const session = (pace: Pace, state: CrabState): LearnSession<CrabState> => ({ game: 'crab-commands', version: 1, id: 'crab-commands-1-c1b', revision: 4, levelHelped: false, options: { mode: 'solo', pace }, state } as LearnSession<CrabState>);
/** A School round paused on its first beach with this plan, exactly as 3.0 writes it. */
const paused = (pace: Pace, first: string, program: Command[], extra: Partial<CrabState> = {}): CrabState => {
  const others = levels.filter((l) => l.pace === pace && !l.retired && l.id !== first).map((l) => l.id);
  return { levels: [first, others[0], others[1]], completed: [], program, cursor: 0, running: false, starter: 0, cards: program.length, debugging: false, ...extra };
};
async function mount(pace: Pace, state: CrabState) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const update = vi.fn(), assistance = vi.fn();
  const props = { session: session(pace, state), update, practice: vi.fn(), assistance, skills: {}, sound: vi.fn(), stopSound: vi.fn(), soundOn: false, width: 360, height: 800, active: true, coach: { active: false, done: vi.fn() }, cheer: vi.fn() };
  const Crab = Board as unknown as React.ComponentType<typeof props>;
  await act(async () => { root = create(<Crab {...props} />); });
  return { update, assistance };
}
/** Every line of copy as the child reads it. */
const text = () => root!.root.findAllByType('p').map((p) => p.children.join('')).join('\n');
// A plan card that would bump, or that a shown hint names, also says so ("Card 1: Up, this card bumps. Select to …").
const same = (name: string, given: unknown) => given === name || (typeof given === 'string' && given.replace(', the hint is about this card', '').replace(', this card bumps.', '.') === name);
const buttons = (name: string) => root!.root.findAllByType('button').filter((b) => same(name, b.props.accessibilityLabel) || b.children.filter((c) => typeof c === 'string').join('') === name);
const press = async (name: string) => act(async () => { const b = buttons(name)[0]; expect(b, name).toBeDefined(); b.props.onPress(); });
const cardName = (at: number, c: Command) => `Card ${at + 1}: ${label[c]}. Select to change, insert before, or remove.`;
const apply = (p: Command[], e: Repair) => e.op === 'remove' ? p.filter((_, i) => i !== e.at) : e.op === 'insert' ? [...p.slice(0, e.at), e.card!, ...p.slice(e.at)] : p.map((c, i) => (i === e.at ? e.card! : c));

it('C1b: every School level (Gentle, Growing, Challenge) edits with Replace, Insert before, Remove and Add at end', async () => {
  for (const pace of ['easy', 'medium', 'hard'] as const) {
    const level = levels.find((l) => l.pace === pace && !l.retired && l.tier === 2)!, good = solve(level), cs = commands(pace);
    const wrong = cs.find((c) => c !== good[0])!, program = [wrong, ...good.slice(1)];
    const m = await mount(pace, paused(pace, level.id, program));
    // Replace: the wrong first card becomes the right one, so the plan reaches home.
    await press(cardName(0, wrong));
    expect(text()).toContain(`Card 1: ${label[wrong]}. Choose a command to replace it.`);
    await press(`Replace with ${label[good[0]]}`);
    let next = m.update.mock.lastCall![0] as CrabState;
    expect(next.program).toEqual(good);expect(next.cards).toBe(program.length + 1);
    expect(solved(level, run(level, next.program))).toBe(true);
    expect(engine.validate(next, { mode: 'solo', pace })).toBe(true);
    // Insert before card 2.
    await press(cardName(1, program[1]));await press('Insert before');
    expect(text()).toContain(`Card 2: ${label[program[1]]}. Choose a command to insert before it.`);
    await press(`Insert ${label[cs[0]]}`);
    next = m.update.mock.lastCall![0] as CrabState;expect(next.program).toEqual([program[0], cs[0], ...program.slice(1)]);
    // Remove card 1.
    await press(cardName(0, wrong));await press('Remove card');
    next = m.update.mock.lastCall![0] as CrabState;expect(next.program).toEqual(program.slice(1));expect(next.cards).toBe(program.length);
    // Add at end drops the selection, and the next command is added at the end.
    await press(cardName(0, wrong));await press('Add at end');
    expect(text()).not.toContain('Choose a command');
    await press(`Add ${label[cs[1]]}`);
    next = m.update.mock.lastCall![0] as CrabState;expect(next.program).toEqual([...program, cs[1]]);
    await act(async () => root!.unmount());root = undefined;
  }
});

it('C1b: replacing a card with itself changes nothing, and Insert before is refused at 80 cards', () => {
  const p: Command[] = ['forward', 'turn-left'];
  expect(editPlan(p, 0, 'replace', 'forward')).toBeNull();
  expect(editPlan(p, 0, 'replace', 'turn-right')).toEqual(['turn-right', 'turn-left']);
  expect(editPlan(p, 1, 'insert', 'forward')).toEqual(['forward', 'forward', 'turn-left']);
  expect(editPlan(p, null, 'replace', 'forward')).toEqual([...p, 'forward']);
  const full = Array(80).fill('forward') as Command[];
  expect(editPlan(full, 3, 'insert', 'turn-left')).toBeNull();expect(editPlan(full, null, 'insert', 'turn-left')).toBeNull();
  expect(editPlan(full, 3, 'replace', 'turn-left')![3]).toBe('turn-left');
});

it('C1b: the School Hint names one Change for one wrong card (not Remove and re-add)', async () => {
  const level = levels.find((l) => l.id === 'm4')!, good = solve(level);
  const wrong: Command = good[0] === 'forward' ? 'turn-left' : 'forward', program = [wrong, ...good.slice(1)];
  const m = await mount('medium', paused('medium', 'm4', program));
  await press('Hint');expect(m.assistance).toHaveBeenCalledTimes(1);
  const d = { level, budget: null, starter: [], lesson: '' } as Descriptor, hint = nextHint(d, program);
  expect(hint.edit).toEqual({ op: 'change', at: 0, card: good[0] });
  await vi.waitFor(async () => { await act(async () => {}); expect(text()).toContain(`Change card 1: ${label[good[0]]}. Keep the other cards.`); }, { timeout: 5000, interval: 20 });
  expect(text()).not.toContain('Remove card 1.');
  // Following it on the board: one edit, then home.
  await press(cardName(0, wrong));await press(`Replace with ${label[good[0]]}`);
  const next = m.update.mock.lastCall![0] as CrabState;expect(solved(level, run(level, next.program))).toBe(true);
});

it('C1b: on every School beach, any one wrong card is repaired by one hinted step that reaches home', () => {
  let checked = 0;
  for (const level of levels.filter((l) => !l.retired)) {
    const d = { level, budget: null, starter: [], lesson: '' } as Descriptor, good = solve(level);
    for (let at = 0; at < good.length; at++) for (const c of commands(level.pace).filter((c) => c !== good[at])) {
      const program = good.map((g, i) => (i === at ? c : g));
      if (execute(d, program).won) continue;
      const hint = nextHint(d, program);
      expect(hint.edit, `${level.id} card ${at + 1} ${c}`).toBeDefined();
      expect(execute(d, apply(program, hint.edit!)).won, `${level.id} card ${at + 1} ${c}: ${JSON.stringify(hint.edit)}`).toBe(true);
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(500);
});

it('C1b: a School round paused in 3.0 (bumped, mid-plan) still loads, edits with the new editor and finishes', async () => {
  const level = levels.find((l) => l.id === 'mb1')!, good = solve(level), cs = commands('medium');
  const wrong = cs.find((c) => c !== good[1] && !solved(level, run(level, [good[0], c, ...good.slice(2)])))!;
  const program = [good[0], wrong, ...good.slice(2)];
  // Run it the way 3.0 did, until the crab bumps or stops: this is the saved shape.
  let state = paused('medium', 'mb1', program, { running: true });
  while (state.running) state = tick(state);
  expect(Object.keys(state).sort()).toEqual(['cards', 'completed', 'cursor', 'debugging', 'levels', 'program', 'running', 'starter']);
  const raw = JSON.stringify({ ...emptySave(), learn: { 'crab-commands': session('medium', state) }, recentLearn: 'crab-commands' });
  const loaded = parseSave(raw).learn!['crab-commands'] as unknown as LearnSession<CrabState>;
  expect(validLearnSession(loaded, 'crab-commands')).toBe(true);
  expect(loaded.state).toEqual(state);
  const m = await mount('medium', loaded.state);
  await press(cardName(1, wrong));await press(`Replace with ${label[good[1]]}`);
  const edited = m.update.mock.lastCall![0] as CrabState;
  expect(edited.program).toEqual(good);expect(edited.cursor).toBe(0);
  expect(engine.validate(edited, { mode: 'solo', pace: 'medium' })).toBe(true);
  let go: CrabState = { ...edited, running: true };
  while (go.running) go = tick(go);
  expect(solved(level, run(level, go.program.slice(0, go.cursor)))).toBe(true);
  expect(engine.validate(go, { mode: 'solo', pace: 'medium' })).toBe(true);
  // The input round itself is untouched.
  expect(loaded.state.program).toEqual(program);
});

it('review: School plan cards are numbered, and the card a shown hint names is marked for sight and VoiceOver', async () => {
  const level = levels.find((l) => l.id === 'm4')!, good = solve(level);
  const wrong: Command = good[0] === 'forward' ? 'turn-left' : 'forward', program = [wrong, ...good.slice(1)];
  await mount('medium', paused('medium', 'm4', program));
  const cards = root!.root.findAllByType('button').filter((b) => String(b.props.accessibilityLabel).startsWith('Card '));
  expect(cards.map((b) => b.findAllByType('p')[0].children.join(''))).toEqual(program.map((_, i) => String(i + 1)));
  expect(cards.some((b) => String(b.props.accessibilityLabel).includes('the hint is about this card'))).toBe(false);
  await press('Hint');
  await vi.waitFor(async () => { await act(async () => {}); expect(text()).toContain('Change card 1:'); }, { timeout: 5000, interval: 20 });
  const marked = root!.root.findAllByType('button').filter((b) => String(b.props.accessibilityLabel).includes('the hint is about this card'));
  expect(marked).toHaveLength(1);expect(marked[0].props.accessibilityLabel).toMatch(/^Card 1: /);
  const face = marked[0].findAllByType('div')[0];
  expect(face.props.style.borderStyle).toBe('dashed');
});

it('review: a bumped round restored from a save shows its red card fully, not faded', async () => {
  const level = levels.find((l) => l.id === 'mb1')!;
  let state = paused('medium', 'mb1', ['turn-left', 'forward'], { running: true });
  while (state.running) state = tick(state);
  expect(state.debugging).toBe(true);
  await mount('medium', state);
  const bumped = root!.root.findAllByType('button').find((b) => String(b.props.accessibilityLabel).includes('this card bumps'))!;
  expect(bumped.findAllByType('div')[0].props.style.opacity).toBe(1);
  expect(level.id).toBe('mb1');
});
