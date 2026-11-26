import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stageLayout } from '../src/arcade/games/lagoon-run/camera';
import { illustrated } from '../src/arcade/games/lagoon-run/illustrated';
import { RunBackdrop, morningHorizonFrame } from '../src/arcade/games/lagoon-run/Backdrop';

vi.mock('react-native', () => ({ Image: 'Image', View: 'View' }));
vi.mock('react-native-svg', () => ({
  default: 'Svg', Circle: 'Circle', Defs: 'Defs', Ellipse: 'Ellipse', G: 'G',
  LinearGradient: 'LinearGradient', Path: 'Path', RadialGradient: 'RadialGradient', Rect: 'Rect', Stop: 'Stop',
}));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  cancelAnimation: vi.fn(),
  Easing: { linear: vi.fn() },
  useAnimatedStyle: (f: () => unknown) => f,
  useSharedValue: (v: unknown) => ({ value: v, set() {} }),
  withRepeat: vi.fn(),
  withTiming: vi.fn(),
}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false }));
vi.mock('../src/arcade/Sprite', () => ({ ArcadeSprite: () => null }));
vi.mock('../src/arcade/games/scrolling/Art', () => ({ palette: () => ['#000', '#000', '#000', '#000'] }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
});

const host = (r: ReactTestRenderer, type: string) => r.root.findAll(n => String(n.type) === type);

describe('Lagoon Run morning horizon backdrop', () => {
  it('aligns the 60% shoreline to the stage horizon across phone and tablet aspect ratios without gaps', () => {
    const arenas: [number, number][] = [[390, 660], [393, 760], [852, 393], [852, 300], [744, 1090], [1376, 980]];
    for (const [w, h] of arenas) {
      const layout = stageLayout(w, h);
      const frame = morningHorizonFrame(layout, w, h);
      expect(frame.hzScreen, `${w}×${h}`).toBeCloseTo(h * (layout.horizon / layout.height));
      expect(frame.imageTop, `${w}×${h}`).toBeLessThanOrEqual(1e-8);
      // 60% shoreline lands squarely on hzScreen and resizeMode="cover" never clips vertically.
      expect(frame.imageTop + frame.imageHeight * 0.6, `${w}×${h}`).toBeCloseTo(frame.hzScreen);
      expect(w / frame.imageHeight, `${w}×${h}`).toBeLessThanOrEqual(960 / 540 + 1e-8);
      // Clipping container extends past hzScreen (past the 6% water fade-in) while staying inside the image.
      expect(frame.clipHeight, `${w}×${h}`).toBeGreaterThan(frame.hzScreen + (h - frame.hzScreen) * 0.06);
      expect(frame.clipHeight, `${w}×${h}`).toBeLessThanOrEqual(frame.imageTop + frame.imageHeight + 1e-8);
    }
  });

  it('keeps the vector morning backdrop visible while loading, reveals the painted horizon onLoad, and falls back cleanly onError', async () => {
    const w = 390, h = 660, layout = stageLayout(w, h);
    const expectVectorMorning = (r: ReactTestRenderer) => {
      const images = host(r, 'Image');
      expect(images).toHaveLength(1);
      expect(images[0].props.source).toBe(illustrated.horizonMorning());
      expect(images[0].props.resizeMode).toBe('cover');
      expect(images[0].props.fadeDuration).toBe(0);
      expect(images[0].props.accessible).toBe(false);
      expect(images[0].props.style.opacity).toBe(0);
      expect(host(r, 'Rect').some(n => n.props.fill === 'url(#lr-sky)')).toBe(true);
      expect(host(r, 'Circle').length).toBeGreaterThan(0);
      expect(host(r, 'Path').length).toBeGreaterThan(0);
      const waterGradient = host(r, 'LinearGradient').find(g => g.props.id === 'lr-water')!;
      const stops = waterGradient.findAll(n => String(n.type) === 'Stop');
      expect(stops).toHaveLength(2);
      expect(stops[0].props.stopOpacity).toBeUndefined();
      expect(host(r, 'Rect').some(n => n.props.fill === 'url(#lr-haze)')).toBe(true);
    };

    // (a) Initial / loading state: image stays mounted at opacity 0 while full vector sky + opaque water render.
    await act(async () => { tree = create(<RunBackdrop world="w1" layout={layout} width={w} height={h}/>); });
    const wrap = tree!.root.findByProps({ testID: 'run-horizon-morning' });
    expect(wrap.props.style).toMatchObject({ overflow: 'hidden', width: w });
    expectVectorMorning(tree!);

    // (b) After onLoad: painted morning horizon becomes visible, vector sky/hills hide, top water fade activates.
    await act(async () => { host(tree!, 'Image')[0].props.onLoad(); });
    const loadedImage = host(tree!, 'Image')[0];
    expect(loadedImage.props.style.opacity).toBe(1);
    expect(host(tree!, 'Rect').some(r => r.props.fill === 'url(#lr-sky)')).toBe(false);
    expect(host(tree!, 'Circle')).toHaveLength(0);
    expect(host(tree!, 'Path')).toHaveLength(0);
    const waterGradient = host(tree!, 'LinearGradient').find(g => g.props.id === 'lr-water')!;
    const stops = waterGradient.findAll(n => String(n.type) === 'Stop');
    expect(stops).toHaveLength(3);
    expect(stops[0].props.stopOpacity).toBe(0);
    expect(stops[1].props.stopOpacity).toBe(1);
    expect(host(tree!, 'Rect').some(r => r.props.fill === 'url(#lr-haze)')).toBe(true);

    // (c) After onError: falls back cleanly to full vector morning sky, hills, landmark, and opaque water.
    await act(async () => { host(tree!, 'Image')[0].props.onError(); });
    expectVectorMorning(tree!);

    // Switching away to another world and back resets readiness until the remounted image fires onLoad again.
    await act(async () => { host(tree!, 'Image')[0].props.onLoad(); });
    expect(host(tree!, 'Image')[0].props.style.opacity).toBe(1);
    await act(async () => { tree!.update(<RunBackdrop world="w2" layout={layout} width={w} height={h}/>); });
    expect(host(tree!, 'Image')).toHaveLength(0);
    await act(async () => { tree!.update(<RunBackdrop world="w1" layout={layout} width={w} height={h}/>); });
    expectVectorMorning(tree!);
  });

  it('preserves layered vector sky, clouds, hills, and landmarks on festival and rain worlds', async () => {
    const w = 390, h = 660, layout = stageLayout(w, h);
    for (const world of ['w2', 'w5'] as const) {
      await act(async () => {
        if (tree) tree.update(<RunBackdrop world={world} layout={layout} width={w} height={h}/>);
        else tree = create(<RunBackdrop world={world} layout={layout} width={w} height={h}/>);
      });
      expect(host(tree!, 'Image')).toHaveLength(0);
      expect(host(tree!, 'Rect').some(r => r.props.fill === 'url(#lr-sky)')).toBe(true);
      expect(host(tree!, 'Path').length).toBeGreaterThan(0);
      const waterGradient = host(tree!, 'LinearGradient').find(g => g.props.id === 'lr-water')!;
      const stops = waterGradient.findAll(n => String(n.type) === 'Stop');
      expect(stops).toHaveLength(2);
      expect(stops[0].props.stopOpacity).toBeUndefined();
    }
  });
});
