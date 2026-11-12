/** R0: a capped text above its cap is drawn at its capped size explicitly. React Native's native measure cache ignores
 * maxFontSizeMultiplier, so otherwise the same words capped differently (landscape 1.5x, portrait 2x) share one stale
 * measurement after a rotation and are clipped. */
import React from 'react';
import { expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({ Text: 'Text', StyleSheet: { flatten: (s: unknown) => Array.isArray(s) ? Object.assign({}, ...s.flat(Infinity).filter(Boolean)) : s }, useWindowDimensions: () => ({ fontScale: 3.12 }) }));
const { cappedTextProps } = await import('../src/components/Text');

it('above the cap: explicit capped size and line height, no system scaling, so each cap is its own measurement', () => {
  const a = cappedTextProps({ maxFontSizeMultiplier: 1.5, style: [{ fontSize: 19, lineHeight: 24 }, { color: 'red' }], children: 'Follow the arrows' }, 3.12);
  const b = cappedTextProps({ maxFontSizeMultiplier: 2, style: [{ fontSize: 19, lineHeight: 24 }, { color: 'red' }], children: 'Follow the arrows' }, 3.12);
  expect(a.allowFontScaling).toBe(false);expect(a.maxFontSizeMultiplier).toBeUndefined();
  expect(a.style).toEqual({ fontSize: 28.5, lineHeight: 36, color: 'red' });
  expect(b.style).toEqual({ fontSize: 38, lineHeight: 48, color: 'red' });
  // No style size uses React Native's 14-pt default.
  expect(cappedTextProps({ maxFontSizeMultiplier: 1.3, children: 'Games' }, 3.12).style).toEqual({ fontSize: 14 * 1.3 });
});

it('at or below the cap, without a cap, with scaling off or with nested text, the props pass through unchanged', () => {
  const plain = { maxFontSizeMultiplier: 2, style: { fontSize: 19 }, children: 'Hi' };
  expect(cappedTextProps(plain, 1.8)).toBe(plain);
  expect(cappedTextProps(plain, 2)).toBe(plain);
  const uncapped = { style: { fontSize: 19 }, children: 'Hi' };
  expect(cappedTextProps(uncapped, 3.12)).toBe(uncapped);
  const off = { allowFontScaling: false, maxFontSizeMultiplier: 2, children: 'Hi' };
  expect(cappedTextProps(off, 3.12)).toBe(off);
  const nested = { maxFontSizeMultiplier: 2, style: { fontSize: 19 }, children: ['Tap ', React.createElement('Text', { key: 1, style: { fontSize: 30 } }, 'Go')] };
  expect(cappedTextProps(nested, 3.12)).toBe(nested);
  expect(cappedTextProps({ maxFontSizeMultiplier: 2, children: ['1', ' swipe ', 2] }, 3.12).allowFontScaling).toBe(false);
});
