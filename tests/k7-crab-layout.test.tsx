import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { Board, Beach } from '../src/learn/games/crab-commands/view';
import { engine, levels, type CrabState } from '../src/learn/games/crab-commands/engine';
import { encodeProgram } from '../src/learn/program/codec';
vi.mock('react-native', () => {
  class Value { setValue() {} interpolate() { return 1; } }
  class ValueXY { x = new Value(); y = new Value(); setValue() {} }
  const animation = { start: (done?: () => void) => done?.(), stop: () => {} };
  return { View: 'div', useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 3.12 }), Animated: { View: 'div', Value, ValueXY, timing: () => animation, sequence: () => animation, loop: () => animation } };
});
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Ellipse: 'ellipse', G: 'g', Path: 'path', Rect: 'rect', Text: 'text' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', IconButton: 'button', PressableScale: 'button', C: { ink: '#183F39', teal: '#246858', soft: '#E5EFE5', paper: '#FFF', cream: '#FFF8EA', line: '#DDD' } }));
vi.mock('../src/components/motion', () => ({ easeInOut: () => 0, nativeDriver: false, useReducedMotion: () => true }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/learn/games/tide-pool/view', () => ({ CreatureArt: () => null }));
vi.mock('../src/learn/program/ProgramEditor', () => ({ ProgramEditor: 'block-editor' }));
vi.mock('../src/learn/games/crab-commands/useCrabHint', () => ({ useCrabHint: () => null }));

it('K7 AX5 keeps Go and Step beside the beach; a manual step is valid and its nested draft resumes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const state: CrabState = { levels: ['ea1', 'eb1', 'e5'], completed: [], program: ['right', 'right'], cursor: 1, running: false, starter: 0, cards: 2, debugging: false, blockDraft: encodeProgram({ version: 1, songs: [], body: [{ kind: 'repeat', times: 2, body: [{ kind: 'command', command: 1 }] }] }) };
  const options = { mode: 'solo' as const, pace: 'easy' as const }, update = vi.fn(); let tree: ReactTestRenderer | undefined;
  expect(engine.validate(state, options)).toBe(true);
  levels[0].blockEditor=true;
  try {
    await act(async () => { tree = create(<Board session={{ game: 'crab-commands', version: 1, id: 'k7-layout', revision: 1, options, state }} update={update} practice={vi.fn()} assistance={vi.fn()} skills={{}} sound={vi.fn()} stopSound={vi.fn()} soundOn={false} width={337} height={852} active coach={{ active: false, done: vi.fn() }} cheer={vi.fn()} />); });
    const run = tree!.root.findByProps({ testID: 'crab-block-run' });
    expect(tree!.root.findAllByType('button').some(b=>b.children.join('')==='Arrow editor')).toBe(false);
    expect(tree!.root.findByType('block-editor' as never).props.onFlat).toBeTypeOf('function');
    expect(run.parent!.findByType(Beach).props.size).toBeLessThanOrEqual(180);
    const step = run.findAllByType('button').find(b => b.children.join('') === 'Step')!;
    await act(async () => step.props.onPress());
    const saved = JSON.parse(JSON.stringify(update.mock.lastCall![0])) as CrabState;
    expect(saved.cursor).toBe(2); expect(saved.running).toBe(false); expect(saved.blockDraft).toEqual(state.blockDraft); expect(engine.validate(saved, options)).toBe(true);
  } finally { if (tree) await act(async () => tree!.unmount()); delete levels[0].blockEditor;vi.unstubAllGlobals(); }
});
