import React from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ItemArt } from '../src/home/art/Items';
import { MoreItemArt } from '../src/home/art/More';
import { SeatArt } from '../src/home/art/SeatArt';
import { LivingArt } from '../src/home/art/LivingArt';
import { HandProp } from '../src/home/art/PropShape';
import { CrabFriend } from '../src/home/art/CrabFriend';
import { DispenserFanArt } from '../src/home/art/DispenserFanArt';
import { particlesOf } from '../src/home/runtime/Effects';
import { drinkIds, holdableIds } from '../src/home/art/living';

vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView', createAnimatedComponent: (c: unknown) => c },
  ReduceMotion: { Never: 'never', System: 'system' },
  useSharedValue: (value: number) => ({ value, set(v: number) { this.value = v; } }),
  useAnimatedProps: () => ({}),
  useAnimatedStyle: () => ({}),
  cancelAnimation: () => {},
  withRepeat: () => 0,
  withSequence: () => 0,
  withTiming: () => 0,
  Easing: { inOut: () => 0, sin: 0, linear: (t: number) => t },
}));

vi.mock('react-native-svg', () => {
  const tags = {
    default: 'svg',
    Circle: 'circle',
    Ellipse: 'ellipse',
    G: 'g',
    Path: 'path',
    Rect: 'rect',
    Defs: 'defs',
    Filter: 'filter',
    FeColorMatrix: 'feColorMatrix',
    ClipPath: 'clipPath',
    Pattern: 'pattern',
    Text: 'text',
    LinearGradient: 'linearGradient',
    Stop: 'stop',
  };
  return Object.fromEntries(
    Object.entries(tags).map(([name, tag]) => [
      name,
      ({ children, accessible: _accessible, ...props }: Record<string, unknown>) =>
        React.createElement(tag, props, children as React.ReactNode),
    ]),
  );
});

vi.mock('../src/arcade/Art', () => ({ StickerArt: () => null }));

describe('Track E2 Toca Boca Island Home props art contracts', () => {
  it('assigns unique SVG Defs gradient and filter IDs when multiple identical items share a room tree', () => {
    const html = render(
      <div>
        <ItemArt item="plant" tint="original" />
        <ItemArt item="plant" tint="coral" />
        <ItemArt item="plant" tint="coral" />
        <ItemArt item="toy-box" tint="lagoon" />
        <ItemArt item="toy-box" tint="sunshine" />
        <MoreItemArt id="bookcase" tint="original" />
        <MoreItemArt id="bookcase" tint="lagoon" />
        <MoreItemArt id="bookcase" tint="lagoon" />
        <MoreItemArt id="dollhouse" tint="coral" />
        <MoreItemArt id="dollhouse" tint="lilac" />
      </div>,
    );
    const ids = [...html.matchAll(/<(?:linearGradient|filter)[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(20);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps back and front seat layers distinct and non-empty for every covered seat', () => {
    for (const id of ['bed', 'bunk-bed', 'hammock', 'sofa', 'armchair', 'beanbag', 'bathtub', 'bubble-bath']) {
      const back = render(<SeatArt id={id} layer="back" />);
      const front = render(<SeatArt id={id} layer="front" />);
      expect(back).toMatch(/<(path|rect|ellipse|circle)/);
      expect(front).toMatch(/<(path|rect|ellipse|circle)/);
      expect(back).not.toBe(front);
    }
  });

  it('preserves CrabFriend poses, ground contact box, and Reduce Motion sleep mark hiding', () => {
    const stand = render(<CrabFriend pose="stand" />);
    const sit = render(<CrabFriend pose="sit" />);
    const lie = render(<CrabFriend pose="lie" />);
    const lieReduced = render(<CrabFriend pose="lie" reduced />);
    const held = render(<CrabFriend pose="held" />);
    expect(stand).toContain('viewBox="0 0 120 110"');
    expect(new Set([stand, sit, lie, held]).size).toBe(4);
    expect(lie).not.toBe(lieReduced);
    expect(lie).toContain('M87 27h9l-9 9h9');
    expect(lieReduced).not.toContain('M87 27h9l-9 9h9');
  });

  it('renders living props, holdables, dispenser fan, and delight effects cleanly', () => {
    for (const id of holdableIds) {
      const held = render(<svg><HandProp id={id} /></svg>);
      expect(held).toMatch(/<(path|rect|ellipse|circle)/);
      expect(held).not.toMatch(/NaN|Infinity|undefined/);
    }
    for (const id of drinkIds) {
      expect(render(<LivingArt id={id} state={{ empty: false }} />)).not.toBe(render(<LivingArt id={id} state={{ empty: true }} />));
    }
    expect(render(<DispenserFanArt item="fridge" state={{ on: true }} />)).toContain('viewBox="-112 -120 224 120"');
    expect(particlesOf('bubbles', 3)).toHaveLength(8);
    expect(particlesOf('splash', 3)).toHaveLength(7);
  });
});
