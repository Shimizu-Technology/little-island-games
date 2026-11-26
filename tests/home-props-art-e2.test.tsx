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

  it('keeps standalone CrabFriend ground contact at (60, 96) and sleeping bounds above y=96 across poses and mirroring', () => {
    type Transform = { sx: number; sy: number; tx: number; ty: number };
    const parseTransform = (raw?: string): Transform => {
      let t: Transform = { sx: 1, sy: 1, tx: 0, ty: 0 };
      if (!raw) return t;
      for (const match of raw.matchAll(/(translate|scale|rotate)\(([^)]+)\)/g)) {
        const [, op, body] = match;
        const nums = body.trim().split(/[\s,]+/).map(Number);
        if (op === 'translate') {
          const [dx = 0, dy = 0] = nums;
          t = { sx: t.sx, sy: t.sy, tx: t.tx + t.sx * dx, ty: t.ty + t.sy * dy };
        } else if (op === 'scale') {
          const [sx = 1, sy = sx] = nums;
          t = { sx: t.sx * sx, sy: t.sy * sy, tx: t.tx, ty: t.ty };
        } else if (op === 'rotate') {
          expect(nums[0] ?? 0).toBe(0);
        }
      }
      return t;
    };
    const compose = (a: Transform, b: Transform): Transform => ({
      sx: a.sx * b.sx,
      sy: a.sy * b.sy,
      tx: a.tx + a.sx * b.tx,
      ty: a.ty + a.sy * b.ty,
    });
    const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
    const pathBounds = (d: string, t: Transform) => {
      let cx = 0;
      let cy = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      const pushPoint = (x: number, y: number) => {
        const tx = t.tx + t.sx * x;
        const ty = t.ty + t.sy * y;
        minX = Math.min(minX, tx);
        maxX = Math.max(maxX, tx);
        minY = Math.min(minY, ty);
        maxY = Math.max(maxY, ty);
      };
      const pushQuad = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) => {
        const quadExtremum = (p0: number, p1: number, p2: number) => {
          const denom = p0 - 2 * p1 + p2;
          if (Math.abs(denom) <= 1e-6) return null;
          const u = (p0 - p1) / denom;
          return u > 0 && u < 1 ? u : null;
        };
        for (const u of [quadExtremum(x0, x1, x2), quadExtremum(y0, y1, y2)]) {
          if (u !== null) {
            const omt = 1 - u;
            pushPoint(
              omt * omt * x0 + 2 * omt * u * x1 + u * u * x2,
              omt * omt * y0 + 2 * omt * u * y1 + u * u * y2,
            );
          }
        }
        pushPoint(x2, y2);
      };
      const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
      let cmd = '';
      let i = 0;
      while (i < tokens.length) {
        if (/^[A-Za-z]$/.test(tokens[i])) {
          cmd = tokens[i++];
          if (cmd === 'Z' || cmd === 'z') continue;
        }
        const n = () => Number(tokens[i++]);
        if (cmd === 'M' || cmd === 'L') {
          cx = n();
          cy = n();
          pushPoint(cx, cy);
        } else if (cmd === 'm' || cmd === 'l') {
          cx += n();
          cy += n();
          pushPoint(cx, cy);
        } else if (cmd === 'V') {
          cy = n();
          pushPoint(cx, cy);
        } else if (cmd === 'v') {
          cy += n();
          pushPoint(cx, cy);
        } else if (cmd === 'H') {
          cx = n();
          pushPoint(cx, cy);
        } else if (cmd === 'h') {
          cx += n();
          pushPoint(cx, cy);
        } else if (cmd === 'Q') {
          const [x1, y1, x2, y2] = [n(), n(), n(), n()];
          pushQuad(cx, cy, x1, y1, x2, y2);
          cx = x2;
          cy = y2;
        } else if (cmd === 'q') {
          const [dx1, dy1, dx2, dy2] = [n(), n(), n(), n()];
          pushQuad(cx, cy, cx + dx1, cy + dy1, cx + dx2, cy + dy2);
          cx += dx2;
          cy += dy2;
        }
      }
      return { minX, maxX, minY, maxY };
    };

    const inspectCrab = (pose: 'stand' | 'sit' | 'lie' | 'held', mirrored: boolean) => {
      const svg = render(<CrabFriend pose={pose} mirrored={mirrored} />);
      const stack: Transform[] = [{ sx: 1, sy: 1, tx: 0, ty: 0 }];
      let shadow: { cx: number; cy: number; rx: number; ry: number } | null = null;
      let shell: { cx: number; cy: number; rx: number; ry: number; bottom: number; top: number } | null = null;
      let belly: { bottom: number } | null = null;
      let bodyMinX = Infinity;
      let bodyMaxX = -Infinity;
      let bodyMinY = Infinity;
      let bodyMaxY = -Infinity;
      for (const token of svg.matchAll(/<\/?([a-zA-Z]+)([^>]*)>/g)) {
        const [full, tag, attrs] = token;
        const closing = full.startsWith('</');
        const selfClosing = full.endsWith('/>');
        if (closing) {
          if (tag === 'g') stack.pop();
          continue;
        }
        const current = stack[stack.length - 1];
        if (tag === 'g') {
          const next = compose(current, parseTransform(attr(attrs, 'transform')));
          if (!selfClosing) stack.push(next);
          continue;
        }
        if (tag === 'ellipse') {
          const cx = current.tx + current.sx * Number(attr(attrs, 'cx'));
          const cy = current.ty + current.sy * Number(attr(attrs, 'cy'));
          const rx = Math.abs(current.sx) * Number(attr(attrs, 'rx'));
          const ry = Math.abs(current.sy) * Number(attr(attrs, 'ry'));
          const fill = attr(attrs, 'fill');
          if (fill === '#4A3328') shadow = { cx, cy, rx, ry };
          if (fill === '#F26F55') shell = { cx, cy, rx, ry, top: cy - ry, bottom: cy + ry };
          if (fill === '#FAD27A') belly = { bottom: cy + ry };
        } else if (tag === 'path') {
          const d = attr(attrs, 'd');
          if (d) {
            const b = pathBounds(d, current);
            bodyMinX = Math.min(bodyMinX, b.minX);
            bodyMaxX = Math.max(bodyMaxX, b.maxX);
            bodyMinY = Math.min(bodyMinY, b.minY);
            bodyMaxY = Math.max(bodyMaxY, b.maxY);
          }
        }
      }
      return { shadow, shell, belly, bodyMinX, bodyMaxX, bodyMinY, bodyMaxY };
    };

    for (const mirrored of [false, true]) {
      for (const pose of ['stand', 'sit', 'lie'] as const) {
        const { shadow, shell, belly, bodyMinX, bodyMaxX, bodyMinY, bodyMaxY } = inspectCrab(pose, mirrored);
        expect(shadow).not.toBeNull();
        expect(shell).not.toBeNull();
        expect(belly).not.toBeNull();
        expect(shadow!.cx).toBeCloseTo(60, 5);
        expect(shadow!.cy).toBeCloseTo(96, 5);
        expect(shell!.cx).toBeCloseTo(60, 5);
        expect(shell!.top).toBeGreaterThanOrEqual(0);
        expect(shell!.bottom).toBeLessThanOrEqual(110);
        expect(bodyMinX).toBeGreaterThanOrEqual(0);
        expect(bodyMaxX).toBeLessThanOrEqual(120);
        expect(bodyMinY).toBeGreaterThanOrEqual(0);
        expect(bodyMaxY).toBeLessThanOrEqual(110);

        if (pose === 'stand') {
          expect(shell!.bottom).toBeCloseTo(96.5, 5);
        } else if (pose === 'sit') {
          expect(shell!.bottom).toBeCloseTo(102.5, 5);
        } else if (pose === 'lie') {
          expect(shell!.bottom).toBeLessThanOrEqual(96);
          expect(shell!.bottom).toBeGreaterThanOrEqual(94);
          expect(belly!.bottom).toBeLessThanOrEqual(shell!.bottom);
          expect(bodyMaxY).toBeLessThanOrEqual(96);
          expect(shadow!.cy + shadow!.ry).toBeGreaterThan(shell!.bottom);
        }
      }
      expect(inspectCrab('held', mirrored).shadow).toBeNull();
    }
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
