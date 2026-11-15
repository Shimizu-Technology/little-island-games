import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { Board, Beach } from '../src/learn/games/crab-commands/view';
import { type CrabState } from '../src/learn/games/crab-commands/engine';


import { BoardSpaceProvider, BoardSpaceContent } from '../src/learn/BoardSpace';
vi.mock('react-native', () => {
  class Value { setValue() {} interpolate() { return 1; } }
  class ValueXY { x = new Value(); y = new Value(); setValue() {} }
  const animation = { start: (done?: () => void) => done?.(), stop: () => {} };
  return { View: 'div', ScrollView: 'scroll', useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), Animated: { View: 'div', Value, ValueXY, timing: () => animation, sequence: () => animation, loop: () => animation } };
});
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Ellipse: 'ellipse', G: 'g', Path: 'path', Rect: 'rect', Text: 'text' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', IconButton: 'button', PressableScale: 'button', C: { ink: '#183F39', teal: '#246858', soft: '#E5EFE5', paper: '#FFF', cream: '#FFF8EA', line: '#DDD' } }));
vi.mock('../src/components/motion', () => ({ easeInOut: () => 0, nativeDriver: false, useReducedMotion: () => true }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/learn/games/tide-pool/view', () => ({ CreatureArt: () => null }));
vi.mock('../src/learn/program/ProgramEditor', () => ({ ProgramEditor: 'block-editor' }));
vi.mock('../src/learn/games/crab-commands/useCrabHint', () => ({ useCrabHint: () => null }));
const frames = new Map<number, FrameRequestCallback>(); let nextFrame = 0;
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; frames.clear(); vi.unstubAllGlobals(); });
it('Crab filled-plan regression: uses the measured 500-pt inner space instead of a window-sized 280-pt beach', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { frames.set(++nextFrame, f); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const state: CrabState = { levels: ['ea1', 'eb1', 'e5'], completed: [], program: Array.from({length:12},()=> 'right' as const), cursor: 0, running: false, starter: 0, cards: 12, debugging: false };
  const options = { mode: 'solo' as const, pace: 'easy' as const };
  await act(async () => { tree = create(<BoardSpaceProvider space={{width:333,height:500,large:false}}><BoardSpaceContent testID="content"><Board session={{ game: 'crab-commands', version: 1, id: 'geometry', revision: 1, options, state }} update={vi.fn()} practice={vi.fn()} assistance={vi.fn()} skills={{}} sound={vi.fn()} stopSound={vi.fn()} soundOn={false} width={333} height={759} active coach={{ active: false, done: vi.fn() }} cheer={vi.fn()} /></BoardSpaceContent></BoardSpaceProvider>); });
  const beach = () => tree!.root.findByType(Beach);
  expect(beach().props.size).toBe(280);
  await act(async () => {
    tree!.root.findAllByType('div').find(n=>n.props.testID==='content')!.props.onLayout({nativeEvent:{layout:{width:333,height:568}}});
    // The pre-fix board has no measured drawing callback. Still supply the same
    // outer frame measurement: it must react to it to keep Go on this screen.
    beach().parent!.props.onLayout?.({nativeEvent:{layout:{height:280}}});
    const queue=[...frames.values()];frames.clear();queue.forEach(f=>f(0));
  });
  expect(beach().props.size + 288).toBeLessThanOrEqual(500);
  expect(beach().props.size).toBeGreaterThanOrEqual(150);
  const plan=tree!.root.findAllByType('scroll' as never).find(n=>n.props.accessibilityLabel==='Your plan cards');
  expect(plan).toBeDefined();
  expect(plan!.props.style.maxHeight).toBe(66);
  expect(plan!.findAllByType('button').filter(n=>n.props.accessibilityLabel?.startsWith('Card ')).every(n=>n.props.style.width>=44&&n.props.style.height>=44)).toBe(true);
});
