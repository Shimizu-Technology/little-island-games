import React from 'react';
import { View } from 'react-native';
import { readFileSync } from 'node:fs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { BoardPanView, BoardTouchView, createBoardPan } from '../src/gestures/BoardPan.native';
import { SkyBoard } from '../src/library/ExhibitBoard';
import { newLab } from '../src/explore/activities';
import { HuntBoard } from '../src/wordgames/HuntBoard';
vi.mock('../src/gestures/BoardPan', async () => import('../src/gestures/BoardPan.native'));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable', useWindowDimensions: () => ({ width: 375, height: 812 }), Platform: { OS: 'ios' }, StyleSheet: { create: (s: unknown) => s, absoluteFill: {} } }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Polyline: 'Polyline', G: 'G', Path: 'Path' }));
vi.mock('../src/components/ui', () => ({ PressableScale: 'Tile' }));
vi.mock('../src/wordgames/WordGameUI', () => ({ W: { tile: {}, letter: {} } }));
vi.mock('../src/explore/ExploreArt', () => ({ Motif: () => null }));
vi.mock('../src/library/SceneBackdrop', () => ({ SceneBackdrop: () => null }));
vi.mock('../src/library/ui', () => ({ s: { small: {} } }));
vi.mock('../src/library/WordLabel', () => ({ WordLabel: () => null }));
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('react-native-reanimated', () => ({ runOnJS: (f: unknown) => f }));
vi.mock('react-native-gesture-handler', () => {
  const make = () => {
    const config: Record<string, any> = {};
    const chain: any = new Proxy({ config }, { get: (_, key) => key === 'config' ? config : (value: unknown) => { config[String(key)] = value; return chain; } });
    return chain;
  };
  return { GestureDetector: 'GestureDetector', Gesture: { Pan: make, Tap: make, Race: (...gestures: unknown[]) => ({ gestures }) } };
});
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let tree: ReactTestRenderer | undefined;
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; });
const sample = (x = 30, y = 30) => ({ x, y, absoluteX: x + 10, absoluteY: y + 100, translationX: x - 30, translationY: y - 30, numberOfPointers: 1 });
const config = () => { const g = tree!.root.findByType('GestureDetector' as React.ElementType).props.gesture; return (g.gestures?.[0] ?? g).config; };
const tap = () => tree!.root.findByType('GestureDetector' as React.ElementType).props.gesture.gestures[1].config;
const begin = () => { config().onBegin(sample()); tap().onBegin(sample()); };
const finishPan = (e = sample(), success = true) => { tap().onFinalize(e, false); config().onEnd(e, success); config().onFinalize(e, success); };
const finishTap = () => { config().onFinalize(sample(), false); tap().onEnd(sample(), true); tap().onFinalize(sample(), true); };

it('Word Hunt claims native drags before scroll movement, reports release and cancellation exactly once, and keeps tap mode available', async () => {
  const tile = vi.fn(), release = vi.fn(), cancel = vi.fn(), tracing = vi.fn();
  const props = { tiles: Array(16).fill('A'), size: 4 as const, width: 240, path: [], interactive: true, onTile: tile, onRelease: release, onCancel: cancel, onTracingChange: tracing };
  await act(async () => { tree = create(<HuntBoard {...props}/>); });
  expect(config()).toMatchObject({ minDistance: 0, shouldCancelWhenOutside: false, enabled: true });
  await act(async () => { begin(); config().onUpdate(sample(30, 90)); finishPan(sample(30, 150)); });
  expect(tile.mock.calls.map(c => c[0])).toEqual([0, 4, 8]);
  expect(tracing.mock.calls.map(c => c[0])).toEqual([true, false]);
  expect(release).toHaveBeenCalledOnce(); expect(cancel).not.toHaveBeenCalled();
  await act(async () => { begin(); config().onFinalize(sample(), false); tap().onFinalize(sample(), false); });
  expect(cancel).toHaveBeenCalledOnce(); expect(tracing).toHaveBeenLastCalledWith(false);
  await act(async () => tree!.update(<HuntBoard {...props} tapMode/>));
  expect(config().enabled).toBe(false);
  expect(tree!.root.findAllByType('Tile' as React.ElementType)).toHaveLength(16);
});

it('native pan keeps local, absolute, translation and pointer-count coordinates and cancels on unmount', async () => {
  const grant = vi.fn(), move = vi.fn(), cancel = vi.fn();
  const pan = createBoardPan({ onPanResponderGrant: grant, onPanResponderMove: move, onPanResponderTerminate: cancel });
  await act(async () => { tree = create(<BoardPanView pan={pan}><View/></BoardPanView>); });
  await act(async () => { begin(); config().onUpdate(sample(30, 130)); });
  expect(move.mock.calls[0][0].nativeEvent).toMatchObject({ locationX: 30, locationY: 130, pageX: 40, pageY: 230 });
  expect(move.mock.calls[0][1]).toMatchObject({ dx: 0, dy: 100, moveX: 40, moveY: 230, numberActiveTouches: 1 });
  await act(async () => tree!.unmount()); tree = undefined;
  expect(cancel).toHaveBeenCalledOnce();
});

it('raw native tracing preserves independent Word Search pointer identities and finalizes cancelled touches', async () => {
  const begin = vi.fn(), move = vi.fn(), end = vi.fn(), cancel = vi.fn();
  await act(async () => { tree = create(<BoardTouchView multiTouch><View onResponderGrant={begin} onResponderMove={move} onResponderRelease={end} onResponderTerminate={cancel}/></BoardTouchView>); });
  const touch = (id: number, x: number) => ({ id, x, y: 50, absoluteX: x + 20, absoluteY: 150 });
  await act(async () => {
    config().onTouchesDown({ changedTouches: [touch(7, 10)], allTouches: [touch(7, 10)] });
    config().onTouchesDown({ changedTouches: [touch(9, 90)], allTouches: [touch(7, 10), touch(9, 90)] });
    config().onTouchesMove({ changedTouches: [touch(9, 140)] });
    config().onTouchesUp({ changedTouches: [touch(7, 20)], allTouches: [touch(7, 20), touch(9, 140)], numberOfTouches: 1 });
    config().onFinalize();
  });
  expect(begin.mock.calls.map(c => c[0].nativeEvent.changedTouches[0].identifier)).toEqual([7, 9]);
  expect(move.mock.calls[0][0].nativeEvent.changedTouches[0]).toMatchObject({ identifier: 9, locationX: 140 });
  expect(end.mock.calls[0][0].nativeEvent.changedTouches[0].identifier).toBe(7);
  expect(cancel).toHaveBeenCalledOnce();
});

it.each([
  'src/wordgames/HuntBoard.tsx', 'src/puzzles/words/WordSearchBoard.tsx',
  'src/puzzles/edges/BridgesBoard.tsx', 'src/puzzles/lines/LineBoard.tsx',
  'src/puzzles/grid/GridShell.tsx', 'src/puzzles/picture-grid/GridCanvas.tsx',
  'src/puzzles/table/SolitaireBoard.tsx', 'src/library/ExhibitBoard.tsx', 'src/learn/program/PaletteDrag.tsx',
  'src/learn/games/shape-shift/view.tsx', 'src/learn/games/shape-shift/challenge-view.tsx',
  'src/learn/games/shape-shift/legacy-view.tsx', 'src/learn/games/letter-lagoon/ReadingBoard.tsx',
])('%s routes through the native claiming surface and preserves the web touch policy', path => {
  const source = readFileSync(path, 'utf8');
  expect(source).toMatch(/<Board(?:Pan|Touch)View[^]*?enabled=/);
  if (!path.endsWith('GridShell.tsx')) expect(source).not.toContain('PanResponder.create(');
  expect(source).toMatch(/touchAction.*none|boardTouchStyle|boardHorizontalTouchStyle/);
});

it('the Library Earth board keeps native tap and horizontal swipe turns without turning on a vertical drag', async () => {
  const turn = vi.fn();
  await act(async () => { tree = create(<SkyBoard state={newLab()} act={turn}/>); });
  await act(async () => { begin(); finishTap(); });
  expect(turn).toHaveBeenLastCalledWith({ type: 'turn', by: 1 });
  await act(async () => { begin(); finishPan(sample(30, 140)); });
  expect(turn).toHaveBeenCalledOnce();
  await act(async () => { begin(); finishPan(sample(-50, 30)); });
  expect(turn).toHaveBeenCalledTimes(2);
  expect(turn).toHaveBeenLastCalledWith({ type: 'turn', by: 1 });
});

it('a stationary iOS BEGAN -> FAILED pan is completed by Tap with one grant and release', async () => {
  const grant = vi.fn(), release = vi.fn(), cancel = vi.fn();
  const pan = createBoardPan({ onPanResponderGrant: grant, onPanResponderRelease: release, onPanResponderTerminate: cancel });
  await act(async () => { tree = create(<BoardPanView pan={pan}><View/></BoardPanView>); });
  await act(async () => { begin(); config().onFinalize(sample(), false); });
  expect(release).not.toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled();
  await act(async () => { tap().onEnd(sample(), true); tap().onFinalize(sample(), true); });
  expect(grant).toHaveBeenCalledOnce(); expect(release).toHaveBeenCalledOnce(); expect(cancel).not.toHaveBeenCalled();
  expect(release.mock.calls[0][1]).toMatchObject({ dx: 0, dy: 0 });
});
it('cancelled ACTIVE pans terminate and never release, even when both recognizers finalize', async () => {
  const release = vi.fn(), cancel = vi.fn();
  const pan = createBoardPan({ onPanResponderRelease: release, onPanResponderTerminate: cancel });
  await act(async () => { tree = create(<BoardPanView pan={pan}><View/></BoardPanView>); });
  await act(async () => { begin(); finishPan(sample(30, 130), false); });
  expect(release).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
});
it('the last normal raw touch-up uses numberOfTouches, even though allTouches includes the lifted finger', async () => {
  const release = vi.fn(), cancel = vi.fn();
  await act(async () => { tree = create(<BoardTouchView><View onResponderRelease={release} onResponderTerminate={cancel}/></BoardTouchView>); });
  const finger = { id: 2, x: 30, y: 30, absoluteX: 40, absoluteY: 130 };
  await act(async () => {
    config().onTouchesDown({ changedTouches: [finger], allTouches: [finger], numberOfTouches: 1 });
    config().onTouchesUp({ changedTouches: [finger], allTouches: [finger], numberOfTouches: 0 });
    config().onFinalize(sample(), false);
  });
  expect(release).toHaveBeenCalledOnce(); expect(cancel).not.toHaveBeenCalled();
});
it('native hit regions fail non-draggable starts on UI, before JS shouldSet or scroll locking can decide', async () => {
  const pan = createBoardPan({});
  const regions = [{ left: 10, top: 10, width: 40, height: 40, radius: 20 }];
  await act(async () => { tree = create(<BoardPanView pan={pan} nativeRegions={regions}><View/></BoardPanView>); });
  const manager = { fail: vi.fn() };
  config().onTouchesDown({ changedTouches: [{ x: 30, y: 30 }] }, manager);
  expect(manager.fail).not.toHaveBeenCalled();
  config().onTouchesDown({ changedTouches: [{ x: 10, y: 10 }] }, manager);
  expect(manager.fail).toHaveBeenCalledOnce();
  config().onTouchesDown({ changedTouches: [{ x: 50, y: 30 }] }, manager);
  expect(manager.fail).toHaveBeenCalledTimes(2);
  const before = tree!.root.findByType('GestureDetector' as React.ElementType).props.gesture;
  await act(async () => tree!.update(<BoardPanView pan={pan} nativeRegions={[...regions]}><View/></BoardPanView>));
  expect(tree!.root.findByType('GestureDetector' as React.ElementType).props.gesture).toBe(before);
});
it('the Earth lab uses native horizontal activation and vertical failure criteria', async () => {
  await act(async () => { tree = create(<SkyBoard state={newLab()} act={() => {}}/>); });
  expect(config()).toMatchObject({ activeOffsetX: [-20, 20], failOffsetY: [-12, 12] });
});

it('a hit-gate failure before Pan BEGAN still permits repeated stationary taps on stock or Bridges water', async () => {
  const release = vi.fn(), cancel = vi.fn(), pan = createBoardPan({ onPanResponderRelease: release, onPanResponderTerminate: cancel });
  await act(async () => { tree = create(<BoardPanView pan={pan} nativeRegions={[]}><View/></BoardPanView>); });
  const finger = { id: 1, x: 30, y: 30, absoluteX: 40, absoluteY: 130 };
  for (let i = 0; i < 2; i++) await act(async () => {
    config().onTouchesDown({ changedTouches: [finger], numberOfTouches: 1 }, { fail() {} });
    config().onFinalize(sample(), false); // UNDETERMINED -> FAILED; no Pan onBegin.
    tap().onBegin(sample());
    tap().onEnd(sample(), true); tap().onFinalize(sample(), true);
  });
  expect(release).toHaveBeenCalledTimes(2); expect(cancel).not.toHaveBeenCalled();
});
