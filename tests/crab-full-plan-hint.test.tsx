import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { Board } from '../src/learn/games/crab-commands/view';
import { engine, levels, type Command, type CrabState } from '../src/learn/games/crab-commands/engine';
import type { LearnSession, Pace } from '../src/learn/types';

vi.mock('react-native', () => {
  class Value { v: number; constructor(v: number) { this.v = v; } setValue(v: number) { this.v = v; } interpolate({ inputRange: [a, b], outputRange: [x, y] }: { inputRange: number[]; outputRange: number[] }) { return x + ((this.v - a) / (b - a)) * (y - x); } }
  class ValueXY { x = new Value(0); y = new Value(0); setValue() {} }
  const animation = { start: (done?: () => void) => done?.(), stop: () => {} };
  return { View: 'div', Animated: { View: 'div', Value, ValueXY, timing: () => animation, sequence: () => animation, loop: () => animation } };
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
  return { update, assistance, props };
}
/** Every line of copy as the child reads it. */
const text = () => root!.root.findAllByType('p').map((p) => p.children.join('')).join('\n');
// A plan card that would bump, or that a shown hint names, also says so ("Card 1: Up, this card bumps. Select to …").
const same = (name: string, given: unknown) => given === name || (typeof given === 'string' && given.replace(', the hint is about this card', '').replace(', this card bumps.', '.') === name);
const buttons = (name: string) => root!.root.findAllByType('button').filter((b) => same(name, b.props.accessibilityLabel) || b.children.filter((c) => typeof c === 'string').join('') === name);
const press = async (name: string) => act(async () => { const b = buttons(name)[0]; expect(b, name).toBeDefined(); b.props.onPress(); });
const cardName = (at: number, c: Command) => `Card ${at + 1}: ${label[c]}. Select to change, insert before, or remove.`;

it('a full School board gets a hint it can carry out (a removal, never a disabled insertion)', async () => {
  const program: Command[] = ['right', 'down', ...Array(78).fill('up')];
  const state = paused('easy', 'ea5', program);
  expect(engine.validate(state, { mode: 'solo', pace: 'easy' })).toBe(true);
  await mount('easy', state);
  await press('Hint');
  let hint = '';
  await vi.waitFor(async () => { await act(async () => {}); hint = text().split('\n').find(l => /^(Remove card|Insert before card|Change card)/.test(l)) ?? ''; expect(hint).not.toBe(''); });
  // At 80 cards Insert is disabled, so the hint must not ask for one first.
  expect(hint).not.toMatch(/^Insert before/);
  const at = Number(hint.match(/^Remove card (\d+)/)?.[1]);
  expect(at).toBeGreaterThan(0);
  await press(cardName(at - 1, program[at - 1]));
  const remove = buttons('Remove card')[0];
  expect(remove.props.disabled).toBeFalsy();
});
