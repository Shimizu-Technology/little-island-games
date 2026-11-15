import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { Board } from '../src/learn/games/crab-commands/view';
import { engine, levels, solve, type CrabState } from '../src/learn/games/crab-commands/engine';
import { optionsAtLevel } from '../src/learn/levelOptions';
vi.mock('react-native', () => {
  class Value { setValue() {} interpolate() { return 1; } }
  class ValueXY { x = new Value(); y = new Value(); setValue() {} }
  const animation = { start: (done?: () => void) => done?.(), stop: () => {} };
  return { View: 'div', useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), Animated: { View: 'div', Value, ValueXY, timing: () => animation, sequence: () => animation, loop: () => animation } };
});
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Ellipse: 'ellipse', G: 'g', Path: 'path', Rect: 'rect', Text: 'text' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', IconButton: 'button', PressableScale: 'button', C: { ink: '#183F39', teal: '#246858', soft: '#E5EFE5', paper: '#FFF', cream: '#FFF8EA', line: '#DDD' } }));
vi.mock('../src/components/motion', () => ({ easeInOut: () => 0, nativeDriver: false, useReducedMotion: () => true }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/learn/games/tide-pool/view', () => ({ CreatureArt: () => null }));
vi.mock('../src/learn/program/ProgramEditor', () => ({ ProgramEditor: 'block-editor' }));
vi.mock('../src/learn/games/crab-commands/useCrabHint', () => ({ useCrabHint: () => null }));
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });
const mount = async (state: CrabState, level: 4 | 5, update = vi.fn()) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const options = optionsAtLevel({ mode: 'solo', pace: 'medium' }, level);
  expect(engine.validate(state, options)).toBe(true);
  await act(async () => { tree = create(<Board session={{ game: 'crab-commands', version: 1, id: `c1d-${level}`, revision: 1, options, state }} update={update} practice={vi.fn()} assistance={vi.fn()} skills={{}} sound={vi.fn()} stopSound={vi.fn()} soundOn={false} width={361} height={700} active coach={{ active: false, done: vi.fn() }} cheer={vi.fn()} />); });
  return update;
};
const text = () => tree!.root.findAllByType('p' as never).map(p => p.children.join('')).join(' | ');
const button = (label: string) => tree!.root.findAllByType('button' as never).find(b => b.children.join('') === label);

it('Level 4 opens on the planted bug, offers Undo and Start over, and a fixed plan wins', async () => {
  const l = levels.find(x => x.stage === 'stretch' && x.tier === 0)!, others = levels.filter(x => x.stage === 'stretch' && x.tier > 0).slice(0, 2).map(x => x.id);
  const state: CrabState = { levels: [l.id, ...others], completed: [], program: [...l.starter!], cursor: 0, running: false, starter: 0, cards: l.starter!.length, debugging: false };
  const update = await mount(state, 4);
  expect(text()).toContain('This plan has a bug. Find it and fix it.');
  expect(button('Start over')!.props.disabled).toBe(true);
  expect(button('Undo')!.props.disabled).toBe(true);
  expect(button('Clear')).toBeUndefined();
  // Remove a card, then Undo brings the planted plan back exactly.
  const first = tree!.root.findAllByType('button' as never).find(b => String(b.props.accessibilityLabel ?? '').startsWith('Card 1:'))!;
  await act(async () => first.props.onPress());
  await act(async () => button('Remove card')!.props.onPress());
  const removed = update.mock.lastCall![0] as CrabState;
  expect(removed.program).toHaveLength(l.starter!.length - 1);
  await act(async () => { tree!.update(<Board session={{ game: 'crab-commands', version: 1, id: 'c1d-4', revision: 2, options: optionsAtLevel({ mode: 'solo', pace: 'medium' }, 4), state: removed }} update={update} practice={vi.fn()} assistance={vi.fn()} skills={{}} sound={vi.fn()} stopSound={vi.fn()} soundOn={false} width={361} height={700} active coach={{ active: false, done: vi.fn() }} cheer={vi.fn()} />); });
  await act(async () => button('Undo')!.props.onPress());
  expect((update.mock.lastCall![0] as CrabState).program).toEqual(l.starter);
  expect(solve(l).length).toBeGreaterThan(0);
});

it('Level 5 opens straight into blocks with the tray, no arrow editor, no songs or condition', async () => {
  const l = levels.find(x => x.stage === 'deep' && x.tier === 0)!, others = levels.filter(x => x.stage === 'deep' && x.tier > 0).slice(0, 2).map(x => x.id);
  await mount({ levels: [l.id, ...others], completed: [], program: [], cursor: 0, running: false, starter: 0, cards: 0, debugging: false }, 5);
  const editor = tree!.root.findByType('block-editor' as never);
  expect(editor.props.tray).toBe(l.tray);
  expect(editor.props.onFlat).toBeUndefined();
  expect(editor.props.songs).toBe(false);
  expect(editor.props.condition).toBeUndefined();
  expect(button('Block editor')).toBeUndefined();
  expect(text()).toContain(`The tray holds ${l.tray} blocks. Build with Repeat!`);
  // The tray is enforced on save as well: a flat plan over the tray is refused.
  expect(await editor.props.onChange({ version: 1, songs: [], body: solve(l).map(c => ({ kind: 'command', command: ['up','right','down','left','forward','turn-left','turn-right','repeat'].indexOf(c) })) })).toBe(false);
});
